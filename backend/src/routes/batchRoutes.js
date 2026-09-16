const express = require("express");

const {
  createBatch,
  getBatches,
  getBatchesByProduct,
} = require("../controllers/batchController");

const authenticateToken = require("../middleware/auth");

const router = express.Router();

// All batch routes require login
router.use(authenticateToken);

// Create a batch
router.post("/", createBatch);

// Get all batches
router.get("/", getBatches);

// Get batches for a specific product
router.get("/product/:productId", getBatchesByProduct);

module.exports = router;