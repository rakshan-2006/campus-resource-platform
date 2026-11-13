-- ============================================================================
-- CAMPUS RESOURCE ALLOCATION & CONFLICT DETECTION PLATFORM
-- Deterministic Seed Data (PostgreSQL 16)
-- ============================================================================

-- Clean existing data in reverse dependency order
TRUNCATE TABLE resource_request_facility, resource_facility, booking, maintenance, booking_request, resource, facility, resource_type, users, department RESTART IDENTITY CASCADE;

-- 1. Departments
INSERT INTO department (id, code, name) VALUES
(1, 'CS', 'Computer Science & Engineering'),
(2, 'EC', 'Electronics & Communication Engineering'),
(3, 'ME', 'Mechanical Engineering'),
(4, 'ADMIN', 'Campus Administration');

-- 2. Users (Admin and Faculty accounts)
-- Passwords:
-- admin@campus.edu : Admin@123
-- faculty1@campus.edu : Faculty@123
-- faculty2@campus.edu : Faculty@123
INSERT INTO users (id, department_id, email, password_hash, name, role) VALUES
(1, 4, 'admin@campus.edu', '$2a$10$gkYvPcZa1BgKfQZ.BqYV0utHV6/ZKalmTgpz1hKsQE3VcDSSM4DaS', 'Dr. Alan Turing (Admin)', 'ADMIN'),
(2, 1, 'faculty1@campus.edu', '$2a$10$E9J5r7QFWRd1XRujXufXGO8xzH.zdAv.VZCGQbleJ85iIqrZ3Fr.e', 'Dr. Grace Hopper (Faculty CS)', 'FACULTY'),
(3, 2, 'faculty2@campus.edu', '$2a$10$E9J5r7QFWRd1XRujXufXGO8xzH.zdAv.VZCGQbleJ85iIqrZ3Fr.e', 'Dr. Claude Shannon (Faculty EC)', 'FACULTY');

-- 3. Resource Types
INSERT INTO resource_type (id, code, name, description) VALUES
(1, 'CLASSROOM', 'Lecture Classroom', 'Standard tier classroom with stepped seating and acoustic panels'),
(2, 'COMPUTER_LAB', 'Computer Laboratory', 'Hands-on computing facility with networked desktop machines'),
(3, 'SEMINAR_HALL', 'Seminar Hall', 'Medium auditorium-style hall equipped for guest lectures and symposiums'),
(4, 'CONFERENCE_ROOM', 'Conference Room', 'Executive meeting room with round-table video conferencing facilities'),
(5, 'AUDITORIUM', 'Campus Auditorium', 'Large multipurpose performance and institutional gathering venue');

-- 4. Facilities
INSERT INTO facility (id, code, name, description) VALUES
(1, 'PROJECTOR', '4K Overhead Projector', 'Ceiling-mounted high-lumen laser projector with HDMI/Wireless input'),
(2, 'SMART_BOARD', 'Interactive Smart Board', '75-inch touch-enabled digital whiteboard with recording capabilities'),
(3, 'AUDIO_SYSTEM', 'Surround Sound Audio & Mics', 'Multichannel PA system with wireless lapel and handheld microphones'),
(4, 'WORKSTATIONS', 'High-End Workstations', 'Intel i9 / 32GB RAM / Dedicated GPU developer desktop terminals'),
(5, 'VIDEO_CONF', 'Video Conference Suite', 'Dual camera PTZ tracking with dedicated codec and display arrays'),
(6, 'AIR_CONDITIONING', 'Centralized HVAC', 'Climate-controlled cooling system suitable for full occupancy');

-- 5. Resources
INSERT INTO resource (id, resource_type_id, department_id, code, name, capacity, location, status) VALUES
(1, 1, 1, 'LH-101', 'Lecture Hall 101', 60, 'Main Academic Block, Floor 1', 'AVAILABLE'),
(2, 1, 3, 'LH-102', 'Lecture Hall 102', 80, 'Main Academic Block, Floor 1', 'AVAILABLE'),
(3, 2, 1, 'LAB-CS1', 'Alan Kay Computing Lab', 40, 'Turing IT Complex, Floor 2', 'AVAILABLE'),
(4, 2, 1, 'LAB-CS2', 'Ada Lovelace Systems Lab', 35, 'Turing IT Complex, Floor 2', 'AVAILABLE'),
(5, 3, 1, 'SEM-HALL-A', 'Sir C.V. Raman Seminar Hall', 120, 'Turing IT Complex, Floor 3', 'AVAILABLE'),
(6, 4, 4, 'CONF-ROOM-1', 'Executive Boardroom', 25, 'Administrative Tower, Floor 4', 'AVAILABLE'),
(7, 5, 4, 'AUD-CENTRAL', 'Campus Grand Auditorium', 450, 'Cultural Complex, Ground Floor', 'AVAILABLE'),
(8, 2, 2, 'LAB-EC1', 'Shannon DSP & Embedded Lab', 30, 'Maxwell EC Block, Floor 1', 'AVAILABLE');

