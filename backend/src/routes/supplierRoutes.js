const express = require("express");

const {
  createSupplier,
  getSuppliers,
} = require("../controllers/supplierController");

const authenticateToken = require("../middleware/auth");
const { requireAdmin } = require("../middleware/authorize");

const router = express.Router();

// All supplier routes require login
router.use(authenticateToken);

// Create supplier (ADMIN only)
router.post("/", requireAdmin, createSupplier);

// Get all suppliers
router.get("/", getSuppliers);

module.exports = router;