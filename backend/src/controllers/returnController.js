const crypto = require("crypto");
const pool = require("../config/database");
const { verifyTripAccess, getStaffIdForUser } = require("../middleware/authorize");

// Helper to retrieve an existing return with all items for idempotency
const getExistingReturnWithItems = async (dbClientOrPool, idempotencyKey) => {
  const result = await dbClientOrPool.query(
    `
    SELECT
      r.*,
      s.shop_name,
      COALESCE(
        json_agg(
          json_build_object(
            'id', ri.id,
            'product_id', ri.product_id,
            'batch_id', ri.batch_id,
            'quantity', ri.quantity,
            'unit_price', ri.unit_price,
            'line_total', ri.line_total,
            'sale_id', ri.sale_id
          )
        ) FILTER (WHERE ri.id IS NOT NULL), '[]'
      ) AS items
    FROM returns r
    JOIN shops s ON s.id = r.shop_id
    LEFT JOIN return_items ri ON ri.return_id = r.id
    WHERE r.idempotency_key = $1
    GROUP BY r.id, s.shop_name
    `,
    [idempotencyKey]
  );
  return result.rows[0] || null;
};

// Helper to verify whether an incoming return request payload matches an existing return
const isSameReturnPayload = (existingReturn, incomingData) => {
  if (!existingReturn) return false;
  if (existingReturn.shop_id !== incomingData.shop_id) return false;
  if (existingReturn.trip_id !== incomingData.trip_id) return false;
  if (existingReturn.reason !== incomingData.reason) return false;

  const existingItems = existingReturn.items || [];
  const incomingItems = incomingData.items || [];

  if (existingItems.length !== incomingItems.length) return false;

  for (const incItem of incomingItems) {
    const match = existingItems.find(
      (e) =>
        e.product_id === incItem.product_id &&
        (!incItem.batch_id || e.batch_id === incItem.batch_id) &&
        Number(e.quantity) === Number(incItem.quantity)
    );
    if (!match) return false;
  }

  return true;
};

