const pool = require("../config/database");

// CREATE PRODUCT
const createProduct = async (req, res) => {
  try {
    const {
      product_name,
      sku,
      unit,
      purchase_price,
      selling_price,
      category,
    } = req.body;

    if (!product_name || !unit) {
      return res.status(400).json({
        message: "Product name and unit are required",
      });
    }

    if (purchase_price !== undefined && Number(purchase_price) < 0) {
      return res.status(400).json({
        message: "Purchase price must be greater than or equal to 0",
      });
    }

    if (selling_price !== undefined && Number(selling_price) < 0) {
      return res.status(400).json({
        message: "Selling price must be greater than or equal to 0",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO products (
        product_name,
        sku,
        unit,
        purchase_price,
        selling_price,
        category
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        product_name,
        sku || null,
        unit,
        purchase_price || 0,
        selling_price || 0,
        category || 'General',
      ]
    );

    res.status(201).json({
      message: "Product created successfully",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Create product error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "SKU already exists",
      });
    }

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// GET ALL PRODUCTS
const getProducts = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM products
      ORDER BY created_at DESC
      `
    );

    res.json({
      products: result.rows,
    });
  } catch (error) {
    console.error("Get products error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// GET ONE PRODUCT
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM products
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json({
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Get product error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// UPDATE PRODUCT
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      product_name,
      sku,
      unit,
      purchase_price,
      selling_price,
      is_active,
      category,
    } = req.body;

    if (purchase_price !== undefined && Number(purchase_price) < 0) {
      return res.status(400).json({
        message: "Purchase price must be greater than or equal to 0",
      });
    }

    if (selling_price !== undefined && Number(selling_price) < 0) {
      return res.status(400).json({
        message: "Selling price must be greater than or equal to 0",
      });
    }

    const result = await pool.query(
      `
      UPDATE products
      SET
        product_name = COALESCE($1, product_name),
        sku = COALESCE($2, sku),
        unit = COALESCE($3, unit),
        purchase_price = COALESCE($4, purchase_price),
        selling_price = COALESCE($5, selling_price),
        is_active = COALESCE($6, is_active),
        category = COALESCE($7, category),
        updated_at = NOW()
      WHERE id = $8
      RETURNING *
      `,
      [
        product_name,
        sku,
        unit,
        purchase_price,
        selling_price,
        is_active,
        category,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json({
      message: "Product updated successfully",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Update product error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "SKU already exists",
      });
    }

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// DELETE PRODUCT
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM products
      WHERE id = $1
      RETURNING id
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};