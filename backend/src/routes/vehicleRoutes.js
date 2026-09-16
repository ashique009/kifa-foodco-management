const express = require("express");

const {
  createVehicle,
  getVehicles,
} = require("../controllers/vehicleController");

const authenticateToken = require("../middleware/auth");
const { requireAdmin } = require("../middleware/authorize");

const router = express.Router();

// All vehicle routes require login
router.use(authenticateToken);

// Create vehicle (ADMIN only)
router.post("/", requireAdmin, createVehicle);

// Get all vehicles
router.get("/", getVehicles);

module.exports = router;