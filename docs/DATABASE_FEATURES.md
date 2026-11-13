# Database Features & Verification Guide

## Campus Resource Allocation & Conflict Detection Platform

This document maps every advanced database feature (functions, stored procedures, triggers, views, constraints, indexes, CTEs, and RLS policies) to its direct user-visible operational benefit and provides runnable verification commands.

---

## 1. Feature Mapping Matrix

| # | Feature Name | Object Type | User-Visible Benefit | Verification / Demo Command |
|---|---|---|---|---|
| **1** | `exclude_overlapping_confirmed_bookings` | GiST Exclusion Constraint | Prevents physical double-booking at the PostgreSQL engine level; mathematically guarantees no conflicting reservations exist. | `npx tsx scripts/test-db-features.ts --test=exclusion` |
| **2** | `fn_is_available` | Stored Function (PL/pgSQL) | Instantly computes whether a resource is allocatable by checking status, active bookings, and scheduled maintenance. | `SELECT fn_is_available(1, '2026-11-20 09:00', '2026-11-20 11:00');` |
| **3** | `fn_recommend_resources` | Set-Returning Function | Powers the request wizard; provides transparent, explainable recommendations with weighted score breakdown. | `SELECT * FROM fn_recommend_resources(2, 30, '2026-11-20 11:00', '2026-11-20 13:00', '[]'::JSONB);` |
| **4** | `sp_approve_request` | Stored Procedure (PL/pgSQL) | Safely serializes admin approvals with row-level locks (`FOR UPDATE`), prevents concurrent approval races. | `CALL sp_approve_request(3, 1, 5);` |
| **5** | `trg_booking_validate` | Trigger (`BEFORE INSERT/UPDATE`) | Intercepts booking attempts on resources marked `UNAVAILABLE` or undergoing maintenance with a clear error. | `npx tsx scripts/test-db-features.ts --test=booking_trigger` |
| **6** | `trg_maintenance_status` | Trigger (`AFTER INSERT/UPDATE/DELETE`) | Automatically flips resource status to `MAINTENANCE` during active work, and restores `AVAILABLE` upon completion. | `npx tsx scripts/test-db-features.ts --test=maintenance_trigger` |
| **7** | `trg_request_cancelled` | Trigger (`AFTER UPDATE OF status`) | Cascades request cancellation to automatically release confirmed bookings, freeing resources for others. | `npx tsx scripts/test-db-features.ts --test=cancellation_cascade` |
| **8** | `v_resource_utilization` | Relational View | Displays 30-day utilization percentage assuming 10 hours/day operating baseline for campus administrators. | `SELECT * FROM v_resource_utilization;` |
| **9** | `v_peak_hours` | Relational View | Shows booking volume across 07:00 to 20:00 operational hours to assist faculty in picking quiet slots. | `SELECT * FROM v_peak_hours;` |
| **10**| `v_pending_requests` | Relational View | Aggregates waiting requests with required facilities, faculty info, and wait time for quick admin triage. | `SELECT * FROM v_pending_requests;` |
| **11**| `faculty_select_own_requests` | Row Level Security (RLS) Policy | Enforces data privacy: faculty can only view and edit their own booking requests in raw queries. | `npx tsx scripts/test-db-features.ts --test=rls_isolation` |
| **12**| `calendar_days` (Recursive CTE) | Recursive CTE | Dynamically computes operational campus calendar grids and daily booking loads without hard-coded calendar tables. | See `db/query-workbook.sql` Section 4.1 |

---

## 2. Detailed Technical Specifications & Demo Scripts

### 2.1 Double-Booking Prevention: GiST Exclusion Constraint
- **Constraint Definition**:
  ```sql
  CONSTRAINT exclude_overlapping_confirmed_bookings 
  EXCLUDE USING gist (
      resource_id WITH =, 
      tsrange(start_time, end_time) WITH &&
  ) WHERE (status = 'CONFIRMED');
  ```
- **How It Works**: Uses PostgreSQL's `btree_gist` index to index integer `resource_id` with exact equality (`=`) and timestamp range `tsrange(start_time, end_time)` with range overlap (`&&`). If two confirmed rows overlap for the same resource, PostgreSQL aborts the transaction with `exclusion_violation`.
- **Demo Command**:
  ```bash
  npx tsx -e "
  const { Client } = require('pg');
  const c = new Client({ host: '127.0.0.1', port: 5432, database: 'campus_db', user: 'postgres', password: 'postgres' });
  c.connect().then(async () => {
    try {
      await c.query(\"INSERT INTO booking (request_id, resource_id, booked_by_user_id, start_time, end_time, status) VALUES (999, 1, 2, '2026-11-20 09:30', '2026-11-20 10:30', 'CONFIRMED')\");
    } catch (e) {
      console.log('Blocked by Exclusion Constraint:', e.code, e.message);
    }
    await c.end();
  });
  "
  ```
