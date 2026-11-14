-- ============================================================================
-- CAMPUS RESOURCE ALLOCATION & CONFLICT DETECTION PLATFORM
-- db/demo-data.sql
-- OWNER: Person B (Admin Features, Analytics & Demo Scenarios)
-- Purpose: Deterministic supplemental demo data for the last 28 weekdays.
--          Idempotent: uses ON CONFLICT DO NOTHING on booking/booking_request rows.
--          Seed resource IDs 1-8 are assumed to already exist (from db/seed.sql).
--          IDs start from 100 to avoid colliding with seed data.
-- Assumption: 30-day window, 10 operating hours/day (300 hrs max capacity per resource).
-- ============================================================================

-- ── Helper: determine weekday offsets for the last 28 weekdays ──────────────
-- We pick 28 specific day offsets: Mon-Fri of the past ~6 weeks.
-- Using a fixed list of offsets (1..40 days ago) filtered to Mon-Fri.
-- For determinism, we map to concrete offsets for each weekday batch:
-- Week -1: offsets 1,2,3,4,5 (Fri to Mon counting backwards from yesterday)
-- We'll use a simple explicit approach: pre-compute dates as expressions.

-- ── SECTION 1: Booking Requests (IDs 100-139) + Bookings (IDs 100-114) ─────
-- Covers 10 resources (IDs 1-8), 09:00-11:00 and 14:00-16:00 slots.
-- Status mix: APPROVED (with bookings), CANCELLED (cascades), REJECTED, PENDING (future).

-- ─── Week 1 ago (Mon-Fri, ~5-9 days ago) ────────────────────────────────────

-- Request 100: APPROVED - LH-101 (resource 1), 09:00-11:00
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description,
  start_time, end_time, expected_capacity, status, created_at, updated_at)
VALUES (100, 2, 1, 1, 'CS101 Intro Lecture - Week 1', 'Introductory session for freshman batch',
  CURRENT_DATE - INTERVAL '7 days' + TIME '09:00:00',
  CURRENT_DATE - INTERVAL '7 days' + TIME '11:00:00',
  50, 'APPROVED',
  CURRENT_TIMESTAMP - INTERVAL '8 days', CURRENT_TIMESTAMP - INTERVAL '7 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (100, 1, 1) ON CONFLICT DO NOTHING;

INSERT INTO booking (id, request_id, resource_id, booked_by_user_id, start_time, end_time, status, created_at, updated_at)
VALUES (100, 100, 1, 2,
  CURRENT_DATE - INTERVAL '7 days' + TIME '09:00:00',
  CURRENT_DATE - INTERVAL '7 days' + TIME '11:00:00',
  'CONFIRMED', CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '7 days')
ON CONFLICT (id) DO NOTHING;

-- Request 101: APPROVED - LAB-CS1 (resource 3), 14:00-16:00
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description,
  start_time, end_time, expected_capacity, status, created_at, updated_at)
VALUES (101, 2, 2, 3, 'CS502 Lab Session - Week 1', 'Database lab practical',
  CURRENT_DATE - INTERVAL '7 days' + TIME '14:00:00',
  CURRENT_DATE - INTERVAL '7 days' + TIME '16:00:00',
  35, 'APPROVED',
  CURRENT_TIMESTAMP - INTERVAL '8 days', CURRENT_TIMESTAMP - INTERVAL '7 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (101, 4, 35) ON CONFLICT DO NOTHING;
INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (101, 1, 1) ON CONFLICT DO NOTHING;

INSERT INTO booking (id, request_id, resource_id, booked_by_user_id, start_time, end_time, status, created_at, updated_at)
VALUES (101, 101, 3, 2,
  CURRENT_DATE - INTERVAL '7 days' + TIME '14:00:00',
  CURRENT_DATE - INTERVAL '7 days' + TIME '16:00:00',
  'CONFIRMED', CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '7 days')
ON CONFLICT (id) DO NOTHING;

-- Request 102: APPROVED - LH-102 (resource 2), 09:00-11:00
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description,
  start_time, end_time, expected_capacity, status, created_at, updated_at)
