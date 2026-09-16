const pool = require("../config/database");

// CREATE BATCH
const createBatch = async (req, res) => {
  try {
    const {
      product_id,
      batch_number,
      production_date,
      expiry_date,
      purchase_price,
    } = req.body;

    if (!product_id || !batch_number) {
      return res.status(400).json({
        message: "Product ID and batch number are required",
      });
    }

    const productResult = await pool.query(
      `
      SELECT id
      FROM products
      WHERE id = $1
      AND is_active = TRUE
      `,
      [product_id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO product_batches (
        product_id,
        batch_number,
        production_date,
        expiry_date,
        purchase_price
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        product_id,
        batch_number,
        production_date || null,
        expiry_date || null,
        purchase_price || 0,
      ]
    );

    res.status(201).json({
      message: "Batch created successfully",
      batch: result.rows[0],
    });
  } catch (error) {
    console.error("Create batch error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "This batch already exists for this product",
      });
    }

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// GET ALL BATCHES
const getBatches = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        pb.*,
        p.product_name,
        p.sku
      FROM product_batches pb
      JOIN products p
        ON p.id = pb.product_id
      ORDER BY pb.created_at DESC
      `
    );

    res.json({
      batches: result.rows,
    });
  } catch (error) {
    console.error("Get batches error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// GET BATCHES FOR ONE PRODUCT
const getBatchesByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM product_batches
      WHERE product_id = $1
      ORDER BY expiry_date ASC NULLS LAST
      `,
      [productId]
    );

    res.json({
      batches: result.rows,
    });
  } catch (error) {
    console.error("Get product batches error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  createBatch,
  getBatches,
  getBatchesByProduct,
};

