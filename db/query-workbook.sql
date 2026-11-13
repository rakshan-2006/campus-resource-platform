-- ============================================================================
-- CAMPUS RESOURCE ALLOCATION & CONFLICT DETECTION PLATFORM
-- db/query-workbook.sql
-- Lab-ready SQL and NoSQL query workbook with expected-result comments
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SECTION 1: DATA MANIPULATION LANGUAGE (DML)
-- ----------------------------------------------------------------------------

-- 1.1 INSERT: Submit a new resource booking request
-- Expected Result: Inserts row with status 'PENDING', returns generated request ID.
INSERT INTO booking_request (
    user_id,
    resource_type_id,
    preferred_resource_id,
    title,
    description,
    start_time,
    end_time,
    expected_capacity,
    status
) VALUES (
    2, -- Dr. Grace Hopper (Faculty CS)
    1, -- CLASSROOM
    1, -- LH-101
    'CS201 Data Structures Doubt Session',
    'Extra tutorial covering AVL trees and heaps',
    '2026-11-25 15:00:00',
    '2026-11-25 17:00:00',
    40,
    'PENDING'
) RETURNING id, title, status, start_time, end_time;

-- 1.2 UPDATE: Update request notes/capacity before admin approval
-- Expected Result: 1 row updated with new expected capacity and title.
UPDATE booking_request
SET expected_capacity = 45,
    title = 'CS201 Data Structures Extended Tutorial',
    updated_at = CURRENT_TIMESTAMP
WHERE id = (SELECT MAX(id) FROM booking_request WHERE status = 'PENDING');

-- 1.3 DELETE: Delete a rejected or draft request facility mapping
-- Expected Result: Deletes matching requested facility row cleanly without cascade issues.
DELETE FROM resource_request_facility
WHERE request_id = 99999; -- Safe non-existent ID demonstration

-- 1.4 Multi-row Transactional Mutation:
-- Atomic creation of a request with multiple requested facilities in one transaction
BEGIN;
DO $$
DECLARE
    v_req_id INT;
BEGIN
    INSERT INTO booking_request (
        user_id, resource_type_id, preferred_resource_id,
        title, description, start_time, end_time, expected_capacity, status
    ) VALUES (
        3, 2, 4,
        'Embedded Systems Project Demo',
        'Student hardware demonstration with logic analyzers',
        '2026-11-26 10:00:00', '2026-11-26 13:00:00', 30, 'PENDING'
    ) RETURNING id INTO v_req_id;

    -- Insert multiple facility requirements atomically
    INSERT INTO resource_request_facility (request_id, facility_id, min_quantity) VALUES
    (v_req_id, 4, 30), -- 30 Workstations
    (v_req_id, 1, 1);  -- 1 Projector

    RAISE NOTICE 'Transactional request created with ID %', v_req_id;
END;
$$;
COMMIT;

-- ----------------------------------------------------------------------------
-- SECTION 2: COMPLEX JOINS, AGGREGATIONS & HAVING
-- ----------------------------------------------------------------------------

-- 2.1 Multi-table Inner & Outer Join:
-- List all resources with their department, type, total installed facilities, and current status
-- Expected Result: 8 rows with detailed resource attributes and facility counts.
SELECT 
    r.id AS resource_id,
    r.code AS resource_code,
    r.name AS resource_name,
    rt.name AS resource_type,
    d.name AS department,
    r.capacity,
    r.status,
    COUNT(rf.facility_id) AS total_facility_types,
    COALESCE(SUM(rf.quantity), 0) AS total_facility_items
FROM resource r
JOIN resource_type rt ON r.resource_type_id = rt.id
JOIN department d ON r.department_id = d.id
LEFT JOIN resource_facility rf ON r.id = rf.resource_id
GROUP BY r.id, r.code, r.name, rt.name, d.name, r.capacity, r.status
ORDER BY r.id ASC;

