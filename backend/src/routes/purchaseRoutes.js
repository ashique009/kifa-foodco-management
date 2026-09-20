const express = require("express");

const {
  createPurchase,
  getPurchases,
} = require("../controllers/purchaseController");

const authenticateToken = require("../middleware/auth");
const { requireManagerOrAdmin } = require("../middleware/authorize");

const router = express.Router();

// All purchase routes require login and Manager/Admin privileges
router.use(authenticateToken);
router.use(requireManagerOrAdmin);

// Purchases (Manager / Admin)
router.get("/", getPurchases);
router.post("/", createPurchase);

module.exports = router;