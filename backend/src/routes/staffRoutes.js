const express = require("express");

const {
  createStaff,
  getStaff,
  deleteStaff,
} = require("../controllers/staffController");

const authenticateToken = require("../middleware/auth");
const { requireManagerOrAdmin } = require("../middleware/authorize");
const { validateUuidParam } = require("../middleware/validateUuid");

const router = express.Router();

// All staff routes require login
router.use(authenticateToken);

// Create staff (Manager / Admin)
router.post("/", requireManagerOrAdmin, createStaff);

// Get all staff
router.get("/", getStaff);

// Delete / deactivate staff (Manager / Admin)
router.delete("/:id", requireManagerOrAdmin, validateUuidParam("id"), deleteStaff);

module.exports = router;