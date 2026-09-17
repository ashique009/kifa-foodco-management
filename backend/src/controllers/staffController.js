const bcrypt = require("bcrypt");
const pool = require("../config/database");

// CREATE USER / STAFF (ADMIN only)
const createStaff = async (req, res) => {
  // Enforce backend authorization: Only ADMIN can create staff
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "Admin access required to create staff members",
    });
  }

  const {
    name,
    phone,
    username,
    password,
    confirmPassword,
    role = "sales_staff",
    is_available = true,
  } = req.body;

  // 1. Validate required fields
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({
      message: "Staff name is required",
    });
  }

  if (!username || typeof username !== "string" || username.trim().length < 3) {
    return res.status(400).json({
      message: "Username is required and must be at least 3 characters",
    });
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return res.status(400).json({
      message: "Password is required and must be at least 6 characters",
    });
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({
      message: "Passwords do not match",
    });
  }

  // 2. Validate and normalize role (Disallow creating admin via staff creation)
  const normalizedRole = typeof role === "string" ? role.toLowerCase().trim().replace(/\s+/g, "_") : "sales_staff";

  if (normalizedRole === "admin") {
    return res.status(400).json({
      message: "Admin accounts cannot be created via staff creation",
    });
  }

  const validStaffRoles = ["sales_staff", "driver", "manager"];
  const staffRole = validStaffRoles.includes(normalizedRole) ? normalizedRole : "sales_staff";

  const cleanUsername = username.trim().toLowerCase();
  const cleanName = name.trim();
  const cleanPhone = phone && typeof phone === "string" ? phone.trim() : null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 3. Check for existing username (case-insensitive) inside transaction
    const existingUser = await client.query(
      `SELECT id FROM users WHERE LOWER(username) = $1`,
      [cleanUsername]
    );

    if (existingUser.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        message: "Username already exists",
      });
    }

    // 4. Hash password with bcrypt (10 rounds standard)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 5. Create user in users table
    const userResult = await client.query(
      `
      INSERT INTO users (
        username,
        password_hash,
        role,
        is_active
      )
      VALUES ($1, $2, $3, TRUE)
      RETURNING id, username, role, is_active, created_at, updated_at
      `,
      [
        cleanUsername,
        passwordHash,
        staffRole,
      ]
    );

    const newUser = userResult.rows[0];

    // 6. Create corresponding staff record linked by user_id
    const staffResult = await client.query(
      `
      INSERT INTO staff (
        name,
        phone,
        user_id,
        is_available
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, phone, user_id, is_available, created_at, updated_at
      `,
      [
        cleanName,
        cleanPhone,
        newUser.id,
        Boolean(is_available),
      ]
    );

    const newStaff = staffResult.rows[0];

    await client.query("COMMIT");

    // 7. Return clean response without password or password_hash
    res.status(201).json({
      message: "Staff created successfully",
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        is_active: newUser.is_active,
        staff_id: newStaff.id,
      },
      staff: {
        id: newStaff.id,
        user_id: newUser.id,
        name: newStaff.name,
        phone: newStaff.phone || "",
        is_available: newStaff.is_available,
        is_active: newUser.is_active,
        role: newUser.role,
        username: newUser.username,
        created_at: newStaff.created_at,
        updated_at: newStaff.updated_at,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Username already exists",
      });
    }

    console.error("Create staff error:", error.message);
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
        COALESCE(s.phone, '') AS phone,
        COALESCE(s.is_available, TRUE) AS is_available,
        COALESCE(u.is_active, TRUE) AS is_active,
        COALESCE(u.role::text, 'sales_staff') AS role,
        u.username,
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

    // Fetch staff record (by staff id or linked user id)
    const staffResult = await client.query(
      `
      SELECT id, user_id, name FROM staff WHERE id = $1 OR user_id = $1
      `,
      [id]
    );

    if (staffResult.rows.length === 0) {
      // Check if it's a standalone user
      const userOnly = await client.query(`SELECT id, username FROM users WHERE id = $1`, [id]);
      if (userOnly.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          message: "User/staff member not found",
        });
      }

      if (userOnly.rows[0].id === req.user?.userId) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: "Cannot deactivate your own account",
        });
      }

      await client.query(
        `UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
        [id]
      );
      await client.query("COMMIT");
      return res.json({
        message: "User deactivated successfully",
        id,
      });
    }

    const staffMember = staffResult.rows[0];

    // Prevent deactivating own account
    if (staffMember.user_id && staffMember.user_id === req.user?.userId) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Cannot deactivate your own account",
      });
    }

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