- **Expected Result**: Error code `23P01` (`exclusion_violation`).

---

### 2.2 Explainable Resource Recommendation (`fn_recommend_resources`)
- **Formula**:
  $$\text{Total Score} = (C \times 0.30) + (F \times 0.30) + (A \times 0.25) + (T \times 0.10) + (L \times 0.05)$$
  - **Capacity Score ($C$)**: $100 - \frac{\text{capacity} - \text{requested}}{\text{requested}} \times 40$ (penalizes oversized rooms that waste campus resources).
  - **Facilities Score ($F$)**: $\frac{\text{matched facilities}}{\text{total requested}} \times 100$.
  - **Availability Score ($A$)**: $100$ (hard-filtered).
  - **Type Score ($T$)**: $100$ (exact requested type).
  - **Location Score ($L$)**: $100$ (baseline).
- **Demo Command**:
  ```sql
  SELECT 
      resource_name, 
      capacity, 
      total_score, 
      capacity_score, 
      facilities_score, 
      availability_score 
  FROM fn_recommend_resources(
      2, -- COMPUTER_LAB
      30, -- Capacity
      '2026-11-20 11:00', 
      '2026-11-20 13:00', 
      '[{\"facility_id\": 4, \"min_quantity\": 30}]'::JSONB
  );
  ```

---

### 2.3 Atomic Approval Stored Procedure (`sp_approve_request`)
- **Flow**:
  1. Verifies caller has role `'ADMIN'`.
  2. Acquires row-level exclusive lock: `SELECT * FROM booking_request WHERE id = p_request_id FOR UPDATE`.
  3. Validates status is `'PENDING'`.
  4. Re-checks availability via `fn_is_available()`.
  5. Updates `booking_request` to `'APPROVED'`.
  6. Inserts confirmed row into `booking`.
- **Demo Command**:
  ```sql
  CALL sp_approve_request(4, 1, 1);
  ```

---

### 2.4 Automatic Maintenance Status Trigger (`trg_maintenance_status`)
- **Benefit**: Campus administrators do not need to manually toggle room availability. When maintenance is marked `IN_PROGRESS`, the room status automatically flips to `MAINTENANCE`. When marked `COMPLETED`, it automatically restores to `AVAILABLE`.
- **Demo Command**:
  ```sql
  -- Start maintenance
  INSERT INTO maintenance (resource_id, scheduled_by_user_id, start_time, end_time, status, reason)
  VALUES (1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '2 hours', 'IN_PROGRESS', 'A/C Servicing');

  -- Verify room status changed to MAINTENANCE
  SELECT code, status FROM resource WHERE id = 1; -- Returns 'MAINTENANCE'

  -- Complete maintenance
  UPDATE maintenance SET status = 'COMPLETED' WHERE resource_id = 1 AND status = 'IN_PROGRESS';

  -- Verify room status restored to AVAILABLE
  SELECT code, status FROM resource WHERE id = 1; -- Returns 'AVAILABLE'
  ```

---

### 2.5 Request Cancellation Cascade (`trg_request_cancelled`)
- **Benefit**: When a faculty member or administrator cancels an approved request, its confirmed booking is immediately cancelled in the same transaction, making the room instantly available for other faculty without orphaned reservations.
- **Demo Command**:
  ```sql
  UPDATE booking_request SET status = 'CANCELLED' WHERE id = 1;
  SELECT id, status FROM booking WHERE request_id = 1; -- Returns 'CANCELLED'
  ```

---

### 2.6 Row Level Security (RLS) & Faculty Isolation
- **Benefit**: Ensures direct database queries from faculty role cannot read or mutate other faculty members' pending requests.
- **Demo Command**:
  ```sql
  -- Set connection context to Faculty 2 (Claude Shannon, ID 3)
  SET ROLE campus_faculty;
  SELECT fn_set_current_user_id(3);

  -- Faculty 2 can only see their own requests (ID 3)
  SELECT id, user_id, title FROM booking_request;
  -- Result: Only rows where user_id = 3 are returned!

  RESET ROLE;
  ```
