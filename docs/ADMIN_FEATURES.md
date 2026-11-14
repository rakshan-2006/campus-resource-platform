# Admin Features & Cross-Store Integration

**Assigned Scope**: Admin Resource Management & MongoDB Extended Profiles, Maintenance Lifecycle Controls, and Operational Analytics & Conflict Demonstrations.

---

## 1. Architectural Boundary & Data Store Responsibilities

| Subsystem | Authoritative Store | Justification |
| :--- | :--- | :--- |
| **Users & Roles** | PostgreSQL (`users`, `department`) | Single source of truth for authentication and `ADMIN` / `FACULTY` role-based access control. |
| **Resource Catalog & Facilities** | PostgreSQL (`resource`, `resource_type`, `facility`, `resource_facility`) | Relational normalization, strict foreign keys, positive capacity and positive quantity constraints. |
| **Extended Resource Profiles** | MongoDB (`campus_resource_profiles`) | Semi-structured hardware, software, GPU, OS, stage acoustics, and accessibility specs differing widely per room type. |
| **Reservations & Conflict Guard** | PostgreSQL (`booking`, `booking_request`, `btree_gist`) | GiST temporal exclusion constraint prevents double-booking at the relational engine level. |
| **Maintenance Scheduling** | PostgreSQL (`maintenance`, `trg_maintenance_status`) | Temporal overlap detection (`tsrange`), cascading resource status updates (`AVAILABLE` ⇄ `MAINTENANCE`). |
| **Analytics Views** | PostgreSQL (`v_resource_utilization`, `v_peak_hours`) | Relational aggregation over confirmed bookings and standard 300-hour operating window. |

> [!IMPORTANT]
> **MongoDB Boundary Principle**: MongoDB does not store or participate in booking decisions, user privileges, or maintenance status. If a MongoDB profile is absent, the system gracefully displays `"No extended specifications recorded"`. Furthermore, MongoDB cannot participate in PostgreSQL transactions; PostgreSQL changes commit first, followed by MongoDB operations with explicit error reporting on failure.

---

## 2. Admin Screens Implemented

### 2.1 Resource & Inventory Management (`/admin/resources`)
- **Three-Tier Catalog Navigation**: Tabbed views for **Resources**, **Resource Types**, and **Facilities**.
- **Dense Operational Table**: Displays resource code, name, location, classification, department, seating capacity, status badge, facility quantities (e.g. `4K Projector ×1`), and booking usage counts.
- **Filtering & Search**: Instant client-side filtering by name, code, department, classification type, and operational status (`AVAILABLE`, `MAINTENANCE`, `UNAVAILABLE`).
- **Resource Add/Edit Modal**:
  - Enforces positive capacity and positive facility quantities.
  - Transactionally replaces `resource_facility` junction rows on update.
  - Prohibits manual selection of `MAINTENANCE` status.
  - Prohibits setting status to `AVAILABLE` if active maintenance is currently ongoing.
- **Extended Profile (MongoDB) Sub-Section**:
  - Dynamically renders fields tailored to the resource type (e.g., Computer Labs: terminal count, CPU, RAM, GPU, OS, network speed, and software array; Auditoriums: stage dimensions, seating tier, acoustics RT60, lighting rig).
  - Explicit RUD controls: Create profile on resource creation, load existing profile on edit, update specifications, and delete/clear extended profile independently without touching PostgreSQL.
- **Delete Protection Confirmation**: Checks referential integrity before deletion. Actionable 409 conflict messages guide the administrator to mark referenced resources unavailable instead of deleting them.

### 2.2 Maintenance & Servicing Management (`/admin/maintenance`)
- **Active & History Tabs**: Filters active servicing (`SCHEDULED`, `IN_PROGRESS`) separate from past servicing logs (`COMPLETED`, `CANCELLED`).
- **Schedule Maintenance Modal**: Validates that `end_time > start_time`.
- **Pre-Execution Conflict Warning**: Automatically previews confirmed bookings overlapping the proposed maintenance window before scheduling. Bookings are not deleted or cancelled automatically, maintaining faculty auditability.
- **State Transition Controls**:
  - Valid transitions strictly enforced:
    - `SCHEDULED` → `IN_PROGRESS` or `CANCELLED`
    - `IN_PROGRESS` → `COMPLETED` or `CANCELLED`
  - Rejects illegal state skips (e.g. `SCHEDULED` → `COMPLETED`) with HTTP 409.
  - Direct PostgreSQL `UPDATE` statements trigger `trg_maintenance_status`, synchronizing resource status between `AVAILABLE` and `MAINTENANCE`.

