-- ============================================================================
-- CAMPUS RESOURCE ALLOCATION & CONFLICT DETECTION PLATFORM
-- db/seed-clubs.sql
-- Deterministic seed data for Club accounts, Advisor relationships,
-- Pending Registrations, and Multi-Stage Event Requests.
-- ============================================================================

BEGIN;

-- 1. Ensure Student Affairs Department exists
INSERT INTO department (id, code, name)
VALUES (5, 'SA', 'Student Affairs & Campus Clubs')
ON CONFLICT (code) DO NOTHING;

-- 2. Seed Club Accounts and Pending Faculty
-- Passwords:
-- Club@123 : $2a$10$m8Bl3WwiflnW2lNFh65R/eOHICDoec8pHDqmTXCihoPeU7FoTK0um
-- Faculty@123 : $2a$10$E9J5r7QFWRd1XRujXufXGO8xzH.zdAv.VZCGQbleJ85iIqrZ3Fr.e

-- Club 1: ACM Student Chapter (Approved, Advised by Dr. Grace Hopper)
INSERT INTO users (id, department_id, email, password_hash, name, role, verification_status, verified_at, verified_by_user_id)
VALUES (
    10, 5, 'club1@campus.edu',
    '$2a$10$m8Bl3WwiflnW2lNFh65R/eOHICDoec8pHDqmTXCihoPeU7FoTK0um',
    'ACM Student Chapter',
    'CLUB',
    'APPROVED',
    CURRENT_TIMESTAMP - INTERVAL '30 days',
    1
)
ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    verification_status = EXCLUDED.verification_status;

-- Club 2: Robotics & Automation Society (Approved, Advised by Dr. Claude Shannon)
INSERT INTO users (id, department_id, email, password_hash, name, role, verification_status, verified_at, verified_by_user_id)
VALUES (
    11, 5, 'club2@campus.edu',
    '$2a$10$m8Bl3WwiflnW2lNFh65R/eOHICDoec8pHDqmTXCihoPeU7FoTK0um',
    'Robotics & Automation Society',
    'CLUB',
    'APPROVED',
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    1
)
ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    verification_status = EXCLUDED.verification_status;

-- Club 3: Design & Innovation Guild (Pending Admin Verification & Pending Advisor Acceptance)
INSERT INTO users (id, department_id, email, password_hash, name, role, verification_status)
VALUES (
    12, 5, 'pending.club@campus.edu',
    '$2a$10$m8Bl3WwiflnW2lNFh65R/eOHICDoec8pHDqmTXCihoPeU7FoTK0um',
    'Design & Innovation Guild',
    'CLUB',
    'PENDING'
)
ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    verification_status = EXCLUDED.verification_status;

-- Faculty 3: Dr. John von Neumann (Pending Admin Verification)
INSERT INTO users (id, department_id, email, password_hash, name, role, verification_status)
VALUES (
    13, 1, 'pending.faculty@campus.edu',
    '$2a$10$E9J5r7QFWRd1XRujXufXGO8xzH.zdAv.VZCGQbleJ85iIqrZ3Fr.e',
    'Dr. John von Neumann (Applicant)',
    'FACULTY',
    'PENDING'
)
ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    verification_status = EXCLUDED.verification_status;

-- 3. Club Profiles
INSERT INTO club_profile (id, user_id, club_name, lead_name, lead_phone, category, description, founded_year)
VALUES (
    1, 10, 'ACM Student Chapter', 'Aditya Sharma', '+91 98765 43210', 'Technical',
    'Premier campus computing society organizing hackathons, open-source sprints, and technical workshops.',
    2018
)
ON CONFLICT (id) DO UPDATE SET
    club_name = EXCLUDED.club_name,
    lead_name = EXCLUDED.lead_name;

INSERT INTO club_profile (id, user_id, club_name, lead_name, lead_phone, category, description, founded_year)
VALUES (
    2, 11, 'Robotics & Automation Society', 'Pooja Hegde', '+91 98765 43211', 'Technical',
    'Hands-on engineering collective specializing in autonomous ground robotics, aerial drones, and IoT.',
    2020
)
ON CONFLICT (id) DO UPDATE SET
    club_name = EXCLUDED.club_name,
    lead_name = EXCLUDED.lead_name;

