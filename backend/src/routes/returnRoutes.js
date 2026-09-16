const express = require("express");

const {
  createReturn,
  getReturns,
} = require("../controllers/returnController");

const authenticateToken = require("../middleware/auth");

const router = express.Router();

router.use(authenticateToken);

router.get("/", getReturns);
router.post("/", createReturn);

module.exports = router;