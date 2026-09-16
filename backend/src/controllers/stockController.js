const pool = require("../config/database");

// GET GODOWN STOCK
const getGodownStock = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        gs.id,
        gs.product_id,
        p.product_name,
        p.sku,
        gs.batch_id,
        pb.batch_number,
        pb.production_date,
        pb.expiry_date,
        gs.quantity,
        gs.updated_at
      FROM godown_stock gs
      JOIN products p
        ON p.id = gs.product_id
      JOIN product_batches pb
        ON pb.id = gs.batch_id
      ORDER BY pb.expiry_date ASC NULLS LAST
    `);

    res.json({
      stock: result.rows,
    });
  } catch (error) {
    console.error("Get godown stock error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  getGodownStock,
};