-- =========================================================
-- bTaskee-like Data Model v2 - PostgreSQL Script
-- PostgreSQL 14+ / 16+ recommended
-- Requires: pgcrypto, postgis
-- =========================================================

-- NOTE:
-- Run CREATE DATABASE separately if you are already inside Adminer/pgAdmin connected to a DB.
-- Example:
-- CREATE DATABASE btaskee_db;
-- Then connect to btaskee_db and run this script.

BEGIN;

-- =========================================================
-- Extensions
-- =========================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

-- =========================================================
-- Drop old objects
-- =========================================================
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS ticket_surveys CASCADE;
DROP TABLE IF EXISTS ticket_resolutions CASCADE;
DROP TABLE IF EXISTS ticket_status_logs CASCADE;
DROP TABLE IF EXISTS ticket_attachments CASCADE;
DROP TABLE IF EXISTS ticket_messages CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS customer_vouchers CASCADE;
DROP TABLE IF EXISTS incident_evidences CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS tasker_withdrawal_requests CASCADE;
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS booking_status_logs CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS vouchers CASCADE;
DROP TABLE IF EXISTS system_configs CASCADE;
DROP TABLE IF EXISTS peak_day_configs CASCADE;
DROP TABLE IF EXISTS pricing_configs CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS tasker_favorites CASCADE;
DROP TABLE IF EXISTS tasker_schedules CASCADE;
DROP TABLE IF EXISTS taskers CASCADE;
DROP TABLE IF EXISTS tasker_levels CASCADE;
DROP TABLE IF EXISTS customer_addresses CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS tasker_status CASCADE;
DROP TYPE IF EXISTS document_status CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS cancelled_by CASCADE;
DROP TYPE IF EXISTS wallet_owner_type CASCADE;
DROP TYPE IF EXISTS wallet_transaction_type CASCADE;
DROP TYPE IF EXISTS incident_status CASCADE;
DROP TYPE IF EXISTS document_type CASCADE;
DROP TYPE IF EXISTS withdrawal_status CASCADE;
DROP TYPE IF EXISTS voucher_type CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;

-- =========================================================
-- Enum types
-- =========================================================
CREATE TYPE user_role AS ENUM ('CUSTOMER', 'TASKER', 'ADMIN');
CREATE TYPE user_status AS ENUM ('ACTIVE','INACTIVE','BLOCKED','PENDING');
CREATE TYPE tasker_status AS ENUM ('PENDING','TRAINING','ACTIVE','SUSPENDED','REJECTED','TERMINATED');
CREATE TYPE document_status AS ENUM ('PENDING','APPROVED','REJECTED','EXPIRED');
CREATE TYPE booking_status AS ENUM ('POSTED','CONFIRMED','TASKER_ON_THE_WAY','CHECKED_IN','IN_PROGRESS','COMPLETED','CANCELLED','EXPIRED');
CREATE TYPE payment_method AS ENUM ('CASH','MOMO','ZALOPAY','VNPAY','VIETQR');
CREATE TYPE payment_status AS ENUM ('PENDING','PAID','FAILED','REFUNDED','PARTIALLY_REFUNDED');
CREATE TYPE cancelled_by AS ENUM ('CUSTOMER','TASKER','SYSTEM');
CREATE TYPE wallet_owner_type AS ENUM ('CUSTOMER','TASKER');
CREATE TYPE wallet_transaction_type AS ENUM ('DEPOSIT','WITHDRAW','PAYMENT','REFUND','PLATFORM_FEE','TASKER_EARNING','DEPOSIT_HOLD','DEPOSIT_DEDUCT','CANCELLATION_FEE','ADJUSTMENT');
CREATE TYPE incident_status AS ENUM ('REPORTED','INVESTIGATING','APPROVED','REJECTED','COMPENSATED','CLOSED');
CREATE TYPE document_type AS ENUM ('CITIZEN_ID','OTHER');
CREATE TYPE withdrawal_status AS ENUM ('PENDING','APPROVED','REJECTED','PROCESSED');
CREATE TYPE voucher_type AS ENUM ('PERCENT','FIXED');
CREATE TYPE notification_type AS ENUM (
  'BOOKING_CONFIRMED',
  'TASKER_ON_THE_WAY',
  'BOOKING_COMPLETED',
  'BOOKING_CANCELLED',
  'PAYMENT_SUCCESS',
  'PAYMENT_FAILED',
  'INCIDENT_UPDATE',
  'SUPPORT_REPLY',
  'PROMOTION',
  'SYSTEM'
);

-- =========================================================
-- 1. users
-- =========================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  role user_role NOT NULL,
  status user_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- =========================================================
-- 2. customers
-- =========================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  default_payment_method payment_method DEFAULT 'CASH',
  total_bookings INT DEFAULT 0,
  total_cancelled INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 3. customer_addresses
-- =========================================================
CREATE TABLE customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  label VARCHAR(100),
  full_address TEXT NOT NULL,
  ward_detail VARCHAR(255),
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  is_default BOOLEAN DEFAULT FALSE,
  has_pet BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customer_addresses_customer_id ON customer_addresses(customer_id);

-- =========================================================
-- 7. tasker_levels
-- Created before taskers because taskers.level_id references it
-- =========================================================
CREATE TABLE tasker_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  min_points INT NOT NULL,
  min_rating NUMERIC(3,2) DEFAULT 4.80 CHECK (min_rating >= 0 AND min_rating <= 5),
  min_completed_jobs INT DEFAULT 0,
  benefit_description TEXT,
  priority_weight INT DEFAULT 1
);

CREATE INDEX idx_tasker_levels_points ON tasker_levels(min_points);

