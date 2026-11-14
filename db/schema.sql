-- ============================================================================
-- CAMPUS RESOURCE ALLOCATION & CONFLICT DETECTION PLATFORM
-- Relational Schema DDL (PostgreSQL 16)
-- Clean, re-runnable script with named constraints, RLS, functions, triggers, views
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. APPLICATION ROLES & PERMISSIONS
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'campus_admin') THEN
        CREATE ROLE campus_admin;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'campus_faculty') THEN
        CREATE ROLE campus_faculty;
    END IF;
END
$$;

-- Drop dependent views, triggers, functions and tables in reverse dependency order for clean re-runnability
DROP VIEW IF EXISTS v_resource_utilization CASCADE;
DROP VIEW IF EXISTS v_peak_hours CASCADE;
DROP VIEW IF EXISTS v_pending_requests CASCADE;
DROP VIEW IF EXISTS v_confirmed_occupancy CASCADE;

DROP TRIGGER IF EXISTS trg_booking_validate ON booking CASCADE;
DROP TRIGGER IF EXISTS trg_maintenance_status ON maintenance CASCADE;
DROP TRIGGER IF EXISTS trg_request_cancelled ON booking_request CASCADE;

DROP FUNCTION IF EXISTS fn_booking_validate() CASCADE;
DROP FUNCTION IF EXISTS fn_maintenance_status() CASCADE;
DROP FUNCTION IF EXISTS fn_request_cancelled() CASCADE;
DROP FUNCTION IF EXISTS fn_is_available(INT, TIMESTAMP WITHOUT TIME ZONE, TIMESTAMP WITHOUT TIME ZONE, INT) CASCADE;
DROP FUNCTION IF EXISTS fn_recommend_resources(INT, INT, TIMESTAMP WITHOUT TIME ZONE, TIMESTAMP WITHOUT TIME ZONE, JSONB) CASCADE;
DROP PROCEDURE IF EXISTS sp_approve_request(INT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS fn_set_current_user_id(INT) CASCADE;

DROP TABLE IF EXISTS resource_request_facility CASCADE;
DROP TABLE IF EXISTS resource_facility CASCADE;
DROP TABLE IF EXISTS booking CASCADE;
DROP TABLE IF EXISTS maintenance CASCADE;
DROP TABLE IF EXISTS booking_request CASCADE;
DROP TABLE IF EXISTS resource CASCADE;
DROP TABLE IF EXISTS facility CASCADE;
DROP TABLE IF EXISTS resource_type CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS department CASCADE;

-- ============================================================================
-- 3. CORE RELATIONAL TABLES
-- ============================================================================

-- 3.1 Department
CREATE TABLE department (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_department_code UNIQUE (code),
    CONSTRAINT uq_department_name UNIQUE (name)
);

-- 3.2 Users (Single table for ADMIN and FACULTY; no separate admin/faculty tables)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    department_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'FACULTY',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_role CHECK (role IN ('ADMIN', 'FACULTY')),
    CONSTRAINT fk_users_department FOREIGN KEY (department_id) 
        REFERENCES department(id) ON DELETE RESTRICT
);

-- 3.3 Resource Type (Classroom, Computer Lab, Seminar Hall, Conference Room, Auditorium)
CREATE TABLE resource_type (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_resource_type_code UNIQUE (code),
    CONSTRAINT uq_resource_type_name UNIQUE (name)
);

-- 3.4 Resource
CREATE TABLE resource (
    id SERIAL PRIMARY KEY,
    resource_type_id INT NOT NULL,
    department_id INT NOT NULL,
    code VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    capacity INT NOT NULL,
    location VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_resource_code UNIQUE (code),
    CONSTRAINT uq_resource_name UNIQUE (name),
    CONSTRAINT chk_resource_capacity CHECK (capacity > 0),
    CONSTRAINT chk_resource_status CHECK (status IN ('AVAILABLE', 'MAINTENANCE', 'UNAVAILABLE')),
    CONSTRAINT fk_resource_type FOREIGN KEY (resource_type_id) 
        REFERENCES resource_type(id) ON DELETE RESTRICT,
    CONSTRAINT fk_resource_department FOREIGN KEY (department_id) 
        REFERENCES department(id) ON DELETE RESTRICT
);