-- 2.2 Aggregation with HAVING Clause:
-- Find departments that have resources capable of accommodating an aggregate capacity of >= 100
-- Expected Result: CS (120+40+35+60=255) and ADMIN (450+25=475).
SELECT 
    d.id AS department_id,
    d.name AS department_name,
    COUNT(r.id) AS total_resources,
    SUM(r.capacity) AS aggregate_capacity,
    ROUND(AVG(r.capacity), 1) AS avg_resource_capacity
FROM department d
JOIN resource r ON d.id = r.department_id
GROUP BY d.id, d.name
HAVING SUM(r.capacity) >= 100
ORDER BY aggregate_capacity DESC;

-- ----------------------------------------------------------------------------
-- SECTION 3: NESTED & CORRELATED QUERIES
-- ----------------------------------------------------------------------------

-- 3.1 Nested Query:
-- Find all resources that have a capacity strictly greater than the average capacity of all classrooms
-- Expected Result: Resources with capacity > 70 (e.g., LH-102 at 80, SEM-HALL-A at 120, AUD-CENTRAL at 450).
SELECT 
    r.id,
    r.name,
    r.capacity,
    r.location
FROM resource r
WHERE r.capacity > (
    SELECT AVG(r2.capacity)
    FROM resource r2
    JOIN resource_type rt2 ON r2.resource_type_id = rt2.id
    WHERE rt2.code = 'CLASSROOM'
)
ORDER BY r.capacity DESC;

-- 3.2 Correlated Subquery:
-- For each resource, determine the total count of confirmed bookings that exist for it
-- Expected Result: Every resource with its individual confirmed booking count.
SELECT 
    r.id,
    r.code,
    r.name,
    (
        SELECT COUNT(*)
        FROM booking b
        WHERE b.resource_id = r.id
          AND b.status = 'CONFIRMED'
    ) AS confirmed_bookings_count
FROM resource r
ORDER BY confirmed_bookings_count DESC, r.id ASC;

-- ----------------------------------------------------------------------------
-- SECTION 4: COMMON TABLE EXPRESSIONS (CTEs)
-- ----------------------------------------------------------------------------

-- 4.1 Recursive CTE: Generated Campus Date Series / Calendar Grid
-- Generates a 7-day schedule date series starting from seed date and checks booking load
-- Expected Result: 7 rows with date and count of confirmed bookings on that day.
WITH RECURSIVE calendar_days AS (
    SELECT '2026-11-20'::DATE AS day_date
    UNION ALL
    SELECT (day_date + INTERVAL '1 day')::DATE
    FROM calendar_days
    WHERE day_date < '2026-11-26'::DATE
)
SELECT 
    cd.day_date,
    TO_CHAR(cd.day_date, 'Dy, DD Mon YYYY') AS formatted_day,
    COUNT(b.id) AS total_confirmed_bookings
FROM calendar_days cd
LEFT JOIN booking b ON b.status = 'CONFIRMED' 
    AND b.start_time::DATE = cd.day_date
GROUP BY cd.day_date
ORDER BY cd.day_date ASC;

-- 4.2 Ordinary CTE for Useful Operational Analysis:
-- Identify heavily contested resources (resources with both confirmed bookings and pending requests)
-- Expected Result: Operational table showing pending demand vs confirmed allocation.
WITH resource_confirmed AS (
    SELECT resource_id, COUNT(*) AS confirmed_count
    FROM booking
    WHERE status = 'CONFIRMED'
    GROUP BY resource_id
),
resource_pending AS (
    SELECT preferred_resource_id AS resource_id, COUNT(*) AS pending_count
    FROM booking_request
    WHERE status = 'PENDING' AND preferred_resource_id IS NOT NULL
    GROUP BY preferred_resource_id
)
SELECT 
    r.id AS resource_id,
    r.name AS resource_name,
    COALESCE(rc.confirmed_count, 0) AS confirmed_allocations,
    COALESCE(rp.pending_count, 0) AS pending_requests,
    (COALESCE(rc.confirmed_count, 0) + COALESCE(rp.pending_count, 0)) AS total_engagement
