const express = require("express");

const {
  createStaff,
  getStaff,
  deleteStaff,
} = require("../controllers/staffController");

const authenticateToken = require("../middleware/auth");

const router = express.Router();

// All staff routes require login
router.use(authenticateToken);

// Create staff
router.post("/", createStaff);

// Get all staff
router.get("/", getStaff);

// Delete / deactivate staff
router.delete("/:id", deleteStaff);

module.exports = router;