const express = require("express");

const {
  createPurchase,
  getPurchases,
} = require("../controllers/purchaseController");

const authenticateToken = require("../middleware/auth");

const router = express.Router();

// All purchase routes require login
router.use(authenticateToken);

// Purchases
router.get("/", getPurchases);
router.post("/", createPurchase);

module.exports = router;