-- 3.5 Facility (Projector, Smart Board, Audio System, High-End Workstations, Video Conf, etc.)
CREATE TABLE facility (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_facility_code UNIQUE (code),
    CONSTRAINT uq_facility_name UNIQUE (name)
);

-- 3.6 Resource-Facility (Junction Table with positive quantities)
CREATE TABLE resource_facility (
    resource_id INT NOT NULL,
    facility_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    CONSTRAINT pk_resource_facility PRIMARY KEY (resource_id, facility_id),
    CONSTRAINT chk_resource_facility_quantity CHECK (quantity > 0),
    CONSTRAINT fk_resource_facility_resource FOREIGN KEY (resource_id) 
        REFERENCES resource(id) ON DELETE RESTRICT,
    CONSTRAINT fk_resource_facility_facility FOREIGN KEY (facility_id) 
        REFERENCES facility(id) ON DELETE RESTRICT
);

-- 3.7 Booking Request
CREATE TABLE booking_request (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    resource_type_id INT NOT NULL,
    preferred_resource_id INT,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    end_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    expected_capacity INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_request_capacity CHECK (expected_capacity > 0),
    CONSTRAINT chk_request_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    CONSTRAINT chk_request_time_order CHECK (end_time > start_time),
    CONSTRAINT fk_booking_request_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_booking_request_type FOREIGN KEY (resource_type_id) 
        REFERENCES resource_type(id) ON DELETE RESTRICT,
    CONSTRAINT fk_booking_request_preferred_resource FOREIGN KEY (preferred_resource_id) 
        REFERENCES resource(id) ON DELETE SET NULL
);

-- 3.8 Resource Request Facility (Junction Table for requested facilities)
CREATE TABLE resource_request_facility (
    request_id INT NOT NULL,
    facility_id INT NOT NULL,
    min_quantity INT NOT NULL DEFAULT 1,
    CONSTRAINT pk_resource_request_facility PRIMARY KEY (request_id, facility_id),
    CONSTRAINT chk_request_facility_quantity CHECK (min_quantity > 0),
    CONSTRAINT fk_rrf_request FOREIGN KEY (request_id) 
        REFERENCES booking_request(id) ON DELETE CASCADE,
    CONSTRAINT fk_rrf_facility FOREIGN KEY (facility_id) 
        REFERENCES facility(id) ON DELETE RESTRICT
);

-- 3.9 Booking (A request has zero or one resulting booking)
CREATE TABLE booking (
    id SERIAL PRIMARY KEY,
    request_id INT NOT NULL,
    resource_id INT NOT NULL,
    booked_by_user_id INT NOT NULL,
    start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    end_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_booking_request_id UNIQUE (request_id),
    CONSTRAINT chk_booking_status CHECK (status IN ('CONFIRMED', 'CANCELLED')),
    CONSTRAINT chk_booking_time_order CHECK (end_time > start_time),
    CONSTRAINT fk_booking_request FOREIGN KEY (request_id) 
        REFERENCES booking_request(id) ON DELETE RESTRICT,
    CONSTRAINT fk_booking_resource FOREIGN KEY (resource_id) 
        REFERENCES resource(id) ON DELETE RESTRICT,
    CONSTRAINT fk_booking_user FOREIGN KEY (booked_by_user_id) 
        REFERENCES users(id) ON DELETE RESTRICT,
    -- GiST exclusion constraint preventing overlapping confirmed bookings per resource
    CONSTRAINT exclude_overlapping_confirmed_bookings 
        EXCLUDE USING gist (
            resource_id WITH =, 
            tsrange(start_time, end_time) WITH &&
        ) WHERE (status = 'CONFIRMED')
);

