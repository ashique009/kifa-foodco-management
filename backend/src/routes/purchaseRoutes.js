const express = require("express");

const {
  createPurchase,
  getPurchases,
} = require("../controllers/purchaseController");

const authenticateToken = require("../middleware/auth");
const { requireAdmin } = require("../middleware/authorize");

const router = express.Router();

// All purchase routes require login and ADMIN privileges
router.use(authenticateToken);
router.use(requireAdmin);

// Purchases (ADMIN only)
router.get("/", getPurchases);
router.post("/", createPurchase);

module.exports = router;