-- =========================================================
-- 4. taskers
-- =========================================================
CREATE TABLE taskers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  working_address TEXT,
  status tasker_status DEFAULT 'PENDING',
  deposit_amount NUMERIC(12,2) DEFAULT 400000,
  current_deposit_balance NUMERIC(12,2) DEFAULT 400000,
  rating_avg NUMERIC(3,2) DEFAULT 5.00 CHECK (rating_avg >= 0 AND rating_avg <= 5),
  total_completed_jobs INT DEFAULT 0,
  total_working_hours NUMERIC(10,2) DEFAULT 0,
  total_points INT DEFAULT 0,
  level_id UUID REFERENCES tasker_levels(id) ON DELETE SET NULL ON UPDATE CASCADE,
  doc_type document_type,
  doc_id_number VARCHAR(50),
  doc_front_url TEXT,
  doc_back_url TEXT,
  doc_issued_date DATE,
  doc_expired_date DATE,
  doc_status document_status DEFAULT 'PENDING',
  doc_reviewed_at TIMESTAMP,
  doc_note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_taskers_level_id ON taskers(level_id);
CREATE INDEX idx_taskers_status ON taskers(status);

-- =========================================================
-- 5. tasker_schedules
-- =========================================================
CREATE TABLE tasker_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tasker_id UUID NOT NULL REFERENCES taskers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  CHECK (start_time < end_time)
);

CREATE INDEX idx_tasker_schedules_tasker_id ON tasker_schedules(tasker_id);
CREATE INDEX idx_tasker_schedules_lookup ON tasker_schedules(tasker_id, day_of_week, is_active);

-- =========================================================
-- 6. tasker_favorites
-- =========================================================
CREATE TABLE tasker_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  tasker_id UUID NOT NULL REFERENCES taskers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (customer_id, tasker_id)
);

CREATE INDEX idx_tasker_favorites_tasker_id ON tasker_favorites(tasker_id);

-- =========================================================
-- 8. services
-- =========================================================
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_duration_hours NUMERIC(4,1),
  coverage_area geometry(MULTIPOLYGON, 4326),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_services_is_active ON services(is_active);
CREATE INDEX idx_services_coverage_area ON services USING GIST(coverage_area);

-- =========================================================
-- 9. pricing_configs
-- =========================================================
CREATE TABLE pricing_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE ON UPDATE CASCADE,
  province_code VARCHAR(20) NOT NULL,
  duration_hours NUMERIC(4,1) NOT NULL,
  base_price NUMERIC(12,2) NOT NULL,
  peak_price NUMERIC(12,2),
  pet_fee NUMERIC(12,2) DEFAULT 0,
  waiting_fee NUMERIC(12,2) DEFAULT 0,
  platform_commission_rate NUMERIC(5,2) DEFAULT 20.00 CHECK (platform_commission_rate >= 0 AND platform_commission_rate <= 100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (service_id, province_code, duration_hours)
);

CREATE INDEX idx_pricing_configs_lookup ON pricing_configs(province_code, duration_hours, is_active);

-- =========================================================
-- 10. peak_day_configs
-- =========================================================
CREATE TABLE peak_day_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  start_at TIMESTAMP NOT NULL,
  end_at TIMESTAMP NOT NULL,
  peak_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (peak_rate >= 0),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (start_at < end_at)
);

CREATE INDEX idx_peak_day_configs_range ON peak_day_configs(start_at, end_at, is_active);

-- =========================================================
-- 11. system_configs
-- =========================================================
CREATE TABLE system_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 21. vouchers
-- Created before bookings because bookings.voucher_id references it
-- =========================================================
CREATE TABLE vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type voucher_type NOT NULL,
  value NUMERIC(12,2) NOT NULL CHECK (value >= 0),
  max_discount NUMERIC(12,2),
  min_order_amount NUMERIC(12,2) DEFAULT 0,
  usage_limit INT CHECK (usage_limit IS NULL OR usage_limit >= 0),
  used_count INT DEFAULT 0 CHECK (used_count >= 0),
  service_id UUID REFERENCES services(id) ON DELETE SET NULL ON UPDATE CASCADE,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vouchers_service_id ON vouchers(service_id);
CREATE INDEX idx_vouchers_active_dates ON vouchers(is_active, start_date, end_date);

-- =========================================================
-- 12. bookings
-- =========================================================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code VARCHAR(20) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  tasker_id UUID REFERENCES taskers(id) ON DELETE SET NULL ON UPDATE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  address TEXT NOT NULL,
  address_id UUID REFERENCES customer_addresses(id) ON DELETE SET NULL ON UPDATE CASCADE,
  note TEXT,
  scheduled_start_date DATE,
  scheduled_start_time TIME,
  scheduled_end_date DATE,
  scheduled_end_time TIME,
  duration_hours NUMERIC(4,1) NOT NULL CHECK (duration_hours > 0),
  status booking_status DEFAULT 'POSTED',
  base_price NUMERIC(12,2) NOT NULL,
  addon_price NUMERIC(12,2) DEFAULT 0,
  peak_fee NUMERIC(12,2) DEFAULT 0,
  pet_fee NUMERIC(12,2) DEFAULT 0,
  waiting_fee NUMERIC(12,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  total_price NUMERIC(12,2) NOT NULL CHECK (total_price >= 0),
  payment_method payment_method DEFAULT 'CASH',
  payment_status payment_status DEFAULT 'PENDING',
  voucher_id UUID REFERENCES vouchers(id) ON DELETE SET NULL ON UPDATE CASCADE,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_rule VARCHAR(255),
  checked_in_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    scheduled_start_date IS NULL OR scheduled_end_date IS NULL
    OR (scheduled_start_date + scheduled_start_time) < (scheduled_end_date + scheduled_end_time)
  )
);

CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_tasker_id ON bookings(tasker_id);
CREATE INDEX idx_bookings_service_id ON bookings(service_id);
CREATE INDEX idx_bookings_address_id ON bookings(address_id);
CREATE INDEX idx_bookings_voucher_id ON bookings(voucher_id);
CREATE INDEX idx_bookings_status_schedule ON bookings(status, scheduled_start_date, scheduled_start_time);

-- =========================================================
-- 14. payments
-- Created before booking_status_logs because booking_status_logs.payment_id references it
-- =========================================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE ON UPDATE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  method payment_method NOT NULL,
  status payment_status DEFAULT 'PENDING',
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  transaction_code VARCHAR(255),
  paid_at TIMESTAMP,
  refunded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_transaction_code ON payments(transaction_code);

-- =========================================================
-- 13. booking_status_logs
-- =========================================================
CREATE TABLE booking_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE ON UPDATE CASCADE,
  old_status booking_status,
  new_status booking_status NOT NULL,
  changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  note TEXT,
  cancelled_by cancelled_by,
  cancelled_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  cancel_reason TEXT,
  cancellation_fee NUMERIC(12,2) DEFAULT 0 CHECK (cancellation_fee >= 0),
  refund_amount NUMERIC(12,2) DEFAULT 0 CHECK (refund_amount >= 0),
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_booking_status_logs_booking_id ON booking_status_logs(booking_id);
CREATE INDEX idx_booking_status_logs_changed_by_user_id ON booking_status_logs(changed_by_user_id);
CREATE INDEX idx_booking_status_logs_cancelled_by_user_id ON booking_status_logs(cancelled_by_user_id);
CREATE INDEX idx_booking_status_logs_payment_id ON booking_status_logs(payment_id);
CREATE INDEX idx_booking_status_logs_created_at ON booking_status_logs(created_at);

-- =========================================================
-- 15. wallets
-- =========================================================
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type wallet_owner_type NOT NULL,
  customer_id UUID UNIQUE REFERENCES customers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  tasker_id UUID UNIQUE REFERENCES taskers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  balance NUMERIC(12,2) DEFAULT 0 CHECK (balance >= 0),
  hold_balance NUMERIC(12,2) DEFAULT 0 CHECK (hold_balance >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_wallet_owner CHECK (
    (owner_type = 'CUSTOMER' AND customer_id IS NOT NULL AND tasker_id IS NULL)
    OR
    (owner_type = 'TASKER' AND tasker_id IS NOT NULL AND customer_id IS NULL)
  )
);

CREATE INDEX idx_wallets_owner_type ON wallets(owner_type);

-- =========================================================
-- 16. wallet_transactions
-- =========================================================
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE ON UPDATE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL ON UPDATE CASCADE,
  reference_id UUID,
  reference_type VARCHAR(50),
  type wallet_transaction_type NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  balance_before NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_booking_id ON wallet_transactions(booking_id);
CREATE INDEX idx_wallet_transactions_reference ON wallet_transactions(reference_id, reference_type);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(created_at);

-- =========================================================
-- 17. tasker_withdrawal_requests
-- =========================================================
CREATE TABLE tasker_withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tasker_id UUID NOT NULL REFERENCES taskers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE ON UPDATE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  status withdrawal_status DEFAULT 'PENDING',
  bank_account VARCHAR(255),
  bank_name VARCHAR(100),
  note TEXT,
  reviewed_at TIMESTAMP,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasker_withdrawal_tasker_id ON tasker_withdrawal_requests(tasker_id);
CREATE INDEX idx_tasker_withdrawal_wallet_id ON tasker_withdrawal_requests(wallet_id);
CREATE INDEX idx_tasker_withdrawal_status ON tasker_withdrawal_requests(status);

-- =========================================================
-- 18. reviews
-- =========================================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE ON UPDATE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  tasker_id UUID NOT NULL REFERENCES taskers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  on_time_rating INT NOT NULL CHECK (on_time_rating BETWEEN 1 AND 5),
  friendly_rating INT NOT NULL CHECK (friendly_rating BETWEEN 1 AND 5),
  clean_rating INT NOT NULL CHECK (clean_rating BETWEEN 1 AND 5),
  cheerful_rating INT NOT NULL CHECK (cheerful_rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reviews_customer_id ON reviews(customer_id);
CREATE INDEX idx_reviews_tasker_id ON reviews(tasker_id);

-- =========================================================
-- 19. incidents
-- =========================================================
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE ON UPDATE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  tasker_id UUID NOT NULL REFERENCES taskers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  claimed_amount NUMERIC(12,2) CHECK (claimed_amount IS NULL OR claimed_amount >= 0),
  approved_compensation_amount NUMERIC(12,2) CHECK (approved_compensation_amount IS NULL OR approved_compensation_amount >= 0),
  compensation_source VARCHAR(50) CHECK (
    compensation_source IS NULL
    OR compensation_source IN ('TASKER_DEPOSIT','PLATFORM_FUND','MIXED')
  ),
  status incident_status DEFAULT 'REPORTED',
  reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

CREATE INDEX idx_incidents_booking_id ON incidents(booking_id);
CREATE INDEX idx_incidents_customer_id ON incidents(customer_id);
CREATE INDEX idx_incidents_tasker_id ON incidents(tasker_id);
CREATE INDEX idx_incidents_status ON incidents(status);

-- =========================================================
-- 20. incident_evidences
-- =========================================================
CREATE TABLE incident_evidences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE ON UPDATE CASCADE,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50) CHECK (file_type IS NULL OR file_type IN ('IMAGE','VIDEO')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_incident_evidences_incident_id ON incident_evidences(incident_id);

-- =========================================================
-- 22. customer_vouchers
-- =========================================================
CREATE TABLE customer_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (customer_id, voucher_id)
);