-- 3.10 Maintenance
CREATE TABLE maintenance (
    id SERIAL PRIMARY KEY,
    resource_id INT NOT NULL,
    scheduled_by_user_id INT NOT NULL,
    start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    end_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    reason VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_maintenance_status CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT chk_maintenance_time_order CHECK (end_time > start_time),
    CONSTRAINT fk_maintenance_resource FOREIGN KEY (resource_id) 
        REFERENCES resource(id) ON DELETE RESTRICT,
    CONSTRAINT fk_maintenance_user FOREIGN KEY (scheduled_by_user_id) 
        REFERENCES users(id) ON DELETE RESTRICT
);

-- ============================================================================
-- 4. INDEXES
-- ============================================================================
-- Foreign key and search/filter indexes
CREATE INDEX idx_users_department ON users(department_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_resource_type ON resource(resource_type_id);
CREATE INDEX idx_resource_dept ON resource(department_id);
CREATE INDEX idx_resource_status ON resource(status);
CREATE INDEX idx_resource_capacity ON resource(capacity);
CREATE INDEX idx_booking_resource_time ON booking(resource_id, start_time, end_time) WHERE status = 'CONFIRMED';
CREATE INDEX idx_booking_user ON booking(booked_by_user_id);
CREATE INDEX idx_booking_status ON booking(status);
CREATE INDEX idx_booking_request_user ON booking_request(user_id);
CREATE INDEX idx_booking_request_status ON booking_request(status);
CREATE INDEX idx_booking_request_time ON booking_request(start_time, end_time);
CREATE INDEX idx_maintenance_resource_range ON maintenance(resource_id, start_time, end_time) WHERE status IN ('SCHEDULED', 'IN_PROGRESS');

-- ============================================================================
-- 5. PROCEDURES AND FUNCTIONS
-- ============================================================================

-- 5.1 Safe session helper for transaction-local trusted context
CREATE OR REPLACE FUNCTION fn_set_current_user_id(p_user_id INT)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::TEXT, true);
END;
$$ LANGUAGE plpgsql;