FROM resource r
LEFT JOIN resource_confirmed rc ON r.id = rc.resource_id
LEFT JOIN resource_pending rp ON r.id = rp.resource_id
ORDER BY total_engagement DESC, r.id ASC;

-- ----------------------------------------------------------------------------
-- SECTION 5: FUNCTIONS & STORED PROCEDURES EXECUTION
-- ----------------------------------------------------------------------------

-- 5.1 Call Availability Function:
-- Check if LH-101 is available on 2026-11-20 from 09:00 to 11:00 (Already booked by Request 1)
-- Expected Result: FALSE
SELECT fn_is_available(1, '2026-11-20 09:00:00', '2026-11-20 11:00:00') AS is_available;

-- Check if LH-101 is available on 2026-11-20 from 11:30 to 13:00 (No conflict)
-- Expected Result: TRUE
SELECT fn_is_available(1, '2026-11-20 11:30:00', '2026-11-20 13:00:00') AS is_available;

-- 5.2 Call Explainable Recommendation Function:
-- Search for a Computer Lab with capacity >= 30, requiring 30 Workstations and 1 Projector
-- Expected Result: Returns candidate labs with transparent component score breakdown
SELECT * FROM fn_recommend_resources(
    2, -- COMPUTER_LAB
    30, -- Capacity
    '2026-11-20 11:00:00',
    '2026-11-20 13:00:00',
    '[{"facility_id": 4, "min_quantity": 30}, {"facility_id": 1, "min_quantity": 1}]'::JSONB
);

-- 5.3 Call Approval Procedure:
-- Admin (ID 1) approves pending request 3 (Seminar Hall for IEEE lecture)
-- Expected Result: Request 3 updated to APPROVED, new booking inserted into `booking`.
CALL sp_approve_request(3, 1, 5);

-- Verify the result of approval procedure
SELECT b.id, b.request_id, b.resource_id, r.name, b.status, b.start_time, b.end_time
FROM booking b
JOIN resource r ON b.resource_id = r.id
WHERE b.request_id = 3;

-- ----------------------------------------------------------------------------
-- SECTION 6: MONGODB SHELL RUD OPERATIONS (campus_resource_profiles)
-- Run these statements in mongosh against campus_profiles database
-- ----------------------------------------------------------------------------

/*
// 6.1 READ: Search for lab profiles equipped with 'Docker' and RAM > 32GB
db.campus_resource_profiles.find({
  "resource_type": "COMPUTER_LAB",
  "specifications.software": "Docker"
}, {
  "pg_resource_id": 1,
  "resource_type": 1,
  "specifications.cpu": 1,
  "specifications.ram": 1,
  "specifications.software": 1
}).pretty();

// 6.2 INSERT: Create a dynamic specifications profile for Demo Classroom (pg_resource_id: 1)
db.campus_resource_profiles.insertOne({
  pg_resource_id: NumberInt(1),
  resource_type: "CLASSROOM",
  updated_at: new Date().toISOString(),
  specifications: {
    desk_type: "Fixed wooden benches with under-desk book storage",
    blackboard_type: "Dual ceramic green chalkboard (12ft x 4ft)",
    window_blinds: "Motorized blackout shades for projection clarity",
    power_outlets_per_bench: NumberInt(2)
  }
});

// 6.3 UPDATE: Add new licensed software package to LAB-CS1 profile
db.campus_resource_profiles.updateOne(
  { pg_resource_id: NumberInt(3) },
  {
    $addToSet: { "specifications.software": "Postman Enterprise" },
    $set: { updated_at: new Date().toISOString() }
  }
);

// 6.4 DELETE: Delete the demo classroom profile created in 6.2
db.campus_resource_profiles.deleteOne({ pg_resource_id: NumberInt(1) });
*/