CREATE INDEX idx_customer_vouchers_voucher_id ON customer_vouchers(voucher_id);

-- =========================================================
-- 23. support_tickets (To-Be — feature Support Ticket)
-- =========================================================
-- Enum cho Support Ticket
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='support_ticket_status') THEN
    CREATE TYPE support_ticket_status AS ENUM ('NEW','IN_PROGRESS','PENDING','RESOLVED','CLOSED'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='ticket_category') THEN
    CREATE TYPE ticket_category AS ENUM ('SERVICE_QUALITY','TASKER_BEHAVIOR','SCHEDULING','PROPERTY_DAMAGE','PAYMENT_BILLING','ACCOUNT_TECHNICAL','OTHER'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='ticket_priority') THEN
    CREATE TYPE ticket_priority AS ENUM ('URGENT','HIGH','MEDIUM','LOW'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='ticket_source') THEN
    CREATE TYPE ticket_source AS ENUM ('CUSTOMER_APP','TASKER_APP','ADMIN'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='ticket_pending_reason') THEN
    CREATE TYPE ticket_pending_reason AS ENUM ('WAIT_CUSTOMER','WAIT_TASKER','WAIT_INTERNAL'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='resolution_type') THEN
    CREATE TYPE resolution_type AS ENUM ('EXPLANATION','RECLEAN','VOUCHER','REFUND','COMPENSATION','TASKER_PENALTY'); END IF;
END $$;

CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code VARCHAR(20),
  subject VARCHAR(255) NOT NULL,
  description TEXT,
  category ticket_category DEFAULT 'OTHER',
  subtype VARCHAR(100),
  priority ticket_priority DEFAULT 'MEDIUM',
  status support_ticket_status DEFAULT 'NEW',
  source ticket_source DEFAULT 'CUSTOMER_APP',
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL ON UPDATE CASCADE,
  reporter_user_id UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  counterparty_user_id UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  assigned_admin_id UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  first_response_due_at TIMESTAMP,
  resolution_due_at TIMESTAMP,
  first_responded_at TIMESTAMP,
  resolved_at TIMESTAMP,
  closed_at TIMESTAMP,
  sla_paused_at TIMESTAMP,
  sla_paused_accum_ms BIGINT DEFAULT 0,
  sla_breached BOOLEAN DEFAULT FALSE,
  pending_reason ticket_pending_reason,
  incident_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX uq_support_tickets_code ON support_tickets(ticket_code) WHERE ticket_code IS NOT NULL;
CREATE INDEX idx_st_status_priority_created ON support_tickets(status, priority, created_at);
CREATE INDEX idx_st_reporter ON support_tickets(reporter_user_id);
CREATE INDEX idx_st_booking ON support_tickets(booking_id);
CREATE INDEX idx_st_assigned ON support_tickets(assigned_admin_id);

-- Bảng con Support Ticket
CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE ON UPDATE CASCADE,
  sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  body TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_tm_ticket ON ticket_messages(ticket_id, created_at);

CREATE TABLE ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE ON UPDATE CASCADE,
  message_id UUID REFERENCES ticket_messages(id) ON DELETE CASCADE ON UPDATE CASCADE,
  url TEXT NOT NULL,
  public_id VARCHAR(255),
  uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ta_ticket ON ticket_attachments(ticket_id);

CREATE TABLE ticket_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE ON UPDATE CASCADE,
  old_status support_ticket_status,
  new_status support_ticket_status NOT NULL,
  changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_tsl_ticket ON ticket_status_logs(ticket_id, created_at);

CREATE TABLE ticket_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE ON UPDATE CASCADE,
  type resolution_type NOT NULL,
  amount NUMERIC(12,2),
  voucher_id UUID,
  reclean_booking_id UUID,
  proposed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  wallet_transaction_id UUID,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_tr_ticket ON ticket_resolutions(ticket_id);

CREATE TABLE ticket_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL UNIQUE REFERENCES support_tickets(id) ON DELETE CASCADE ON UPDATE CASCADE,
  rating SMALLINT CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  comment TEXT,
  submitted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 24. notifications
