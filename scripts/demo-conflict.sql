-- ============================================================================
-- CAMPUS RESOURCE ALLOCATION & CONFLICT DETECTION PLATFORM
-- scripts/demo-conflict.sql
-- Demonstration Script: Intentional Overlapping Booking Conflict
-- OWNER: Person B
-- ============================================================================
-- Purpose:
-- This script demonstrates that PostgreSQL engine-level GiST exclusion constraint
-- 'exclude_overlapping_confirmed_bookings' strictly prevents concurrent or
-- overlapping CONFIRMED reservations for the same resource.
--
-- Constraint Definition from db/schema.sql:
--   CONSTRAINT exclude_overlapping_confirmed_bookings 
--     EXCLUDE USING gist (
--       resource_id WITH =, 
--       tsrange(start_time, end_time) WITH &&
--     ) WHERE (status = 'CONFIRMED');
--
-- How to run:
--   psql -U postgres -d campus_db -f scripts/demo-conflict.sql
-- ============================================================================

\echo '===================================================================='
\echo 'DEMO: Testing GiST Exclusion Constraint against Overlapping Bookings'
\echo '===================================================================='

-- Ensure we run within a transaction block
BEGIN;

-- 1. Insert a baseline confirmed booking for Resource 1 (Lecture Hall 101)
-- Interval: 2027-02-15 09:00 to 11:00
\echo 'Step 1: Inserting initial CONFIRMED booking (09:00 - 11:00)...'
INSERT INTO booking_request (
  id, user_id, resource_type_id, preferred_resource_id, title,
  start_time, end_time, expected_capacity, status
) VALUES (
  901, 2, 1, 1, 'Conflict Demo: Baseline Lecture',
  '2027-02-15 09:00:00', '2027-02-15 11:00:00', 40, 'APPROVED'
);

INSERT INTO booking (
  id, request_id, resource_id, booked_by_user_id,
  start_time, end_time, status
) VALUES (
  901, 901, 1, 2,
  '2027-02-15 09:00:00', '2027-02-15 11:00:00', 'CONFIRMED'
);
\echo '✓ Step 1 Success: Initial booking #901 confirmed.'

-- 2. Attempt to insert an overlapping confirmed booking for the SAME Resource 1
-- Interval: 2027-02-15 10:00 to 12:00 (Overlaps 10:00 - 11:00)
-- EXPECTED OUTCOME: PostgreSQL will immediately abort with SQLSTATE 23P01:
-- ERROR: conflicting key value violates exclusion constraint "exclude_overlapping_confirmed_bookings"
-- DETAIL: Key (resource_id, tsrange(start_time, end_time))=(1, ["2027-02-15 10:00:00","2027-02-15 12:00:00")) conflicts with existing key (resource_id, tsrange(start_time, end_time))=(1, ["2027-02-15 09:00:00","2027-02-15 11:00:00")).

\echo 'Step 2: Attempting conflicting booking for Resource 1 (10:00 - 12:00)...'
INSERT INTO booking_request (
  id, user_id, resource_type_id, preferred_resource_id, title,
  start_time, end_time, expected_capacity, status
) VALUES (
  902, 3, 1, 1, 'Conflict Demo: Colliding Seminar',
  '2027-02-15 10:00:00', '2027-02-15 12:00:00', 30, 'APPROVED'
);

-- This statement MUST fail with exclusion constraint violation
INSERT INTO booking (
  id, request_id, resource_id, booked_by_user_id,
  start_time, end_time, status
) VALUES (
  902, 902, 1, 3,
  '2027-02-15 10:00:00', '2027-02-15 12:00:00', 'CONFIRMED'
);

-- If the above did not throw an error, roll back
ROLLBACK;