INSERT INTO club_profile (id, user_id, club_name, lead_name, lead_phone, category, description, founded_year)
VALUES (
    3, 12, 'Design & Innovation Guild', 'Rohan Verma', '+91 98765 43212', 'Cultural',
    'Creative design collective exploring UI/UX, generative art, and interdisciplinary product prototyping.',
    2023
)
ON CONFLICT (id) DO UPDATE SET
    club_name = EXCLUDED.club_name,
    lead_name = EXCLUDED.lead_name;

-- 4. Club Advisor Relationships
-- Club 1 advised by Dr. Grace Hopper (User 2) -> ACCEPTED
INSERT INTO club_advisor (id, club_id, faculty_user_id, status, assigned_at, responded_at, notes)
VALUES (
    1, 1, 2, 'ACCEPTED',
    CURRENT_TIMESTAMP - INTERVAL '30 days',
    CURRENT_TIMESTAMP - INTERVAL '29 days',
    'Faculty advisor accepted during annual charter renewal.'
)
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    faculty_user_id = EXCLUDED.faculty_user_id;

-- Club 2 advised by Dr. Claude Shannon (User 3) -> ACCEPTED
INSERT INTO club_advisor (id, club_id, faculty_user_id, status, assigned_at, responded_at, notes)
VALUES (
    2, 2, 3, 'ACCEPTED',
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    CURRENT_TIMESTAMP - INTERVAL '19 days',
    'Faculty advisor accepted sponsorship for technical projects.'
)
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    faculty_user_id = EXCLUDED.faculty_user_id;

-- Club 3 invited Dr. Grace Hopper (User 2) -> PENDING acceptance
INSERT INTO club_advisor (id, club_id, faculty_user_id, status, assigned_at, notes)
VALUES (
    3, 3, 2, 'PENDING',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    'Nomination submitted during club charter application.'
)
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    faculty_user_id = EXCLUDED.faculty_user_id;

-- 5. Club Booking Requests & Reviews Demo Data
-- Clean any prior seed records
DELETE FROM booking WHERE id IN (10, 11);
DELETE FROM request_review_history WHERE request_id IN (201, 202, 203, 204, 205);
DELETE FROM resource_request_facility WHERE request_id IN (201, 202, 203, 204, 205);
DELETE FROM booking_request WHERE id IN (201, 202, 203, 204, 205);

-- ----------------------------------------------------------------------------
-- CLUB 1: ACM Student Chapter (Advised by Dr. Grace Hopper)
-- ----------------------------------------------------------------------------

-- Request 201: Awaiting Faculty Advisor Endorsement (Shows in Dr. Grace Hopper's Inbox!)
INSERT INTO booking_request (
    id, user_id, resource_type_id, preferred_resource_id, title, description,
    start_time, end_time, expected_capacity, status, request_type, club_id,
    advisor_review_status, event_type, expected_guests, equipment_notes, created_at, updated_at
) VALUES (
    201, 10, 3, 5, 'HackCampus 2027: 24-Hour Code Sprint',
    'Flagship annual campus hackathon featuring 25 student teams building AI solutions for community logistics and accessibility.',
    CURRENT_DATE + INTERVAL '7 days' + TIME '09:00:00',
    CURRENT_DATE + INTERVAL '7 days' + TIME '21:00:00',
    100, 'PENDING', 'CLUB', 1,
    'PENDING_ADVISOR', 'Hackathon', '15 Industry mentors from Google Cloud & Red Hat',
    'High-power distribution strips and gigabit network drops required.',
    CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day'
);

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity)
VALUES (201, 1, 1), (201, 3, 1);

INSERT INTO request_review_history (request_id, reviewer_user_id, action, comments, created_at)
VALUES (201, 10, 'SUBMITTED', 'Event proposal submitted by club president for faculty advisor review.', CURRENT_TIMESTAMP - INTERVAL '1 day');

