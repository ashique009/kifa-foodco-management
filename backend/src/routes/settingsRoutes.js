const express = require("express");
const {
  getSettings,
  updateBusinessProfile,
  updateInvoiceSettings,
} = require("../controllers/settingsController");
const authenticateToken = require("../middleware/auth");
const { requireManagerOrAdmin } = require("../middleware/authorize");

const router = express.Router();

router.use(authenticateToken);

// Read settings (authenticated users)
router.get("/", getSettings);

// Update business profile (Manager / Admin)
router.put("/business", requireManagerOrAdmin, updateBusinessProfile);

// Update invoice & receipt preferences (Manager / Admin)
router.put("/invoice", requireManagerOrAdmin, updateInvoiceSettings);

module.exports = router;
