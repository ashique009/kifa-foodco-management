const express = require("express");

const {
  createShop,
  getShops,
  getShopById,
  getShopLedger,
} = require("../controllers/shopController");

const authenticateToken = require("../middleware/auth");
const { requireAdmin } = require("../middleware/authorize");
const { validateUuidParam } = require("../middleware/validateUuid");

const router = express.Router();

// All shop routes require login
router.use(authenticateToken);

// Create shop (ADMIN only)
router.post("/", requireAdmin, createShop);

// Get all shops
router.get("/", getShops);

// Get one shop
router.get("/:id", validateUuidParam("id"), getShopById);

// Get shop ledger
router.get("/:id/ledger", validateUuidParam("id"), getShopLedger);

module.exports = router;