-- ============================================
-- Migration 002: Add damaged_quantity to trip_stock and idempotency_key to stock_ledger
-- ============================================

-- 1. Add damaged_quantity to trip_stock
ALTER TABLE trip_stock 
  ADD COLUMN IF NOT EXISTS damaged_quantity NUMERIC NOT NULL DEFAULT 0;

-- 2. Add idempotency_key to stock_ledger for damage/transfer idempotency
ALTER TABLE stock_ledger 
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);

-- 3. Partial unique index to enforce idempotency on ledger entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_ledger_idempotency_key 
  ON stock_ledger (idempotency_key) 
  WHERE idempotency_key IS NOT NULL;
