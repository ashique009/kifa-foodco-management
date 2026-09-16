const express = require("express");

const {
  createStaff,
  getStaff,
  deleteStaff,
} = require("../controllers/staffController");

const authenticateToken = require("../middleware/auth");
const { requireAdmin } = require("../middleware/authorize");
const { validateUuidParam } = require("../middleware/validateUuid");

const router = express.Router();

// All staff routes require login
router.use(authenticateToken);

// Create staff (ADMIN only)
router.post("/", requireAdmin, createStaff);

// Get all staff
router.get("/", getStaff);

// Delete / deactivate staff (ADMIN only)
router.delete("/:id", requireAdmin, validateUuidParam("id"), deleteStaff);

module.exports = router;