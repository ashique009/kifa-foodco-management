const express = require("express");

const {
  createSupplier,
  getSuppliers,
} = require("../controllers/supplierController");

const authenticateToken = require("../middleware/auth");

const router = express.Router();

// All supplier routes require login
router.use(authenticateToken);

// Create supplier
router.post("/", createSupplier);

// Get all suppliers
router.get("/", getSuppliers);

module.exports = router;