# Demonstration Script & Viva Walkthrough Guide

## Campus Resource Allocation & Conflict Detection Platform

This script provides an examiner/evaluator walkthrough of the system, highlighting key database concepts, architecture, and real-time operational workflows.

---

## 1. Environment & Setup Checklist

1. **Verify Services**:
   ```bash
   # Check PostgreSQL & MongoDB status
   npm run db:setup

   # Ensure Club workflow migration is applied
   npm run db:migrate:club
   ```
2. **Launch Application**:
   ```bash
   npm run dev
   # Open browser at http://localhost:3000
   ```
3. **Demo Accounts**:
   - **Administrator**: `admin@campus.edu` / `Admin@123`
   - **Faculty CS & Advisor**: `faculty1@campus.edu` / `Faculty@123` (Dr. Grace Hopper)
   - **Faculty ECE & Advisor**: `faculty2@campus.edu` / `Faculty@123` (Dr. Claude Shannon)
   - **Verified Student Club**: `club1@campus.edu` / `Club@123` (ACM Student Chapter)
   - **Verified Student Club**: `club2@campus.edu` / `Club@123` (Robotics Society)
   - **Pending Club Applicant**: `pending.club@campus.edu` / `Club@123` (Design Guild)
   - **Pending Faculty Applicant**: `pending.faculty@campus.edu` / `Faculty@123` (Dr. John von Neumann)

---

## 2. Walkthrough Steps

### Step 1: Login & Role-Based Navigation
- Navigate to `http://localhost:3000/login`.
- Notice the clean, institutional layout.
- Click **"Fill Faculty 1 (CS)"** and log in.
- Observe:
  - Header displays `Dr. Grace Hopper` with badge `FACULTY`.
  - Navigation provides: **Dashboard**, **Explore Resources**, **New Request**, **My Requests**, **Advisor Desk**, **Campus Bookings**, **Schedule Timeline**.
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
- Click **"Search & Recommend Venues"**.
- Evaluator Focus:
  - Show candidate cards returned by `fn_recommend_resources`.
  - Point out the **Component Score Breakdown**:
    - Total Match Score: `98.29%`
    - Capacity Score: `94.29%` (30% weight) — Explain the penalty for excess capacity (35 vs 30) to prevent room hoarding.
    - Facilities Score: `100.00%` (30% weight) — 35 available >= 30 required.
    - Availability Score: `100.00%` (25% weight).
    - Type Score: `100.00%` (10% weight).
    - Location Score: `100.00%` (5% weight).
- Click **"Confirm Selection & Submit Request"**.
- The request is submitted and appears in **My Requests** with status `PENDING`.

---

### Step 4: Admin Triage & Conflict Prevention (`sp_approve_request`)
- Logout and log in as **Administrator** (`admin@campus.edu`).
- Observe: Admin badge, administrative overview on Dashboard.
- Navigate to **Admin Requests** (`/admin/requests`).
- Locate the pending request submitted in Step 3.
- Click **"Allocate Room"**.
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
  npm run test:db
  ```
- Evaluator Focus:
  - Show the PostgreSQL engine error `23P01 (exclusion_violation)`.
  - Explain that double-booking is impossible even under high concurrency or external direct SQL execution.

---

### Step 6: Public Self-Registration & Role Protection
- Navigate to `http://localhost:3000/login`.
- Switch to the **Create account** tab.
- Evaluator Focus:
  - Notice the role selector: **Faculty Member** vs **Student Club**. `ADMIN` accounts cannot be created publicly.
  - Select **Student Club**:
    - Progressive form discloses club-specific fields: **Club Category**, **Club Description**, **Student Lead Name & Phone**, **Founded Year**, and a dropdown to nominate a **Designated Faculty Advisor**.
    - The dropdown displays verified faculty members fetched via `/api/metadata`.
- Fill in new club details (e.g., "AI Robotics Circle") and submit.
- The applicant is registered with status `PENDING`. Attempting to submit event requests is blocked until verified.

---

### Step 7: Protected Admin Registration Desk (`/admin/registrations`)
- Log in as **Administrator** (`admin@campus.edu`).
- Click on **Admin Tools** in the top navigation -> **Account Registrations**.
- Observe:
  - Compact responsive filter toolbar (Status: Pending / Approved / Rejected; Role: All / Faculty / Club).
  - Dense table showing applicant name, email, role badge, organization details, and nominated advisor.
  - Click **Approve** on a pending applicant -> opens verification modal with notes.
  - Submit approval -> user `verification_status` updates to `APPROVED` and audit details are saved.

---

### Step 8: Faculty Advisor Desk (`/advisor/inbox`)
- Log in as **Faculty** (Dr. Grace Hopper: `faculty1@campus.edu`).
- On the Dashboard, point out the **Faculty Advisor Responsibilities** banner displaying pending proposals and nominations.
- Navigate to **Advisor Desk** (`/advisor/inbox`).
- Inspect the 3 tabs:
  1. **Event Proposals**: Club proposals awaiting faculty endorsement.
  2. **Assigned Clubs**: Clubs under this faculty member's mentorship.
  3. **Advisor Nominations**: Invitations from clubs to serve as their advisor with **Accept Appointment** and **Decline** options.
- On an event proposal (e.g. from ACM Student Chapter), click **Endorse Proposal**:
  - Modal displays event title, expected students, external guests, and requested facilities.
  - Enter endorsement comments and click **Confirm Endorsement**.
  - Status updates to `ENDORSED`, advancing the proposal to administration.

---

### Step 9: Engine-Level Club Endorsement Enforcement
- Run the automated test suite to prove database-level enforcement:
  ```bash
  npm run test:club
  ```
- Evaluator Focus:
  - **Check 5**: Demonstrates that calling stored procedure `sp_approve_request` on an unendorsed club request (`PENDING_ADVISOR`) strictly raises `ADVISOR_APPROVAL_REQUIRED` at the PostgreSQL engine level. An admin cannot bypass faculty endorsement.
  - **Check 7**: Shows that once endorsed, `sp_approve_request` succeeds and creates a confirmed booking.
  - **Check 8**: Confirms that GiST exclusion blocks double-bookings over club reservations.
  - **Check 9**: Proves sequential multi-stage audit trail (`SUBMITTED` -> `ENDORSED` -> `APPROVED_BY_ADMIN`).

---

### Step 10: Complete Audit Trail & Scoped Visibility
- Log in as **Club** (`club1@campus.edu`).
- On the Dashboard:
  - View the **Club Workspace**: verification badge, advisor card (Dr. Grace Hopper), and pipeline counters.
- Navigate to **Event Requests** (`/requests`):
  - Notice the next-action badge: `Advisor Endorsed (Awaiting Admin)`.
  - Click on the **Review History** link (`3 decisions`):
    - Opens modal showing the full chronological decision audit trail: who reviewed, their role, timestamp, action, and remarks.
- Note that clubs can view only their own requests and cannot access `/admin/*` routes.
