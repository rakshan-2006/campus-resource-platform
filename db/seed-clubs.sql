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

-- 5. Club Booking Requests
-- Request 201: ACM Student Chapter - Pending Advisor Review (for Dr. Grace Hopper's inbox)
INSERT INTO booking_request (
    id, user_id, resource_type_id, preferred_resource_id, title, description,
    start_time, end_time, expected_capacity, status, request_type, club_id,
    advisor_review_status, event_type, expected_guests, equipment_notes, created_at, updated_at
) VALUES (
    201, 10, 3, 5, 'HackCampus 2027: 24-Hour Code Sprint',
    'Flagship annual campus hackathon featuring 30 teams building AI-driven societal tools.',
    '2027-04-10 09:00:00', '2027-04-10 21:00:00', 100, 'PENDING', 'CLUB', 1,
    'PENDING_ADVISOR', 'Hackathon', 'External industry mentors from Google and Red Hat',
    'High-power extension boards and gigabit network drops required',
    CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day'
)
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    advisor_review_status = EXCLUDED.advisor_review_status;

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity)
VALUES (201, 1, 1), (201, 3, 1)
ON CONFLICT DO NOTHING;

INSERT INTO request_review_history (request_id, reviewer_user_id, action, comments)
VALUES (201, 10, 'SUBMITTED', 'Event proposal submitted by club president for faculty advisor review.')
ON CONFLICT DO NOTHING;

-- Request 202: Robotics Society - Endorsed by Dr. Claude Shannon (Ready for Admin Allocation!)
INSERT INTO booking_request (
    id, user_id, resource_type_id, preferred_resource_id, title, description,
    start_time, end_time, expected_capacity, status, request_type, club_id,
    advisor_review_status, event_type, expected_guests, equipment_notes, created_at, updated_at
) VALUES (
    202, 11, 5, 7, 'Autonomous Drone Flight & AI Vision Expo',
    'Indoor demonstration of micro-quadcopters with optical flow and obstacle avoidance.',
    '2027-04-15 14:00:00', '2027-04-15 17:00:00', 120, 'PENDING', 'CLUB', 2,
    'ENDORSED', 'Exhibition', 'Campus faculty and student public audience',
    'Safety net barrier and protective perimeter cones',
    CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '1 day'
)
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    advisor_review_status = EXCLUDED.advisor_review_status;

INSERT INTO resource_request_facility (request_id, facility_id, min_quantity)
VALUES (202, 1, 1), (202, 3, 1)
ON CONFLICT DO NOTHING;

INSERT INTO request_review_history (request_id, reviewer_user_id, action, comments)
VALUES 
(202, 11, 'SUBMITTED', 'Initial request submitted by Robotics Society.'),
(202, 3, 'ENDORSED', 'Strongly endorsed. Flight enclosure and emergency stop mechanics reviewed and validated.')
ON CONFLICT DO NOTHING;

-- Update sequences
SELECT setval('users_id_seq', (SELECT GREATEST(MAX(id), 20) FROM users));
SELECT setval('club_profile_id_seq', (SELECT GREATEST(MAX(id), 10) FROM club_profile));
SELECT setval('club_advisor_id_seq', (SELECT GREATEST(MAX(id), 10) FROM club_advisor));
SELECT setval('booking_request_id_seq', (SELECT GREATEST(MAX(id), 250) FROM booking_request));

COMMIT;
