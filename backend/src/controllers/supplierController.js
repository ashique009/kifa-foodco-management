const pool = require("../config/database");

// CREATE SUPPLIER
const createSupplier = async (req, res) => {
  try {
    const {
      supplier_name,
      contact_person,
      phone,
      address,
    } = req.body;

    if (!supplier_name) {
      return res.status(400).json({
        message: "Supplier name is required",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO suppliers (
        supplier_name,
        contact_person,
        phone,
        address
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        supplier_name,
        contact_person || null,
        phone || null,
        address || null,
      ]
    );

    res.status(201).json({
      message: "Supplier created successfully",
      supplier: result.rows[0],
    });
  } catch (error) {
    console.error("Create supplier error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// GET ALL SUPPLIERS
const getSuppliers = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM suppliers
      ORDER BY created_at DESC
      `
    );

    res.json({
      suppliers: result.rows,
    });
  } catch (error) {
    console.error("Get suppliers error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  createSupplier,
  getSuppliers,
};