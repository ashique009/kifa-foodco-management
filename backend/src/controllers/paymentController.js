const pool = require("../config/database");
const { getStaffIdForUser } = require("../middleware/authorize");

// CREATE PAYMENT
const createPayment = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      shop_id,
      sale_id,
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

    // Role check: If STAFF, check that shop belongs to at least one assigned trip
    if (req.user && req.user.role !== "admin") {
      const staffId = await getStaffIdForUser(pool, req.user.userId);
      if (!staffId) {
        return res.status(403).json({
          message: "No staff profile linked to this user",
        });
      }

      const assignedCheck = await pool.query(
        `SELECT ts.id 
         FROM trip_shops ts
         JOIN trips t ON t.id = ts.trip_id
         WHERE ts.shop_id = $1 AND (t.driver_id = $2 OR t.sales_staff_id = $2)
         LIMIT 1`,
        [shop_id, staffId]
      );

      if (assignedCheck.rows.length === 0) {
        return res.status(403).json({
          message: "You are not assigned to any trips serving this shop",
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
          payment: existingPayment,
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
          payment: existingPayment,
          outstanding_balance: Number(balRes.rows[0].balance),
          is_duplicate: true,
        });
      }
    }

    // If payment is linked to a sale, verify the sale
    if (sale_id) {
      const saleResult = await client.query(
        `
        SELECT id, shop_id, total_amount
        FROM sales
        WHERE id = $1
        `,
        [sale_id]
      );

      if (saleResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          message: "Sale not found",
        });
      }

      if (saleResult.rows[0].shop_id !== shop_id) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: "Payment shop does not match sale shop",
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

    // Create payment with idempotency key
    const paymentResult = await client.query(
      `
      INSERT INTO payments (
        shop_id,
        sale_id,
        payment_method,
        amount,
        payment_date,
        reference_number,
        notes,
        idempotency_key
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
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

    const payment = paymentResult.rows[0];

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
            payment: existingPayment,
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
    let query = `
      SELECT
        p.*,
        sh.shop_name
      FROM payments p
      JOIN shops sh ON sh.id = p.shop_id
    `;
    const params = [];

    // If caller is STAFF, only return payments for shops assigned to their trips
    if (req.user && req.user.role !== "admin") {
      const staffId = await getStaffIdForUser(pool, req.user.userId);
      if (!staffId) {
        return res.json({ payments: [] });
      }
      query += ` WHERE p.shop_id IN (
        SELECT ts.shop_id
        FROM trip_shops ts
        JOIN trips t ON t.id = ts.trip_id
        WHERE t.driver_id = $1 OR t.sales_staff_id = $1
      ) `;
      params.push(staffId);
    }

    query += ` ORDER BY p.payment_date DESC, p.created_at DESC `;

    const result = await pool.query(query, params);

    res.json({
      payments: result.rows,
    });
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