const express = require("express");

const {
  createSale,
  getSales,
} = require("../controllers/saleController");

const authenticateToken = require("../middleware/auth");

const router = express.Router();

router.use(authenticateToken);

router.post("/", createSale);
router.get("/", getSales);

module.exports = router;