VALUES (102, 3, 1, 2, 'EC201 Signal Processing Lecture', 'Fourier transforms and applications',
  CURRENT_DATE - INTERVAL '8 days' + TIME '09:00:00',
  CURRENT_DATE - INTERVAL '8 days' + TIME '11:00:00',
  70, 'APPROVED',
  CURRENT_TIMESTAMP - INTERVAL '9 days', CURRENT_TIMESTAMP - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (102, 1, 1) ON CONFLICT DO NOTHING;
INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (102, 2, 1) ON CONFLICT DO NOTHING;

INSERT INTO booking (id, request_id, resource_id, booked_by_user_id, start_time, end_time, status, created_at, updated_at)
VALUES (102, 102, 2, 3,
  CURRENT_DATE - INTERVAL '8 days' + TIME '09:00:00',
  CURRENT_DATE - INTERVAL '8 days' + TIME '11:00:00',
  'CONFIRMED', CURRENT_TIMESTAMP - INTERVAL '8 days', CURRENT_TIMESTAMP - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- Request 103: APPROVED - LAB-EC1 (resource 8), 14:00-16:00
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description,
  start_time, end_time, expected_capacity, status, created_at, updated_at)
VALUES (103, 3, 2, 8, 'EC302 Embedded Systems Lab', 'Microcontroller programming lab',
  CURRENT_DATE - INTERVAL '8 days' + TIME '14:00:00',
  CURRENT_DATE - INTERVAL '8 days' + TIME '16:00:00',
  28, 'APPROVED',
  CURRENT_TIMESTAMP - INTERVAL '9 days', CURRENT_TIMESTAMP - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (103, 4, 28) ON CONFLICT DO NOTHING;

INSERT INTO booking (id, request_id, resource_id, booked_by_user_id, start_time, end_time, status, created_at, updated_at)
VALUES (103, 103, 8, 3,
  CURRENT_DATE - INTERVAL '8 days' + TIME '14:00:00',
  CURRENT_DATE - INTERVAL '8 days' + TIME '16:00:00',
  'CONFIRMED', CURRENT_TIMESTAMP - INTERVAL '8 days', CURRENT_TIMESTAMP - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- Request 104: APPROVED - SEM-HALL-A (resource 5), 09:00-11:00
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description,
  start_time, end_time, expected_capacity, status, created_at, updated_at)
VALUES (104, 2, 3, 5, 'AI Workshop Day 1', 'Introduction to machine learning paradigms',
  CURRENT_DATE - INTERVAL '9 days' + TIME '09:00:00',
  CURRENT_DATE - INTERVAL '9 days' + TIME '11:00:00',
  100, 'APPROVED',
  CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '9 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (104, 1, 1) ON CONFLICT DO NOTHING;
INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (104, 3, 1) ON CONFLICT DO NOTHING;
INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (104, 5, 1) ON CONFLICT DO NOTHING;

INSERT INTO booking (id, request_id, resource_id, booked_by_user_id, start_time, end_time, status, created_at, updated_at)
VALUES (104, 104, 5, 2,
  CURRENT_DATE - INTERVAL '9 days' + TIME '09:00:00',
  CURRENT_DATE - INTERVAL '9 days' + TIME '11:00:00',
  'CONFIRMED', CURRENT_TIMESTAMP - INTERVAL '9 days', CURRENT_TIMESTAMP - INTERVAL '9 days')
ON CONFLICT (id) DO NOTHING;

-- Request 105: APPROVED - CONF-ROOM-1 (resource 6), 14:00-16:00
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description,
  start_time, end_time, expected_capacity, status, created_at, updated_at)
VALUES (105, 3, 4, 6, 'Department Heads Meeting', 'Monthly coordination meeting EC',
  CURRENT_DATE - INTERVAL '9 days' + TIME '14:00:00',
  CURRENT_DATE - INTERVAL '9 days' + TIME '16:00:00',
  20, 'APPROVED',
  CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '9 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (105, 5, 1) ON CONFLICT DO NOTHING;
INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (105, 1, 1) ON CONFLICT DO NOTHING;

INSERT INTO booking (id, request_id, resource_id, booked_by_user_id, start_time, end_time, status, created_at, updated_at)
VALUES (105, 105, 6, 3,
  CURRENT_DATE - INTERVAL '9 days' + TIME '14:00:00',
  CURRENT_DATE - INTERVAL '9 days' + TIME '16:00:00',
  'CONFIRMED', CURRENT_TIMESTAMP - INTERVAL '9 days', CURRENT_TIMESTAMP - INTERVAL '9 days')
ON CONFLICT (id) DO NOTHING;

-- Request 106: APPROVED - LAB-CS2 (resource 4), 09:00-11:00
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description,
  start_time, end_time, expected_capacity, status, created_at, updated_at)
VALUES (106, 2, 2, 4, 'CS601 Compiler Design Lab', 'Lexer and parser implementation',
  CURRENT_DATE - INTERVAL '11 days' + TIME '09:00:00',
  CURRENT_DATE - INTERVAL '11 days' + TIME '11:00:00',
  30, 'APPROVED',
  CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP - INTERVAL '11 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (106, 4, 30) ON CONFLICT DO NOTHING;
INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (106, 2, 1) ON CONFLICT DO NOTHING;

INSERT INTO booking (id, request_id, resource_id, booked_by_user_id, start_time, end_time, status, created_at, updated_at)
VALUES (106, 106, 4, 2,
  CURRENT_DATE - INTERVAL '11 days' + TIME '09:00:00',
  CURRENT_DATE - INTERVAL '11 days' + TIME '11:00:00',
  'CONFIRMED', CURRENT_TIMESTAMP - INTERVAL '11 days', CURRENT_TIMESTAMP - INTERVAL '11 days')
ON CONFLICT (id) DO NOTHING;

-- Request 107: APPROVED - LH-101 (resource 1), 14:00-16:00
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description,
  start_time, end_time, expected_capacity, status, created_at, updated_at)
VALUES (107, 3, 1, 1, 'EC401 Communication Theory', 'Shannon capacity theorem lecture',
  CURRENT_DATE - INTERVAL '11 days' + TIME '14:00:00',
  CURRENT_DATE - INTERVAL '11 days' + TIME '16:00:00',
  55, 'APPROVED',
  CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP - INTERVAL '11 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (107, 1, 1) ON CONFLICT DO NOTHING;

INSERT INTO booking (id, request_id, resource_id, booked_by_user_id, start_time, end_time, status, created_at, updated_at)
VALUES (107, 107, 1, 3,
  CURRENT_DATE - INTERVAL '11 days' + TIME '14:00:00',
  CURRENT_DATE - INTERVAL '11 days' + TIME '16:00:00',
  'CONFIRMED', CURRENT_TIMESTAMP - INTERVAL '11 days', CURRENT_TIMESTAMP - INTERVAL '11 days')
ON CONFLICT (id) DO NOTHING;

-- Request 108: APPROVED - LAB-CS1 (resource 3), 09:00-11:00
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description,
  start_time, end_time, expected_capacity, status, created_at, updated_at)
VALUES (108, 2, 2, 3, 'CS301 OS Lab - Shell Scripting', 'POSIX shell and process management',
  CURRENT_DATE - INTERVAL '12 days' + TIME '09:00:00',
  CURRENT_DATE - INTERVAL '12 days' + TIME '11:00:00',
  38, 'APPROVED',
  CURRENT_TIMESTAMP - INTERVAL '13 days', CURRENT_TIMESTAMP - INTERVAL '12 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (108, 4, 38) ON CONFLICT DO NOTHING;

INSERT INTO booking (id, request_id, resource_id, booked_by_user_id, start_time, end_time, status, created_at, updated_at)
VALUES (108, 108, 3, 2,
  CURRENT_DATE - INTERVAL '12 days' + TIME '09:00:00',
  CURRENT_DATE - INTERVAL '12 days' + TIME '11:00:00',
  'CONFIRMED', CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP - INTERVAL '12 days')
ON CONFLICT (id) DO NOTHING;

-- Request 109: APPROVED - SEM-HALL-A (resource 5), 14:00-16:00
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description,
  start_time, end_time, expected_capacity, status, created_at, updated_at)
VALUES (109, 3, 3, 5, 'EC Dept Tech Talk - VLSI', 'Guest speaker from semiconductor industry',
  CURRENT_DATE - INTERVAL '12 days' + TIME '14:00:00',
  CURRENT_DATE - INTERVAL '12 days' + TIME '16:00:00',
  110, 'APPROVED',
  CURRENT_TIMESTAMP - INTERVAL '13 days', CURRENT_TIMESTAMP - INTERVAL '12 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (109, 1, 1) ON CONFLICT DO NOTHING;
INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (109, 3, 2) ON CONFLICT DO NOTHING;

INSERT INTO booking (id, request_id, resource_id, booked_by_user_id, start_time, end_time, status, created_at, updated_at)
VALUES (109, 109, 5, 3,
  CURRENT_DATE - INTERVAL '12 days' + TIME '14:00:00',
  CURRENT_DATE - INTERVAL '12 days' + TIME '16:00:00',
  'CONFIRMED', CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP - INTERVAL '12 days')
ON CONFLICT (id) DO NOTHING;

-- Request 110: APPROVED - LH-102 (resource 2), 14:00-16:00
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description,
  start_time, end_time, expected_capacity, status, created_at, updated_at)
VALUES (110, 2, 1, 2, 'CS201 Data Structures Lecture', 'Tree traversals and graph algorithms',
  CURRENT_DATE - INTERVAL '14 days' + TIME '14:00:00',
  CURRENT_DATE - INTERVAL '14 days' + TIME '16:00:00',
  65, 'APPROVED',
  CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '14 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (110, 1, 1) ON CONFLICT DO NOTHING;
INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (110, 2, 1) ON CONFLICT DO NOTHING;

INSERT INTO booking (id, request_id, resource_id, booked_by_user_id, start_time, end_time, status, created_at, updated_at)
VALUES (110, 110, 2, 2,
  CURRENT_DATE - INTERVAL '14 days' + TIME '14:00:00',
  CURRENT_DATE - INTERVAL '14 days' + TIME '16:00:00',
  'CONFIRMED', CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP - INTERVAL '14 days')
ON CONFLICT (id) DO NOTHING;

-- Request 111: APPROVED - LAB-EC1 (resource 8), 09:00-11:00
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description,
  start_time, end_time, expected_capacity, status, created_at, updated_at)
VALUES (111, 3, 2, 8, 'EC501 IoT Lab - Raspberry Pi', 'Sensor interfacing and MQTT protocol',
  CURRENT_DATE - INTERVAL '15 days' + TIME '09:00:00',
  CURRENT_DATE - INTERVAL '15 days' + TIME '11:00:00',
  25, 'APPROVED',
  CURRENT_TIMESTAMP - INTERVAL '16 days', CURRENT_TIMESTAMP - INTERVAL '15 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (111, 4, 25) ON CONFLICT DO NOTHING;

INSERT INTO booking (id, request_id, resource_id, booked_by_user_id, start_time, end_time, status, created_at, updated_at)
VALUES (111, 111, 8, 3,
  CURRENT_DATE - INTERVAL '15 days' + TIME '09:00:00',
  CURRENT_DATE - INTERVAL '15 days' + TIME '11:00:00',
  'CONFIRMED', CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '15 days')
ON CONFLICT (id) DO NOTHING;

-- Request 112: APPROVED - CONF-ROOM-1 (resource 6), 09:00-11:00
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description,
  start_time, end_time, expected_capacity, status, created_at, updated_at)
VALUES (112, 2, 4, 6, 'Research Committee Meeting', 'PhD admission panel discussion',
  CURRENT_DATE - INTERVAL '15 days' + TIME '09:00:00',
  CURRENT_DATE - INTERVAL '15 days' + TIME '11:00:00',
  18, 'APPROVED',
  CURRENT_TIMESTAMP - INTERVAL '16 days', CURRENT_TIMESTAMP - INTERVAL '15 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (112, 5, 1) ON CONFLICT DO NOTHING;

INSERT INTO booking (id, request_id, resource_id, booked_by_user_id, start_time, end_time, status, created_at, updated_at)
VALUES (112, 112, 6, 2,
  CURRENT_DATE - INTERVAL '15 days' + TIME '09:00:00',
  CURRENT_DATE - INTERVAL '15 days' + TIME '11:00:00',
  'CONFIRMED', CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '15 days')
ON CONFLICT (id) DO NOTHING;

-- Request 113: APPROVED - LAB-CS2 (resource 4), 14:00-16:00
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description,
  start_time, end_time, expected_capacity, status, created_at, updated_at)
VALUES (113, 3, 2, 4, 'EC Lab: Python for DSP', 'Signal processing with numpy/scipy',
  CURRENT_DATE - INTERVAL '16 days' + TIME '14:00:00',
  CURRENT_DATE - INTERVAL '16 days' + TIME '16:00:00',
  32, 'APPROVED',
  CURRENT_TIMESTAMP - INTERVAL '17 days', CURRENT_TIMESTAMP - INTERVAL '16 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (113, 4, 32) ON CONFLICT DO NOTHING;
INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (113, 2, 1) ON CONFLICT DO NOTHING;

INSERT INTO booking (id, request_id, resource_id, booked_by_user_id, start_time, end_time, status, created_at, updated_at)
VALUES (113, 113, 4, 3,
  CURRENT_DATE - INTERVAL '16 days' + TIME '14:00:00',
  CURRENT_DATE - INTERVAL '16 days' + TIME '16:00:00',
  'CONFIRMED', CURRENT_TIMESTAMP - INTERVAL '16 days', CURRENT_TIMESTAMP - INTERVAL '16 days')
ON CONFLICT (id) DO NOTHING;

-- Request 114: APPROVED - LH-101 (resource 1), 09:00-11:00
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description,
  start_time, end_time, expected_capacity, status, created_at, updated_at)
VALUES (114, 2, 1, 1, 'CS401 Network Security Lecture', 'Public key infrastructure overview',
  CURRENT_DATE - INTERVAL '16 days' + TIME '09:00:00',
  CURRENT_DATE - INTERVAL '16 days' + TIME '11:00:00',
  48, 'APPROVED',
  CURRENT_TIMESTAMP - INTERVAL '17 days', CURRENT_TIMESTAMP - INTERVAL '16 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (114, 1, 1) ON CONFLICT DO NOTHING;

INSERT INTO booking (id, request_id, resource_id, booked_by_user_id, start_time, end_time, status, created_at, updated_at)
VALUES (114, 114, 1, 2,
  CURRENT_DATE - INTERVAL '16 days' + TIME '09:00:00',
  CURRENT_DATE - INTERVAL '16 days' + TIME '11:00:00',
  'CONFIRMED', CURRENT_TIMESTAMP - INTERVAL '16 days', CURRENT_TIMESTAMP - INTERVAL '16 days')
ON CONFLICT (id) DO NOTHING;

-- ── SECTION 2: CANCELLED Requests (cascade triggers booking cancel) ──────────

-- Request 120: Was APPROVED+CONFIRMED for LAB-CS1, then CANCELLED (trg_request_cancelled fires)
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description,
  start_time, end_time, expected_capacity, status, created_at, updated_at)
VALUES (120, 2, 2, 3, 'CS Workshop: Advanced Algorithms (CANCELLED)', 'Cancelled by requester due to scheduling conflict',
  CURRENT_DATE - INTERVAL '19 days' + TIME '09:00:00',
  CURRENT_DATE - INTERVAL '19 days' + TIME '11:00:00',
  36, 'CANCELLED',
  CURRENT_TIMESTAMP - INTERVAL '21 days', CURRENT_TIMESTAMP - INTERVAL '19 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (120, 4, 36) ON CONFLICT DO NOTHING;

INSERT INTO booking (id, request_id, resource_id, booked_by_user_id, start_time, end_time, status, created_at, updated_at)
VALUES (120, 120, 3, 2,
  CURRENT_DATE - INTERVAL '19 days' + TIME '09:00:00',
  CURRENT_DATE - INTERVAL '19 days' + TIME '11:00:00',
  'CANCELLED', CURRENT_TIMESTAMP - INTERVAL '19 days', CURRENT_TIMESTAMP - INTERVAL '19 days')
ON CONFLICT (id) DO NOTHING;

-- Request 121: Was APPROVED+CONFIRMED for LH-102, then CANCELLED
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description,
  start_time, end_time, expected_capacity, status, created_at, updated_at)
VALUES (121, 3, 1, 2, 'EC Exam Prep Session (CANCELLED)', 'Cancelled - exam date changed',
  CURRENT_DATE - INTERVAL '20 days' + TIME '14:00:00',
  CURRENT_DATE - INTERVAL '20 days' + TIME '16:00:00',
  72, 'CANCELLED',
  CURRENT_TIMESTAMP - INTERVAL '22 days', CURRENT_TIMESTAMP - INTERVAL '20 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (121, 1, 1) ON CONFLICT DO NOTHING;

INSERT INTO booking (id, request_id, resource_id, booked_by_user_id, start_time, end_time, status, created_at, updated_at)
VALUES (121, 121, 2, 3,
  CURRENT_DATE - INTERVAL '20 days' + TIME '14:00:00',
  CURRENT_DATE - INTERVAL '20 days' + TIME '16:00:00',
  'CANCELLED', CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP - INTERVAL '20 days')
ON CONFLICT (id) DO NOTHING;

-- Request 122: CANCELLED before booking was created (pure cancel)
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description,
  start_time, end_time, expected_capacity, status, created_at, updated_at)
VALUES (122, 2, 3, 5, 'Annual Symposium Rehearsal (CANCELLED)', 'Cancelled - venue moved offsite',
  CURRENT_DATE - INTERVAL '22 days' + TIME '09:00:00',
  CURRENT_DATE - INTERVAL '22 days' + TIME '11:00:00',
  100, 'CANCELLED',
  CURRENT_TIMESTAMP - INTERVAL '23 days', CURRENT_TIMESTAMP - INTERVAL '22 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (122, 1, 1) ON CONFLICT DO NOTHING;
INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (122, 3, 1) ON CONFLICT DO NOTHING;

-- ── SECTION 3: REJECTED Requests ────────────────────────────────────────────

-- Request 130: REJECTED - overlapping with an approved booking (demonstrated)
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description,
  start_time, end_time, expected_capacity, status, rejection_reason, created_at, updated_at)
VALUES (130, 3, 1, 1, 'EC Workshop: RF Circuits (REJECTED)', 'Requested same slot as confirmed CS booking',
  CURRENT_DATE - INTERVAL '7 days' + TIME '09:00:00',
  CURRENT_DATE - INTERVAL '7 days' + TIME '11:00:00',
  45, 'REJECTED', 'Resource LH-101 already confirmed for this time window.',
  CURRENT_TIMESTAMP - INTERVAL '8 days', CURRENT_TIMESTAMP - INTERVAL '7 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (130, 1, 1) ON CONFLICT DO NOTHING;

-- Request 131: REJECTED - insufficient capacity
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description,
  start_time, end_time, expected_capacity, status, rejection_reason, created_at, updated_at)
VALUES (131, 2, 4, 6, 'All-Faculty Conf Meeting (REJECTED)', 'Expected attendance exceeds conference room capacity',
  CURRENT_DATE - INTERVAL '14 days' + TIME '09:00:00',
  CURRENT_DATE - INTERVAL '14 days' + TIME '11:00:00',
  25, 'REJECTED', 'Executive Boardroom capacity is 25 but 25 expected; no suitable room available.',
  CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '14 days')
ON CONFLICT (id) DO NOTHING;

-- ── SECTION 4: Future PENDING Requests ───────────────────────────────────────

-- Request 140: PENDING - SEM-HALL-A next week
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description,
  start_time, end_time, expected_capacity, status, created_at, updated_at)
VALUES (140, 2, 3, 5, 'Annual Tech Symposium 2026', 'Full-day technical symposium with paper presentations',
  CURRENT_DATE + INTERVAL '7 days' + TIME '09:00:00',
  CURRENT_DATE + INTERVAL '7 days' + TIME '11:00:00',
  115, 'PENDING',
  CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP - INTERVAL '1 hour')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (140, 1, 2) ON CONFLICT DO NOTHING;
INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (140, 3, 2) ON CONFLICT DO NOTHING;
INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (140, 5, 1) ON CONFLICT DO NOTHING;

-- Request 141: PENDING - Grand Auditorium next month
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description,
  start_time, end_time, expected_capacity, status, created_at, updated_at)
