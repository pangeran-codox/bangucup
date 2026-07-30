-- =========================================================
-- SCHEMA: Sistem Billing + ACS Monitoring untuk RT/RW Net
-- Database: PostgreSQL
-- =========================================================

-- Catatan:
-- 1. Tabel roles/permissions TIDAK dibuat manual di sini.
--    Gunakan package "spatie/laravel-permission", dia akan
--    generate migration-nya sendiri (roles, permissions,
--    model_has_roles, role_has_permissions, dst).
-- 2. Semua enum di sini pakai VARCHAR + CHECK constraint
--    (bukan native ENUM type) supaya lebih gampang di-ALTER
--    di kemudian hari dan portable kalau suatu saat pindah ke MySQL.

-- =========================================================
-- 1. USERS (admin / staff internal)
-- =========================================================
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password        VARCHAR(255) NOT NULL,
    email_verified_at TIMESTAMP,
    remember_token  VARCHAR(100),
    created_at      TIMESTAMP DEFAULT now(),
    updated_at      TIMESTAMP DEFAULT now()
);

-- =========================================================
-- 2. ODPs (titik distribusi jaringan)
-- =========================================================
CREATE TABLE odps (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    location_lat    DECIMAL(10,7),
    location_lng    DECIMAL(10,7),
    total_ports     INT NOT NULL DEFAULT 8,
    installed_at    DATE,
    created_at      TIMESTAMP DEFAULT now(),
    updated_at      TIMESTAMP DEFAULT now()
);

-- =========================================================
-- 3. CUSTOMERS
-- =========================================================
CREATE TABLE customers (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    phone           VARCHAR(20) NOT NULL,
    email           VARCHAR(150),
    address         TEXT NOT NULL,
    coordinate_lat  DECIMAL(10,7),
    coordinate_lng  DECIMAL(10,7),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('active','isolir','inactive','pending')),
    joined_at       DATE,
    created_at      TIMESTAMP DEFAULT now(),
    updated_at      TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_customers_status ON customers(status);

-- =========================================================
-- 4. PACKAGES (paket internet)
-- =========================================================
CREATE TABLE packages (
    id                      BIGSERIAL PRIMARY KEY,
    name                    VARCHAR(100) NOT NULL,
    speed_mbps              INT NOT NULL,
    price                   DECIMAL(12,2) NOT NULL,
    mikrotik_profile_name   VARCHAR(100) NOT NULL,
    is_active               BOOLEAN NOT NULL DEFAULT true,
    created_at              TIMESTAMP DEFAULT now(),
    updated_at              TIMESTAMP DEFAULT now()
);

