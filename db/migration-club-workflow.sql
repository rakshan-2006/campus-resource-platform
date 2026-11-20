-- ============================================================================
-- CAMPUS RESOURCE ALLOCATION & CONFLICT DETECTION PLATFORM
-- db/migration-club-workflow.sql
-- Safe, forward-only migration adding CLUB role, advisor relationship,
-- self-registration verification, and multi-stage event booking workflow.
-- Preserves all existing tables, users, bookings, and constraints.
-- ============================================================================

BEGIN;

-- 1. Ensure Student Affairs Department exists for Campus Clubs
INSERT INTO department (code, name) 
VALUES ('SA', 'Student Affairs & Campus Clubs')
ON CONFLICT (code) DO NOTHING;

-- 2. Update users table role constraint to include 'CLUB'
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;
ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('ADMIN', 'FACULTY', 'CLUB'));

-- 3. Add verification status columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'APPROVED';
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_verification_status;
ALTER TABLE users ADD CONSTRAINT chk_users_verification_status CHECK (verification_status IN ('PENDING', 'APPROVED', 'REJECTED'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_by_user_id INT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Ensure existing seeded users are marked APPROVED
UPDATE users SET verification_status = 'APPROVED' WHERE verification_status IS NULL;

-- Allow department_id to be nullable if a club is institutional, or fallback to Student Affairs
ALTER TABLE users ALTER COLUMN department_id DROP NOT NULL;

-- 4. Create club_profile table
CREATE TABLE IF NOT EXISTS club_profile (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    club_name VARCHAR(150) NOT NULL,
    lead_name VARCHAR(100),
    lead_phone VARCHAR(30),
    category VARCHAR(50) NOT NULL DEFAULT 'Technical',
    description TEXT,
    founded_year INT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_club_category CHECK (category IN ('Technical', 'Cultural', 'Sports', 'Literary', 'Social', 'Academic', 'Other'))
);

CREATE INDEX IF NOT EXISTS idx_club_profile_user ON club_profile(user_id);

-- 5. Create club_advisor table
CREATE TABLE IF NOT EXISTS club_advisor (
    id SERIAL PRIMARY KEY,
    club_id INT NOT NULL REFERENCES club_profile(id) ON DELETE CASCADE,
    faculty_user_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    assigned_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP WITHOUT TIME ZONE,
    notes TEXT,
    CONSTRAINT chk_club_advisor_status CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'REPLACED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_club_active_advisor ON club_advisor (club_id) WHERE status = 'ACCEPTED';
CREATE UNIQUE INDEX IF NOT EXISTS uq_club_pending_advisor ON club_advisor (club_id) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_club_advisor_faculty ON club_advisor (faculty_user_id, status);

-- 6. Add club and advisor review columns to booking_request
ALTER TABLE booking_request ADD COLUMN IF NOT EXISTS request_type VARCHAR(20) NOT NULL DEFAULT 'FACULTY';
ALTER TABLE booking_request DROP CONSTRAINT IF EXISTS chk_request_type;
ALTER TABLE booking_request ADD CONSTRAINT chk_request_type CHECK (request_type IN ('FACULTY', 'CLUB'));

ALTER TABLE booking_request ADD COLUMN IF NOT EXISTS club_id INT REFERENCES club_profile(id) ON DELETE RESTRICT;

ALTER TABLE booking_request ADD COLUMN IF NOT EXISTS advisor_review_status VARCHAR(20) NOT NULL DEFAULT 'NOT_APPLICABLE';
ALTER TABLE booking_request DROP CONSTRAINT IF EXISTS chk_advisor_review_status;
ALTER TABLE booking_request ADD CONSTRAINT chk_advisor_review_status 
    CHECK (advisor_review_status IN ('NOT_APPLICABLE', 'PENDING_ADVISOR', 'ENDORSED', 'REJECTED'));

ALTER TABLE booking_request ADD COLUMN IF NOT EXISTS event_type VARCHAR(50);
ALTER TABLE booking_request ADD COLUMN IF NOT EXISTS expected_guests TEXT;
ALTER TABLE booking_request ADD COLUMN IF NOT EXISTS equipment_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_booking_request_club ON booking_request(club_id);
CREATE INDEX IF NOT EXISTS idx_booking_request_advisor_status ON booking_request(advisor_review_status);

-- 7. Create request_review_history table
CREATE TABLE IF NOT EXISTS request_review_history (
    id SERIAL PRIMARY KEY,
    request_id INT NOT NULL REFERENCES booking_request(id) ON DELETE CASCADE,
    reviewer_user_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action VARCHAR(30) NOT NULL,
    comments TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_review_action CHECK (action IN ('SUBMITTED', 'ENDORSED', 'REJECTED_BY_ADVISOR', 'APPROVED_BY_ADMIN', 'REJECTED_BY_ADMIN', 'COMMENT'))
);

CREATE INDEX IF NOT EXISTS idx_review_history_request ON request_review_history(request_id);

-- 8. Application roles & privileges
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'campus_club') THEN
        CREATE ROLE campus_club;
    END IF;
END
$$;

GRANT SELECT ON department, resource_type, resource, facility, resource_facility, v_resource_utilization, v_peak_hours TO campus_club;
GRANT SELECT ON users, club_profile, club_advisor TO campus_club;
GRANT SELECT, INSERT, UPDATE ON booking_request TO campus_club;
GRANT SELECT ON booking TO campus_club;
GRANT SELECT, INSERT, UPDATE, DELETE ON resource_request_facility TO campus_club;
GRANT SELECT, INSERT ON request_review_history TO campus_club;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO campus_club;
GRANT EXECUTE ON FUNCTION fn_is_available, fn_recommend_resources, fn_set_current_user_id TO campus_club;

GRANT SELECT, UPDATE ON club_advisor TO campus_faculty;
GRANT SELECT ON club_profile TO campus_faculty;
GRANT SELECT, INSERT ON request_review_history TO campus_faculty;

GRANT ALL PRIVILEGES ON club_profile, club_advisor, request_review_history TO campus_admin;

-- 9. Update sp_approve_request to enforce advisor endorsement for club requests
CREATE OR REPLACE PROCEDURE sp_approve_request(
    p_request_id INT,
    p_admin_id INT,
    p_assigned_resource_id INT DEFAULT NULL
)
AS $$
DECLARE
    v_admin_role VARCHAR(20);
    v_req RECORD;
    v_target_resource_id INT;
    v_is_avail BOOLEAN;
BEGIN
    -- 1. Validate the admin user
    SELECT role INTO v_admin_role FROM users WHERE id = p_admin_id;
    IF v_admin_role IS NULL OR v_admin_role != 'ADMIN' THEN
        RAISE EXCEPTION 'UNAUTHORIZED: User % is not an authorized administrator', p_admin_id;
    END IF;

    -- 2. Lock the request row FOR UPDATE to serialize concurrent approval attempts
    SELECT * INTO v_req 
    FROM booking_request 
    WHERE id = p_request_id 
    FOR UPDATE;

    IF v_req IS NULL THEN
        RAISE EXCEPTION 'NOT_FOUND: Booking request % does not exist', p_request_id;
    END IF;

    IF v_req.status != 'PENDING' THEN
        RAISE EXCEPTION 'INVALID_STATE: Request % has already been resolved with status %', p_request_id, v_req.status;
    END IF;

    -- 2.1 Enforce Faculty Advisor endorsement for Club requests
    IF v_req.request_type = 'CLUB' AND v_req.advisor_review_status != 'ENDORSED' THEN
        RAISE EXCEPTION 'ADVISOR_APPROVAL_REQUIRED: Club request % cannot be approved without faculty advisor endorsement (current status: %)',
            p_request_id, v_req.advisor_review_status;
    END IF;

    -- 3. Determine resource to assign (passed override or preferred resource)
    v_target_resource_id := COALESCE(p_assigned_resource_id, v_req.preferred_resource_id);

    -- If still null, pick the top available resource of matching type and capacity
    IF v_target_resource_id IS NULL THEN
        SELECT r.id INTO v_target_resource_id
        FROM resource r
        WHERE fn_resource_meets_request(r.id, v_req.id)
          AND fn_is_available(r.id, v_req.start_time, v_req.end_time) = TRUE
        ORDER BY r.capacity ASC, r.id ASC
        LIMIT 1;
    END IF;

    IF v_target_resource_id IS NULL THEN
        RAISE EXCEPTION 'NO_AVAILABLE_RESOURCE: No suitable resource available for request %', p_request_id;
    END IF;

    -- Serialize approvals competing for this resource and validate explicit assignments too.
    PERFORM 1 FROM resource WHERE id = v_target_resource_id FOR UPDATE;
    IF NOT fn_resource_meets_request(v_target_resource_id, v_req.id) THEN
        RAISE EXCEPTION 'RESOURCE_CONFLICT: Resource % does not meet the requested type, capacity, or facility quantities', v_target_resource_id;
    END IF;

    -- 4. Re-check availability under transaction lock
    v_is_avail := fn_is_available(v_target_resource_id, v_req.start_time, v_req.end_time);
    IF NOT v_is_avail THEN
        RAISE EXCEPTION 'RESOURCE_CONFLICT: Resource % is unavailable or conflicts with another confirmed booking/maintenance during % to %',
            v_target_resource_id, v_req.start_time, v_req.end_time;
    END IF;

    -- 5. Update request to APPROVED
    UPDATE booking_request
    SET status = 'APPROVED',
        preferred_resource_id = v_target_resource_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_request_id;

    -- 6. Insert one CONFIRMED booking (Guaranteed conflict-free by GiST exclusion constraint)
    INSERT INTO booking (
        request_id,
        resource_id,
        booked_by_user_id,
        start_time,
        end_time,
        status,
        created_at,
        updated_at
    ) VALUES (
        p_request_id,
        v_target_resource_id,
        v_req.user_id,
        v_req.start_time,
        v_req.end_time,
        'CONFIRMED',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

    -- 7. Record approval in review history
    INSERT INTO request_review_history (
        request_id,
        reviewer_user_id,
        action,
        comments
    ) VALUES (
        p_request_id,
        p_admin_id,
        'APPROVED_BY_ADMIN',
        'Allocated resource: ' || (SELECT name FROM resource WHERE id = v_target_resource_id)
    );

END;
$$ LANGUAGE plpgsql;

-- 10. Update v_pending_requests view to support club requests and plain presentation
DROP VIEW IF EXISTS v_pending_requests CASCADE;

CREATE OR REPLACE VIEW v_pending_requests AS
SELECT 
    br.id AS request_id,
    br.title,
    br.description,
    br.request_type,
    br.club_id,
    cp.club_name,
    br.advisor_review_status,
    u.id AS user_id,
    u.name AS applicant_name,
    u.email AS applicant_email,
    u.role AS applicant_role,
    COALESCE(d.name, 'Student Affairs & Campus Clubs') AS department_name,
    rt.name AS resource_type_name,
    r_pref.name AS preferred_resource_name,
    br.expected_capacity,
    br.start_time,
    br.end_time,
    br.event_type,
    br.created_at,
    ROUND((EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - br.created_at)) / 3600.0)::NUMERIC, 1) AS wait_hours,
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'facility_id', f.id,
                'facility_name', f.name,
                'min_quantity', rrf.min_quantity
            )
        ) FILTER (WHERE f.id IS NOT NULL),
        '[]'::JSONB
    ) AS requested_facilities
FROM booking_request br
JOIN users u ON br.user_id = u.id
LEFT JOIN department d ON u.department_id = d.id
JOIN resource_type rt ON br.resource_type_id = rt.id
LEFT JOIN resource r_pref ON br.preferred_resource_id = r_pref.id
LEFT JOIN club_profile cp ON br.club_id = cp.id
LEFT JOIN resource_request_facility rrf ON br.id = rrf.request_id
LEFT JOIN facility f ON rrf.facility_id = f.id
WHERE br.status = 'PENDING'
GROUP BY br.id, u.id, u.name, u.email, u.role, d.name, rt.name, r_pref.name, cp.club_name
ORDER BY br.created_at ASC;

-- Ensure campus_admin retains SELECT access to the recreated view
GRANT SELECT ON v_pending_requests TO campus_admin;

COMMIT;
