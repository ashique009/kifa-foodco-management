const express = require("express");

const {
  createBatch,
  getBatches,
  getBatchesByProduct,
} = require("../controllers/batchController");

const authenticateToken = require("../middleware/auth");
const { requireManagerOrAdmin } = require("../middleware/authorize");
const { validateUuidParam } = require("../middleware/validateUuid");

const router = express.Router();

// All batch routes require login
router.use(authenticateToken);

// Create a batch (Manager / Admin)
router.post("/", requireManagerOrAdmin, createBatch);

// Get all batches
router.get("/", getBatches);

// Get batches for a specific product
router.get("/product/:productId", validateUuidParam("productId"), getBatchesByProduct);

module.exports = router;