const express = require("express");

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const authenticateToken = require("../middleware/auth");
const { requireAdmin } = require("../middleware/authorize");
const { validateUuidParam } = require("../middleware/validateUuid");

const router = express.Router();

// All product routes require login
router.use(authenticateToken);

// Create product (ADMIN only)
router.post("/", requireAdmin, createProduct);

// Get all products (All authenticated users)
router.get("/", getProducts);

// Get one product
router.get("/:id", validateUuidParam("id"), getProductById);

// Update product (ADMIN only)
router.put("/:id", requireAdmin, validateUuidParam("id"), updateProduct);

// Delete product (ADMIN only)
router.delete("/:id", requireAdmin, validateUuidParam("id"), deleteProduct);

module.exports = router;