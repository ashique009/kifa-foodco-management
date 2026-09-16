const pool = require("../config/database");

// CREATE STAFF
const createStaff = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      name,
      phone,
      role = "sales_staff",
      is_available = true,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Staff name is required",
      });
    }

    await client.query("BEGIN");

    // Validate and normalize role (supports 'driver', 'Driver', 'sales_staff', 'Sales Staff', etc.)
    const validRoles = ["admin", "manager", "sales_staff", "driver"];
    const normalizedRole =
      typeof role === "string"
        ? role.toLowerCase().trim().replace(/\s+/g, "_")
        : "sales_staff";
    const staffRole = validRoles.includes(normalizedRole)
      ? normalizedRole
      : "sales_staff";

    // Create linked user record for role storage
    const username = `staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const userResult = await client.query(
      `
      INSERT INTO users (
        username,
        password_hash,
        role
      )
      VALUES ($1, $2, $3)
      RETURNING id, role
      `,
      [
        username,
        "$2b$10$placeholder_staff_hash_only",
        staffRole,
      ]
    );

    const userId = userResult.rows[0].id;

    const result = await client.query(
      `
      INSERT INTO staff (
        name,
        phone,
        user_id,
        is_available
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        name,
        phone || null,
        userId,
        is_available,
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Staff created successfully",
      staff: {
        ...result.rows[0],
        role: staffRole,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create staff error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
};

// GET ALL STAFF
const getStaff = async (req, res) => {
  try {
    const includeInactive = req.query.include_inactive === "true";
    const whereClause = includeInactive ? "" : "WHERE COALESCE(u.is_active, TRUE) = TRUE";

    const result = await pool.query(
      `
      SELECT
        s.id,
        s.user_id,
        s.name,
        s.phone,
        s.is_available,
        COALESCE(u.is_active, TRUE) AS is_active,
        COALESCE(u.role::text, 'sales_staff') AS role,
        s.created_at,
        s.updated_at
      FROM staff s
      LEFT JOIN users u ON s.user_id = u.id
      ${whereClause}
      ORDER BY s.created_at DESC
      `
    );

    res.json({
      staff: result.rows,
    });
  } catch (error) {
    console.error("Get staff error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// DELETE / DEACTIVATE STAFF
const deleteStaff = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query("BEGIN");

    // Fetch staff record
    const staffResult = await client.query(
      `
      SELECT id, user_id, name FROM staff WHERE id = $1
      `,
      [id]
    );

    if (staffResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Staff member not found",
      });
    }

    const staffMember = staffResult.rows[0];

    // Deactivate linked user if present
    if (staffMember.user_id) {
      await client.query(
        `
        UPDATE users
        SET is_active = FALSE,
            updated_at = NOW()
        WHERE id = $1
        `,
        [staffMember.user_id]
      );
    } else {
      // If no linked user exists, create an inactive user and link it
      const username = `inactive_staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const userRes = await client.query(
        `
        INSERT INTO users (username, password_hash, role, is_active)
        VALUES ($1, $2, 'sales_staff', FALSE)
        RETURNING id
        `,
        [username, "$2b$10$placeholder_staff_hash_only"]
      );
      await client.query(
        `UPDATE staff SET user_id = $1 WHERE id = $2`,
        [userRes.rows[0].id, id]
      );
    }

    // Set staff is_available to false
    await client.query(
      `
      UPDATE staff
      SET is_available = FALSE,
          updated_at = NOW()
      WHERE id = $1
      `,
      [id]
    );

    await client.query("COMMIT");

    res.json({
      message: "Staff member removed successfully",
      id,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Delete staff error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
};

module.exports = {
  createStaff,
  getStaff,
  deleteStaff,
};