const express = require("express");

const {
  createPayment,
  getPayments,
} = require("../controllers/paymentController");

const authenticateToken = require("../middleware/auth");

const router = express.Router();

router.use(authenticateToken);

router.post("/", createPayment);
router.get("/", getPayments);

module.exports = router;