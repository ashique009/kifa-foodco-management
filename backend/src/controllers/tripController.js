const pool = require("../config/database");
const crypto = require("crypto");
const { verifyTripAccess, getStaffIdForUser } = require("../middleware/authorize");

// CREATE TRIP
const createTrip = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      vehicle_id,
      driver_id,
      sales_staff_id,
      trip_date,
      notes,
      items = [],
      shops = [],
    } = req.body;

    if (!vehicle_id || !driver_id || !sales_staff_id) {
      return res.status(400).json({
        message: "Vehicle, driver and sales staff are required",
      });
    }

    await client.query("BEGIN");

    // 1. Check vehicle
    const vehicleResult = await client.query(
      `
      SELECT id, vehicle_number, status
      FROM vehicles
      WHERE id = $1
      FOR UPDATE
      `,
      [vehicle_id]
    );

    if (vehicleResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Vehicle not found",
      });
    }

    if (vehicleResult.rows[0].status !== "available") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Vehicle is not available",
      });
    }

    // 2. Check driver
    const driverResult = await client.query(
      `
      SELECT s.id, s.name, s.is_available, COALESCE(u.is_active, TRUE) AS is_active
      FROM staff s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = $1
      FOR UPDATE OF s
      `,
      [driver_id]
    );

    if (driverResult.rows.length === 0 || !driverResult.rows[0].is_active) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Driver not found",
      });
    }

    if (!driverResult.rows[0].is_available) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Driver is not available",
      });
    }

    // 3. Check sales staff
    const salesStaffResult = await client.query(
      `
      SELECT s.id, s.name, s.is_available, COALESCE(u.is_active, TRUE) AS is_active
      FROM staff s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = $1
      FOR UPDATE OF s
      `,
      [sales_staff_id]
    );

    if (salesStaffResult.rows.length === 0 || !salesStaffResult.rows[0].is_active) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Sales staff not found",
      });
    }

    if (!salesStaffResult.rows[0].is_available) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Sales staff is not available",
      });
    }

    // 4. Validate items and available godown stock
    const validatedItems = [];
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const productId = item.product_id || item.productId;
        const reqQty = Number(item.quantity || item.loadedQty);

        if (!productId) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            message: "Product ID is required for all loaded items",
          });
        }

        if (!Number.isFinite(reqQty) || reqQty <= 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            message: "Quantity must be greater than 0",
          });
        }

        // Fetch product info
        const prodRes = await client.query(
          `SELECT id, product_name, unit FROM products WHERE id = $1`,
          [productId]
        );
        if (prodRes.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({
            message: `Product not found: ${productId}`,
          });
        }
        const prodName = prodRes.rows[0].product_name;

        // Query godown stock rows with lock
        let stockQuery = `
          SELECT gs.id, gs.batch_id, gs.quantity, pb.batch_number
          FROM godown_stock gs
          JOIN product_batches pb ON gs.batch_id = pb.id
          WHERE gs.product_id = $1
        `;
        const stockParams = [productId];

        if (item.batch_id) {
          stockQuery += ` AND gs.batch_id = $2`;
          stockParams.push(item.batch_id);
        }

        stockQuery += ` ORDER BY pb.expiry_date ASC NULLS LAST, pb.created_at ASC FOR UPDATE OF gs`;

        const stockRes = await client.query(stockQuery, stockParams);
        const totalAvailable = stockRes.rows.reduce(
          (sum, row) => sum + Number(row.quantity || 0),
          0
        );

        if (totalAvailable < reqQty) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            message: `Insufficient stock for ${prodName}. Requested: ${reqQty}, Available: ${totalAvailable}`,
            product_id: productId,
            requested_quantity: reqQty,
            available_quantity: totalAvailable,
          });
        }

        validatedItems.push({
          productId,
          productName: prodName,
          quantity: reqQty,
          stockRows: stockRes.rows,
        });
      }
    }

    // 5. Create trip header
    const tripStatus = validatedItems.length > 0 ? "loaded" : "draft";
    const tripResult = await client.query(
      `
      INSERT INTO trips (
        vehicle_id,
        driver_id,
        sales_staff_id,
        trip_date,
        status,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        vehicle_id,
        driver_id,
        sales_staff_id,
        trip_date || new Date(),
        tripStatus,
        notes || null,
      ]
    );

    const trip = tripResult.rows[0];
    const newTripId = trip.id;

    // 6. Deduct godown stock and write to trip_stock & stock_ledger
    for (const vItem of validatedItems) {
      let remainingQty = vItem.quantity;

      for (const stockRow of vItem.stockRows) {
        if (remainingQty <= 0) break;

        const availableInBatch = Number(stockRow.quantity || 0);
        if (availableInBatch <= 0) continue;

        const deductQty = Math.min(remainingQty, availableInBatch);

        // Deduct from godown
        await client.query(
          `
          UPDATE godown_stock
          SET quantity = quantity - $1,
              updated_at = NOW()
          WHERE id = $2
          `,
          [deductQty, stockRow.id]
        );

        // Add to trip stock
        await client.query(
          `
          INSERT INTO trip_stock (
            trip_id,
            product_id,
            batch_id,
            quantity
          )
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (trip_id, product_id, batch_id)
          DO UPDATE SET
            quantity = trip_stock.quantity + EXCLUDED.quantity,
            updated_at = NOW()
          `,
          [newTripId, vItem.productId, stockRow.batch_id, deductQty]
        );

        // Ledger load_out
        await client.query(
          `
          INSERT INTO stock_ledger (
            product_id,
            batch_id,
            movement_type,
            quantity_change,
            godown_stock_id,
            trip_id,
            notes
          )
          VALUES ($1, $2, 'load_out', $3, $4, $5, 'Stock loaded from godown into trip')
          `,
          [vItem.productId, stockRow.batch_id, -deductQty, stockRow.id, newTripId]
        );

        // Ledger load_in
        await client.query(
          `
          INSERT INTO stock_ledger (
            product_id,
            batch_id,
            movement_type,
            quantity_change,
            trip_id,
            notes
          )
          VALUES ($1, $2, 'load_in', $3, $4, 'Stock received into trip')
          `,
          [vItem.productId, stockRow.batch_id, deductQty, newTripId]
        );

        remainingQty -= deductQty;
      }
    }

    // 7. Associate shops
    if (Array.isArray(shops) && shops.length > 0) {
      let visitSeq = 1;
      for (const sh of shops) {
        const shopId = typeof sh === "string" ? sh : sh.shop_id || sh.shopId;
        if (!shopId) continue;

        const shopCheck = await client.query(
          `SELECT id FROM shops WHERE id = $1 AND is_active = TRUE`,
          [shopId]
        );

        if (shopCheck.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({
            message: `Shop not found or inactive: ${shopId}`,
          });
        }

        const order = typeof sh === "object" && sh.visit_order ? sh.visit_order : visitSeq++;
        await client.query(
          `
          INSERT INTO trip_shops (trip_id, shop_id, visit_order)
          VALUES ($1, $2, $3)
          ON CONFLICT (trip_id, shop_id) DO NOTHING
          `,
          [newTripId, shopId, order]
        );
      }
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Trip created successfully",
      trip,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create trip error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
};

// GET ALL TRIPS
const getTrips = async (req, res) => {
  try {
    let query = `
      SELECT
        t.*,
        v.vehicle_number,
        v.vehicle_name,
        d.name AS driver_name,
        s.name AS sales_staff_name
      FROM trips t
      JOIN vehicles v
        ON v.id = t.vehicle_id
      JOIN staff d
        ON d.id = t.driver_id
      JOIN staff s
        ON s.id = t.sales_staff_id
    `;
    const params = [];

    // If caller is STAFF, only return trips where they are driver or sales_staff
    if (req.user && req.user.role !== "admin") {
      const staffId = await getStaffIdForUser(pool, req.user.userId);
      if (!staffId) {
        return res.json({ trips: [] });
      }
      query += ` WHERE t.driver_id = $1 OR t.sales_staff_id = $1 `;
      params.push(staffId);
    }

    query += ` ORDER BY t.trip_date DESC, t.created_at DESC `;

    const result = await pool.query(query, params);

    res.json({
      trips: result.rows,
    });
  } catch (error) {
    console.error("Get trips error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// LOAD STOCK INTO TRIP
const loadStock = async (req, res) => {
  const client = await pool.connect();

  try {
    const { tripId } = req.params;
    const { product_id, batch_id, quantity } = req.body;

    if (!product_id || !batch_id || !quantity) {
      return res.status(400).json({
        message: "Product, batch and quantity are required",
      });
    }

    const loadQuantity = Number(quantity);

    if (!Number.isFinite(loadQuantity) || loadQuantity <= 0) {
      return res.status(400).json({
        message: "Quantity must be greater than 0",
      });
    }

    await client.query("BEGIN");

    // Check trip and authorization
    const access = await verifyTripAccess(tripId, req, client);
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
      [tripId]
    );

    const trip = tripResult.rows[0];

    if (trip.status !== "draft" && trip.status !== "loaded") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Stock can only be loaded while the trip is being prepared",
      });
    }

    // Lock godown stock row
    const stockResult = await client.query(
      `
      SELECT id, quantity
      FROM godown_stock
      WHERE product_id = $1
      AND batch_id = $2
      FOR UPDATE
      `,
      [product_id, batch_id]
    );

    if (stockResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Godown stock not found for this product and batch",
      });
    }

    const godownStock = stockResult.rows[0];

    if (Number(godownStock.quantity) < loadQuantity) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: `Insufficient stock. Available: ${godownStock.quantity}`,
      });
    }

    // Remove from godown
    await client.query(
      `
      UPDATE godown_stock
      SET quantity = quantity - $1,
          updated_at = NOW()
      WHERE id = $2
      `,
      [loadQuantity, godownStock.id]
    );

    // Add to trip stock
    await client.query(
      `
      INSERT INTO trip_stock (
        trip_id,
        product_id,
        batch_id,
        quantity
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (trip_id, product_id, batch_id)
      DO UPDATE SET
        quantity = trip_stock.quantity + EXCLUDED.quantity,
        updated_at = NOW()
      `,
      [
        tripId,
        product_id,
        batch_id,
        loadQuantity,
      ]
    );

    // Godown → Vehicle movement
    await client.query(
      `
      INSERT INTO stock_ledger (
        product_id,
        batch_id,
        movement_type,
        quantity_change,
        godown_stock_id,
        trip_id,
        notes
      )
      VALUES ($1, $2, 'load_out', $3, $4, $5, $6)
      `,
      [
        product_id,
        batch_id,
        -loadQuantity,
        godownStock.id,
        tripId,
        "Stock loaded from godown into trip",
      ]
    );

    // Vehicle received movement
    await client.query(
      `
      INSERT INTO stock_ledger (
        product_id,
        batch_id,
        movement_type,
        quantity_change,
        trip_id,
        notes
      )
      VALUES ($1, $2, 'load_in', $3, $4, $5)
      `,
      [
        product_id,
        batch_id,
        loadQuantity,
        tripId,
        "Stock received into trip",
      ]
    );

    // Update trip status
    await client.query(
      `
      UPDATE trips
      SET status = 'loaded',
          updated_at = NOW()
      WHERE id = $1
      `,
      [tripId]
    );

    await client.query("COMMIT");

    res.status(200).json({
      message: "Stock loaded successfully",
      trip_id: tripId,
      product_id,
      batch_id,
      quantity_loaded: loadQuantity,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Load stock error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
};

// ADD SHOP TO TRIP
const addShopToTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { shop_id, visit_order } = req.body;

    if (!shop_id) {
      return res.status(400).json({
        message: "Shop ID is required",
      });
    }

    // Check trip exists and authorization
    const access = await verifyTripAccess(tripId, req, pool);
    if (!access.authorized) {
      return res.status(access.status).json({ message: access.message });
    }

    const trip = access.trip;

    // Only draft trips can have shops added
    if (
      trip.status !== "draft" &&
      trip.status !== "loaded"
    ) {
      return res.status(400).json({
        message: "Shop can only be added while the trip is being prepared",
      });
    }

    // Check shop exists and is active
    const shopResult = await pool.query(
      `
      SELECT id, shop_name
      FROM shops
      WHERE id = $1
      AND is_active = TRUE
      `,
      [shop_id]
    );

    if (shopResult.rows.length === 0) {
      return res.status(404).json({
        message: "Shop not found or inactive",
      });
    }

    // Add shop to trip
    const result = await pool.query(
      `
      INSERT INTO trip_shops (
        trip_id,
        shop_id,
        visit_order
      )
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [
        tripId,
        shop_id,
        visit_order || null,
      ]
    );

    res.status(201).json({
      message: "Shop added to trip successfully",
      trip_shop: result.rows[0],
    });
  } catch (error) {
    console.error("Add shop to trip error:", error);

    // Duplicate shop in same trip
    if (error.code === "23505") {
      return res.status(409).json({
        message: "Shop is already added to this trip",
      });
    }

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// GET SHOPS ASSIGNED TO A TRIP
const getTripShops = async (req, res) => {
  try {
    const { tripId } = req.params;

    const access = await verifyTripAccess(tripId, req, pool);
    if (!access.authorized) {
      return res.status(access.status).json({ message: access.message });
    }

    const result = await pool.query(
      `
      SELECT
        ts.id,
        ts.trip_id,
        ts.shop_id,
        s.shop_name,
        s.owner_name,
        s.phone,
        s.address,
        ts.visit_order,
        ts.visited_at
      FROM trip_shops ts
      JOIN shops s
        ON s.id = ts.shop_id
      WHERE ts.trip_id = $1
      ORDER BY ts.visit_order ASC NULLS LAST
      `,
      [tripId]
    );

    res.json({
      shops: result.rows,
    });
  } catch (error) {
    console.error("Get trip shops error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// MARK SHOP AS VISITED ON A TRIP
const markShopVisited = async (req, res) => {
  try {
    const { tripId, shopId } = req.params;

    const access = await verifyTripAccess(tripId, req, pool);
    if (!access.authorized) {
      return res.status(access.status).json({ message: access.message });
    }

    const result = await pool.query(
      `
      UPDATE trip_shops
      SET visited_at = NOW()
      WHERE trip_id = $1
      AND shop_id = $2
      RETURNING *
      `,
      [tripId, shopId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Shop not assigned to this trip",
      });
    }

    res.json({
      message: "Shop marked as visited successfully",
      trip_shop: result.rows[0],
    });
  } catch (error) {
    console.error("Mark shop visited error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// GET TRIP STOCK & RECONCILIATION
const getTripStock = async (req, res) => {
  try {
    const { tripId } = req.params;

    // 1. Check trip existence and authorization
    const access = await verifyTripAccess(tripId, req, pool);
    if (!access.authorized) {
      return res.status(access.status).json({ message: access.message });
    }

    const tripStatus = access.trip.status;
    const isTripFinished = tripStatus === "completed" || tripStatus === "cancelled";

    // 2. Query aggregated metrics per product for this trip
    const result = await pool.query(
      `
      SELECT
        p.id AS product_id,
        p.product_name,
        p.sku,
        p.unit,
        p.selling_price AS unit_price,
        COALESCE(loaded.qty, 0)::numeric AS loaded_quantity,
        COALESCE(sold.qty, 0)::numeric AS sold_quantity,
        COALESCE(ret.qty, 0)::numeric AS returned_quantity,
        COALESCE(unloaded.qty, 0)::numeric AS unloaded_quantity,
        COALESCE(damaged.qty, ts.damaged_qty, 0)::numeric AS damaged_quantity,
        COALESCE(ts.current_qty, 0)::numeric AS current_quantity,
        ts.batch_id,
        ts.batch_number
      FROM (
        SELECT DISTINCT product_id FROM trip_stock WHERE trip_id = $1
        UNION
        SELECT DISTINCT product_id FROM stock_ledger WHERE trip_id = $1
        UNION
        SELECT DISTINCT si.product_id FROM sale_items si JOIN sales s ON s.id = si.sale_id WHERE s.trip_id = $1
        UNION
        SELECT DISTINCT ri.product_id FROM return_items ri JOIN returns r ON r.id = ri.return_id WHERE r.trip_id = $1
      ) tp
      JOIN products p ON p.id = tp.product_id
      LEFT JOIN (
        SELECT product_id, SUM(quantity_change) AS qty
        FROM stock_ledger
        WHERE trip_id = $1 AND movement_type = 'load_in'
        GROUP BY product_id
      ) loaded ON loaded.product_id = p.id
      LEFT JOIN (
        SELECT si.product_id, SUM(si.quantity) AS qty
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        WHERE s.trip_id = $1
        GROUP BY si.product_id
      ) sold ON sold.product_id = p.id
      LEFT JOIN (
        SELECT ri.product_id, SUM(ri.quantity) AS qty
        FROM return_items ri
        JOIN returns r ON r.id = ri.return_id
        WHERE r.trip_id = $1 AND r.reason = 'shop_return'
        GROUP BY ri.product_id
      ) ret ON ret.product_id = p.id
      LEFT JOIN (
        SELECT product_id, SUM(ABS(quantity_change)) AS qty
        FROM stock_ledger
        WHERE trip_id = $1 AND movement_type = 'damage_out'
        GROUP BY product_id
      ) damaged ON damaged.product_id = p.id
      LEFT JOIN (
        SELECT product_id, SUM(ABS(quantity_change)) AS qty
        FROM stock_ledger
        WHERE trip_id = $1 AND movement_type = 'unload_out'
        GROUP BY product_id
      ) unloaded ON unloaded.product_id = p.id
      LEFT JOIN (
        SELECT DISTINCT ON (ts_inner.product_id)
          ts_inner.product_id,
          ts_inner.batch_id,
          pb.batch_number,
          SUM(ts_inner.quantity) OVER (PARTITION BY ts_inner.product_id) AS current_qty,
          SUM(ts_inner.damaged_quantity) OVER (PARTITION BY ts_inner.product_id) AS damaged_qty
        FROM trip_stock ts_inner
        LEFT JOIN product_batches pb ON pb.id = ts_inner.batch_id
        WHERE ts_inner.trip_id = $1
        ORDER BY ts_inner.product_id, ts_inner.quantity DESC
      ) ts ON ts.product_id = p.id
      ORDER BY p.product_name ASC
      `,
      [tripId]
    );

    const stock = result.rows.map((row) => {
      let loadedQty = Number(row.loaded_quantity || 0);
      const soldQty = Number(row.sold_quantity || 0);
      const returnedQty = Number(row.returned_quantity || 0);
      const unloadedQty = Number(row.unloaded_quantity || 0);
      const damagedQty = Number(row.damaged_quantity || 0);
      const currentQty = Number(row.current_quantity || 0);

      // Fallback: If stock_ledger load_in was not recorded (e.g. manual insertion),
      // compute loaded as currentQty + soldQty + damagedQty - returnedQty + unloadedQty
      if (loadedQty === 0 && (currentQty > 0 || soldQty > 0 || damagedQty > 0 || unloadedQty > 0)) {
        loadedQty = Math.max(0, currentQty + soldQty + damagedQty - returnedQty + unloadedQty);
      }

      // Balance in van:
      // If trip is completed/cancelled, remaining stock was returned to godown -> balance is 0.
      // Otherwise: Loaded - Sold - Damaged + Returned
      const vanBalance = isTripFinished
        ? 0
        : Math.max(0, loadedQty - soldQty - damagedQty + returnedQty);

      return {
        id: row.product_id,
        trip_id: tripId,
        product_id: row.product_id,
        product_name: row.product_name,
        sku: row.sku,
        unit: row.unit || "packet",
        unit_price: Number(row.unit_price || 30),
        batch_id: row.batch_id,
        batch_number: row.batch_number,
        loaded_quantity: loadedQty,
        sold_quantity: soldQty,
        damaged_quantity: damagedQty,
        returned_quantity: returnedQty,
        unloaded_quantity: unloadedQty,
        van_balance: vanBalance,
        quantity: isTripFinished ? 0 : vanBalance, // backward compatibility for consumers checking st.quantity
      };
    });

    res.json({
      stock,
    });
  } catch (error) {
    console.error("Get trip stock error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// RECONCILE AND COMPLETE TRIP
const reconcileTrip = async (req, res) => {
  const client = await pool.connect();

  try {
    const { tripId } = req.params;

    await client.query("BEGIN");

    // Check trip and authorization
    const access = await verifyTripAccess(tripId, req, client);
    if (!access.authorized) {
      await client.query("ROLLBACK");
      return res.status(access.status).json({ message: access.message });
    }

    // Lock trip
    const tripResult = await client.query(
      `
      SELECT
        id,
        vehicle_id,
        driver_id,
        sales_staff_id,
        status
      FROM trips
      WHERE id = $1
      FOR UPDATE
      `,
      [tripId]
    );

    const trip = tripResult.rows[0];

    if (!["loaded", "in_progress"].includes(trip.status)) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          "Only loaded or in-progress trips can be reconciled",
      });
    }

    // Lock vehicle
    await client.query(
      `
      SELECT id
      FROM vehicles
      WHERE id = $1
      FOR UPDATE
      `,
      [trip.vehicle_id]
    );

    // Get all remaining trip stock
    const stockResult = await client.query(
      `
      SELECT
        id,
        product_id,
        batch_id,
        quantity
      FROM trip_stock
      WHERE trip_id = $1
      AND quantity > 0
      FOR UPDATE
      `,
      [tripId]
    );

    let totalReturnedToGodown = 0;
    const reconciledItems = [];

    for (const stock of stockResult.rows) {
      const quantity = Number(stock.quantity);

      if (quantity <= 0) {
        continue;
      }

      const transferId = crypto.randomUUID();

      // Add stock back to godown
      await client.query(
        `
        INSERT INTO godown_stock (
          product_id,
          batch_id,
          quantity
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (product_id, batch_id)
        DO UPDATE SET
          quantity = godown_stock.quantity + EXCLUDED.quantity,
          updated_at = NOW()
        `,
        [
          stock.product_id,
          stock.batch_id,
          quantity,
        ]
      );

      // Remove stock from trip
      await client.query(
        `
        UPDATE trip_stock
        SET quantity = 0,
            updated_at = NOW()
        WHERE id = $1
        `,
        [stock.id]
      );

      // Trip -> Godown
      await client.query(
        `
        INSERT INTO stock_ledger (
          product_id,
          batch_id,
          movement_type,
          quantity_change,
          trip_id,
          transfer_id,
          notes
        )
        VALUES (
          $1,
          $2,
          'unload_out',
          $3,
          $4,
          $5,
          $6
        )
        `,
        [
          stock.product_id,
          stock.batch_id,
          -quantity,
          tripId,
          transferId,
          "Stock returned from trip to godown",
        ]
      );

      // Godown receives stock
      await client.query(
        `
        INSERT INTO stock_ledger (
          product_id,
          batch_id,
          movement_type,
          quantity_change,
          trip_id,
          transfer_id,
          notes
        )
        VALUES (
          $1,
          $2,
          'unload_in',
          $3,
          $4,
          $5,
          $6
        )
        `,
        [
          stock.product_id,
          stock.batch_id,
          quantity,
          tripId,
          transferId,
          "Stock received back into godown",
        ]
      );

      totalReturnedToGodown += quantity;

      reconciledItems.push({
        product_id: stock.product_id,
        batch_id: stock.batch_id,
        quantity_returned: quantity,
        transfer_id: transferId,
      });
    }

    // Complete trip
    await client.query(
      `
      UPDATE trips
      SET status = 'completed',
          completed_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      `,
      [tripId]
    );

    // Vehicle becomes available
    await client.query(
      `
      UPDATE vehicles
      SET status = 'available',
          updated_at = NOW()
      WHERE id = $1
      `,
      [trip.vehicle_id]
    );

    // Staff become available again
    if (trip.driver_id) {
      await client.query(
        `
        UPDATE staff
        SET is_available = TRUE,
            updated_at = NOW()
        WHERE id = $1
        `,
        [trip.driver_id]
      );
    }

    if (trip.sales_staff_id) {
      await client.query(
        `
        UPDATE staff
        SET is_available = TRUE,
            updated_at = NOW()
        WHERE id = $1
        `,
        [trip.sales_staff_id]
      );
    }

    await client.query("COMMIT");

    res.status(200).json({
      message: "Trip reconciled and completed successfully",
      trip_id: tripId,
      total_returned_to_godown: totalReturnedToGodown,
      items: reconciledItems,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Reconcile trip error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
};

// START TRIP (only loaded -> in_progress)
const startTrip = async (req, res) => {
  const client = await pool.connect();

  try {
    const { tripId } = req.params;

    await client.query("BEGIN");

    // Check trip and authorization
    const access = await verifyTripAccess(tripId, req, client);
    if (!access.authorized) {
      await client.query("ROLLBACK");
      return res.status(access.status).json({ message: access.message });
    }

    // Lock trip row
    const tripRes = await client.query(
      `SELECT id, vehicle_id, status FROM trips WHERE id = $1 FOR UPDATE`,
      [tripId]
    );

    const trip = tripRes.rows[0];

    // Strictly enforce: only loaded -> in_progress allowed
    if (trip.status !== "loaded") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Cannot start trip with status '${trip.status}'. Only loaded trips can be started.`,
        current_status: trip.status,
      });
    }

    const result = await client.query(
      `
      UPDATE trips
      SET status = 'in_progress',
          started_at = COALESCE(started_at, NOW()),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [tripId]
    );

    const updatedTrip = result.rows[0];

    if (updatedTrip.vehicle_id) {
      await client.query(
        `
        UPDATE vehicles
        SET status = 'on_trip',
            updated_at = NOW()
        WHERE id = $1
        `,
        [updatedTrip.vehicle_id]
      );
    }

    await client.query("COMMIT");

    res.json({
      message: "Trip started successfully",
      trip: updatedTrip,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Start trip error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
};

// RECORD TRANSIT DAMAGE
const recordTransitDamage = async (req, res) => {
  const { tripId } = req.params;
  const { product_id, batch_id, notes } = req.body;
  const quantity = Number(req.body.quantity);

  const idempotencyKey =
    req.headers["idempotency-key"] || req.body.idempotency_key;

  // Basic validation
  if (!product_id) {
    return res.status(400).json({
      message: "Product ID is required",
    });
  }

  if (isNaN(quantity) || quantity <= 0) {
    return res.status(400).json({
      message: "Quantity must be a positive number greater than 0",
    });
  }

  // Fast-path idempotency check before opening transaction
  if (idempotencyKey) {
    try {
      const existingLedger = await pool.query(
        `SELECT sl.*, p.product_name 
         FROM stock_ledger sl
         JOIN products p ON p.id = sl.product_id
         WHERE sl.idempotency_key = $1`,
        [idempotencyKey]
      );
      if (existingLedger.rows.length > 0) {
        return res.status(200).json({
          message: "Transit damage already processed",
          is_duplicate: true,
          damage: existingLedger.rows[0],
        });
      }
    } catch (checkErr) {
      console.error("Fast-path damage idempotency check error:", checkErr);
    }
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Concurrency lock on idempotency key
    if (idempotencyKey) {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        idempotencyKey,
      ]);

      const existingUnderLock = await client.query(
        `SELECT sl.*, p.product_name 
         FROM stock_ledger sl
         JOIN products p ON p.id = sl.product_id
         WHERE sl.idempotency_key = $1`,
        [idempotencyKey]
      );

      if (existingUnderLock.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(200).json({
          message: "Transit damage already processed",
          is_duplicate: true,
          damage: existingUnderLock.rows[0],
        });
      }
    }

    // 1. Lock trip, verify authorization and status
    const access = await verifyTripAccess(tripId, req, client);
    if (!access.authorized) {
      await client.query("ROLLBACK");
      return res.status(access.status).json({ message: access.message });
    }

    const tripRes = await client.query(
      `SELECT id, status FROM trips WHERE id = $1 FOR UPDATE`,
      [tripId]
    );

    const trip = tripRes.rows[0];
    if (trip.status !== "in_progress") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Only active in-progress trips can record damage (current trip status: '${trip.status}')`,
        current_status: trip.status,
      });
    }

    // 2. Query and lock trip_stock
    let stockQuery = `
      SELECT id, product_id, batch_id, quantity, damaged_quantity
      FROM trip_stock
      WHERE trip_id = $1 AND product_id = $2
    `;
    const params = [tripId, product_id];

    if (batch_id) {
      stockQuery += ` AND batch_id = $3`;
      params.push(batch_id);
    } else {
      stockQuery += ` ORDER BY quantity DESC LIMIT 1`;
    }
    stockQuery += ` FOR UPDATE`;

    const stockRes = await client.query(stockQuery, params);

    if (stockRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Product/batch does not belong to this trip",
      });
    }

    const stockRow = stockRes.rows[0];
    const availableStock = Number(stockRow.quantity || 0);

    if (quantity > availableStock) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Quantity exceeds current available vehicle stock. Available: ${availableStock}, Requested: ${quantity}`,
        available_quantity: availableStock,
        requested_quantity: quantity,
      });
    }

    // 3. Deduct quantity from trip_stock.quantity and increment trip_stock.damaged_quantity
    const updatedStockRes = await client.query(
      `
      UPDATE trip_stock
      SET quantity = quantity - $1,
          damaged_quantity = damaged_quantity + $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
      `,
      [quantity, stockRow.id]
    );

    // 4. Create stock_ledger damage_out entry with negative quantity
    const ledgerRes = await client.query(
      `
      INSERT INTO stock_ledger (
        product_id,
        batch_id,
        movement_type,
        quantity_change,
        trip_id,
        idempotency_key,
        notes
      )
      VALUES (
        $1,
        $2,
        'damage_out',
        $3,
        $4,
        $5,
        $6
      )
      RETURNING *
      `,
      [
        product_id,
        stockRow.batch_id,
        -quantity,
        tripId,
        idempotencyKey || null,
        notes || "Transit damaged product recorded",
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Transit damage recorded successfully",
      damage: {
        product_id,
        batch_id: stockRow.batch_id,
        quantity,
        damaged_quantity: Number(updatedStockRes.rows[0].damaged_quantity),
        remaining_quantity: Number(updatedStockRes.rows[0].quantity),
        notes: notes || null,
        ledger_entry: ledgerRes.rows[0],
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    // Catch duplicate idempotency key race condition gracefully (Postgres unique violation 23505)
    if (error.code === "23505" && idempotencyKey) {
      try {
        const existingLedger = await pool.query(
          `SELECT sl.*, p.product_name 
           FROM stock_ledger sl
           JOIN products p ON p.id = sl.product_id
           WHERE sl.idempotency_key = $1`,
          [idempotencyKey]
        );
        if (existingLedger.rows.length > 0) {
          return res.status(200).json({
            message: "Transit damage already processed",
            is_duplicate: true,
            damage: existingLedger.rows[0],
          });
        }
      } catch (innerErr) {
        console.error("Duplicate key recovery failed:", innerErr);
      }
    }

    console.error("Record transit damage error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
};

module.exports = {
  createTrip,
  getTrips,
  loadStock,
  addShopToTrip,
  getTripShops,
  markShopVisited,
  getTripStock,
  reconcileTrip,
  startTrip,
  recordTransitDamage,
};