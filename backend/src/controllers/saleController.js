const crypto = require("crypto");
const pool = require("../config/database");
const { verifyTripAccess, getStaffIdForUser } = require("../middleware/authorize");

// Helper to retrieve an existing sale with all items for idempotency
const getExistingSaleWithItems = async (dbClientOrPool, idempotencyKey) => {
  const result = await dbClientOrPool.query(
    `
    SELECT
      s.*,
      sh.shop_name,
      st.name AS sales_staff_name,
      COALESCE(
        json_agg(
          json_build_object(
            'id', si.id,
            'product_id', si.product_id,
            'product_name', p.product_name,
            'batch_id', si.batch_id,
            'quantity', si.quantity,
            'unit_price', si.unit_price,
            'discount', si.discount,
            'line_total', si.line_total
          )
        ) FILTER (WHERE si.id IS NOT NULL), '[]'
      ) AS items
    FROM sales s
    JOIN shops sh ON sh.id = s.shop_id
    LEFT JOIN staff st ON st.id = s.sales_staff_id
    LEFT JOIN sale_items si ON si.sale_id = s.id
    LEFT JOIN products p ON p.id = si.product_id
    WHERE s.idempotency_key = $1
    GROUP BY s.id, sh.shop_name, st.name
    `,
    [idempotencyKey]
  );
  return result.rows[0] || null;
};

// Helper to verify whether an incoming sale request payload matches an existing sale
const isSameSalePayload = (existingSale, incomingData) => {
  if (!existingSale) return false;
  if (existingSale.shop_id !== incomingData.shop_id) return false;
  if (existingSale.trip_id !== incomingData.trip_id) return false;

  const incomingDiscount = Number(incomingData.discount || 0);
  if (Number(existingSale.discount) !== incomingDiscount) return false;

  const existingItems = existingSale.items || [];
  const incomingItems = incomingData.items || [];

  if (existingItems.length !== incomingItems.length) return false;

  for (const incItem of incomingItems) {
    const match = existingItems.find(
      (e) =>
        e.product_id === incItem.product_id &&
        Number(e.quantity) === Number(incItem.quantity)
    );
    if (!match) return false;
  }

  return true;
};

