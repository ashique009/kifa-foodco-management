const express = require("express");

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const authenticateToken = require("../middleware/auth");

const router = express.Router();

// All product routes require login
router.use(authenticateToken);

// Create product
router.post("/", createProduct);

// Get all products
router.get("/", getProducts);

// Get one product
router.get("/:id", getProductById);

// Update product
router.put("/:id", updateProduct);

// Delete product
router.delete("/:id", deleteProduct);

module.exports = router;