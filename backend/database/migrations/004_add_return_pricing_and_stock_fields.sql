-- ============================================
-- Migration 004: Add return item pricing, return idempotency/credit tracking,
-- and non-sellable stock tracking
--
-- NOTE: These changes were originally applied directly to the production
-- database on 2026-09-17 to fix "column does not exist" errors (42703) in
-- the returns endpoints. This migration file documents those changes so the
-- schema history stays accurate for any fresh environment setup.
-- ============================================

-- 1. return_items: valuation + sale linkage (used by createReturn/getReturns)
ALTER TABLE return_items
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES sales(id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'return_item_price_check'
  ) THEN
    ALTER TABLE return_items
      ADD CONSTRAINT return_item_price_check CHECK (unit_price >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'return_item_total_check'
  ) THEN
    ALTER TABLE return_items
      ADD CONSTRAINT return_item_total_check CHECK (line_total >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_return_items_sale ON return_items(sale_id);

-- 2. returns: idempotency + total credited amount (used by createReturn/getReturns)
ALTER TABLE returns
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS total_credit_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_returns_idempotency_key
  ON returns (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 3. trip_stock: non-sellable (damaged/rejected) quantity tracking
--    (separate from damaged_quantity added in migration 002)
ALTER TABLE trip_stock
  ADD COLUMN IF NOT EXISTS non_sellable_quantity NUMERIC(12,3) NOT NULL DEFAULT 0;