-- 5.2 fn_is_available
-- BEGIN AVAILABILITY RULES
-- Checks if resource is available: status=AVAILABLE, no overlapping confirmed booking, no overlapping scheduled/in-progress maintenance
-- Overlap rule: new_start < existing_end AND new_end > existing_start
CREATE OR REPLACE FUNCTION fn_is_available(
    p_resource_id INT,
    p_start TIMESTAMP WITHOUT TIME ZONE,
    p_end TIMESTAMP WITHOUT TIME ZONE,
    p_exclude_booking_id INT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_status VARCHAR(20);
    v_has_booking_conflict BOOLEAN;
    v_has_maintenance_conflict BOOLEAN;
BEGIN
    -- Check resource existence and general status
    SELECT status INTO v_status FROM public.resource WHERE id = p_resource_id;
    IF v_status IS NULL OR v_status = 'UNAVAILABLE' THEN
        RETURN FALSE;
    END IF;

    -- Check overlapping confirmed bookings
    SELECT EXISTS (
        SELECT 1 FROM public.booking
        WHERE resource_id = p_resource_id
          AND status = 'CONFIRMED'
          AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
          AND p_start < end_time AND p_end > start_time
    ) INTO v_has_booking_conflict;

    IF v_has_booking_conflict THEN
        RETURN FALSE;
    END IF;

    -- Check overlapping maintenance (SCHEDULED or IN_PROGRESS)
    SELECT EXISTS (
        SELECT 1 FROM public.maintenance
        WHERE resource_id = p_resource_id
          AND status IN ('SCHEDULED', 'IN_PROGRESS')
          AND p_start < end_time AND p_end > start_time
    ) INTO v_has_maintenance_conflict;

    IF v_has_maintenance_conflict THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp;
REVOKE EXECUTE ON FUNCTION fn_is_available(INT, TIMESTAMP, TIMESTAMP, INT) FROM PUBLIC;
-- END AVAILABILITY RULES

-- 5.3 fn_recommend_resources
-- Hard filters available resources by requested type and capacity, excludes conflicts/maintenance,
-- then returns transparent component scores using:
-- Capacity 30%, Facilities 30%, Availability 25%, Type 10%, Location 5%
CREATE OR REPLACE FUNCTION fn_recommend_resources(
    p_type_id INT,
    p_capacity INT,
    p_start TIMESTAMP WITHOUT TIME ZONE,
    p_end TIMESTAMP WITHOUT TIME ZONE,
    p_required_facilities JSONB DEFAULT '[]'::JSONB
)
RETURNS TABLE (
    resource_id INT,
    resource_code VARCHAR,
    resource_name VARCHAR,
    capacity INT,
    location VARCHAR,
    department_name VARCHAR,
    total_score NUMERIC(5, 2),
    capacity_score NUMERIC(5, 2),
    facilities_score NUMERIC(5, 2),
    availability_score NUMERIC(5, 2),
    type_score NUMERIC(5, 2),
    location_score NUMERIC(5, 2),
    facility_breakdown JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH candidate_resources AS (
        -- Hard filter: type match, capacity >= requested, available in the window
        SELECT 
            r.id AS res_id,
            r.code AS res_code,
            r.name AS res_name,
            r.capacity AS res_cap,
            r.location AS res_loc,
            d.name AS dept_name
        FROM resource r
        JOIN department d ON r.department_id = d.id
        WHERE r.resource_type_id = p_type_id
          AND r.capacity >= p_capacity
          AND fn_is_available(r.id, p_start, p_end) = TRUE
    ),
    required_facs AS (
        SELECT 
            (elem->>'facility_id')::INT AS facility_id,
            COALESCE((elem->>'min_quantity')::INT, 1) AS min_qty
        FROM jsonb_array_elements(p_required_facilities) AS elem
    ),
    required_count AS (
        SELECT COUNT(*)::INT AS total_req FROM required_facs
    ),
    facility_eval AS (
        SELECT 
            c.res_id,
            COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'facility_id', rf.facility_id,
                        'facility_name', f.name,
                        'required_qty', rf_req.min_qty,
                        'available_qty', COALESCE(rf.quantity, 0),
                        'satisfied', (COALESCE(rf.quantity, 0) >= rf_req.min_qty)
                    )
                ) FILTER (WHERE rf_req.facility_id IS NOT NULL),
                '[]'::JSONB
            ) AS fac_breakdown,
            COUNT(rf_req.facility_id) FILTER (WHERE COALESCE(rf.quantity, 0) >= rf_req.min_qty)::INT AS satisfied_count
        FROM candidate_resources c
        LEFT JOIN required_facs rf_req ON TRUE
        LEFT JOIN resource_facility rf ON rf.resource_id = c.res_id AND rf.facility_id = rf_req.facility_id
        LEFT JOIN facility f ON f.id = rf_req.facility_id
        GROUP BY c.res_id
    )
    SELECT 
        c.res_id,
        c.res_code,
        c.res_name,
        c.res_cap,
        c.res_loc,
        c.dept_name,
        -- Total score calculation (Weighted: Capacity 30%, Facilities 30%, Availability 25%, Type 10%, Location 5%)
        ROUND(
            (
                (scores.c_score * 0.30) +
                (scores.f_score * 0.30) +
                (scores.a_score * 0.25) +
                (scores.t_score * 0.10) +
                (scores.l_score * 0.05)
            )::NUMERIC, 2
        ) AS total_score,
        ROUND(scores.c_score::NUMERIC, 2) AS capacity_score,
        ROUND(scores.f_score::NUMERIC, 2) AS facilities_score,
        ROUND(scores.a_score::NUMERIC, 2) AS availability_score,
        ROUND(scores.t_score::NUMERIC, 2) AS type_score,
        ROUND(scores.l_score::NUMERIC, 2) AS location_score,
        fe.fac_breakdown AS facility_breakdown
    FROM candidate_resources c
    JOIN facility_eval fe ON fe.res_id = c.res_id
    CROSS JOIN required_count rc
    CROSS JOIN LATERAL (
        SELECT 
            -- Capacity score: 100 if exact match, gently scaled down if oversized to avoid wasted capacity
            GREATEST(0.0, 100.0 - (((c.res_cap - p_capacity)::NUMERIC / NULLIF(p_capacity, 0)::NUMERIC) * 40.0)) AS c_score,
            -- Facilities score: proportion of required facilities satisfied (100 if none required)
            CASE 
                WHEN rc.total_req = 0 THEN 100.0
                ELSE (fe.satisfied_count::NUMERIC / rc.total_req::NUMERIC) * 100.0
            END AS f_score,
            -- Availability score: 100 (hard-filtered)
            100.0 AS a_score,
            -- Type score: 100 (exact requested type)
            100.0 AS t_score,
            -- Location score: 100 default campus score
            100.0 AS l_score
    ) scores
    ORDER BY total_score DESC, c.res_cap ASC, c.res_id ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5.4 sp_approve_request
