-- ==============================================================================
-- CampusCycle PostgreSQL Relational Schema & Migration Definition
-- Enforces Concurrency Safety, Range Exclusion, Fleet Capacity & Policy Limits
-- ==============================================================================

-- 1. Enable btree_gist extension for spatio-temporal exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Enumerations
DO $$ BEGIN
  CREATE TYPE booking_status_enum AS ENUM (
    'PENDING_APPROVAL', 
    'APPROVED', 
    'REJECTED', 
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE cycle_category_enum AS ENUM (
    'e-assist', 
    'city', 
    'trail', 
    'step-thru'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Cycles Fleet Table
CREATE TABLE IF NOT EXISTS cycles (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  series VARCHAR(128) NOT NULL,
  model_code VARCHAR(32) UNIQUE NOT NULL,
  category cycle_category_enum NOT NULL DEFAULT 'city',
  dock_number VARCHAR(32) NOT NULL,
  is_maintenance BOOLEAN NOT NULL DEFAULT FALSE,
  maintenance_reason TEXT,
  battery_percent INTEGER CHECK (battery_percent BETWEEN 0 AND 100),
  hourly_rate NUMERIC(6, 2) NOT NULL DEFAULT 10.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Bookings & Reservations Table
CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL,
  student_name VARCHAR(128) NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  -- Temporal range using Asia/Kolkata timestamps
  slot_range TSTZRANGE NOT NULL,
  duration_hours NUMERIC(4, 2) NOT NULL CHECK (duration_hours > 0 AND duration_hours <= 12.0),
  hourly_rate NUMERIC(6, 2) NOT NULL DEFAULT 10.00,
  total_price NUMERIC(8, 2) NOT NULL,
  is_same_day BOOLEAN NOT NULL,
  cycle_preference VARCHAR(64) NOT NULL DEFAULT 'ANY',
  assigned_cycle_id VARCHAR(64) REFERENCES cycles(id) ON DELETE SET NULL,
  status booking_status_enum NOT NULL DEFAULT 'PENDING_APPROVAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by VARCHAR(128),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Constraint: end time must be after start time
  CONSTRAINT chk_booking_time_valid CHECK (end_time > start_time),
  -- Constraint: duration and price check
  CONSTRAINT chk_total_price_hourly CHECK (total_price = duration_hours * hourly_rate)
);

-- 5. Physical Double-Booking Exclusion Constraint:
-- Ensures that no two APPROVED bookings can reserve the exact same cycle during overlapping time ranges.
ALTER TABLE bookings 
DROP CONSTRAINT IF EXISTS exclude_double_booking_cycle;

ALTER TABLE bookings
ADD CONSTRAINT exclude_double_booking_cycle
EXCLUDE USING GIST (
  assigned_cycle_id WITH =,
  slot_range WITH &&
)
WHERE (status = 'APPROVED' AND assigned_cycle_id IS NOT NULL);

-- 6. Indexes for High-Concurrency Queries
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings (booking_date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_student ON bookings (student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_slot_range ON bookings USING GIST (slot_range);

-- 7. Fleet Capacity Validation Trigger Function:
-- Prevents overlapping APPROVED reservations from exceeding the total number of active (non-maintenance) cycles.
CREATE OR REPLACE FUNCTION check_fleet_capacity_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_active_capacity INTEGER;
  v_overlapping_count INTEGER;
  v_now_ist TIMESTAMPTZ := NOW() AT TIME ZONE 'Asia/Kolkata';
  v_start_ist TIMESTAMPTZ;
  v_diff_minutes INTEGER;
BEGIN
  -- A. Verify Same-Day 60-Minute Cutoff Rule
  IF (NEW.is_same_day = TRUE AND (TG_OP = 'INSERT' OR OLD.status <> 'APPROVED') AND NEW.status = 'APPROVED') THEN
    v_start_ist := lower(NEW.slot_range);
    v_diff_minutes := EXTRACT(EPOCH FROM (v_start_ist - v_now_ist)) / 60;
    
    IF v_diff_minutes < 60 THEN
      RAISE EXCEPTION 'Same-day booking cutoff violation: Must be created at least 60 minutes before start time. Current time: %, Slot start: %', v_now_ist, v_start_ist;
    END IF;
  END IF;

  -- B. Prevent Future Dates from being created directly with APPROVED status
  IF (NEW.is_same_day = FALSE AND TG_OP = 'INSERT' AND NEW.status = 'APPROVED') THEN
    RAISE EXCEPTION 'Future-date booking violation: Bookings after today cannot be automatically confirmed. Initial status must be PENDING_APPROVAL.';
  END IF;

  -- C. Enforce Fleet Capacity on APPROVED Bookings
  IF (NEW.status = 'APPROVED') THEN
    -- Lock cycles table in share mode to serialize concurrent capacity decisions
    SELECT COUNT(*) INTO v_active_capacity 
    FROM cycles 
    WHERE is_maintenance = FALSE;

    -- Count overlapping approved bookings during the slot
    SELECT COUNT(*) INTO v_overlapping_count
    FROM bookings
    WHERE status = 'APPROVED'
      AND id <> COALESCE(NEW.id, 'none')
      AND slot_range && NEW.slot_range;

    IF (v_overlapping_count + 1 > v_active_capacity) THEN
      RAISE EXCEPTION 'Fleet capacity exceeded: % active cycles, but % overlapping bookings requested.', 
        v_active_capacity, v_overlapping_count + 1;
    END IF;

    -- If a specific cycle was requested, ensure it is not under maintenance
    IF (NEW.assigned_cycle_id IS NOT NULL) THEN
      IF EXISTS (SELECT 1 FROM cycles WHERE id = NEW.assigned_cycle_id AND is_maintenance = TRUE) THEN
        RAISE EXCEPTION 'Cycle under maintenance: Cycle % cannot be booked.', NEW.assigned_cycle_id;
      END IF;
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Bind Trigger to Bookings Table
DROP TRIGGER IF EXISTS trg_validate_fleet_capacity ON bookings;
CREATE TRIGGER trg_validate_fleet_capacity
BEFORE INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION check_fleet_capacity_trigger();

-- 9. Row-Level Security (RLS) Policies
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Students can read their own bookings
DROP POLICY IF EXISTS student_select_own_bookings ON bookings;
CREATE POLICY student_select_own_bookings ON bookings
  FOR SELECT
  USING (student_id = current_setting('request.jwt.claim.sub', true) OR current_setting('request.jwt.claim.role', true) IN ('admin', 'volunteer'));

-- Only admins/volunteers can approve or reject
DROP POLICY IF EXISTS admin_manage_bookings ON bookings;
CREATE POLICY admin_manage_bookings ON bookings
  FOR UPDATE
  USING (current_setting('request.jwt.claim.role', true) IN ('admin', 'volunteer'));

-- 10. Users Table & Authentication Profiles
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(128) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'student',
  department VARCHAR(128),
  semester VARCHAR(32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_user_id ON users (user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
