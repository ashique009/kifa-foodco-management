-- ============================================
-- Migration 007: Add trip_id to payments and backfill deterministic associations
--
-- Adds trip_id foreign key to payments table to allow direct trip-scoped
-- payment tracking and authorization, eliminating cross-trip leakage for drivers
-- and sales staff.
--
-- Safe forward-only migration:
-- - Preserves all existing payment records, IDs, amounts, and receipt numbers.
-- - Deterministically backfills trip_id only when directly inherited from sales.trip_id.
-- - Leaves unassociated payments with NULL trip_id (no heuristic guessing).
-- ============================================

-- 1. Add trip_id column referencing trips table
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES trips(id) ON DELETE SET NULL;

-- 2. Create index on trip_id for performant trip-scoped payment queries
CREATE INDEX IF NOT EXISTS idx_payments_trip_id
  ON payments(trip_id);

-- 3. Deterministic backfill: populate trip_id for payments linked to a sale that has a trip_id
UPDATE payments p
SET trip_id = s.trip_id
FROM sales s
WHERE p.sale_id = s.id
  AND p.trip_id IS NULL
  AND s.trip_id IS NOT NULL;