// CREATE RETURN
const createReturn = async (req, res) => {
  const idempotencyKey =
    req.headers["idempotency-key"] ||
    req.body.idempotency_key ||
    null;

  // Fast-path idempotency check before opening transaction
  if (idempotencyKey) {
    try {
      const existingReturn = await getExistingReturnWithItems(
        pool,
        idempotencyKey
      );
      if (existingReturn) {
        if (!isSameReturnPayload(existingReturn, req.body)) {
          return res.status(409).json({
            message: "Idempotency key already used with different payload",
          });
        }
        return res.status(200).json({
          message: "Return already processed",
          return: existingReturn,
          is_duplicate: true,
        });
      }
    } catch (checkErr) {
      console.error("Fast-path idempotency check error in returns:", checkErr);
    }
  }

  const client = await pool.connect();

  try {
    const {
      trip_id,
      shop_id,
      reason,
      return_date,
      items,
      notes,
    } = req.body;

    if (!trip_id || !shop_id || !reason) {
      return res.status(400).json({
        message: "Trip ID, shop ID and return reason are required",
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "At least one return item is required",
      });
    }

    const allowedReasons = [
      "shop_return",
      "damaged",
      "expired",
    ];

    if (!allowedReasons.includes(reason)) {
      return res.status(400).json({
        message: "Invalid return reason",
      });
    }

    await client.query("BEGIN");

    // Concurrency lock on idempotency key
    if (idempotencyKey) {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        idempotencyKey,
      ]);

      const existingUnderLock = await getExistingReturnWithItems(
        client,
        idempotencyKey
      );
      if (existingUnderLock) {
        await client.query("ROLLBACK");
        if (!isSameReturnPayload(existingUnderLock, req.body)) {
          return res.status(409).json({
            message: "Idempotency key already used with different payload",
          });
        }
        return res.status(200).json({
          message: "Return already processed",
          return: existingUnderLock,
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
      SELECT id, status
      FROM trips
      WHERE id = $1
      FOR UPDATE
      `,
      [trip_id]
    );

    const trip = tripResult.rows[0];

    // Check shop belongs to trip
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

    const finalIdempotencyKey = idempotencyKey || crypto.randomUUID();

    // Create return record
    const returnResult = await client.query(
      `
      INSERT INTO returns (
        trip_id,
        shop_id,
        reason,
        return_date,
        notes,
        idempotency_key,
        total_credit_amount
      )
      VALUES ($1, $2, $3, $4, $5, $6, 0)
      RETURNING *
      `,
      [
        trip_id,
        shop_id,
        reason,
        return_date || new Date(),
        notes || null,
        finalIdempotencyKey,
      ]
    );

    const returnRecord = returnResult.rows[0];
    let totalReturnCredit = 0;

    for (const item of items) {
      if (
        !item.product_id ||
        item.quantity === undefined ||
        item.quantity === null
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: "Each return item requires product_id and quantity",
        });
      }

      const quantity = Number(item.quantity);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: "Return quantity must be greater than 0",
        });
      }

      // Verify product exists and fetch master selling price
      const prodCheck = await client.query(
        `SELECT id, product_name, selling_price FROM products WHERE id = $1 AND is_active = true`,
        [item.product_id]
      );

      if (prodCheck.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: `Product not found or inactive (${item.product_id})`,
        });
      }

      // If batch_id not supplied, find an existing batch for this trip or product
      let batchId = item.batch_id;
      if (!batchId) {
        const existingBatch = await client.query(
          `SELECT batch_id FROM trip_stock WHERE trip_id = $1 AND product_id = $2 LIMIT 1`,
          [trip_id, item.product_id]
        );
        if (existingBatch.rows.length > 0) {
          batchId = existingBatch.rows[0].batch_id;
        } else {
          const pbRes = await client.query(
            `SELECT id FROM product_batches WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [item.product_id]
          );
          batchId = pbRes.rows[0]?.id || "00000000-0000-0000-0000-000000000000";
        }
      }

      // Ensure product/batch row exists in trip_stock so return is tracked
      await client.query(
        `INSERT INTO trip_stock (trip_id, product_id, batch_id, quantity, non_sellable_quantity)
         VALUES ($1, $2, $3, 0, 0)
         ON CONFLICT (trip_id, product_id, batch_id) DO NOTHING`,
        [trip_id, item.product_id, batchId]
      );

      // Lock row in trip_stock
      await client.query(
        `SELECT id, quantity, non_sellable_quantity
         FROM trip_stock
         WHERE trip_id = $1 AND product_id = $2 AND batch_id = $3
         FOR UPDATE`,
        [trip_id, item.product_id, batchId]
      );

      // =====================================================================
      // HISTORICAL UNIT PRICE RESOLUTION (PREVIOUS-TRIP & SALE PRICE LOOKUP)
      // =====================================================================
      let unitPrice = null;
      let matchedSaleId = item.sale_id || null;

      // 1. If explicit sale_id is provided, look in that specific sale
      if (matchedSaleId) {
        const directSaleRes = await client.query(
          `SELECT si.unit_price, si.sale_id
           FROM sale_items si
           WHERE si.sale_id = $1 AND si.product_id = $2
           ORDER BY si.created_at DESC LIMIT 1`,
          [matchedSaleId, item.product_id]
        );
        if (directSaleRes.rows.length > 0) {
          unitPrice = Number(directSaleRes.rows[0].unit_price);
        }
      }

      // 2. Look for most recent sale to this shop with matching batch (any trip)
      if (unitPrice === null && batchId) {
        const batchSaleRes = await client.query(
          `SELECT si.unit_price, s.id AS sale_id
           FROM sale_items si
           JOIN sales s ON s.id = si.sale_id
           WHERE s.shop_id = $1
           AND si.product_id = $2
           AND si.batch_id = $3
           ORDER BY s.sale_date DESC, s.created_at DESC
           LIMIT 1`,
          [shop_id, item.product_id, batchId]
        );
        if (batchSaleRes.rows.length > 0) {
          unitPrice = Number(batchSaleRes.rows[0].unit_price);
          matchedSaleId = batchSaleRes.rows[0].sale_id;
        }
      }

      // 3. Fallback: look for most recent sale of this product to this shop (any batch, any trip)
      if (unitPrice === null) {
        const prodSaleRes = await client.query(
          `SELECT si.unit_price, s.id AS sale_id
           FROM sale_items si
           JOIN sales s ON s.id = si.sale_id
           WHERE s.shop_id = $1
           AND si.product_id = $2
           ORDER BY s.sale_date DESC, s.created_at DESC
           LIMIT 1`,
          [shop_id, item.product_id]
        );
        if (prodSaleRes.rows.length > 0) {
          unitPrice = Number(prodSaleRes.rows[0].unit_price);
          matchedSaleId = prodSaleRes.rows[0].sale_id;
        }
      }

      // 4. Fallback: master product selling price
      if (unitPrice === null) {
        unitPrice = Number(prodCheck.rows[0].selling_price || 0);
      }

      if (unitPrice === null || !Number.isFinite(unitPrice) || unitPrice < 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: `Unable to determine unit price for product return (${item.product_id})`,
        });
      }

      const lineTotal = quantity * unitPrice;
      totalReturnCredit += lineTotal;

      // Add return item with valuation and sale link
      await client.query(
        `
        INSERT INTO return_items (
          return_id,
          product_id,
          batch_id,
          quantity,
          unit_price,
          line_total,
          sale_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          returnRecord.id,
          item.product_id,
          batchId,
          quantity,
          unitPrice,
          lineTotal,
          matchedSaleId || null,
        ]
      );

      // =====================================================================
      // STOCK MOVEMENT DISPOSITION
      // =====================================================================
      if (reason === "shop_return") {
        // Sellable customer return goes back into usable sellable trip stock
        await client.query(
          `
          UPDATE trip_stock
          SET quantity = quantity + $1,
              updated_at = NOW()
          WHERE trip_id = $2
          AND product_id = $3
          AND batch_id = $4
          `,
          [
            quantity,
            trip_id,
            item.product_id,
            batchId,
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
            'return_in',
            $3,
            $4,
            $5,
            $6
          )
          `,
          [
            item.product_id,
            batchId,
            quantity,
            trip_id,
            returnRecord.id,
            "Customer return received back into trip (sellable)",
          ]
        );
      } else {
        // DAMAGED or EXPIRED customer return:
        // Received into vehicle, but kept strictly in non-sellable stock quarantine!
        // Does NOT deduct from sellable stock, and does NOT add to sellable stock.
        await client.query(
          `
          UPDATE trip_stock
          SET non_sellable_quantity = COALESCE(non_sellable_quantity, 0) + $1,
              updated_at = NOW()
          WHERE trip_id = $2
          AND product_id = $3
          AND batch_id = $4
          `,
          [
            quantity,
            trip_id,
            item.product_id,
            batchId,
          ]
        );

        const movementNotes =
          reason === "damaged"
            ? "Customer damaged return received (non-sellable quarantine)"
            : "Customer expired return received (non-sellable quarantine)";

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
            'return_in',
            $3,
            $4,
            $5,
            $6
          )
          `,
          [
            item.product_id,
            batchId,
            quantity,
            trip_id,
            returnRecord.id,
            movementNotes,
          ]
        );
      }
    }

    // =====================================================================
    // FINANCIAL ACCOUNTING: CREDIT SHOP LEDGER FOR ALL RETURN REASONS
    // =====================================================================
    if (totalReturnCredit > 0) {
      await client.query(
        `
        INSERT INTO shop_ledger_entries (
          shop_id,
          entry_type,
          debit,
          credit,
          balance_after,
          reference_id,
          notes
        )
        SELECT
          $1,
          'return',
          0,
          $2,
          COALESCE(SUM(debit), 0) -
          COALESCE(SUM(credit), 0) - $2,
          $3,
          $4
        FROM shop_ledger_entries
        WHERE shop_id = $1
        `,
        [
          shop_id,
          totalReturnCredit,
          returnRecord.id,
          `Customer return adjustment (${reason})`,
        ]
      );

      await client.query(
        `UPDATE returns SET total_credit_amount = $1 WHERE id = $2`,
        [totalReturnCredit, returnRecord.id]
      );
      returnRecord.total_credit_amount = totalReturnCredit;
    }

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
      message: "Return created successfully",
      return: returnRecord,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    // Handle duplicate idempotency key race condition gracefully
    if (error.code === "23505" && idempotencyKey) {
      try {
        const existingReturn = await getExistingReturnWithItems(
          pool,
          idempotencyKey
        );
        if (existingReturn) {
          if (!isSameReturnPayload(existingReturn, req.body)) {
            return res.status(409).json({
              message: "Idempotency key already used with different payload",
            });
          }
          return res.status(200).json({
            message: "Return already processed",
            return: existingReturn,
            is_duplicate: true,
          });
        }
      } catch (findErr) {
        console.error("Error retrieving existing idempotent return:", findErr);
      }
    }

    console.error("Create return error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
};

// GET ALL RETURNS
const getReturns = async (req, res) => {
  try {
    let query = `
      SELECT
        r.*,
        s.shop_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ri.id,
              'product_id', ri.product_id,
              'product_name', p.product_name,
              'batch_id', ri.batch_id,
              'quantity', ri.quantity,
              'unit_price', ri.unit_price,
              'line_total', ri.line_total,
              'sale_id', ri.sale_id
            )
          ) FILTER (WHERE ri.id IS NOT NULL),
          '[]'
        ) AS items
      FROM returns r
      JOIN shops s ON s.id = r.shop_id
      LEFT JOIN return_items ri ON ri.return_id = r.id
      LEFT JOIN products p ON p.id = ri.product_id
    `;
    const params = [];

    // If caller is STAFF, only return returns for trips assigned to them
    if (req.user && req.user.role !== "admin") {
      const staffId = await getStaffIdForUser(pool, req.user.userId);
      if (!staffId) {
        return res.json({ returns: [] });
      }
      query += ` WHERE r.trip_id IN (
        SELECT id FROM trips WHERE driver_id = $1 OR sales_staff_id = $1
      ) `;
      params.push(staffId);
    }

    query += `
      GROUP BY r.id, s.shop_name
      ORDER BY r.return_date DESC, r.created_at DESC
    `;

    const result = await pool.query(query, params);

    res.json({
      returns: result.rows,
    });
  } catch (error) {
    console.error("Get returns error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  createReturn,
  getReturns,
};