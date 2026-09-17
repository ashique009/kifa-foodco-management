-- ============================================
-- Migration 005: Create business_settings table and add receipt_number to payments
-- ============================================

-- 1. Create business_settings singleton table
CREATE TABLE IF NOT EXISTS business_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    business_name VARCHAR(200) NOT NULL DEFAULT 'Kifa Food Co.',
    gstin VARCHAR(50) DEFAULT '32ABCDE1234F1Z5',
    phone VARCHAR(50) NOT NULL DEFAULT '0495-2760000',
    email VARCHAR(150) DEFAULT 'orders@kifafoodco.com',
    address TEXT DEFAULT 'Industrial Estate Road, Malaparamba, Kozhikode, Kerala 673009',
    invoice_prefix VARCHAR(30) NOT NULL DEFAULT 'INV-',
    receipt_prefix VARCHAR(30) NOT NULL DEFAULT 'REC-',
    invoice_footer_note TEXT DEFAULT 'Thank you for choosing Kifa Food Co.! Goods once sold will only be replaced if reported within 24 hours.',
    receipt_footer_note TEXT DEFAULT 'Thank you for your payment. Keep this receipt for your records.',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed singleton record if not present
INSERT INTO business_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- 2. Add receipt_number column to payments table
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(50);

-- Backfill existing payments with their deterministic historical format REC-{8-char-UUID}
UPDATE payments
SET receipt_number = 'REC-' || UPPER(SUBSTRING(id::text, 1, 8))
WHERE receipt_number IS NULL;

-- Make receipt_number NOT NULL now that it is backfilled
ALTER TABLE payments
  ALTER COLUMN receipt_number SET NOT NULL;

-- Add unique constraint on receipt_number to guarantee uniqueness
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_receipt_number_key'
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT payments_receipt_number_key UNIQUE (receipt_number);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_receipt_number
  ON payments(receipt_number);

-- 3. Ensure 'payment' sequence exists in document_sequences
INSERT INTO document_sequences (document_type, current_value)
VALUES ('payment', 0)
ON CONFLICT (document_type) DO NOTHING;
