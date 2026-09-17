const express = require("express");
const {
  getSettings,
  updateBusinessProfile,
  updateInvoiceSettings,
} = require("../controllers/settingsController");
const authenticateToken = require("../middleware/auth");
const { requireAdmin } = require("../middleware/authorize");

const router = express.Router();

router.use(authenticateToken);

// Read settings (authenticated users)
router.get("/", getSettings);

// Update business profile (admin only)
router.put("/business", requireAdmin, updateBusinessProfile);

// Update invoice & receipt preferences (admin only)
router.put("/invoice", requireAdmin, updateInvoiceSettings);

module.exports = router;