// CREATE SALE
const createSale = async (req, res) => {
  const idempotencyKey =
    req.headers["idempotency-key"] ||
    req.body.idempotency_key ||
    null;

  // Fast-path idempotency check before opening transaction
  if (idempotencyKey) {
    try {
      const existingSale = await getExistingSaleWithItems(pool, idempotencyKey);
      if (existingSale) {
        if (!isSameSalePayload(existingSale, req.body)) {
          return res.status(409).json({
            message: "Idempotency key already used with different payload",
          });
        }
        return res.status(200).json({
          message: "Sale already processed",
          sale: existingSale,
          is_duplicate: true,
        });
      }
    } catch (checkErr) {
      console.error("Fast-path idempotency check error:", checkErr);
    }
  }

  const client = await pool.connect();

  try {
    const {
      trip_id,
      shop_id,
      sale_date,
      items,
      discount = 0,
      notes,
    } = req.body;

    if (!trip_id || !shop_id) {
      return res.status(400).json({
        message: "Trip ID and shop ID are required",
      });
    }

    if (Number(discount) < 0) {
      return res.status(400).json({
        message: "Discount cannot be negative",
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "At least one sale item is required",
      });
    }

    await client.query("BEGIN");

    // Concurrency lock on idempotency key to cleanly serialize concurrent identical requests
    if (idempotencyKey) {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        idempotencyKey,
      ]);

      const existingUnderLock = await getExistingSaleWithItems(
        client,
        idempotencyKey
      );
      if (existingUnderLock) {
        await client.query("ROLLBACK");
        if (!isSameSalePayload(existingUnderLock, req.body)) {
          return res.status(409).json({
            message: "Idempotency key already used with different payload",
          });
        }
        return res.status(200).json({
          message: "Sale already processed",
          sale: existingUnderLock,
          is_duplicate: true,
        });
      }
    }

    // Check trip and authorization
    const access = await verifyTripAccess(trip_id, req, client);
    if (!access.authorized) {
      await client.query("ROLLBACK");
      return res.status(access.status).json({ message: access.message });
    }

    const tripResult = await client.query(
      `
      SELECT id, status, sales_staff_id
      FROM trips
      WHERE id = $1
      FOR UPDATE
      `,
      [trip_id]
    );

    const trip = tripResult.rows[0];

    if (!["loaded", "in_progress"].includes(trip.status)) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Sale can only be created from a loaded or active trip",
      });
    }

    // Check shop belongs to this trip
    const tripShopResult = await client.query(
      `
      SELECT id
      FROM trip_shops
      WHERE trip_id = $1
      AND shop_id = $2
      `,
      [trip_id, shop_id]
    );

    if (tripShopResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Shop is not assigned to this trip",
      });
    }

    let subtotal = 0;
    const preparedItems = [];

    // Validate every item and lock stock
    for (const item of items) {
      if (
        !item.product_id ||
        item.quantity === undefined ||
        item.quantity === null ||
        item.unit_price === undefined ||
        item.unit_price === null
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message:
            "Each item requires product_id, quantity and unit_price",
        });
      }

      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unit_price);

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: "Invalid quantity or unit price",
        });
      }

      // Check total available stock in trip for this product
      const totalStockResult = await client.query(
        `
        SELECT COALESCE(SUM(quantity), 0) AS total_qty
        FROM trip_stock
        WHERE trip_id = $1
        AND product_id = $2
        `,
        [trip_id, item.product_id]
      );
      const totalAvailable = Number(totalStockResult.rows[0]?.total_qty || 0);

      if (totalAvailable < quantity) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: `Insufficient trip stock. Available: ${totalAvailable}`,
        });
      }

      // Lock trip stock row
      let stockResult;
      if (item.batch_id) {
        stockResult = await client.query(
          `
          SELECT id, batch_id, quantity
          FROM trip_stock
          WHERE trip_id = $1
          AND product_id = $2
          AND batch_id = $3
          FOR UPDATE
          `,
          [trip_id, item.product_id, item.batch_id]
        );
      }

      // If batch_id not supplied or has less than requested quantity, fallback to batch with sufficient stock
      if (
        !stockResult ||
        stockResult.rows.length === 0 ||
        Number(stockResult.rows[0].quantity) < quantity
      ) {
        const fallbackResult = await client.query(
          `
          SELECT id, batch_id, quantity
          FROM trip_stock
          WHERE trip_id = $1
          AND product_id = $2
          AND quantity >= $3
          ORDER BY quantity DESC
          LIMIT 1
          FOR UPDATE
          `,
          [trip_id, item.product_id, quantity]
        );

        if (fallbackResult.rows.length > 0) {
          stockResult = fallbackResult;
        }
      }

      if (!stockResult || stockResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: `Insufficient trip stock. Available: ${totalAvailable}`,
        });
      }

      const tripStock = stockResult.rows[0];

      if (Number(tripStock.quantity) < quantity) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: `Insufficient trip stock. Available: ${tripStock.quantity}`,
        });
      }

      const actualBatchId = tripStock.batch_id;
      const lineTotal = quantity * unitPrice;

      subtotal += lineTotal;

      preparedItems.push({
        product_id: item.product_id,
        batch_id: actualBatchId,
        quantity,
        unit_price: unitPrice,
        discount: Number(item.discount || 0),
        line_total: lineTotal - Number(item.discount || 0),
      });
    }

    const saleDiscount = Number(discount);

    if (!Number.isFinite(saleDiscount) || saleDiscount < 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Invalid discount",
      });
    }

    if (saleDiscount > subtotal) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Discount cannot be greater than subtotal",
      });
    }

    const totalAmount = subtotal - saleDiscount;

    // Generate invoice number
    const sequenceResult = await client.query(
      `
      INSERT INTO document_sequences (document_type, current_value)
      VALUES ('sale', 1)
      ON CONFLICT (document_type)
      DO UPDATE SET
        current_value = document_sequences.current_value + 1
      RETURNING current_value
      `
    );

    // Fetch configured invoice prefix from business_settings
    const settingsRes = await client.query(
      `SELECT invoice_prefix FROM business_settings WHERE id = 'default' LIMIT 1`
    );
    const invoicePrefix = settingsRes.rows[0]?.invoice_prefix || "INV-";

    const invoiceNumber = `${invoicePrefix}${String(
      sequenceResult.rows[0].current_value
    ).padStart(5, "0")}`;

    const finalIdempotencyKey = idempotencyKey || crypto.randomUUID();

    // Create sale
    const saleResult = await client.query(
      `
      INSERT INTO sales (
        invoice_number,
        trip_id,
        shop_id,
        sales_staff_id,
        sale_date,
        subtotal,
        discount,
        total_amount,
        notes,
        idempotency_key
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
      `,
      [
        invoiceNumber,
        trip_id,
        shop_id,
        trip.sales_staff_id,
        sale_date || new Date(),
        subtotal,
        saleDiscount,
        totalAmount,
        notes || null,
        finalIdempotencyKey,
      ]
    );

    const sale = saleResult.rows[0];

    // Create items + deduct trip stock
    for (const item of preparedItems) {
      await client.query(
        `
        INSERT INTO sale_items (
          sale_id,
          product_id,
          batch_id,
          quantity,
          unit_price,
          discount,
          line_total
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          sale.id,
          item.product_id,
          item.batch_id,
          item.quantity,
          item.unit_price,
          item.discount,
          item.line_total,
        ]
      );

      await client.query(
        `
        UPDATE trip_stock
        SET quantity = quantity - $1,
            updated_at = NOW()
        WHERE trip_id = $2
        AND product_id = $3
        AND batch_id = $4
        `,
        [
          item.quantity,
          trip_id,
          item.product_id,
          item.batch_id,
        ]
      );

      await client.query(
        `
        INSERT INTO stock_ledger (
          product_id,
          batch_id,
          movement_type,
          quantity_change,
          trip_id,
          reference_id,
          notes
        )
        VALUES (
          $1,
          $2,
          'sale_out',
          $3,
          $4,
          $5,
          $6
        )
        `,
        [
          item.product_id,
          item.batch_id,
          -item.quantity,
          trip_id,
          sale.id,
          `Sale ${invoiceNumber}`,
        ]
      );
    }

    // Add sale to shop ledger
    await client.query(
      `
      INSERT INTO shop_ledger_entries (
        shop_id,
        entry_type,
        sale_id,
        debit,
        credit,
        balance_after,
        reference_id,
        notes
      )
      VALUES (
        $1,
        'sale',
        $2,
        $3,
        0,
        $3,
        $2,
        $4
      )
      `,
      [
        shop_id,
        sale.id,
        totalAmount,
        `Sale ${invoiceNumber}`,
      ]
    );

    // Mark shop as visited in trip_shops if not already marked
    await client.query(
      `
      UPDATE trip_shops
      SET visited_at = COALESCE(visited_at, NOW())
      WHERE trip_id = $1
      AND shop_id = $2
      `,
      [trip_id, shop_id]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Sale created successfully",
      sale,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    // Handle duplicate idempotency key race condition gracefully
    if (error.code === "23505" && idempotencyKey) {
      try {
        const existingSale = await getExistingSaleWithItems(
          pool,
          idempotencyKey
        );
        if (existingSale) {
          if (!isSameSalePayload(existingSale, req.body)) {
            return res.status(409).json({
              message: "Idempotency key already used with different payload",
            });
          }
          return res.status(200).json({
            message: "Sale already processed",
            sale: existingSale,
            is_duplicate: true,
          });
        }
      } catch (findErr) {
        console.error("Error retrieving existing idempotent sale:", findErr);
      }
    }

    console.error("Create sale error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
};

// GET ALL SALES
const getSales = async (req, res) => {
  try {
    let query = `
      SELECT
        s.*,
        sh.shop_name,
        st.name AS sales_staff_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', si.id,
              'product_id', si.product_id,
              'product_name', p.product_name,
              'batch_id', si.batch_id,
              'quantity', si.quantity,
              'unit_price', si.unit_price,
              'discount', si.discount,
              'line_total', si.line_total
            )
          ) FILTER (WHERE si.id IS NOT NULL), '[]'
        ) AS items
      FROM sales s
      JOIN shops sh ON sh.id = s.shop_id
      LEFT JOIN staff st ON st.id = s.sales_staff_id
      LEFT JOIN sale_items si ON si.sale_id = s.id
      LEFT JOIN products p ON p.id = si.product_id
    `;
    const params = [];

    // If caller is STAFF, only return sales for trips assigned to them
    if (req.user && req.user.role !== "admin") {
      const staffId = await getStaffIdForUser(pool, req.user.userId);
      if (!staffId) {
        return res.json({ sales: [] });
      }
      query += ` WHERE s.trip_id IN (
        SELECT id FROM trips WHERE driver_id = $1 OR sales_staff_id = $1
      ) `;
      params.push(staffId);
    }

    query += `
      GROUP BY s.id, sh.shop_name, st.name
      ORDER BY s.sale_date DESC, s.created_at DESC
    `;

    const result = await pool.query(query, params);

    res.json({
      sales: result.rows,
    });
  } catch (error) {
    console.error("Get sales error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  createSale,
  getSales,
};