-- =========================================================
-- 5. SUBSCRIPTIONS (langganan aktif pelanggan)
-- =========================================================
CREATE TABLE subscriptions (
    id                  BIGSERIAL PRIMARY KEY,
    customer_id         BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    package_id          BIGINT NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
    odp_id              BIGINT REFERENCES odps(id) ON DELETE SET NULL,
    port_number         INT,
    pppoe_username      VARCHAR(100) NOT NULL UNIQUE,
    pppoe_password      VARCHAR(255) NOT NULL,
    billing_due_date    SMALLINT NOT NULL DEFAULT 1 CHECK (billing_due_date BETWEEN 1 AND 28),
    status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','isolir','terminated')),
    started_at          DATE NOT NULL,
    ended_at            DATE,
    created_at          TIMESTAMP DEFAULT now(),
    updated_at          TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_odp ON subscriptions(odp_id);

-- =========================================================
-- 6. DEVICES (cache dari GenieACS)
-- =========================================================
CREATE TABLE devices (
    id                  BIGSERIAL PRIMARY KEY,
    customer_id         BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    genieacs_device_id  VARCHAR(150) NOT NULL UNIQUE,
    serial_number       VARCHAR(100),
    brand_model         VARCHAR(100),
    last_inform_at      TIMESTAMP,
    last_status         VARCHAR(20) NOT NULL DEFAULT 'unknown'
                        CHECK (last_status IN ('online','offline','unknown')),
    rx_power            DECIMAL(6,2),
    ssid                VARCHAR(100),
    updated_at          TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_devices_customer ON devices(customer_id);

-- =========================================================
-- 7. VOUCHERS
-- =========================================================
CREATE TABLE vouchers (
    id              BIGSERIAL PRIMARY KEY,
    code            VARCHAR(50) NOT NULL UNIQUE,
    type            VARCHAR(20) NOT NULL CHECK (type IN ('percentage','fixed')),
    value           DECIMAL(12,2) NOT NULL,
    applies_to      VARCHAR(20) NOT NULL DEFAULT 'all'
                    CHECK (applies_to IN ('installation','monthly','all')),
    valid_from      DATE NOT NULL,
    valid_until     DATE NOT NULL,
    max_usage       INT,
    used_count      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP DEFAULT now()
);

-- =========================================================
-- 8. INVOICES
-- =========================================================
CREATE TABLE invoices (
    id                  BIGSERIAL PRIMARY KEY,
    customer_id         BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    subscription_id     BIGINT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    voucher_id          BIGINT REFERENCES vouchers(id) ON DELETE SET NULL,
    invoice_number      VARCHAR(50) NOT NULL UNIQUE,
    type                VARCHAR(20) NOT NULL DEFAULT 'monthly'
                        CHECK (type IN ('installation','monthly','other')),
    period_month        DATE,
    amount              DECIMAL(12,2) NOT NULL,
    discount_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
    due_date            DATE NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'unpaid'
                        CHECK (status IN ('unpaid','paid','overdue','cancelled')),
    paid_at             TIMESTAMP,
    created_at          TIMESTAMP DEFAULT now(),
    updated_at          TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- =========================================================
-- 9. PAYMENTS
-- =========================================================
CREATE TABLE payments (
    id                      BIGSERIAL PRIMARY KEY,
    invoice_id              BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    gateway                 VARCHAR(30) NOT NULL CHECK (gateway IN ('midtrans','xendit','manual','other')),
    gateway_transaction_id  VARCHAR(150),
    method                  VARCHAR(50),
    amount                  DECIMAL(12,2) NOT NULL,
    status                  VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','success','failed','expired')),
    paid_at                 TIMESTAMP,
    raw_payload             JSONB,
    created_at              TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_status ON payments(status);
-- Index buat query cepat ke dalam JSON payload kalau perlu audit
CREATE INDEX idx_payments_raw_payload ON payments USING GIN (raw_payload);

-- =========================================================
-- 10. ISOLIR_LOGS (audit trail isolir/restore)
-- =========================================================
CREATE TABLE isolir_logs (
    id                  BIGSERIAL PRIMARY KEY,
    subscription_id     BIGINT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    action              VARCHAR(10) NOT NULL CHECK (action IN ('isolir','restore')),
    reason              VARCHAR(255),
    triggered_by        VARCHAR(10) NOT NULL CHECK (triggered_by IN ('system','admin')),
    admin_id            BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_isolir_logs_subscription ON isolir_logs(subscription_id);

-- =========================================================
-- 11. NOTIFICATION_LOGS
-- =========================================================
CREATE TABLE notification_logs (
    id              BIGSERIAL PRIMARY KEY,
    customer_id     BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type            VARCHAR(30) NOT NULL CHECK (type IN ('reminder','isolir_notice','payment_success')),
    channel         VARCHAR(20) NOT NULL CHECK (channel IN ('whatsapp','email')),
    status          VARCHAR(20) NOT NULL CHECK (status IN ('sent','failed')),
    sent_at         TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_notification_logs_customer ON notification_logs(customer_id);

-- =========================================================
-- 12. TICKETS (komplain / keluhan pelanggan)
-- =========================================================
CREATE TABLE tickets (
    id                  BIGSERIAL PRIMARY KEY,
    customer_id         BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    subscription_id     BIGINT REFERENCES subscriptions(id) ON DELETE SET NULL,
    subject             VARCHAR(200) NOT NULL,
    description         TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','in_progress','resolved','closed')),
    priority            VARCHAR(10) NOT NULL DEFAULT 'medium'
                        CHECK (priority IN ('low','medium','high')),
    assigned_to         BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMP DEFAULT now(),
    resolved_at         TIMESTAMP
);

CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_status ON tickets(status);

-- =========================================================
-- 13. TICKET_REPLIES
-- =========================================================
CREATE TABLE ticket_replies (
    id              BIGSERIAL PRIMARY KEY,
    ticket_id       BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id         BIGINT REFERENCES users(id) ON DELETE SET NULL,
    message         TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_ticket_replies_ticket ON ticket_replies(ticket_id);

-- =========================================================
-- 14. ASSETS (inventori alat)
-- =========================================================
CREATE TABLE assets (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    category        VARCHAR(50) NOT NULL,
    sku             VARCHAR(50),
    stock_qty       INT NOT NULL DEFAULT 0,
    unit            VARCHAR(20) NOT NULL DEFAULT 'pcs',
    created_at      TIMESTAMP DEFAULT now(),
    updated_at      TIMESTAMP DEFAULT now()
);

-- =========================================================
-- 15. ASSET_MOVEMENTS (log keluar-masuk stok)
-- =========================================================
CREATE TABLE asset_movements (
    id                  BIGSERIAL PRIMARY KEY,
    asset_id            BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    type                VARCHAR(10) NOT NULL CHECK (type IN ('in','out')),
    qty                 INT NOT NULL,
    subscription_id     BIGINT REFERENCES subscriptions(id) ON DELETE SET NULL,
    note                VARCHAR(255),
    created_at          TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_asset_movements_asset ON asset_movements(asset_id);

-- =========================================================
-- TRIGGER: auto-update kolom updated_at
-- =========================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_packages_updated_at BEFORE UPDATE ON packages
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_assets_updated_at BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_odps_updated_at BEFORE UPDATE ON odps
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- Selesai. Total 15 tabel (belum termasuk tabel roles/permissions
-- yang akan digenerate otomatis oleh spatie/laravel-permission).
-- =========================================================