-- BEGIN ALLOCATION RULES
CREATE OR REPLACE FUNCTION fn_resource_meets_request(p_resource_id INT, p_request_id INT)
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM resource r
        JOIN booking_request br ON br.id = p_request_id
        WHERE r.id = p_resource_id
          AND r.resource_type_id = br.resource_type_id
          AND r.capacity >= br.expected_capacity
          AND NOT EXISTS (
              SELECT 1 FROM resource_request_facility req
              LEFT JOIN resource_facility rf
                ON rf.facility_id = req.facility_id AND rf.resource_id = r.id
              WHERE req.request_id = br.id AND COALESCE(rf.quantity, 0) < req.min_quantity
          )
    );
$$;

-- Admin approves a pending request, validates admin status and pending state, locks rows,
-- re-checks availability, sets request to APPROVED and inserts one CONFIRMED booking.
-- A concurrent conflicting approval must leave exactly one confirmed booking.
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

END;
$$ LANGUAGE plpgsql;
-- END ALLOCATION RULES

-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

-- 6.1 booking_validate trigger:
-- Ensures resource is not in MAINTENANCE/UNAVAILABLE state and has no overlapping maintenance
CREATE OR REPLACE FUNCTION fn_booking_validate()
RETURNS TRIGGER AS $$
DECLARE
    v_res_status VARCHAR(20);
    v_maint_conflict BOOLEAN;
BEGIN
    IF NEW.status = 'CONFIRMED' THEN
        SELECT status INTO v_res_status FROM resource WHERE id = NEW.resource_id;
        IF v_res_status = 'UNAVAILABLE' THEN
            RAISE EXCEPTION 'INVALID_BOOKING: Resource % is currently marked UNAVAILABLE', NEW.resource_id;
        END IF;

        -- Check maintenance conflict
        SELECT EXISTS (
            SELECT 1 FROM maintenance
            WHERE resource_id = NEW.resource_id
              AND status IN ('SCHEDULED', 'IN_PROGRESS')
              AND NEW.start_time < end_time AND NEW.end_time > start_time
        ) INTO v_maint_conflict;

        IF v_maint_conflict THEN
            RAISE EXCEPTION 'MAINTENANCE_CONFLICT: Cannot confirm booking during maintenance window for resource %', NEW.resource_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_validate
BEFORE INSERT OR UPDATE ON booking
FOR EACH ROW
EXECUTE FUNCTION fn_booking_validate();

-- 6.2 Maintenance-status trigger:
-- Sets a resource to MAINTENANCE for ongoing maintenance and restores AVAILABLE only when no ongoing maintenance remains
CREATE OR REPLACE FUNCTION fn_maintenance_status()
RETURNS TRIGGER AS $$
DECLARE
    v_res_id INT;
    v_active_maint BOOLEAN;