-- 6. Resource Facilities (Junction table with positive quantities)
INSERT INTO resource_facility (resource_id, facility_id, quantity) VALUES
-- LH-101: Projector (1), Air Conditioning (1)
(1, 1, 1),
(1, 6, 1),
-- LH-102: Projector (1), Smart Board (1), Air Conditioning (1)
(2, 1, 1),
(2, 2, 1),
(2, 6, 1),
-- LAB-CS1: Workstations (40), Projector (1), Air Conditioning (1)
(3, 4, 40),
(3, 1, 1),
(3, 6, 1),
-- LAB-CS2: Workstations (35), Projector (1), Smart Board (1), Air Conditioning (1)
(4, 4, 35),
(4, 1, 1),
(4, 2, 1),
(4, 6, 1),
-- SEM-HALL-A: Projector (2), Audio System (2), Video Conference (1), Air Conditioning (1)
(5, 1, 2),
(5, 3, 2),
(5, 5, 1),
(5, 6, 1),
-- CONF-ROOM-1: Projector (1), Audio System (1), Video Conference (1), Air Conditioning (1)
(6, 1, 1),
(6, 3, 1),
(6, 5, 1),
(6, 6, 1),
-- AUD-CENTRAL: Projector (2), Audio System (4), Air Conditioning (1)
(7, 1, 2),
(7, 3, 4),
(7, 6, 1),
-- LAB-EC1: Workstations (30), Projector (1)
(8, 4, 30),
(8, 1, 1);

-- 7. Booking Requests
-- Request 1: Approved request for LH-101
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description, start_time, end_time, expected_capacity, status, created_at, updated_at) VALUES
(1, 2, 1, 1, 'CS301 Algorithms Midterm Review', 'Comprehensive problem-solving session for 50 undergraduate students', '2026-11-20 09:00:00', '2026-11-20 11:00:00', 50, 'APPROVED', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '1 day');

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES
(1, 1, 1);

-- Resulting Booking 1 for Request 1 (One-to-one constraint respected)
INSERT INTO booking (id, request_id, resource_id, booked_by_user_id, start_time, end_time, status, created_at, updated_at) VALUES
(1, 1, 1, 2, '2026-11-20 09:00:00', '2026-11-20 11:00:00', 'CONFIRMED', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day');

-- Request 2: Approved request for LAB-CS1
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description, start_time, end_time, expected_capacity, status, created_at, updated_at) VALUES
(2, 2, 2, 3, 'CS502 Distributed Systems Lab Exam', 'Practical database & socket programming assessment', '2026-11-20 14:00:00', '2026-11-20 17:00:00', 35, 'APPROVED', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '1 day');

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES
(2, 4, 35),
(2, 1, 1);

-- Resulting Booking 2 for Request 2
INSERT INTO booking (id, request_id, resource_id, booked_by_user_id, start_time, end_time, status, created_at, updated_at) VALUES
(2, 2, 3, 2, '2026-11-20 14:00:00', '2026-11-20 17:00:00', 'CONFIRMED', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day');

-- Request 3: Pending request by Faculty 2 for Seminar Hall
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description, start_time, end_time, expected_capacity, status, created_at, updated_at) VALUES
(3, 3, 3, 5, 'IEEE Distinguished Lecture: Quantum Computing', 'Guest lecture by visiting IEEE Fellow with remote speakers', '2026-11-21 10:00:00', '2026-11-21 12:30:00', 100, 'PENDING', CURRENT_TIMESTAMP - INTERVAL '4 hours', CURRENT_TIMESTAMP - INTERVAL '4 hours');

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES
(3, 1, 1),
(3, 3, 1),
(3, 5, 1);

-- Request 4: Pending request by Faculty 1 for LH-101 (Afternoon slot)
INSERT INTO booking_request (id, user_id, resource_type_id, preferred_resource_id, title, description, start_time, end_time, expected_capacity, status, created_at, updated_at) VALUES
(4, 2, 1, 1, 'Database Internals Workshop', 'Hands-on query execution plan analysis and index tuning walkthrough', '2026-11-20 13:00:00', '2026-11-20 15:00:00', 45, 'PENDING', CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '2 hours');

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES
(4, 1, 1);

-- 8. Maintenance Records
-- Scheduled maintenance for LH-102
INSERT INTO maintenance (id, resource_id, scheduled_by_user_id, start_time, end_time, status, reason, notes) VALUES
(1, 2, 1, '2026-11-22 08:00:00', '2026-11-22 13:00:00', 'SCHEDULED', 'Smart Board Firmware & Touch Calibration', 'Technician visit from vendor for hardware recalibration and pen replacement');

-- Synchronize sequence values to prevent duplicate key errors on subsequent inserts
SELECT setval('department_id_seq', (SELECT MAX(id) FROM department));
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('resource_type_id_seq', (SELECT MAX(id) FROM resource_type));
SELECT setval('resource_id_seq', (SELECT MAX(id) FROM resource));
SELECT setval('facility_id_seq', (SELECT MAX(id) FROM facility));
SELECT setval('booking_request_id_seq', (SELECT MAX(id) FROM booking_request));
SELECT setval('booking_id_seq', (SELECT MAX(id) FROM booking));
SELECT setval('maintenance_id_seq', (SELECT MAX(id) FROM maintenance));
