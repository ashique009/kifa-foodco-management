CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE user_role AS ENUM (
    'admin',
    'manager',
    'sales_staff',
    'driver'
);

CREATE TYPE vehicle_status AS ENUM (
    'available',
    'on_trip',
    'maintenance',
    'not_available'
);

CREATE TYPE trip_status AS ENUM (
    'draft',
    'loaded',
    'in_progress',
    'completed',
    'cancelled'
);

CREATE TYPE payment_method AS ENUM (
    'cash',
    'upi',
    'card',
    'bank_transfer'
);

CREATE TYPE ledger_entry_type AS ENUM (
    'sale',
    'payment',
    'return',
    'adjustment',
    'reversal'
);

-- ============================================
-- USERS
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,

    role user_role NOT NULL DEFAULT 'sales_staff',

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- STAFF
-- ============================================

CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID UNIQUE REFERENCES users(id),

    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),

    is_available BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- VEHICLES
-- ============================================

CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    vehicle_number VARCHAR(50) NOT NULL UNIQUE,
    vehicle_name VARCHAR(100),

    status vehicle_status NOT NULL DEFAULT 'available',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SHOPS
-- ============================================

CREATE TABLE shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    shop_name VARCHAR(200) NOT NULL,
    owner_name VARCHAR(150),
    phone VARCHAR(30),

    address TEXT,

    credit_limit NUMERIC(12,2) NOT NULL DEFAULT 0,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- PRODUCTS
-- ============================================

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    product_name VARCHAR(200) NOT NULL,
    sku VARCHAR(100) UNIQUE,

    unit VARCHAR(50) NOT NULL,

    purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- PRODUCT BATCHES
-- ============================================

CREATE TABLE product_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    product_id UUID NOT NULL
        REFERENCES products(id),

    batch_number VARCHAR(100) NOT NULL,

    production_date DATE,
    expiry_date DATE,

    purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(product_id, batch_number)
);

-- ============================================
-- GODOWN STOCK
-- ============================================

CREATE TABLE godown_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    product_id UUID NOT NULL
        REFERENCES products(id),

    batch_id UUID NOT NULL
        REFERENCES product_batches(id),

    quantity NUMERIC(12,3) NOT NULL DEFAULT 0,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(product_id, batch_id),

    CONSTRAINT godown_stock_quantity_check
        CHECK (quantity >= 0)
);

-- ============================================
-- TRIPS
-- ============================================

CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    vehicle_id UUID NOT NULL
        REFERENCES vehicles(id),

    driver_id UUID
        REFERENCES staff(id),

    sales_staff_id UUID
        REFERENCES staff(id),

    trip_date DATE NOT NULL DEFAULT CURRENT_DATE,

    status trip_status NOT NULL DEFAULT 'draft',

    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TRIP SHOPS
-- ============================================

CREATE TABLE trip_shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    trip_id UUID NOT NULL
        REFERENCES trips(id)
        ON DELETE CASCADE,

    shop_id UUID NOT NULL
        REFERENCES shops(id),

    visit_order INTEGER,

    visited_at TIMESTAMPTZ,

    UNIQUE(trip_id, shop_id)
);

-- ============================================
-- TRIP STOCK
-- ============================================

CREATE TABLE trip_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    trip_id UUID NOT NULL
        REFERENCES trips(id)
        ON DELETE CASCADE,

    product_id UUID NOT NULL
        REFERENCES products(id),

    batch_id UUID NOT NULL
        REFERENCES product_batches(id),

    quantity NUMERIC(12,3) NOT NULL DEFAULT 0,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(trip_id, product_id, batch_id),

    CONSTRAINT trip_stock_quantity_check
        CHECK (quantity >= 0)
);

-- ============================================
-- STOCK LEDGER
-- ============================================

CREATE TYPE stock_movement_type AS ENUM (
    'purchase_in',
    'load_out',
    'load_in',
    'unload_out',
    'unload_in',
    'sale_out',
    'return_in',
    'damage_out',
    'expiry_out',
    'adjustment'
);

CREATE TABLE stock_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    product_id UUID NOT NULL
        REFERENCES products(id),

    batch_id UUID NOT NULL
        REFERENCES product_batches(id),

    movement_type stock_movement_type NOT NULL,

    quantity_change NUMERIC(12,3) NOT NULL,

    godown_stock_id UUID
        REFERENCES godown_stock(id),

    trip_id UUID
        REFERENCES trips(id),

    transfer_id UUID,

    reference_id UUID,

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT stock_ledger_quantity_not_zero
        CHECK (quantity_change <> 0)
);

CREATE INDEX idx_stock_ledger_product
    ON stock_ledger(product_id);

CREATE INDEX idx_stock_ledger_batch
    ON stock_ledger(batch_id);

CREATE INDEX idx_stock_ledger_trip
    ON stock_ledger(trip_id);

CREATE INDEX idx_stock_ledger_created_at
    ON stock_ledger(created_at);

-- ============================================
-- SALES
-- ============================================

CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    invoice_number VARCHAR(50) NOT NULL UNIQUE,

    trip_id UUID NOT NULL
        REFERENCES trips(id),

    shop_id UUID NOT NULL
        REFERENCES shops(id),

    sales_staff_id UUID
        REFERENCES staff(id),

    sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT sales_amounts_check
        CHECK (
            subtotal >= 0
            AND discount >= 0
            AND total_amount >= 0
        )
);

-- ============================================
-- SALE ITEMS
-- ============================================

CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    sale_id UUID NOT NULL
        REFERENCES sales(id)
        ON DELETE CASCADE,

    product_id UUID NOT NULL
        REFERENCES products(id),

    batch_id UUID NOT NULL
        REFERENCES product_batches(id),

    quantity NUMERIC(12,3) NOT NULL,

    unit_price NUMERIC(12,2) NOT NULL,

    discount NUMERIC(12,2) NOT NULL DEFAULT 0,

    line_total NUMERIC(12,2) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT sale_item_quantity_check
        CHECK (quantity > 0),

    CONSTRAINT sale_item_price_check
        CHECK (unit_price >= 0),

    CONSTRAINT sale_item_discount_check
        CHECK (discount >= 0),

    CONSTRAINT sale_item_total_check
        CHECK (line_total >= 0)
);

CREATE INDEX idx_sales_trip
    ON sales(trip_id);

CREATE INDEX idx_sales_shop
    ON sales(shop_id);

CREATE INDEX idx_sales_date
    ON sales(sale_date);

CREATE INDEX idx_sale_items_sale
    ON sale_items(sale_id);

-- ============================================
-- SHOP LEDGER
-- ============================================

CREATE TABLE shop_ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    shop_id UUID NOT NULL
        REFERENCES shops(id),

    entry_type ledger_entry_type NOT NULL,

    sale_id UUID
        REFERENCES sales(id),

    debit NUMERIC(12,2) NOT NULL DEFAULT 0,
    credit NUMERIC(12,2) NOT NULL DEFAULT 0,

    balance_after NUMERIC(12,2) NOT NULL,

    reference_id UUID,

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ledger_debit_credit_check
        CHECK (
            debit >= 0
            AND credit >= 0
            AND NOT (debit > 0 AND credit > 0)
        )
);

CREATE INDEX idx_shop_ledger_shop
    ON shop_ledger_entries(shop_id);

CREATE INDEX idx_shop_ledger_created_at
    ON shop_ledger_entries(created_at);

-- ============================================
-- PAYMENTS
-- ============================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    shop_id UUID NOT NULL
        REFERENCES shops(id),

    sale_id UUID
        REFERENCES sales(id),

    payment_method payment_method NOT NULL,

    amount NUMERIC(12,2) NOT NULL,

    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    reference_number VARCHAR(150),

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT payment_amount_check
        CHECK (amount > 0)
);

CREATE INDEX idx_payments_shop
    ON payments(shop_id);

CREATE INDEX idx_payments_sale
    ON payments(sale_id);

CREATE INDEX idx_payments_date
    ON payments(payment_date);

-- ============================================
-- RETURNS
-- ============================================

CREATE TYPE return_reason AS ENUM (
    'shop_return',
    'damaged',
    'expired'
);

CREATE TABLE returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    trip_id UUID NOT NULL
        REFERENCES trips(id),

    shop_id UUID
        REFERENCES shops(id),

    reason return_reason NOT NULL,

    return_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- RETURN ITEMS
-- ============================================

CREATE TABLE return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    return_id UUID NOT NULL
        REFERENCES returns(id)
        ON DELETE CASCADE,

    product_id UUID NOT NULL
        REFERENCES products(id),

    batch_id UUID NOT NULL
        REFERENCES product_batches(id),

    quantity NUMERIC(12,3) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT return_item_quantity_check
        CHECK (quantity > 0)
);

CREATE INDEX idx_returns_trip
    ON returns(trip_id);

CREATE INDEX idx_returns_shop
    ON returns(shop_id);

CREATE INDEX idx_return_items_return
    ON return_items(return_id);


-- ============================================
-- SUPPLIERS
-- ============================================

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    supplier_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(150),
    phone VARCHAR(30),
    address TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- PURCHASES
-- ============================================

CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    purchase_number VARCHAR(50) NOT NULL UNIQUE,

    supplier_id UUID
        REFERENCES suppliers(id),

    purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- PURCHASE ITEMS
-- ============================================

CREATE TABLE purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    purchase_id UUID NOT NULL
        REFERENCES purchases(id)
        ON DELETE CASCADE,

    product_id UUID NOT NULL
        REFERENCES products(id),

    batch_id UUID NOT NULL
        REFERENCES product_batches(id),

    quantity NUMERIC(12,3) NOT NULL,

    unit_cost NUMERIC(12,2) NOT NULL,

    line_total NUMERIC(12,2) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT purchase_item_quantity_check
        CHECK (quantity > 0),

    CONSTRAINT purchase_item_cost_check
        CHECK (unit_cost >= 0),

    CONSTRAINT purchase_item_total_check
        CHECK (line_total >= 0)
);

CREATE INDEX idx_purchases_supplier
    ON purchases(supplier_id);

CREATE INDEX idx_purchases_date
    ON purchases(purchase_date);

CREATE INDEX idx_purchase_items_purchase
    ON purchase_items(purchase_id);

-- ============================================
-- EXPENSES
-- ============================================

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    expense_category VARCHAR(100) NOT NULL,

    amount NUMERIC(12,2) NOT NULL,

    expense_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    description TEXT,

    created_by UUID
        REFERENCES users(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT expense_amount_check
        CHECK (amount > 0)
);

CREATE INDEX idx_expenses_date
    ON expenses(expense_date);

CREATE INDEX idx_expenses_category
    ON expenses(expense_category);

-- ============================================
-- DOCUMENT SEQUENCES
-- ============================================

CREATE TABLE document_sequences (
    document_type VARCHAR(50) PRIMARY KEY,

    current_value BIGINT NOT NULL DEFAULT 0
);

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID
        REFERENCES users(id),

    action VARCHAR(100) NOT NULL,

    entity_type VARCHAR(100) NOT NULL,

    entity_id UUID,

    old_data JSONB,

    new_data JSONB,

    ip_address INET,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user
    ON audit_logs(user_id);

CREATE INDEX idx_audit_logs_entity
    ON audit_logs(entity_type, entity_id);

CREATE INDEX idx_audit_logs_created_at
    ON audit_logs(created_at);