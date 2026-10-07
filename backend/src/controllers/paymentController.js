const pool = require("../config/database");
const {
  hasBusinessAccess,
  verifyTripAccess,
  getStaffIdForUser,
} = require("../middleware/authorize");

// Helper to check if trip_id column exists on payments table
let hasTripIdColumnCache = null;
const checkTripIdColumn = async (clientOrPool) => {
  if (hasTripIdColumnCache !== null) return hasTripIdColumnCache;
  try {
    const db = clientOrPool || pool;
    const res = await db.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'trip_id' LIMIT 1`
    );
    hasTripIdColumnCache = res.rows.length > 0;
  } catch {
    hasTripIdColumnCache = false;
  }
  return hasTripIdColumnCache;
};

// CREATE PAYMENT
const createPayment = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      shop_id,
      sale_id,
      trip_id,
      payment_method,
      amount,
      payment_date,
      reference_number,
      notes,
    } = req.body;

    if (!shop_id || !payment_method || amount === undefined) {
      return res.status(400).json({
        message: "Shop ID, payment method and amount are required",
      });
    }

    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        message: "Payment amount must be greater than 0",
      });
    }

    const allowedMethods = [
      "cash",
      "upi",
      "card",
      "bank_transfer",
    ];

    if (!allowedMethods.includes(payment_method)) {
      return res.status(400).json({
        message: "Invalid payment method",
      });
    }

    const idempotencyKey =
      req.headers["idempotency-key"] ||
      req.body.idempotency_key ||
      null;

    const isBusiness = req.user && hasBusinessAccess(req.user);
    const staffId = !isBusiness ? await getStaffIdForUser(pool, req.user?.userId) : null;

    if (!isBusiness && !staffId) {
      return res.status(403).json({
        message: "No staff profile linked to this user",
      });
    }

    // 1. Resolve and validate consistency of sale_id, shop_id, and trip_id
    let resolvedTripId = trip_id || null;

    if (sale_id) {
      const saleCheck = await pool.query(
        `SELECT id, shop_id, trip_id FROM sales WHERE id = $1`,
        [sale_id]
      );
      if (saleCheck.rows.length === 0) {
        return res.status(404).json({ message: "Sale not found" });
      }
      const saleRow = saleCheck.rows[0];
      if (saleRow.shop_id !== shop_id) {
        return res.status(400).json({ message: "Payment shop does not match sale shop" });
      }
      if (trip_id && saleRow.trip_id && trip_id !== saleRow.trip_id) {
        return res.status(400).json({ message: "Payment trip does not match sale trip" });
      }
      if (!resolvedTripId && saleRow.trip_id) {
        resolvedTripId = saleRow.trip_id;
      }
    }

    // 2. Validate trip authorization and shop assignment
    if (resolvedTripId) {
      if (!isBusiness) {
        const access = await verifyTripAccess(resolvedTripId, req, pool);
        if (!access.authorized) {
          return res.status(access.status).json({ message: access.message });
        }
      } else {
        const tripExists = await pool.query(`SELECT id FROM trips WHERE id = $1`, [resolvedTripId]);
        if (tripExists.rows.length === 0) {
          return res.status(404).json({ message: "Trip not found" });
        }
      }

      // Verify that shop is assigned to this trip
      const shopTripCheck = await pool.query(
        `SELECT id FROM trip_shops WHERE trip_id = $1 AND shop_id = $2 LIMIT 1`,
        [resolvedTripId, shop_id]
      );
      if (shopTripCheck.rows.length === 0) {
        return res.status(400).json({ message: "Shop is not assigned to this trip" });
      }
    } else if (!isBusiness) {
      // Driver/Sales Staff recording payment without explicit trip_id or sale_id:
      // Derive their active trip serving this shop
      const activeTripCheck = await pool.query(
        `SELECT t.id 
         FROM trip_shops ts
         JOIN trips t ON t.id = ts.trip_id
         WHERE ts.shop_id = $1 
           AND (t.driver_id = $2 OR t.sales_staff_id = $2)
           AND t.status IN ('loaded', 'in_progress')
         ORDER BY t.trip_date DESC, t.created_at DESC
         LIMIT 1`,
        [shop_id, staffId]
      );
      if (activeTripCheck.rows.length > 0) {
        resolvedTripId = activeTripCheck.rows[0].id;
      } else {
        return res.status(403).json({
          message: "A valid assigned trip is required to record payments for this shop",
        });
      }
    }

    // Fast-path idempotency check before transaction
    if (idempotencyKey) {
      const existingPaymentRes = await pool.query(
        `SELECT * FROM payments WHERE idempotency_key = $1`,
        [idempotencyKey]
      );

      if (existingPaymentRes.rows.length > 0) {
        const existingPayment = existingPaymentRes.rows[0];
        const balRes = await pool.query(
          `SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) AS balance
           FROM shop_ledger_entries WHERE shop_id = $1`,
          [existingPayment.shop_id]
        );
        return res.status(200).json({
          message: "Payment already processed",
          payment: {
            ...existingPayment,
            trip_id: existingPayment.trip_id || resolvedTripId || null,
          },
          outstanding_balance: Number(balRes.rows[0].balance),
          is_duplicate: true,
        });
      }
    }

    await client.query("BEGIN");

    // Check shop and lock the row to serialize concurrent payment requests per shop
    const shopResult = await client.query(
      `
      SELECT id, shop_name
      FROM shops
      WHERE id = $1
      AND is_active = TRUE
      FOR UPDATE
      `,
      [shop_id]
    );

    if (shopResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Shop not found or inactive",
      });
    }

    // In-transaction idempotency check under the shop lock
    if (idempotencyKey) {
      const existingInTxRes = await client.query(
        `SELECT * FROM payments WHERE idempotency_key = $1`,
        [idempotencyKey]
      );

      if (existingInTxRes.rows.length > 0) {
        await client.query("ROLLBACK");
        const existingPayment = existingInTxRes.rows[0];
        const balRes = await pool.query(
          `SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) AS balance
           FROM shop_ledger_entries WHERE shop_id = $1`,
          [existingPayment.shop_id]
        );
        return res.status(200).json({
          message: "Payment already processed",
          payment: {
            ...existingPayment,
            trip_id: existingPayment.trip_id || resolvedTripId || null,
          },
          outstanding_balance: Number(balRes.rows[0].balance),
          is_duplicate: true,
        });
      }
    }

    // Get current shop balance under row-lock
    const balanceResult = await client.query(
      `
      SELECT
        COALESCE(SUM(debit), 0) -
        COALESCE(SUM(credit), 0) AS balance
      FROM shop_ledger_entries
      WHERE shop_id = $1
      `,
      [shop_id]
    );

    const currentBalance = Number(balanceResult.rows[0].balance);

    if (paymentAmount > currentBalance) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: `Payment cannot exceed outstanding balance of ₹${currentBalance.toFixed(
          2
        )}`,
      });
    }

    const newBalance = currentBalance - paymentAmount;

    // Generate receipt number from document_sequences and receipt_prefix
    const seqResult = await client.query(
      `
      INSERT INTO document_sequences (document_type, current_value)
      VALUES ('payment', 1)
      ON CONFLICT (document_type)
      DO UPDATE SET
        current_value = document_sequences.current_value + 1
      RETURNING current_value
      `
    );

    const settingsRes = await client.query(
      `SELECT receipt_prefix FROM business_settings WHERE id = 'default' LIMIT 1`
    );
    const receiptPrefix = settingsRes.rows[0]?.receipt_prefix || "REC-";

    const receiptNumber = `${receiptPrefix}${String(
      seqResult.rows[0].current_value
    ).padStart(5, "0")}`;

    // Create payment with idempotency key, persistent receipt_number, and trip_id
    const tripColExists = await checkTripIdColumn(client);
    let paymentResult;

    if (tripColExists) {
      paymentResult = await client.query(
        `
        INSERT INTO payments (
          receipt_number,
          shop_id,
          sale_id,
          trip_id,
          payment_method,
          amount,
          payment_date,
          reference_number,
          notes,
          idempotency_key
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
        `,
        [
          receiptNumber,
          shop_id,
          sale_id || null,
          resolvedTripId || null,
          payment_method,
          paymentAmount,
          payment_date || new Date(),
          reference_number || null,
          notes || null,
          idempotencyKey || null,
        ]
      );
    } else {
      paymentResult = await client.query(
        `
        INSERT INTO payments (
          receipt_number,
          shop_id,
          sale_id,
          payment_method,
          amount,
          payment_date,
          reference_number,
          notes,
          idempotency_key
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
        `,
        [
          receiptNumber,
          shop_id,
          sale_id || null,
          payment_method,
          paymentAmount,
          payment_date || new Date(),
          reference_number || null,
          notes || null,
          idempotencyKey || null,
        ]
      );
    }

    const payment = {
      ...paymentResult.rows[0],
      trip_id: paymentResult.rows[0].trip_id || resolvedTripId || null,
    };

    // Add payment to shop ledger
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
        'payment',
        $2,
        0,
        $3,
        $4,
        $5,
        $6
      )
      `,
      [
        shop_id,
        sale_id || null,
        paymentAmount,
        newBalance,
        payment.id,
        `Payment received via ${payment_method}`,
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Payment created successfully",
      payment,
      outstanding_balance: newBalance,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    // Handle duplicate idempotency key race condition gracefully
    if (error.code === "23505" && idempotencyKey) {
      try {
        const existingPaymentRes = await pool.query(
          `SELECT * FROM payments WHERE idempotency_key = $1`,
          [idempotencyKey]
        );
        if (existingPaymentRes.rows.length > 0) {
          const existingPayment = existingPaymentRes.rows[0];
          const balRes = await pool.query(
            `SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) AS balance
             FROM shop_ledger_entries WHERE shop_id = $1`,
            [existingPayment.shop_id]
          );
          return res.status(200).json({
            message: "Payment already processed",
            payment: {
              ...existingPayment,
              trip_id: existingPayment.trip_id || resolvedTripId || null,
            },
            outstanding_balance: Number(balRes.rows[0].balance),
            is_duplicate: true,
          });
        }
      } catch (findErr) {
        console.error("Error retrieving existing idempotent payment:", findErr);
      }
    }

    console.error("Create payment error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
};

// GET ALL PAYMENTS
const getPayments = async (req, res) => {
  try {
    const { trip_id } = req.query;
    const isBusiness = req.user && hasBusinessAccess(req.user);
    const tripColExists = await checkTripIdColumn(pool);

    // Case 1: Specific trip_id requested via query parameter
    if (trip_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(trip_id)) {
        return res.status(400).json({ message: "Invalid trip ID format" });
      }

      // Backend trip authorization check
      if (!isBusiness) {
        const access = await verifyTripAccess(trip_id, req, pool);
        if (!access.authorized) {
          return res.status(access.status).json({ message: access.message });
        }
      } else {
        const tripCheck = await pool.query(`SELECT id FROM trips WHERE id = $1`, [trip_id]);
        if (tripCheck.rows.length === 0) {
          return res.status(404).json({ message: "Trip not found" });
        }
      }

      let query;
      if (tripColExists) {
        query = `
          SELECT
            p.*,
            sh.shop_name,
            COALESCE(p.trip_id, s.trip_id) AS trip_id
          FROM payments p
          JOIN shops sh ON sh.id = p.shop_id
          LEFT JOIN sales s ON s.id = p.sale_id
          WHERE (p.trip_id = $1 OR (p.trip_id IS NULL AND s.trip_id = $1))
          ORDER BY p.payment_date DESC, p.created_at DESC
        `;
      } else {
        query = `
          SELECT
            p.*,
            sh.shop_name,
            s.trip_id
          FROM payments p
          JOIN shops sh ON sh.id = p.shop_id
          JOIN sales s ON s.id = p.sale_id
          WHERE s.trip_id = $1
          ORDER BY p.payment_date DESC, p.created_at DESC
        `;
      }

      const result = await pool.query(query, [trip_id]);
      return res.json({ payments: result.rows });
    }

    // Case 2: Unrestricted company-wide listing for Admin and Manager
    if (isBusiness) {
      let query;
      if (tripColExists) {
        query = `
          SELECT
            p.*,
            sh.shop_name,
            COALESCE(p.trip_id, s.trip_id) AS trip_id
          FROM payments p
          JOIN shops sh ON sh.id = p.shop_id
          LEFT JOIN sales s ON s.id = p.sale_id
          ORDER BY p.payment_date DESC, p.created_at DESC
        `;
      } else {
        query = `
          SELECT
            p.*,
            sh.shop_name,
            s.trip_id
          FROM payments p
          JOIN shops sh ON sh.id = p.shop_id
          LEFT JOIN sales s ON s.id = p.sale_id
          ORDER BY p.payment_date DESC, p.created_at DESC
        `;
      }
      const result = await pool.query(query);
      return res.json({ payments: result.rows });
    }

    // Case 3: Driver and Sales Staff - strictly scoped to their assigned trips
    const staffId = await getStaffIdForUser(pool, req.user?.userId);
    if (!staffId) {
      return res.json({ payments: [] });
    }

    let query;
    if (tripColExists) {
      query = `
        SELECT
          p.*,
          sh.shop_name,
          COALESCE(p.trip_id, s.trip_id) AS trip_id
        FROM payments p
        JOIN shops sh ON sh.id = p.shop_id
        LEFT JOIN sales s ON s.id = p.sale_id
        WHERE (
          p.trip_id IN (
            SELECT id FROM trips WHERE driver_id = $1 OR sales_staff_id = $1
          )
          OR (
            p.trip_id IS NULL AND s.trip_id IN (
              SELECT id FROM trips WHERE driver_id = $1 OR sales_staff_id = $1
            )
          )
        )
        ORDER BY p.payment_date DESC, p.created_at DESC
      `;
    } else {
      query = `
        SELECT
          p.*,
          sh.shop_name,
          s.trip_id
        FROM payments p
        JOIN shops sh ON sh.id = p.shop_id
        JOIN sales s ON s.id = p.sale_id
        WHERE s.trip_id IN (
          SELECT id FROM trips WHERE driver_id = $1 OR sales_staff_id = $1
        )
        ORDER BY p.payment_date DESC, p.created_at DESC
      `;
    }

    const result = await pool.query(query, [staffId]);
    return res.json({ payments: result.rows });
  } catch (error) {
    console.error("Get payments error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  createPayment,
  getPayments,
};