BEGIN
    v_res_id := COALESCE(NEW.resource_id, OLD.resource_id);

    -- Check if any maintenance is currently IN_PROGRESS
    SELECT EXISTS (
        SELECT 1 FROM maintenance
        WHERE resource_id = v_res_id
          AND status = 'IN_PROGRESS'
    ) INTO v_active_maint;

    IF v_active_maint THEN
        UPDATE resource SET status = 'MAINTENANCE' WHERE id = v_res_id;
    ELSE
        -- Restore to AVAILABLE only if it was in MAINTENANCE
        UPDATE resource 
        SET status = 'AVAILABLE' 
        WHERE id = v_res_id AND status = 'MAINTENANCE';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_maintenance_status
AFTER INSERT OR UPDATE OR DELETE ON maintenance
FOR EACH ROW
EXECUTE FUNCTION fn_maintenance_status();

-- 6.3 Request-cancellation trigger:
-- BEGIN CANCELLATION FUNCTION
-- Cancels its confirmed booking when a request is cancelled
CREATE OR REPLACE FUNCTION fn_request_cancelled()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'CANCELLED' AND OLD.status != 'CANCELLED' THEN
        UPDATE public.booking
        SET status = 'CANCELLED',
            updated_at = CURRENT_TIMESTAMP
        WHERE request_id = NEW.id 
          AND status = 'CONFIRMED';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp;
REVOKE EXECUTE ON FUNCTION fn_request_cancelled() FROM PUBLIC;
-- END CANCELLATION FUNCTION

CREATE TRIGGER trg_request_cancelled
AFTER UPDATE OF status ON booking_request
FOR EACH ROW
EXECUTE FUNCTION fn_request_cancelled();

-- ============================================================================
-- 7. OPERATIONAL & ANALYTICS VIEWS
-- ============================================================================

-- 7.1 v_resource_utilization
-- Stated assumption: last-30-days, 10-operating-hours/day (30 days * 10 hrs = 300 hrs capacity)
CREATE OR REPLACE VIEW v_resource_utilization AS
WITH confirmed_hours AS (
    SELECT 
        b.resource_id,
        COALESCE(
            SUM(
                EXTRACT(EPOCH FROM (LEAST(b.end_time, CURRENT_TIMESTAMP) - GREATEST(b.start_time, CURRENT_TIMESTAMP - INTERVAL '30 days'))) / 3600.0
            ), 0.0
        ) AS total_hours_booked
    FROM booking b
    WHERE b.status = 'CONFIRMED'
      AND b.start_time >= CURRENT_TIMESTAMP - INTERVAL '30 days'
      AND b.end_time <= CURRENT_TIMESTAMP + INTERVAL '1 day'
    GROUP BY b.resource_id
)
SELECT 
    r.id AS resource_id,
    r.code AS resource_code,
    r.name AS resource_name,
    rt.name AS resource_type_name,
    d.name AS department_name,
    r.capacity,
    r.status,
    ROUND(COALESCE(ch.total_hours_booked, 0.0)::NUMERIC, 2) AS booked_hours_last_30_days,
    300.0 AS max_operating_hours_last_30_days,
    ROUND(
        LEAST(100.0, (COALESCE(ch.total_hours_booked, 0.0) / 300.0) * 100.0)::NUMERIC, 2
    ) AS utilization_percentage
FROM resource r
JOIN resource_type rt ON r.resource_type_id = rt.id
JOIN department d ON r.department_id = d.id
LEFT JOIN confirmed_hours ch ON r.id = ch.resource_id;

-- 7.2 v_peak_hours
-- Aggregates confirmed bookings by hour of day (07:00 to 20:00)
CREATE OR REPLACE VIEW v_peak_hours AS
WITH hours_series AS (
    SELECT generate_series(7, 20) AS hour_of_day
),
booking_slots AS (
    SELECT 
        EXTRACT(HOUR FROM b.start_time)::INT AS slot_hour,
        COUNT(*)::INT AS booking_count
    FROM booking b
    WHERE b.status = 'CONFIRMED'
    GROUP BY EXTRACT(HOUR FROM b.start_time)::INT
)
SELECT 
    hs.hour_of_day,
    TO_CHAR(TO_TIMESTAMP(hs.hour_of_day::TEXT, 'HH24'), 'HH24:00') AS time_label,
    COALESCE(bs.booking_count, 0) AS booking_count