### 2.3 Campus Utilization & Analytics (`/admin/analytics`)
- **Operational Metrics**: Total campus resources, 30-day booking count, confirmed reservations count, and pending triage requests.
- **Dynamic Threshold Filtering**: User-adjustable underutilization threshold percentage (default 30%). Resources falling below the threshold are highlighted in amber.
- **Operating Capacity Model**: Stated assumption of a 30-day evaluation window with 10 operating hours/day (300 maximum operating hours).
- **Interactive Peak Hours Chart**: Visual bar chart using Recharts mapping booking distribution across campus operating hours (07:00 to 20:00), with zero-count hours represented.
- **Department & Status Breakdowns**: Tabular allocations of bookings by department and requests by status.

---

## 3. API Routes Implemented

| Method | Endpoint | Description | Auth & Security |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/resources` | List all resources with type name, facilities array, and non-cancelled booking usage count | `ADMIN` Session |
| `POST` | `/api/admin/resources` | Create resource and transactionally insert facility quantities | `ADMIN` Session |
| `GET` | `/api/admin/resources/[id]` | Fetch single resource with facilities and linked MongoDB profile | `ADMIN` Session |
| `PATCH` | `/api/admin/resources/[id]` | Update resource details and replace facilities transactionally | `ADMIN` Session |
| `DELETE` | `/api/admin/resources/[id]` | Delete resource if unreferenced; refuses with 409 if referenced | `ADMIN` Session |
| `GET` | `/api/admin/resource-types` | List all room classifications | `ADMIN` Session |
| `POST` | `/api/admin/resource-types` | Create room classification | `ADMIN` Session |
| `PATCH` | `/api/admin/resource-types/[id]` | Update room classification | `ADMIN` Session |
| `DELETE` | `/api/admin/resource-types/[id]` | Delete classification (refuses with 409 if in use) | `ADMIN` Session |
| `GET` | `/api/admin/facilities` | List all facility equipment items | `ADMIN` Session |
| `POST` | `/api/admin/facilities` | Create facility equipment item | `ADMIN` Session |
| `PATCH` | `/api/admin/facilities/[id]` | Update facility equipment item | `ADMIN` Session |
| `DELETE` | `/api/admin/facilities/[id]` | Delete facility item (refuses with 409 if allocated) | `ADMIN` Session |
| `GET` | `/api/admin/resource-profiles/[resourceId]` | Fetch MongoDB extended profile (returns null if unrecorded) | `ADMIN` Session |
| `POST` | `/api/admin/resource-profiles/[resourceId]` | Create MongoDB extended profile; enforces type match; 409 if exists | `ADMIN` Session |
| `PATCH` | `/api/admin/resource-profiles/[resourceId]` | Update MongoDB specifications and server-generated `updated_at` | `ADMIN` Session |
| `DELETE` | `/api/admin/resource-profiles/[resourceId]` | Delete MongoDB profile only; PostgreSQL resource remains untouched | `ADMIN` Session |
| `GET` | `/api/admin/maintenance` | List maintenance records with status and resource filtering | `ADMIN` Session |
| `POST` | `/api/admin/maintenance` | Schedule new maintenance window as `SCHEDULED` | `ADMIN` Session |
| `GET` | `/api/admin/maintenance/[id]` | Fetch single maintenance record | `ADMIN` Session |
| `PATCH` | `/api/admin/maintenance/[id]` | Enforce state machine transitions (`SCHEDULED` ⇄ `IN_PROGRESS` ⇄ `COMPLETED`) | `ADMIN` Session |
| `GET` | `/api/admin/maintenance/[id]/booking-preview` | Preview confirmed reservations overlapping maintenance interval | `ADMIN` Session |
| `GET` | `/api/admin/analytics` | Aggregates view utilization, peak hours, totals, and underutilization | `ADMIN` Session |

---

## 4. PostgreSQL Triggers, Constraints & Views Utilized

1. **`exclude_overlapping_confirmed_bookings` (GiST Constraint)**:
   Engine-level enforcement of single-booking policy. Tested by `scripts/demo-conflict.sql`.
2. **`trg_maintenance_status` (Trigger on `maintenance`)**:
   Automatically sets `resource.status = 'MAINTENANCE'` when any maintenance record transitions to `IN_PROGRESS`. Restores `resource.status = 'AVAILABLE'` once maintenance is completed or cancelled.
3. **`trg_booking_validate` (Trigger on `booking`)**:
   Prevents insertion of confirmed bookings for resources marked `UNAVAILABLE` or during active maintenance windows.
4. **`v_resource_utilization` (Operational View)**:
   Calculates total confirmed hours in the last 30 days against the 300-hour institutional baseline.
5. **`v_peak_hours` (Operational View)**:
   Generates a full series across hours 07:00 through 20:00 to provide a continuous distribution of reservation density.

---

## 5. MongoDB Profile Boundary & RUD Evidence

Extended profiles in collection `campus_resource_profiles` demonstrate full Read-Update-Delete (RUD) lifecycle:

1. **Create Profile**:
   ```http
   POST /api/admin/resource-profiles/3
   Content-Type: application/json

   {
     "resource_type": "COMPUTER_LAB",
     "specifications": {
       "computer_count": 40,
       "cpu": "Intel Core i9-14900K",
       "ram": "64 GB DDR5",
       "gpu_model": "NVIDIA RTX 4080",
       "software": ["Docker", "PostgreSQL 16", "Python 3.12", "MATLAB"]
     }
   }
   ```
   *Response*: `201 Created` with document containing `pg_resource_id: 3`, generated ISO `updated_at`, and validated specifications.

2. **Read Profile**:
   ```http
   GET /api/admin/resource-profiles/3
   ```
   *Response*: `200 OK` with full profile JSON. Non-existent profiles return `200 OK` with `{ "data": null }`.

3. **Update Profile**:
   ```http
   PATCH /api/admin/resource-profiles/3
   Content-Type: application/json

   {
     "specifications": {
       "software": ["Docker", "PostgreSQL 16", "Python 3.12", "MATLAB", "PyTorch 2.5"]
     }
   }
   ```
   *Response*: `200 OK` with merged specifications and updated server timestamp.

4. **Delete Profile**:
   ```http
   DELETE /api/admin/resource-profiles/3
   ```
   *Response*: `200 OK` with `{ "data": { "deleted": true, "pg_resource_id": 3 } }`. The underlying PostgreSQL resource record `LAB-CS1` remains available and untouched.

---

## 6. Demonstration Sequence for Evaluators

1. **Sign in as Admin**:
   - Access `/login` and select **Dr. Alan Turing (Admin)**.
2. **Catalog & MongoDB Profile RUD**:
   - Navigate to `/admin/resources`.
   - Click **+ Add Resource** and create `LAB-AI-101` (Turing AI Lab, Capacity 40, Computer Lab).
   - Enable **Extended Specifications (MongoDB)**, enter GPU and software packages, and submit.
   - Edit the newly created resource, verify that the MongoDB specifications reloaded correctly, modify a software package, and save.
   - Delete the extended profile independently, and observe that the PostgreSQL resource remains intact.
3. **Referential Integrity Enforcement**:
   - In the Resources table, attempt to delete `LH-101` (which has active bookings). Observe the 409 conflict dialog preventing orphan records.
4. **Maintenance State Synchronization**:
   - Navigate to `/admin/maintenance` and click **Schedule Maintenance**.
   - Select `LH-101` for tomorrow. The dialog displays an amber warning showing the existing confirmed midterm booking.
   - Schedule the maintenance window.
   - In the Active table, click **Start**. The record transitions to `IN_PROGRESS`, and the resource badge immediately updates to `MAINTENANCE`.
   - Click **Complete**. The record moves to History, and the resource badge returns to `AVAILABLE`.
5. **Analytics & Utilization**:
   - Navigate to `/admin/analytics`.
   - Review the summary statistics and peak hours bar chart.
   - Adjust the **Underutilization threshold** to `50%` and note how low-traffic venues are dynamically highlighted.
6. **Engine-Level Conflict Script**:
   - In the terminal, execute `psql -U postgres -d campus_db -f scripts/demo-conflict.sql`.
   - Observe the GiST exclusion constraint error (`SQLSTATE 23P01`) preventing concurrent double-booking.
