const pool = require("../config/database");
const { hasBusinessAccess } = require("../middleware/authorize");

// CREATE SHOP
const createShop = async (req, res) => {
  try {
    const {
      shop_name,
      owner_name,
      phone,
      address,
      credit_limit = 0,
    } = req.body;

    if (!shop_name) {
      return res.status(400).json({
        message: "Shop name is required",
      });
    }

    if (Number(credit_limit) < 0) {
      return res.status(400).json({
        message: "Credit limit cannot be negative",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO shops (
        shop_name,
        owner_name,
        phone,
        address,
        credit_limit
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        shop_name,
        owner_name || null,
        phone || null,
        address || null,
        credit_limit,
      ]
    );

    res.status(201).json({
      message: "Shop created successfully",
      shop: result.rows[0],
    });
  } catch (error) {
    console.error("Create shop error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// GET ALL SHOPS
const getShops = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM shops
      WHERE is_active = TRUE
      ORDER BY shop_name ASC
      `
    );

    res.json({
      shops: result.rows,
    });
  } catch (error) {
    console.error("Get shops error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// GET ONE SHOP
const getShopById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM shops
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Shop not found",
      });
    }

    res.json({
      shop: result.rows[0],
    });
  } catch (error) {
    console.error("Get shop error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// GET SHOP LEDGER
const getShopLedger = async (req, res) => {
  try {
    const { id } = req.params;

    // Check shop exists
    const shopResult = await pool.query(
      `
      SELECT id, shop_name, owner_name, phone
      FROM shops
      WHERE id = $1
      `,
      [id]
    );

    if (shopResult.rows.length === 0) {
      return res.status(404).json({
        message: "Shop not found",
      });
    }

    // Role-based access check: If user is restricted staff (Driver / Sales Staff), verify that this shop is assigned to one of their trips
    if (req.user && !hasBusinessAccess(req.user)) {
      const staffCheck = await pool.query(
        `SELECT id FROM staff WHERE user_id = $1 LIMIT 1`,
        [req.user.userId]
      );
      const staffId = staffCheck.rows[0]?.id;
      if (!staffId) {
        return res.status(403).json({
          message: "No staff profile linked to this user",
        });
      }

      const assignedShop = await pool.query(
        `SELECT ts.id 
         FROM trip_shops ts
         JOIN trips t ON t.id = ts.trip_id
         WHERE ts.shop_id = $1 AND (t.driver_id = $2 OR t.sales_staff_id = $2)
         LIMIT 1`,
        [id, staffId]
      );

      if (assignedShop.rows.length === 0) {
        return res.status(403).json({
          message: "You are not assigned to any trips serving this shop",
        });
      }
    }

    // Get ledger entries
    const ledgerResult = await pool.query(
      `
      SELECT
        sle.id,
        sle.entry_type,
        sle.sale_id,
        s.invoice_number,
        sle.debit,
        sle.credit,
        sle.balance_after,
        sle.reference_id,
        sle.notes,
        sle.created_at
      FROM shop_ledger_entries sle
      LEFT JOIN sales s
        ON s.id = sle.sale_id
      WHERE sle.shop_id = $1
      ORDER BY sle.created_at ASC
      `,
      [id]
    );

    // Calculate current outstanding
    const balanceResult = await pool.query(
      `
      SELECT
        COALESCE(SUM(debit), 0) -
        COALESCE(SUM(credit), 0) AS outstanding
      FROM shop_ledger_entries
      WHERE shop_id = $1
      `,
      [id]
    );

    res.json({
      shop: shopResult.rows[0],
      outstanding: Number(balanceResult.rows[0].outstanding),
      ledger: ledgerResult.rows,
    });
  } catch (error) {
    console.error("Get shop ledger error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  createShop,
  getShops,
  getShopById,
  getShopLedger,
};