-- Request 202: Confirmed & Allocated Venue (Shows under Upcoming Bookings!)
INSERT INTO booking_request (
    id, user_id, resource_type_id, preferred_resource_id, title, description,
    start_time, end_time, expected_capacity, status, request_type, club_id,
    advisor_review_status, event_type, expected_guests, equipment_notes, created_at, updated_at
) VALUES (
    202, 10, 1, 1, 'Competitive Programming Spring Bootcamp',
    'Hands-on problem-solving intensive covering dynamic programming, graph theory, and algorithmic complexity for ICPC aspirants.',
    CURRENT_DATE + INTERVAL '3 days' + TIME '14:00:00',
    CURRENT_DATE + INTERVAL '3 days' + TIME '17:00:00',
    50, 'APPROVED', 'CLUB', 1,
    'ENDORSED', 'Technical Workshop', 'None',
    'HDMI wireless clicker and audio lapel mic.',
    CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '1 day'
);

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity)
VALUES (202, 1, 1);

INSERT INTO booking (id, request_id, resource_id, booked_by_user_id, start_time, end_time, status, created_at, updated_at)
VALUES (
    10, 202, 1, 10,
    CURRENT_DATE + INTERVAL '3 days' + TIME '14:00:00',
    CURRENT_DATE + INTERVAL '3 days' + TIME '17:00:00',
    'CONFIRMED',
    CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day'
);

INSERT INTO request_review_history (request_id, reviewer_user_id, action, comments, created_at)
VALUES 
(202, 10, 'SUBMITTED', 'Bootcamp proposal submitted by ACM Student Chapter.', CURRENT_TIMESTAMP - INTERVAL '3 days'),
(202, 2, 'ENDORSED', 'Strongly endorsed. Curriculum reviewed and aligned with competitive programming training.', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(202, 1, 'APPROVED_BY_ADMIN', 'Lecture Hall 101 allocated and reservation confirmed with AV support.', CURRENT_TIMESTAMP - INTERVAL '1 day');

-- Request 203: Returned / Rejected with Feedback (Shows Rejection & Feedback Modal!)
INSERT INTO booking_request (
    id, user_id, resource_type_id, preferred_resource_id, title, description,
    start_time, end_time, expected_capacity, status, request_type, club_id,
    advisor_review_status, event_type, expected_guests, equipment_notes, rejection_reason, created_at, updated_at
) VALUES (
    203, 10, 2, 3, 'Overnight LAN Gaming Tournament',
    'Inter-hostel recreational esports tournament running through Saturday night.',
    CURRENT_DATE + INTERVAL '10 days' + TIME '22:00:00',
    CURRENT_DATE + INTERVAL '11 days' + TIME '06:00:00',
    35, 'REJECTED', 'CLUB', 1,
    'REJECTED', 'Gaming Tournament', 'Inter-hostel participants',
    'High bandwidth network drops',
    'Overnight recreational laboratory reservations are prohibited under campus safety bylaws without Dean authorization.',
    CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '3 days'
);

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity)
VALUES (203, 4, 1);

INSERT INTO request_review_history (request_id, reviewer_user_id, action, comments, created_at)
VALUES 
(203, 10, 'SUBMITTED', 'Club event proposal submitted for lab overnight reservation.', CURRENT_TIMESTAMP - INTERVAL '4 days'),
(203, 2, 'REJECTED_BY_ADVISOR', 'Overnight recreational laboratory reservations are prohibited under campus safety bylaws without Dean authorization. Please reschedule for daytime in student activity center.', CURRENT_TIMESTAMP - INTERVAL '3 days');

-- ----------------------------------------------------------------------------
-- CLUB 2: Robotics & Automation Society (Advised by Dr. Claude Shannon)
-- ----------------------------------------------------------------------------

