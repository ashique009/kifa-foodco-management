-- ============================================
-- Migration 006: Document sales/payments idempotency keys
--
-- NOTE: These columns were originally applied directly to the production
-- database (before migration files existed for them) to fix "column does
-- not exist" errors (42703) in the sale/payment recording endpoints. This
-- migration file documents those changes so the schema history stays
-- accurate for any fresh environment setup. Safe to re-run (idempotent).
-- ============================================

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_idempotency_key
  ON sales (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency_key
  ON payments (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