FROM hours_series hs
LEFT JOIN booking_slots bs ON hs.hour_of_day = bs.slot_hour
ORDER BY hs.hour_of_day ASC;

-- 7.3 v_pending_requests
-- Operational view of all pending requests with user details and requested facilities
CREATE OR REPLACE VIEW v_pending_requests AS
SELECT 
    br.id AS request_id,
    br.title,
    br.description,
    u.id AS user_id,
    u.name AS faculty_name,
    u.email AS faculty_email,
    d.name AS department_name,
    rt.name AS resource_type_name,
    r_pref.name AS preferred_resource_name,
    br.expected_capacity,
    br.start_time,
    br.end_time,
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
JOIN department d ON u.department_id = d.id
JOIN resource_type rt ON br.resource_type_id = rt.id
LEFT JOIN resource r_pref ON br.preferred_resource_id = r_pref.id
LEFT JOIN resource_request_facility rrf ON br.id = rrf.request_id
LEFT JOIN facility f ON rrf.facility_id = f.id
WHERE br.status = 'PENDING'
GROUP BY br.id, u.id, u.name, u.email, d.name, rt.name, r_pref.name
ORDER BY br.created_at ASC;

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) & GRANTS
-- BEGIN ACCESS RULES
-- ============================================================================

-- Enable RLS on faculty-owned tables
ALTER TABLE booking_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_request_facility ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS faculty_select_own_requests ON booking_request;
DROP POLICY IF EXISTS faculty_insert_own_requests ON booking_request;
DROP POLICY IF EXISTS faculty_update_own_requests ON booking_request;
DROP POLICY IF EXISTS faculty_select_confirmed_bookings ON booking;
DROP POLICY IF EXISTS faculty_select_own_bookings ON booking;
DROP POLICY IF EXISTS faculty_update_own_confirmed_bookings ON booking;
DROP POLICY IF EXISTS faculty_read_request_facilities ON resource_request_facility;
DROP POLICY IF EXISTS faculty_write_request_facilities ON resource_request_facility;
DROP POLICY IF EXISTS admin_all_booking_requests ON booking_request;
DROP POLICY IF EXISTS admin_all_bookings ON booking;
DROP POLICY IF EXISTS admin_all_request_facilities ON resource_request_facility;

-- 8.1 Faculty Policies for booking_request:
-- Faculty can SELECT their own requests
CREATE POLICY faculty_select_own_requests ON booking_request
FOR SELECT
TO campus_faculty
USING (
    user_id = NULLIF(current_setting('app.current_user_id', true), '')::INT
);

-- Faculty can INSERT their own requests
CREATE POLICY faculty_insert_own_requests ON booking_request
FOR INSERT
TO campus_faculty
WITH CHECK (
    user_id = NULLIF(current_setting('app.current_user_id', true), '')::INT
    AND status = 'PENDING'
);

-- Faculty edit pending requests and can cancel their own pending or approved requests.
CREATE POLICY faculty_update_own_requests ON booking_request
FOR UPDATE
TO campus_faculty
USING (
    user_id = NULLIF(current_setting('app.current_user_id', true), '')::INT
    AND status IN ('PENDING', 'APPROVED')
)
WITH CHECK (
    user_id = NULLIF(current_setting('app.current_user_id', true), '')::INT
    AND status IN ('PENDING', 'CANCELLED')
);

-- 8.2 Faculty see their own booking records. The schedule view exposes only occupancy.
CREATE POLICY faculty_select_own_bookings ON booking
FOR SELECT
TO campus_faculty
USING (
    booked_by_user_id = NULLIF(current_setting('app.current_user_id', true), '')::INT
);

