const pool = require("../config/database");

// CREATE PURCHASE
const createPurchase = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      supplier_id,
      purchase_date,
      items,
      discount = 0,
      notes,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "At least one purchase item is required",
      });
    }

    await client.query("BEGIN");

    // Calculate subtotal
    let subtotal = 0;

    for (const item of items) {
      if (
        !item.product_id ||
        !item.batch_id ||
        !item.quantity ||
        item.unit_cost === undefined
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message:
            "Each item requires product_id, batch_id, quantity and unit_cost",
        });
      }

      subtotal += Number(item.quantity) * Number(item.unit_cost);
    }

    const total_amount = subtotal - Number(discount);

    if (total_amount < 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Discount cannot be greater than subtotal",
      });
    }

    // Generate purchase number
    const sequenceResult = await client.query(
      `
      INSERT INTO document_sequences (document_type, current_value)
      VALUES ('purchase', 1)
      ON CONFLICT (document_type)
      DO UPDATE SET current_value =
        document_sequences.current_value + 1
      RETURNING current_value
      `
    );

    const purchaseNumber = `PUR-${String(
      sequenceResult.rows[0].current_value
    ).padStart(5, "0")}`;

    // Create purchase
    const purchaseResult = await client.query(
      `
      INSERT INTO purchases (
        purchase_number,
        supplier_id,
        purchase_date,
        subtotal,
        discount,
        total_amount,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        purchaseNumber,
        supplier_id || null,
        purchase_date || new Date(),
        subtotal,
        discount,
        total_amount,
        notes || null,
      ]
    );

    const purchase = purchaseResult.rows[0];

    // Add purchase items + stock
    for (const item of items) {
      const lineTotal =
        Number(item.quantity) * Number(item.unit_cost);

      await client.query(
        `
        INSERT INTO purchase_items (
          purchase_id,
          product_id,
          batch_id,
          quantity,
          unit_cost,
          line_total
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          purchase.id,
          item.product_id,
          item.batch_id,
          item.quantity,
          item.unit_cost,
          lineTotal,
        ]
      );

      // Add to godown stock
      const stockResult = await client.query(
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
        RETURNING *
        `,
        [
          item.product_id,
          item.batch_id,
          item.quantity,
        ]
      );

      // Record stock movement
      await client.query(
        `
        INSERT INTO stock_ledger (
          product_id,
          batch_id,
          movement_type,
          quantity_change,
          reference_id,
          notes
        )
        VALUES ($1, $2, 'purchase_in', $3, $4, $5)
        `,
        [
          item.product_id,
          item.batch_id,
          item.quantity,
          purchase.id,
          `Purchase ${purchaseNumber}`,
        ]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Purchase created successfully",
      purchase,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Create purchase error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
};

// GET ALL PURCHASES
const getPurchases = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        p.*,
        s.supplier_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pi.id,
              'product_id', pi.product_id,
              'product_name', pr.product_name,
              'batch_id', pi.batch_id,
              'quantity', pi.quantity,
              'unit_cost', pi.unit_cost,
              'line_total', pi.line_total
            )
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) AS items
      FROM purchases p
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      LEFT JOIN purchase_items pi ON pi.purchase_id = p.id
      LEFT JOIN products pr ON pr.id = pi.product_id
      GROUP BY p.id, s.supplier_name
      ORDER BY p.purchase_date DESC, p.created_at DESC
      `
    );

    res.json({
      purchases: result.rows,
    });
  } catch (error) {
    console.error("Get purchases error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  createPurchase,
  getPurchases,
};