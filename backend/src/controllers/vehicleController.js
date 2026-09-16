const pool = require("../config/database");

// CREATE VEHICLE
const createVehicle = async (req, res) => {
  try {
    const {
      vehicle_number,
      vehicle_name,
    } = req.body;

    if (!vehicle_number) {
      return res.status(400).json({
        message: "Vehicle number is required",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO vehicles (
        vehicle_number,
        vehicle_name
      )
      VALUES ($1, $2)
      RETURNING *
      `,
      [
        vehicle_number,
        vehicle_name || null,
      ]
    );

    res.status(201).json({
      message: "Vehicle created successfully",
      vehicle: result.rows[0],
    });
  } catch (error) {
    console.error("Create vehicle error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Vehicle number already exists",
      });
    }

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// GET ALL VEHICLES
const getVehicles = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM vehicles
      ORDER BY created_at DESC
      `
    );

    res.json({
      vehicles: result.rows,
    });
  } catch (error) {
    console.error("Get vehicles error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  createVehicle,
  getVehicles,
};