CREATE OR REPLACE VIEW v_confirmed_occupancy AS
SELECT id, resource_id, start_time, end_time, status FROM booking WHERE status = 'CONFIRMED';
GRANT SELECT ON v_confirmed_occupancy TO campus_faculty;

CREATE POLICY faculty_update_own_confirmed_bookings ON booking
FOR UPDATE TO campus_faculty
USING (booked_by_user_id = NULLIF(current_setting('app.current_user_id', true), '')::INT AND status = 'CONFIRMED')
WITH CHECK (booked_by_user_id = NULLIF(current_setting('app.current_user_id', true), '')::INT AND status = 'CONFIRMED');

CREATE POLICY faculty_read_request_facilities ON resource_request_facility
FOR SELECT TO campus_faculty
USING (EXISTS (SELECT 1 FROM booking_request br WHERE br.id = request_id));

CREATE POLICY faculty_write_request_facilities ON resource_request_facility
FOR ALL TO campus_faculty
USING (EXISTS (SELECT 1 FROM booking_request br WHERE br.id = request_id AND br.status = 'PENDING'))
WITH CHECK (EXISTS (SELECT 1 FROM booking_request br WHERE br.id = request_id AND br.status = 'PENDING'));

CREATE POLICY admin_all_request_facilities ON resource_request_facility
FOR ALL TO campus_admin USING (true) WITH CHECK (true);

-- 8.3 Admin Policies (Full access to all requests and bookings)
CREATE POLICY admin_all_booking_requests ON booking_request
FOR ALL
TO campus_admin
USING (true)
WITH CHECK (true);

CREATE POLICY admin_all_bookings ON booking
FOR ALL
TO campus_admin
USING (true)
WITH CHECK (true);

-- 8.4 Grants to Roles
-- Read-only tables for faculty
GRANT SELECT ON department, resource_type, resource, facility, resource_facility, maintenance, v_resource_utilization, v_peak_hours TO campus_faculty;
REVOKE SELECT ON users FROM campus_faculty;
GRANT SELECT (id, name, email, department_id) ON users TO campus_faculty;
REVOKE UPDATE ON booking_request FROM campus_faculty;
GRANT SELECT, INSERT ON booking_request TO campus_faculty;
GRANT UPDATE (title, description, start_time, end_time, expected_capacity, status, updated_at) ON booking_request TO campus_faculty;
GRANT SELECT ON booking TO campus_faculty;
GRANT UPDATE (start_time, end_time, updated_at) ON booking TO campus_faculty;
GRANT SELECT, INSERT, UPDATE, DELETE ON resource_request_facility TO campus_faculty;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM campus_faculty;
GRANT USAGE ON booking_request_id_seq TO campus_faculty;
GRANT EXECUTE ON FUNCTION fn_is_available, fn_recommend_resources, fn_set_current_user_id TO campus_faculty;

-- Full access for admin
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM campus_admin;
GRANT SELECT ON department, resource_type, resource, facility, resource_facility,
    maintenance, booking, booking_request, resource_request_facility,
    v_resource_utilization, v_peak_hours, v_pending_requests, v_confirmed_occupancy TO campus_admin;
GRANT SELECT (id, name, email, department_id, role, created_at) ON users TO campus_admin;
GRANT INSERT, UPDATE, DELETE ON resource_type, resource, facility, resource_facility, maintenance TO campus_admin;
GRANT INSERT, UPDATE ON booking_request, booking TO campus_admin;
GRANT INSERT, UPDATE, DELETE ON resource_request_facility TO campus_admin;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM campus_admin;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO campus_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO campus_admin;
GRANT EXECUTE ON ALL PROCEDURES IN SCHEMA public TO campus_admin;
REVOKE EXECUTE ON PROCEDURE sp_approve_request(INT, INT, INT) FROM PUBLIC, campus_faculty;
-- END ACCESS RULES
