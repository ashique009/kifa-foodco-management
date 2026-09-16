-- ============================================
-- Migration 003: Add category to products table
-- ============================================

ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'General';

CREATE INDEX IF NOT EXISTS idx_products_category 
  ON products(category);