-- =========================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  type notification_type DEFAULT 'SYSTEM',
  reference_id UUID,
  reference_type VARCHAR(50) CHECK (
    reference_type IS NULL
    OR reference_type IN ('BOOKING','INCIDENT','SUPPORT_TICKET','PAYMENT')
  ),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_reference ON notifications(reference_id, reference_type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- =========================================================
-- Optional updated_at trigger helper
-- PostgreSQL does not have MySQL-style "ON UPDATE CURRENT_TIMESTAMP".
-- This trigger updates updated_at automatically.
-- =========================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_customer_addresses_updated_at
BEFORE UPDATE ON customer_addresses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_taskers_updated_at
BEFORE UPDATE ON taskers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_bookings_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_wallets_updated_at
BEFORE UPDATE ON wallets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_support_tickets_updated_at
BEFORE UPDATE ON support_tickets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_system_configs_updated_at
BEFORE UPDATE ON system_configs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- Seed default system configs
-- =========================================================
INSERT INTO system_configs (config_key, config_value, description) VALUES
('DEFAULT_COMMISSION_RATE', '20', 'Chiết khấu nền tảng mặc định (%)'),
('INCIDENT_REPORT_WINDOW_HOURS', '24', 'Thời hạn báo cáo sự cố sau ca (giờ)'),
('MIN_DEPOSIT_AMOUNT', '400000', 'Tiền cọc tối thiểu Tasker (VND)'),
('CANCELLATION_BEFORE_24H_RATE', '0', 'Phí huỷ trước 24h (%)'),
('CANCELLATION_BEFORE_4H_RATE', '30', 'Phí huỷ trong vòng 4–24h (%)'),
('CANCELLATION_UNDER_4H_RATE', '50', 'Phí huỷ trong vòng 4h (%)'),
('WITHDRAWAL_TIMES_PER_WEEK', '2', 'Số lần Tasker rút tiền/tuần'),
('TICKET_SLA_MATRIX', '{"URGENT":{"responseMins":15,"resolutionMins":240},"HIGH":{"responseMins":30,"resolutionMins":120},"MEDIUM":{"responseMins":120,"resolutionMins":1440},"LOW":{"responseMins":120,"resolutionMins":1440}}', 'Ma trận SLA ticket theo priority (phút)'),
('TICKET_CATEGORY_PRIORITY', '{"SERVICE_QUALITY":"MEDIUM","TASKER_BEHAVIOR":"HIGH","SCHEDULING":"HIGH","PROPERTY_DAMAGE":"URGENT","PAYMENT_BILLING":"MEDIUM","ACCOUNT_TECHNICAL":"LOW","OTHER":"LOW"}', 'Priority mặc định theo category'),
('TICKET_AUTOCLOSE_HOURS', '48', 'Giờ auto-close sau RESOLVED'),
('TICKET_COMPLAINT_WINDOW_DAYS', '7', 'Cửa sổ khiếu nại sau khi đơn COMPLETED'),
('TICKET_SLA_PAUSE_ON_WAIT_TASKER', 'true', 'Pause SLA khi chờ tasker');

COMMIT;

-- =========================================================
-- Quick check
-- =========================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- =========================================================
-- bTaskee-like Seed Data - PostgreSQL
-- Run this AFTER btaskee_postgresql_schema.sql
-- Requires existing tables and enum types
-- =========================================================

BEGIN;

-- =========================================================
-- 1. Seed users
-- Password hash below is dummy text for development only.
-- =========================================================
INSERT INTO users (id, full_name, email, phone, password_hash, avatar_url, role, status)
VALUES
('00000000-0000-0000-0000-000000000001', 'Nguyễn Văn An', 'customer.an@example.com', '0901000001', '$2b$10$dummy_customer_hash', NULL, 'CUSTOMER', 'ACTIVE'),
('00000000-0000-0000-0000-000000000002', 'Trần Thị Bình', 'customer.binh@example.com', '0901000002', '$2b$10$dummy_customer_hash', NULL, 'CUSTOMER', 'ACTIVE'),
('00000000-0000-0000-0000-000000000003', 'Lê Văn Cường', 'tasker.cuong@example.com', '0902000001', '$2b$10$dummy_tasker_hash', NULL, 'TASKER', 'ACTIVE'),
('00000000-0000-0000-0000-000000000004', 'Phạm Thị Dung', 'tasker.dung@example.com', '0902000002', '$2b$10$dummy_tasker_hash', NULL, 'TASKER', 'ACTIVE'),
('00000000-0000-0000-0000-000000000005', 'Admin System', 'admin@example.com', '0903000001', '$2b$10$dummy_admin_hash', NULL, 'ADMIN', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 2. Seed customers
-- =========================================================
INSERT INTO customers (id, user_id, default_payment_method, total_bookings, total_cancelled)
VALUES
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'CASH', 2, 0),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'MOMO', 1, 0)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 3. Seed customer addresses
-- =========================================================
INSERT INTO customer_addresses (
  id, customer_id, label, full_address, ward_detail,
  latitude, longitude, is_default, has_pet
)
VALUES
(
  '11000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Nhà riêng',
  '120 Trần Duy Hưng, phường Trung Hòa, quận Cầu Giấy, Hà Nội',
  'Tòa A, tầng 12',
  21.0072345,
  105.7945678,
  TRUE,
  FALSE
),
(
  '11000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002',
  'Chung cư',
  '88 Láng Hạ, phường Láng Hạ, quận Đống Đa, Hà Nội',
  'Căn 1508',
  21.0198765,
  105.8154321,
  TRUE,
  TRUE
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 4. Seed tasker levels
-- =========================================================
INSERT INTO tasker_levels (
  id, name, min_points, min_rating, min_completed_jobs,
  benefit_description, priority_weight
)
VALUES
('12000000-0000-0000-0000-000000000001', 'Bronze', 0, 4.50, 0, 'Level mặc định cho Tasker mới.', 1),
('12000000-0000-0000-0000-000000000002', 'Silver', 500, 4.70, 50, 'Ưu tiên nhận đơn hơn Bronze.', 2),
('12000000-0000-0000-0000-000000000003', 'Gold', 1500, 4.80, 150, 'Ưu tiên nhận đơn cao.', 3),
('12000000-0000-0000-0000-000000000004', 'Platinum', 3000, 4.90, 300, 'Ưu tiên nhận đơn cao nhất.', 5)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 5. Seed taskers
-- =========================================================
INSERT INTO taskers (
  id, user_id, working_address, status,
  deposit_amount, current_deposit_balance,
  rating_avg, total_completed_jobs, total_working_hours,
  total_points, level_id,
  doc_type, doc_id_number, doc_front_url, doc_back_url,
  doc_issued_date, doc_expired_date, doc_status, doc_reviewed_at, doc_note
)
VALUES
(
  '13000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000003',
  'Cầu Giấy, Hà Nội',
  'ACTIVE',
  400000, 400000,
  4.85, 85, 240,
  900, '12000000-0000-0000-0000-000000000002',
  'CITIZEN_ID', '001203000001',
  'https://example.com/docs/cuong-front.jpg',
  'https://example.com/docs/cuong-back.jpg',
  '2020-01-10', '2035-01-10',
  'APPROVED', CURRENT_TIMESTAMP, 'Giấy tờ hợp lệ'
),
(
  '13000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000004',
  'Đống Đa, Hà Nội',
  'ACTIVE',
  400000, 350000,
  4.92, 180, 520,
  1800, '12000000-0000-0000-0000-000000000003',
  'CITIZEN_ID', '001204000002',
  'https://example.com/docs/dung-front.jpg',
  'https://example.com/docs/dung-back.jpg',
  '2021-03-12', '2036-03-12',
  'APPROVED', CURRENT_TIMESTAMP, 'Giấy tờ hợp lệ'
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 6. Seed tasker schedules
-- =========================================================
INSERT INTO tasker_schedules (id, tasker_id, day_of_week, start_time, end_time, is_active)
VALUES
('14000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', 1, '08:00', '17:00', TRUE),
('14000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000001', 2, '08:00', '17:00', TRUE),
('14000000-0000-0000-0000-000000000003', '13000000-0000-0000-0000-000000000001', 3, '08:00', '17:00', TRUE),
('14000000-0000-0000-0000-000000000004', '13000000-0000-0000-0000-000000000002', 4, '09:00', '18:00', TRUE),
('14000000-0000-0000-0000-000000000005', '13000000-0000-0000-0000-000000000002', 5, '09:00', '18:00', TRUE),
('14000000-0000-0000-0000-000000000006', '13000000-0000-0000-0000-000000000002', 6, '09:00', '16:00', TRUE)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 7. Seed tasker favorites
-- =========================================================
INSERT INTO tasker_favorites (id, customer_id, tasker_id)
VALUES
('15000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001'),
('15000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 8. Seed services with sample Hanoi polygon
-- =========================================================
INSERT INTO services (
  id, name, description, base_duration_hours, coverage_area, is_active
)
VALUES
(
  '20000000-0000-0000-0000-000000000001',
  'Dọn dẹp nhà 2 giờ',
  'Dịch vụ dọn dẹp nhà cơ bản trong 2 giờ.',
  2.0,
  ST_GeomFromText(
    'MULTIPOLYGON(((105.7000 20.9500,105.9500 20.9500,105.9500 21.1500,105.7000 21.1500,105.7000 20.9500)))',
    4326
  ),
  TRUE
),
(
  '20000000-0000-0000-0000-000000000002',
  'Dọn dẹp nhà 3 giờ',
  'Dịch vụ dọn dẹp nhà cơ bản trong 3 giờ.',
  3.0,
  ST_GeomFromText(
    'MULTIPOLYGON(((105.7000 20.9500,105.9500 20.9500,105.9500 21.1500,105.7000 21.1500,105.7000 20.9500)))',
    4326
  ),
  TRUE
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 9. Seed pricing configs
-- =========================================================
INSERT INTO pricing_configs (
  id, service_id, province_code, duration_hours,
  base_price, peak_price, pet_fee, waiting_fee,
  platform_commission_rate, is_active
)
VALUES
(
  '21000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '01',
  2.0,
  180000, 220000, 30000, 50000, 20.00, TRUE
),
(
  '21000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002',
  '01',
  3.0,
  260000, 320000, 30000, 50000, 20.00, TRUE
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 10. Seed peak day configs
-- =========================================================
INSERT INTO peak_day_configs (id, name, start_at, end_at, peak_rate, is_active)
VALUES
(
  '22000000-0000-0000-0000-000000000001',
  'Tết Nguyên Đán 2026',
  '2026-02-14 00:00:00',
  '2026-02-22 23:59:59',
  50.00,
  TRUE
),
(
  '22000000-0000-0000-0000-000000000002',
  'Cuối tuần cao điểm',
  '2026-06-13 00:00:00',
  '2026-06-14 23:59:59',
  20.00,
  TRUE
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 11. Seed vouchers
-- =========================================================
INSERT INTO vouchers (
  id, code, name, description, type, value, max_discount,
  min_order_amount, usage_limit, used_count, service_id,
  start_date, end_date, is_active
)
VALUES
(
  '23000000-0000-0000-0000-000000000001',
  'WELCOME20',
  'Giảm 20% đơn đầu tiên',
  'Áp dụng cho khách hàng mới.',
  'PERCENT',
  20,
  50000,
  100000,
  1000,
  0,
  NULL,
  '2026-01-01 00:00:00',
  '2026-12-31 23:59:59',
  TRUE
),
(
  '23000000-0000-0000-0000-000000000002',
  'CLEAN50K',
  'Giảm 50K dịch vụ dọn dẹp',
  'Áp dụng cho dịch vụ dọn dẹp nhà.',
  'FIXED',
  50000,
  NULL,
  200000,
  500,
  0,
  '20000000-0000-0000-0000-000000000002',
  '2026-01-01 00:00:00',
  '2026-12-31 23:59:59',
  TRUE
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 12. Seed customer vouchers
-- =========================================================
INSERT INTO customer_vouchers (id, customer_id, voucher_id, is_used, used_at)
VALUES
('24000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', FALSE, NULL),
('24000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000002', FALSE, NULL)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 13. Seed bookings
-- =========================================================
INSERT INTO bookings (
  id, booking_code, customer_id, tasker_id, service_id,
  address, address_id, note,
  scheduled_start_date, scheduled_start_time, scheduled_end_date, scheduled_end_time, duration_hours, status,
  base_price, addon_price, peak_fee, pet_fee, waiting_fee,
  discount_amount, total_price, payment_method, payment_status,
  voucher_id, is_recurring, recurring_rule,
  checked_in_at, completed_at, cancelled_at
)
VALUES
(
  '30000000-0000-0000-0000-000000000001',
  'BTSK-20260608-00001',
  '10000000-0000-0000-0000-000000000001',
  '13000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '120 Trần Duy Hưng, phường Trung Hòa, quận Cầu Giấy, Hà Nội',
  '11000000-0000-0000-0000-000000000001',
  'Dọn phòng khách và bếp.',
  '2026-06-08', '09:00:00',
  '2026-06-08', '11:00:00',
  2.0,
  'COMPLETED',
  180000, 0, 0, 0, 0,
  0, 180000, 'CASH', 'PAID',
  NULL, FALSE, NULL,
  '2026-06-08 09:02:00',
  '2026-06-08 11:00:00',
  NULL
),
(
  '30000000-0000-0000-0000-000000000002',
  'BTSK-20260609-00001',
  '10000000-0000-0000-0000-000000000002',
  '13000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002',
  '88 Láng Hạ, phường Láng Hạ, quận Đống Đa, Hà Nội',
  '11000000-0000-0000-0000-000000000002',
  'Nhà có mèo, cần mang dụng cụ phù hợp.',
  '2026-06-09', '14:00:00',
  '2026-06-09', '17:00:00',
  3.0,
  'CONFIRMED',
  260000, 0, 0, 30000, 0,
  50000, 240000, 'MOMO', 'PAID',
  '23000000-0000-0000-0000-000000000002',
  FALSE, NULL,
  NULL, NULL, NULL
),
(
  '30000000-0000-0000-0000-000000000003',
  'BTSK-20260610-00001',
  '10000000-0000-0000-0000-000000000001',
  NULL,
  '20000000-0000-0000-0000-000000000002',
  '120 Trần Duy Hưng, phường Trung Hòa, quận Cầu Giấy, Hà Nội',
  '11000000-0000-0000-0000-000000000001',
  'Ưu tiên Tasker quen nếu rảnh.',
  '2026-06-10', '08:00:00',
  '2026-06-10', '11:00:00',
  3.0,
  'POSTED',
  260000, 0, 0, 0, 0,
  0, 260000, 'CASH', 'PENDING',
  NULL, FALSE, NULL,
  NULL, NULL, NULL
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 14. Seed payments
-- =========================================================
INSERT INTO payments (
  id, booking_id, customer_id, method, status,
  amount, transaction_code, paid_at, refunded_at
)
VALUES
(
  '31000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'CASH',
  'PAID',
  180000,
  'CASH-BTSK-20260608-00001',
  '2026-06-08 11:00:00',
  NULL
),
(
  '31000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002',
  'MOMO',
  'PAID',
  240000,
  'MOMO-20260609-ABC123',
  '2026-06-09 13:30:00',
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 15. Seed booking status logs
-- =========================================================
INSERT INTO booking_status_logs (
  id, booking_id, old_status, new_status,
  changed_by_user_id, note,
  cancelled_by, cancelled_by_user_id,
  cancel_reason, cancellation_fee, refund_amount,
  payment_id
)
VALUES
(
  '32000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  NULL,
  'POSTED',
  '00000000-0000-0000-0000-000000000001',
  'Khách tạo đơn.',
  NULL, NULL, NULL, 0, 0, NULL
),
(
  '32000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000001',
  'POSTED',
  'CONFIRMED',
  '00000000-0000-0000-0000-000000000003',
  'Tasker nhận đơn.',
  NULL, NULL, NULL, 0, 0, NULL
),
(
  '32000000-0000-0000-0000-000000000005',
  '30000000-0000-0000-0000-000000000001',
  'CONFIRMED',
  'IN_PROGRESS',
  '00000000-0000-0000-0000-000000000003',
  'Tasker bắt đầu ca làm.',
  NULL, NULL, NULL, 0, 0, NULL
),
(
  '32000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000001',
  'IN_PROGRESS',
  'COMPLETED',
  '00000000-0000-0000-0000-000000000003',
  'Hoàn thành ca làm.',
  NULL, NULL, NULL, 0, 0,
  '31000000-0000-0000-0000-000000000001'
),
(
  '32000000-0000-0000-0000-000000000004',
  '30000000-0000-0000-0000-000000000002',
  NULL,
  'CONFIRMED',
  '00000000-0000-0000-0000-000000000004',
  'Tasker xác nhận đơn.',
  NULL, NULL, NULL, 0, 0,
  '31000000-0000-0000-0000-000000000002'
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 16. Seed wallets
-- =========================================================
INSERT INTO wallets (
  id, owner_type, customer_id, tasker_id,
  balance, hold_balance
)
VALUES
(
  '40000000-0000-0000-0000-000000000001',
  'CUSTOMER',
  '10000000-0000-0000-0000-000000000001',
  NULL,
  500000,
  0
),
(
  '40000000-0000-0000-0000-000000000002',
  'CUSTOMER',
  '10000000-0000-0000-0000-000000000002',
  NULL,
  200000,
  0
),
(
  '40000000-0000-0000-0000-000000000003',
  'TASKER',
  NULL,
  '13000000-0000-0000-0000-000000000001',
  144000,
  0
),
(
  '40000000-0000-0000-0000-000000000004',
  'TASKER',
  NULL,
  '13000000-0000-0000-0000-000000000002',
  192000,
  0
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 17. Seed wallet transactions
-- =========================================================
INSERT INTO wallet_transactions (
  id, wallet_id, booking_id, reference_id, reference_type,
  type, amount, balance_before, balance_after, description
)
VALUES
(
  '41000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000001',
  'PAYMENT',
  'TASKER_EARNING',
  180000,
  0,
  180000,
  'Ghi nhận doanh thu gộp từ booking BTSK-20260608-00001.'
),
(
  '41000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000004',
  '30000000-0000-0000-0000-000000000002',
  '31000000-0000-0000-0000-000000000002',
  'PAYMENT',
  'TASKER_EARNING',
  192000,
  0,
  192000,
  'Tasker nhận 80% doanh thu từ booking BTSK-20260609-00001.'
),
(
  '41000000-0000-0000-0000-000000000003',
  '40000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000001',
  'PAYMENT',
  'PLATFORM_FEE',
  -36000,
  180000,
  144000,
  'Trừ 20% phí nền tảng từ booking BTSK-20260608-00001.'
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 18. Seed tasker withdrawal requests
-- =========================================================
INSERT INTO tasker_withdrawal_requests (
  id, tasker_id, wallet_id, amount, status,
  bank_account, bank_name, note,
  reviewed_at, processed_at
)
VALUES
(
  '42000000-0000-0000-0000-000000000001',
  '13000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000003',
  100000,
  'PENDING',
  '0123456789',
  'VCB',
  'Tasker yêu cầu rút tiền tuần này.',
  NULL,
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 19. Seed reviews
-- =========================================================
INSERT INTO reviews (
  id, booking_id, customer_id, tasker_id,
  rating, on_time_rating, friendly_rating,
  clean_rating, cheerful_rating, comment
)
VALUES
(
  '50000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '13000000-0000-0000-0000-000000000001',
  5, 5, 5, 5, 5,
  'Tasker đúng giờ, làm sạch và thái độ tốt.'
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 20. Seed incidents
-- =========================================================
INSERT INTO incidents (
  id, booking_id, customer_id, tasker_id,
  title, description,
  claimed_amount, approved_compensation_amount,
  compensation_source, status, reported_at, resolved_at
)
VALUES
(
  '51000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '13000000-0000-0000-0000-000000000001',
  'Trầy nhẹ mặt bàn',
  'Khách báo mặt bàn bị trầy nhẹ sau ca dọn dẹp.',
  100000,
  NULL,
  NULL,
  'REPORTED',
  '2026-06-08 13:00:00',
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 21. Seed incident evidences
-- =========================================================
INSERT INTO incident_evidences (
  id, incident_id, file_url, file_type
)
VALUES
(
  '52000000-0000-0000-0000-000000000001',
  '51000000-0000-0000-0000-000000000001',
  'https://example.com/evidences/table-scratch-1.jpg',
  'IMAGE'
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 22. Seed support tickets
-- =========================================================
INSERT INTO support_tickets (
  id, ticket_code, subject, description, category, priority, status, source,
  booking_id, reporter_user_id, counterparty_user_id, resolved_at
)
VALUES
(
  '60000000-0000-0000-0000-000000000001',
  'TK-20260609-0001',
  'Cần đổi giờ làm',
  'Khách muốn đổi lịch từ 14:00 sang 15:00.',
  'SCHEDULING', 'HIGH', 'NEW', 'CUSTOMER_APP',
  '30000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',  -- reporter: customer (user)
  NULL,
  NULL
),
(
  '60000000-0000-0000-0000-000000000002',
  'TK-20260608-0001',
  'Hỏi về thanh toán',
  'Tasker hỏi thời gian ghi nhận tiền về ví.',
  'PAYMENT_BILLING', 'MEDIUM', 'RESOLVED', 'TASKER_APP',
  '30000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000003',  -- reporter: tasker (user)
  NULL,
  '2026-06-08 18:00:00'
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 23. Seed notifications
-- =========================================================
INSERT INTO notifications (
  id, user_id, type, reference_id, reference_type,
  title, content, is_read
)
VALUES
(
  '70000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'BOOKING_COMPLETED',
  '30000000-0000-0000-0000-000000000001',
  'BOOKING',
  'Ca dọn dẹp đã hoàn thành',
  'Cảm ơn bạn đã sử dụng dịch vụ. Hãy đánh giá Tasker.',
  FALSE
),
(
  '70000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  'BOOKING_CONFIRMED',
  '30000000-0000-0000-0000-000000000002',
  'BOOKING',
  'Tasker đã nhận đơn',
  'Tasker Phạm Thị Dung đã xác nhận ca dọn dẹp của bạn.',
  FALSE
),
(
  '70000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000003',
  'PAYMENT_SUCCESS',
  '31000000-0000-0000-0000-000000000001',
  'PAYMENT',
  'Ghi nhận thu nhập',
  'Bạn vừa nhận 144.000đ từ ca BTSK-20260608-00001.',
  TRUE
),
(
  '70000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005',
  'INCIDENT_UPDATE',
  '51000000-0000-0000-0000-000000000001',
  'INCIDENT',
  'Có sự cố mới cần xử lý',
  'Khách báo cáo trầy nhẹ mặt bàn.',
  FALSE
)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- =========================================================
-- Quick check
-- =========================================================
SELECT 'users' AS table_name, COUNT(*) FROM users
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'taskers', COUNT(*) FROM taskers
UNION ALL SELECT 'services', COUNT(*) FROM services
UNION ALL SELECT 'pricing_configs', COUNT(*) FROM pricing_configs
UNION ALL SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL SELECT 'payments', COUNT(*) FROM payments
UNION ALL SELECT 'wallets', COUNT(*) FROM wallets
UNION ALL SELECT 'wallet_transactions', COUNT(*) FROM wallet_transactions
UNION ALL SELECT 'reviews', COUNT(*) FROM reviews
UNION ALL SELECT 'incidents', COUNT(*) FROM incidents
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications;
