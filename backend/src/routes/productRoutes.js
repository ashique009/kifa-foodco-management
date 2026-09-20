const express = require("express");

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const authenticateToken = require("../middleware/auth");
const { requireManagerOrAdmin } = require("../middleware/authorize");
const { validateUuidParam } = require("../middleware/validateUuid");

const router = express.Router();

// All product routes require login
router.use(authenticateToken);

// Create product (Manager / Admin)
router.post("/", requireManagerOrAdmin, createProduct);

// Get all products (All authenticated users)
router.get("/", getProducts);

// Get one product
router.get("/:id", validateUuidParam("id"), getProductById);

// Update product (Manager / Admin)
router.put("/:id", requireManagerOrAdmin, validateUuidParam("id"), updateProduct);

// Delete product (Manager / Admin)
router.delete("/:id", requireManagerOrAdmin, validateUuidParam("id"), deleteProduct);

module.exports = router;