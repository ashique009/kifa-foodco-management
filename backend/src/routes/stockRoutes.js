const express = require("express");

const {
  getGodownStock,
} = require("../controllers/stockController");

const authenticateToken = require("../middleware/auth");

const router = express.Router();

// All stock routes require login
router.use(authenticateToken);

// Get current godown stock
router.get("/", getGodownStock);
router.get("/godown", getGodownStock);

module.exports = router;