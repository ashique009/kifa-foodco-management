const pool = require("../config/database");
const { hasBusinessAccess } = require("../middleware/authorize");

// GET /api/settings
// Accessible by authenticated users (both admin and staff) so business profile
// and footer notes can be rendered on invoices and receipts.
const getSettings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        business_name,
        gstin,
        phone,
        email,
        address,
        invoice_prefix,
        receipt_prefix,
        invoice_footer_note,
        receipt_footer_note,
        updated_at
      FROM business_settings
      WHERE id = 'default'
      LIMIT 1`
    );

    if (result.rows.length === 0) {
      // Fallback in case singleton was somehow deleted
      const fallback = await pool.query(
        `INSERT INTO business_settings (id)
         VALUES ('default')
         RETURNING
          business_name, gstin, phone, email, address,
          invoice_prefix, receipt_prefix, invoice_footer_note,
          receipt_footer_note, updated_at`
      );
      return res.json({ settings: fallback.rows[0] });
    }

    res.json({
      settings: result.rows[0],
    });
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// PUT /api/settings/business
// ADMIN / MANAGER: Update business profile details
const updateBusinessProfile = async (req, res) => {
  try {
    if (!hasBusinessAccess(req.user)) {
      return res.status(403).json({
        message: "Manager or Admin access required to modify business profile",
      });
    }

    const {
      business_name,
      gstin,
      phone,
      email,
      address,
    } = req.body;

    // Validation
    if (!business_name || typeof business_name !== "string" || !business_name.trim()) {
      return res.status(400).json({
        message: "Registered business name is required",
      });
    }

    if (business_name.trim().length > 200) {
      return res.status(400).json({
        message: "Business name cannot exceed 200 characters",
      });
    }

    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return res.status(400).json({
        message: "Business contact phone is required",
      });
    }

    if (phone.trim().length > 50) {
      return res.status(400).json({
        message: "Contact phone cannot exceed 50 characters",
      });
    }

    if (gstin && gstin.trim().length > 50) {
      return res.status(400).json({
        message: "GSTIN cannot exceed 50 characters",
      });
    }

    if (email && email.trim().length > 150) {
      return res.status(400).json({
        message: "Email address cannot exceed 150 characters",
      });
    }

    const result = await pool.query(
      `UPDATE business_settings
       SET
         business_name = $1,
         gstin = $2,
         phone = $3,
         email = $4,
         address = $5,
         updated_at = NOW()
       WHERE id = 'default'
       RETURNING
         business_name,
         gstin,
         phone,
         email,
         address,
         invoice_prefix,
         receipt_prefix,
         invoice_footer_note,
         receipt_footer_note,
         updated_at`,
      [
        business_name.trim(),
        gstin ? gstin.trim() : null,
        phone.trim(),
        email ? email.trim() : null,
        address ? address.trim() : null,
      ]
    );

    res.json({
      message: "Business profile updated successfully",
      settings: result.rows[0],
    });
  } catch (error) {
    console.error("Update business profile error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// PUT /api/settings/invoice
// ADMIN / MANAGER: Update invoice prefix, receipt prefix, and footer notes
const updateInvoiceSettings = async (req, res) => {
  try {
    if (!hasBusinessAccess(req.user)) {
      return res.status(403).json({
        message: "Manager or Admin access required to modify invoice configuration",
      });
    }

    const {
      invoice_prefix,
      receipt_prefix,
      invoice_footer_note,
      receipt_footer_note,
    } = req.body;

    // Validation
    if (!invoice_prefix || typeof invoice_prefix !== "string" || !invoice_prefix.trim()) {
      return res.status(400).json({
        message: "Invoice number prefix is required",
      });
    }

    if (invoice_prefix.trim().length > 30) {
      return res.status(400).json({
        message: "Invoice prefix cannot exceed 30 characters",
      });
    }

    if (!receipt_prefix || typeof receipt_prefix !== "string" || !receipt_prefix.trim()) {
      return res.status(400).json({
        message: "Receipt prefix is required",
      });
    }

    if (receipt_prefix.trim().length > 30) {
      return res.status(400).json({
        message: "Receipt prefix cannot exceed 30 characters",
      });
    }

    if (invoice_footer_note && invoice_footer_note.length > 1000) {
      return res.status(400).json({
        message: "Invoice footer note cannot exceed 1000 characters",
      });
    }

    if (receipt_footer_note && receipt_footer_note.length > 1000) {
      return res.status(400).json({
        message: "Receipt footer note cannot exceed 1000 characters",
      });
    }

    const result = await pool.query(
      `UPDATE business_settings
       SET
         invoice_prefix = $1,
         receipt_prefix = $2,
         invoice_footer_note = $3,
         receipt_footer_note = $4,
         updated_at = NOW()
       WHERE id = 'default'
       RETURNING
         business_name,
         gstin,
         phone,
         email,
         address,
         invoice_prefix,
         receipt_prefix,
         invoice_footer_note,
         receipt_footer_note,
         updated_at`,
      [
        invoice_prefix.trim(),
        receipt_prefix.trim(),
        invoice_footer_note ? invoice_footer_note.trim() : null,
        receipt_footer_note ? receipt_footer_note.trim() : null,
      ]
    );

    res.json({
      message: "Invoice preferences updated successfully",
      settings: result.rows[0],
    });
  } catch (error) {
    console.error("Update invoice settings error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  getSettings,
  updateBusinessProfile,
  updateInvoiceSettings,
};
