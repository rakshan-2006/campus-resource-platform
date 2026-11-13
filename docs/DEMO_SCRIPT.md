# Demonstration Script & Viva Walkthrough Guide

## Campus Resource Allocation & Conflict Detection Platform

This script provides an examiner/evaluator walkthrough of the system, highlighting key database concepts, architecture, and real-time operational workflows.

---

## 1. Environment & Setup Checklist

1. **Verify Services**:
   ```bash
   # Check PostgreSQL & MongoDB status
   npm run db:setup
   ```
2. **Launch Application**:
   ```bash
   npm run dev
   # Open browser at http://localhost:3000
   ```
3. **Demo Accounts**:
   - **Administrator**: `admin@campus.edu` / `Admin@123`
   - **Faculty CS**: `faculty1@campus.edu` / `Faculty@123`
   - **Faculty EC**: `faculty2@campus.edu` / `Faculty@123`

---

## 2. Walkthrough Steps

### Step 1: Login & Role-Based Navigation
- Navigate to `http://localhost:3000/login`.
- Notice the dense, calm institutional layout.
- Click **"Fill Faculty 1 (CS)"** and log in.
- Observe:
  - Header displays `Dr. Grace Hopper (Faculty CS)` with badge `FACULTY`.
  - Navigation provides: **Dashboard**, **Explore Resources**, **New Request**, **My Requests**, **Campus Bookings**, **Schedule Timeline**.
  - Admin management links are restricted.

---

### Step 2: Resource Catalog & Dual-Store Representation
- Navigate to **Explore Resources** (`/resources`).
- Filter by type **"Computer Laboratory"**.
- Click on **"Alan Kay Computing Lab (LAB-CS1)"**.
- Point out to evaluator:
  - **Authoritative PostgreSQL Data**: Code `LAB-CS1`, Department `Computer Science`, Capacity `40`, Status `AVAILABLE`, relational facilities (40 Workstations, 1 Projector).
  - **MongoDB Extended Specifications**: Deeply structured specifications card displaying CPU (`Intel Core i9`), RAM (`64 GB DDR5`), GPU (`RTX 4080`), and software suite array (`Docker`, `PostgreSQL Client`, `MATLAB`, `Wireshark`).
  - Explain why: Hardware and software specs are variable and semi-structured; they belong in MongoDB, while bookings and capacity belong in PostgreSQL.
- Click back and view **"Lecture Hall 101"**:
  - Show the fallback: *"No extended specifications recorded"*. Emphasize that absence of a MongoDB profile is a normal operational state, not an error.

---

### Step 3: Explainable Ranked Recommendations (`fn_recommend_resources`)
- Navigate to **New Request** (`/request/new`).
- Scenario: Faculty wants to book a computer lab for 30 students.
  - Set Resource Type: **Computer Laboratory**.
  - Set Expected Capacity: **30**.
  - Set Date & Time: **2026-11-20 11:00** to **2026-11-20 13:00**.
  - Select Required Facility: **High-End Workstations**, Minimum Quantity: **30**.
- Click **"Search & Compute Recommendations"**.
- Evaluator Focus:
  - Show candidate cards returned by `fn_recommend_resources`.
  - Point out the **Component Score Breakdown**:
    - Total Match Score: `98.29%`
    - Capacity Score: `94.29%` (30% weight) — Explain the penalty for excess capacity (35 vs 30) to prevent room hoarding.
    - Facilities Score: `100.00%` (30% weight) — 35 available >= 30 required.
    - Availability Score: `100.00%` (25% weight).
    - Type Score: `100.00%` (10% weight).
    - Location Score: `100.00%` (5% weight).
- Click **"Select Resource & Submit Request"**.
- The request is submitted and appears in **My Requests** with status `PENDING`.

---

### Step 4: Admin Triage & Conflict Prevention (`sp_approve_request`)
- Logout and log in as **Administrator** (`admin@campus.edu`).
- Observe: Admin badge, administrative overview on Dashboard.
- Navigate to **Admin Requests** (`/admin/requests`).
- Locate the pending request submitted in Step 3.
- Click **"Approve & Allocate"**.
- Point out:
  - The API invokes PostgreSQL stored procedure `sp_approve_request`.
  - Stored procedure executes `FOR UPDATE` lock, checks `fn_is_available`, atomically updates request to `APPROVED`, and inserts a `CONFIRMED` booking.
- Try conflicting scenario:
  - If another request asks for the exact same room and time slot, clicking Approve will cleanly trigger `RESOURCE_CONFLICT` and prevent double-booking.

---

### Step 5: Double-Booking Prevention: PostgreSQL GiST Exclusion Constraint
- Navigate to **Campus Bookings** (`/bookings`).
- Observe the confirmed booking.
- Run the exclusion test script in the terminal:
  ```bash
  npx tsx scripts/test-db-features.ts --test=exclusion
  ```
- Evaluator Focus:
  - Show the PostgreSQL engine error `23P01 (exclusion_violation)`.
  - Explain that double-booking is impossible even under high concurrency or external direct SQL execution.

---

### Step 6: Trigger Demonstration: Maintenance & Cancellation Cascade
- In the terminal or Admin view:
  ```bash
  npx tsx scripts/test-db-features.ts --test=maintenance
  npx tsx scripts/test-db-features.ts --test=cancellation
  ```
- Show:
  1. Setting maintenance to `IN_PROGRESS` immediately sets resource `status = 'MAINTENANCE'`.
  2. Setting maintenance to `COMPLETED` restores `status = 'AVAILABLE'`.
  3. Cancelling a request automatically cascades to cancel the associated booking row in `booking`.

---

### Step 7: Row-Level Security (RLS) Isolation
- Run RLS verification:
  ```bash
  npx tsx scripts/test-db-features.ts --test=rls
  ```
- Demonstrate:
  - When connection is in `campus_faculty` role with user ID 3, user 2's requests cannot be selected or modified.