-- Request 204: Endorsed by Advisor, Awaiting Admin Allocation (Shows in Admin Requests!)
INSERT INTO booking_request (
    id, user_id, resource_type_id, preferred_resource_id, title, description,
    start_time, end_time, expected_capacity, status, request_type, club_id,
    advisor_review_status, event_type, expected_guests, equipment_notes, created_at, updated_at
) VALUES (
    204, 11, 5, 21, 'Autonomous Drone Flight & AI Vision Expo',
    'Indoor demonstration of micro-quadcopters with optical flow localization, computer vision, and autonomous obstacle avoidance.',
    CURRENT_DATE + INTERVAL '6 days' + TIME '14:00:00',
    CURRENT_DATE + INTERVAL '6 days' + TIME '17:00:00',
    120, 'PENDING', 'CLUB', 2,
    'ENDORSED', 'Technical Exhibition', '20 Faculty members and visiting robotics researchers',
    'Safety net barrier and protective perimeter cones.',
    CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '1 day'
);

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity)
VALUES (204, 1, 1), (204, 3, 1);

INSERT INTO request_review_history (request_id, reviewer_user_id, action, comments, created_at)
VALUES 
(204, 11, 'SUBMITTED', 'Proposal submitted by Robotics Society president.', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(204, 3, 'ENDORSED', 'Strongly endorsed. Safety enclosure net and remote emergency-stop cutoff protocols inspected and validated.', CURRENT_TIMESTAMP - INTERVAL '1 day');

-- Request 205: Confirmed & Allocated Venue (Shows under Upcoming Bookings!)
INSERT INTO booking_request (
    id, user_id, resource_type_id, preferred_resource_id, title, description,
    start_time, end_time, expected_capacity, status, request_type, club_id,
    advisor_review_status, event_type, expected_guests, equipment_notes, created_at, updated_at
) VALUES (
    205, 11, 2, 7, 'Hands-on Micro-controller & ROS2 Robotics Lab',
    'Practical lab session programming Raspberry Pi and STM32 boards running Robot Operating System (ROS2).',
    CURRENT_DATE + INTERVAL '4 days' + TIME '10:00:00',
    CURRENT_DATE + INTERVAL '4 days' + TIME '13:00:00',
    28, 'APPROVED', 'CLUB', 2,
    'ENDORSED', 'Hands-on Lab', 'None',
    'Soldering stations, DC power supplies, and oscilloscopes.',
    CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '2 days'
);

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity)
VALUES (205, 1, 1), (205, 4, 1);

INSERT INTO booking (id, request_id, resource_id, booked_by_user_id, start_time, end_time, status, created_at, updated_at)
VALUES (
    11, 205, 7, 11,
    CURRENT_DATE + INTERVAL '4 days' + TIME '10:00:00',
    CURRENT_DATE + INTERVAL '4 days' + TIME '13:00:00',
    'CONFIRMED',
    CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days'
);

INSERT INTO request_review_history (request_id, reviewer_user_id, action, comments, created_at)
VALUES 
(205, 11, 'SUBMITTED', 'Lab proposal submitted by Robotics Society.', CURRENT_TIMESTAMP - INTERVAL '5 days'),
(205, 3, 'ENDORSED', 'Hardware kits, anti-static grounding, and lab ventilation safety confirmed. Endorsed.', CURRENT_TIMESTAMP - INTERVAL '4 days'),
(205, 1, 'APPROVED_BY_ADMIN', 'Shannon DSP & Embedded Lab allocated with full workstation support.', CURRENT_TIMESTAMP - INTERVAL '2 days');

-- Update sequences
SELECT setval('users_id_seq', (SELECT GREATEST(MAX(id), 20) FROM users));
SELECT setval('club_profile_id_seq', (SELECT GREATEST(MAX(id), 10) FROM club_profile));
SELECT setval('club_advisor_id_seq', (SELECT GREATEST(MAX(id), 10) FROM club_advisor));
SELECT setval('booking_request_id_seq', (SELECT GREATEST(MAX(id), 250) FROM booking_request));
SELECT setval('booking_id_seq', (SELECT GREATEST(MAX(id), 20) FROM booking));

COMMIT;
