const express = require("express");

const {
  createShop,
  getShops,
  getShopById,
  getShopLedger,
} = require("../controllers/shopController");

const authenticateToken = require("../middleware/auth");

const router = express.Router();

// All shop routes require login
router.use(authenticateToken);

// Create shop
router.post("/", createShop);

// Get all shops
router.get("/", getShops);

// Get one shop
router.get("/:id", getShopById);

router.get("/:id/ledger", getShopLedger);

module.exports = router;