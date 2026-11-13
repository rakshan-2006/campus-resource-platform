# System Test Plan & Verification Results

## Campus Resource Allocation & Conflict Detection Platform

This test plan exercises every relational table constraint, concurrency lock, GiST exclusion boundary, trigger cascade, RLS policy, and NoSQL fallback mechanism.

---

## 1. Test Suite Summary

| Test ID | Category | Objective | Verification Command | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | **DDL & Constraints** | Re-runnable DDL, named constraints, positive capacity/quantity checks | `npm run db:migrate && npm run db:seed` | **PASSED** |
| **TC-02** | **Conflict Prevention** | GiST exclusion constraint blocks overlapping confirmed bookings | `npx tsx scripts/test-db-features.ts --test=exclusion` | **PASSED** |
| **TC-03** | **Availability Check** | `fn_is_available` returns FALSE for overlapping bookings & maintenance | `npx tsx scripts/test-db-features.ts --test=availability` | **PASSED** |
| **TC-04** | **Recommendation** | `fn_recommend_resources` calculates correct weighted component scores | `npx tsx scripts/test-db-features.ts --test=recommendation` | **PASSED** |
| **TC-05** | **Atomic Approval** | `sp_approve_request` validates admin, locks rows, prevents double-approval | `npx tsx scripts/test-db-features.ts --test=approval` | **PASSED** |
| **TC-06** | **Maintenance Status** | `trg_maintenance_status` flips status to `MAINTENANCE` then restores `AVAILABLE` | `npx tsx scripts/test-db-features.ts --test=maintenance` | **PASSED** |
| **TC-07** | **Cancellation Cascade**| `trg_request_cancelled` automatically cancels confirmed booking | `npx tsx scripts/test-db-features.ts --test=cancellation` | **PASSED** |
| **TC-08** | **RLS Faculty Isolation**| Faculty role cannot read or mutate other faculty requests | `npx tsx scripts/test-db-features.ts --test=rls` | **PASSED** |
| **TC-09** | **Mongo Profile CRUD** | JSON schema validation, multikey indexes, and graceful read fallback | `npx tsx scripts/test-integration.ts` | **PASSED** |
| **TC-10** | **Query Workbook** | All DML, CTE, aggregation, and analytical queries in workbook execute | `npx tsx scripts/test-db-features.ts --test=workbook` | **PASSED** |

---

## 2. Test Execution Details & Observed Results

### TC-01: Schema Migration & Deterministic Seed
- **Command Run**:
  ```bash
  npm run db:setup
  ```
- **Observed Result**:
  - `✓ Schema migration completed successfully.` (PostgreSQL 16)
  - `✓ PostgreSQL seed completed successfully.` (4 departments, 3 users, 5 resource types, 8 resources, 6 facilities, seed requests and bookings)
  - `✓ MongoDB collection schema validation and indexes configured successfully.`
  - `✓ Inserted 4 resource profiles into MongoDB.`

---

### TC-02: GiST Exclusion Constraint (Double-Booking Prevention)
- **Objective**: Attempt to manually insert a confirmed booking overlapping an existing confirmed booking for the same resource (`LH-101` on `2026-11-20 09:30` to `10:30`).
- **Observed Result**:
  - PostgreSQL aborted the insertion immediately with code `23P01` (`exclusion_violation`).
  - Error: `conflicting key value violates exclusion constraint "exclude_overlapping_confirmed_bookings"`.
  - Zero conflicting records were created.

---

### TC-03: Stored Function `fn_is_available`
- **Objective**: Evaluate room availability across conflicting and non-conflicting time windows.
- **Observed Result**:
  - Slot `2026-11-20 09:00 - 11:00` for Resource 1: returns `FALSE` (Confirmed booking conflict).
  - Slot `2026-11-20 11:30 - 13:00` for Resource 1: returns `TRUE` (Available).
  - Slot `2026-11-22 09:00 - 11:00` for Resource 2: returns `FALSE` (Scheduled maintenance conflict).

---

### TC-04: Explainable Ranked Recommendations (`fn_recommend_resources`)
- **Objective**: Request a Computer Lab for 30 students requiring 30 Workstations.
- **Observed Result**:
  - Resource 4 (`LAB-CS2`, capacity 35) returned with `total_score = 98.29` (Rank 1).
    - `capacity_score = 94.29` (ideal match, small excess penalty).
    - `facilities_score = 100.00` (all 30 workstations satisfied).
    - `availability_score = 100.00`.
  - Full breakdown rendered in JSON format with required vs available quantities.

---

### TC-05: Concurrent Approvals & Stored Procedure (`sp_approve_request`)
- **Objective**: Execute concurrent approvals for two pending requests competing for the same resource time slot.
- **Observed Result**:
  - Transaction 1 acquires row lock, validates availability, and commits `APPROVED` state.
  - Transaction 2 raises exception: `RESOURCE_CONFLICT: Resource is unavailable or conflicts with another confirmed booking`.
  - Exactly one confirmed booking persisted in the database.

---

### TC-06: Maintenance Trigger (`trg_maintenance_status`)
- **Objective**: Insert `maintenance` row with status `'IN_PROGRESS'`.
- **Observed Result**:
  - Target resource `status` in table `resource` immediately updated to `'MAINTENANCE'`.
  - Updating maintenance status to `'COMPLETED'` automatically restored resource status to `'AVAILABLE'`.

---

### TC-07: Cancellation Cascade (`trg_request_cancelled`)
- **Objective**: Update approved request status to `'CANCELLED'`.
- **Observed Result**:
  - Associated booking row in table `booking` automatically updated to `'CANCELLED'` with timestamp update.
  - Room immediately became available for re-allocation.

---

### TC-08: Row Level Security (RLS) & Faculty Isolation
- **Objective**: Connect with role `campus_faculty` under `app.current_user_id = 3` (Faculty 2) and run `SELECT * FROM booking_request`.
- **Observed Result**:
  - Only requests belonging to user 3 were returned.
  - Requests belonging to user 2 (Faculty 1) were invisible and inaccessible.
  - Attempting an `UPDATE` on user 2's request returned 0 rows updated (silent denial enforced by RLS).

---

### TC-09: MongoDB Variable Profiles & Fallback
- **Objective**: Query resource details for resources with and without extended specifications.
- **Observed Result**:
  - Resource 3 (`LAB-CS1`): Returns structured specifications (CPU, RAM, GPU, software array).
  - Resource 1 (`LH-101`): Returns `profile: null`. The UI gracefully rendered `"No extended specifications recorded"`.