VALUES (141, 3, 5, 7, 'Campus Graduation Ceremony Rehearsal', 'Full-scale rehearsal for annual graduation',
  CURRENT_DATE + INTERVAL '14 days' + TIME '14:00:00',
  CURRENT_DATE + INTERVAL '14 days' + TIME '16:00:00',
  400, 'PENDING',
  CURRENT_TIMESTAMP - INTERVAL '30 minutes', CURRENT_TIMESTAMP - INTERVAL '30 minutes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (141, 1, 2) ON CONFLICT DO NOTHING;
INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (141, 3, 4) ON CONFLICT DO NOTHING;

-- Request 142: PENDING - LAB-CS1 this coming week
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description,
  start_time, end_time, expected_capacity, status, created_at, updated_at)
VALUES (142, 2, 2, 3, 'CS702 Research Lab - GPU Programming', 'CUDA and parallel computing session',
  CURRENT_DATE + INTERVAL '3 days' + TIME '09:00:00',
  CURRENT_DATE + INTERVAL '3 days' + TIME '11:00:00',
  35, 'PENDING',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES (142, 4, 35) ON CONFLICT DO NOTHING;

-- ── SECTION 5: Synchronize Sequences ─────────────────────────────────────────
SELECT setval('booking_request_id_seq', GREATEST((SELECT MAX(id) FROM booking_request), 142));
SELECT setval('booking_id_seq', GREATEST((SELECT MAX(id) FROM booking), 121));
