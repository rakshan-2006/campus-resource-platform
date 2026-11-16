# Campus Resource Allocation & Conflict Detection Platform

**Course**: Database Management Systems (DBMS) Mini-Project  
**Author**: Person A (Main Developer — Foundation, Core Relational Schema, Auth, APIs, Multi-Stage Workflow & UI Modernization)  
**Collaborator**: Person B (Assigned Admin Feature Extensions: Catalog CRUD, Maintenance Lifecycle, Analytics & Extended NoSQL Profiles)  
**Technology Stack**: Next.js 15 (App Router), TypeScript strict, Tailwind CSS, PostgreSQL 16 (`btree_gist`), MongoDB 7, `pg`, official `mongodb` driver, Zod, bcryptjs, jose, Recharts, lucide-react.

---

## 1. System Architecture & Cross-Store Boundary

```mermaid
graph TD
    subgraph Client Layer
        Browser["Next.js 15 Modern Institutional UI<br/>(Role-Specific Dashboards, Registration, Advisor Desk, Timeline)"]
    end

    subgraph Server Layer
        NextServer["Next.js App Router API Routes<br/>(JWT Cookie Auth, Role Gates, Parameterized Queries)"]
    end

    subgraph Relational Database [PostgreSQL 16 Engine - Single Source of Truth]
        PG_Tables[("Core Relational Tables<br/>users, club_profile, club_advisor, booking_request, booking, review_history")]
        PG_GIST["GiST Exclusion Constraint<br/>exclude_overlapping_confirmed_bookings"]
        PG_Procs["Stored Procedures & Functions<br/>sp_approve_request, fn_recommend_resources, fn_is_available"]
        PG_Trigs["Triggers<br/>trg_booking_validate, trg_maintenance_status, trg_request_cancelled"]
        PG_RLS["Row Level Security (RLS)<br/>campus_faculty, campus_club & campus_admin"]
    end

    subgraph Document Database [MongoDB 7]
        Mongo_Coll[("campus_resource_profiles<br/>Polymorphic Hardware & Software Specs")]
    end

    Browser <-->|HTTP / JSON Envelope| NextServer
    NextServer <-->|pg Connection Pool (ACID Transactions)| PG_Tables
    NextServer -.->|mongodb Official Driver (Advisory Specs)| Mongo_Coll
    PG_Tables --- PG_GIST
    PG_Tables --- PG_Procs
    PG_Tables --- PG_Trigs
    PG_Tables --- PG_RLS
```

### Store Separation Rationale
- **PostgreSQL 16**: The authoritative source of truth for all users, clubs, advisor appointments, registration verification, venue requests, review decisions/audit trails, bookings, and conflict prevention. Enforces strict ACID compliance, serializable row locking (`FOR UPDATE`), and mathematical overlap prevention via `btree_gist` exclusion constraints.
- **MongoDB 7**: Employed solely for polymorphic, variable resource specifications (e.g. computer lab GPU models, software packages array `["Docker", "MATLAB"]`, auditorium stage dimensions, acoustics, and accessibility features). **MongoDB never stores or duplicates booking, request, or authorization records.**

---

## 2. One-Command Setup & Launch

### Prerequisites
- Node.js 20+ / 22+
- Docker & Docker Compose (or local PostgreSQL 16 on WSL2/Host and MongoDB instances)

### Quick Start
```bash
# 1. Clone repository and navigate to root
cd "DBMS Project"

# 2. Install dependencies
npm install

# 3. Start PostgreSQL and MongoDB (via Docker Compose or local daemons)
docker compose up -d

# 4. Run automated database setup (DDL migration, seed data, and MongoDB initialization)
npm run db:setup

# 5. Apply Club Account & Advisor Review Workflow Migration
npm run db:migrate:club

# 6. Launch development server
npm run dev
```

Open your browser at **`http://localhost:3000`**.

---

## 3. Seeded Accounts & Demo Scenarios

Deterministic demo accounts are pre-seeded in PostgreSQL. The `/login` page provides **one-click pre-fill cards** for testing:

| Role | Name | Email | Password | Scope & Role Profile |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | Dr. Alan Turing | `admin@campus.edu` | `Admin@123` | Campus Administration — Registrations desk, triage & final allocation |
| **FACULTY** | Dr. Grace Hopper | `faculty1@campus.edu` | `Faculty@123` | CS Dept Faculty & Active Advisor for ACM Student Chapter |
| **FACULTY** | Dr. Claude Shannon | `faculty2@campus.edu` | `Faculty@123` | ECE Dept Faculty & Active Advisor for Robotics Society |
| **CLUB** | ACM Student Chapter | `club1@campus.edu` | `Club@123` | Verified Club (Advised by Dr. Grace Hopper) |
| **CLUB** | Robotics Society | `club2@campus.edu` | `Club@123` | Verified Club (Advised by Dr. Claude Shannon) |
| **PENDING CLUB** | Design Guild | `pending.club@campus.edu` | `Club@123` | Self-registered Club awaiting Admin verification |
| **PENDING FACULTY** | Dr. John von Neumann | `pending.faculty@campus.edu` | `Faculty@123` | Self-registered Faculty applicant awaiting Admin verification |

---

## 4. Multi-Stage Workflow & Business Rules

### 1. Self-Registration & Administrative Verification
- **Public Create Account**: Applicants navigate to `/login` and switch to the **Create account** tab.
- **Role Selection**: Applicants choose between `FACULTY` and `CLUB`. `ADMIN` accounts cannot be created via public registration.
  - **Faculty**: Submits full name, institutional email, password, and academic department.
  - **Club**: Submits organization name, contact email, password, category, description, student lead name & phone, founded year, and nominates an eligible verified faculty advisor.
- **Admin Verification**: New accounts start in `PENDING` verification status. Protected administrative desk at `/admin/registrations` enables campus administrators to review, approve, or reject applicants with audit notes.

### 2. Faculty Advisor Mentorship Model
- **Relationship, Not a Global Role**: "Faculty Advisor" is modeled via the relational table `club_advisor` pointing to `users(id)` where `role = 'FACULTY'`. A faculty member retains their primary faculty permissions while gaining an **Advisor Desk** (`/advisor/inbox`).
- **One Active Advisor per Club**: Enforced via partial unique index `uq_club_active_advisor` on `(club_id) WHERE (status = 'ACCEPTED')`.
- **Advisor Acceptance**: Nominated faculty receive pending invitations in their Advisor Desk and can `ACCEPT` or `DECLINE`. Unrelated faculty cannot access or respond to foreign club invitations.

### 3. Club Event Booking & Multi-Stage Review
- **Event Submission**: Verified clubs with accepted advisors submit event proposals capturing event type (Hackathon, Workshop, Cultural, etc.), title, description, expected attendance, external guests, preferred venue, facilities, and equipment notes.
- **Advisor Endorsement Gate**: The proposal enters `PENDING_ADVISOR`. The designated advisor reviews the proposal in their Advisor Desk and either:
  - **Endorses** with recommendations (advances proposal to Admin Triage Desk). Endorsement signals academic support; it never allocates a venue.
  - **Returns / Rejects** with constructive feedback (returns proposal to club).
- **Engine-Level Enforcement (`sp_approve_request`)**:
  ```sql
  IF v_req.request_type = 'CLUB' AND v_req.advisor_review_status != 'ENDORSED' THEN
      RAISE EXCEPTION 'ADVISOR_APPROVAL_REQUIRED: Club requests must be endorsed by their designated faculty advisor before administrative venue allocation.';
  END IF;
  ```
- **Final Admin Allocation**: Campus administrators perform final room assignment through automated conflict checking. An atomic booking record is generated, and overlap protection is guaranteed by the GiST exclusion constraint (`23P01`).
- **Complete Audit Trail (`request_review_history`)**: Tracks `SUBMITTED`, `ENDORSED`, `REJECTED_BY_ADVISOR`, `APPROVED_BY_ADMIN`, and `REJECTED_BY_ADMIN` with timestamps and reviewer remarks.

---

## 5. Visual Design & Modernization

- **Institutional Identity**: Restrained navy/slate institutional aesthetic matching campus governance standards.
- **Grouped Admin Tools Navigation**: Cluttered top navigation reworked with a responsive dropdown section for Admin Tools (`/admin/registrations`, `/admin/resources`, `/admin/maintenance`, `/admin/analytics`). Removed all temporary "(B)" tags.
- **Role-Adapted Dashboards**:
  - **Club Workspace**: Shows club verification status banner, designated advisor card, 4 KPI metric counters, recent event proposals with review status badges, and upcoming confirmed bookings.
  - **Faculty Workspace**: Personal academic bookings plus a prominent **Faculty Advisor Desk** notification banner linking to `/advisor/inbox` when clubs or proposals require attention.
  - **Admin Operations Center**: Triage queue, pending account registrations counter, room availability stats, and campus resource utilization overview.
- **Campus-Local Date & Time Formatting**: Replaced raw SQL strings (`2026-11-20 09:00:00`) with campus-local formatting (`Nov 20, 2026` · `9:00 AM – 11:00 AM`).
- **Elimination of Implementation Jargon**: Internal database view names (`v_pending_requests`, `v_resource_utilization`) and function names (`fn_recommend_resources`) replaced with clean, human-readable labels in user-facing UI.
- **Responsive Toolbar**: Search and status filter controls consolidated into compact responsive toolbars with mobile navigation drawer support.

---

## 6. Automated Verification Suites

```bash
# 1. Advanced PostgreSQL Features Suite (GiST constraint, triggers, stored procedures, RLS)
npm run test:db

# 2. Person B Collaborator Verification Suite (Resource CRUD, Maintenance, Analytics, MongoDB)
npm run test:person-b

# 3. Club Workflow & Multi-Stage Advisor Review Integration Suite (10 Comprehensive Checks)
npm run test:club

# 4. Run All Test Suites Sequentially
npm run test:all

# 5. TypeScript Strict Typecheck
npm run typecheck

# 6. Next.js Production Build
npm run build
```

---

## 7. Database Migration & Schema Details

- **Migration Script**: `db/migration-club-workflow.sql` (Executed via `npm run db:migrate:club`).
- **Fresh-Install Schema**: `db/schema.sql` contains the complete authoritative schema including all tables, constraints, views, stored procedures, triggers, and roles.
- **ER Diagram**: Documented in [`docs/ERD.md`](file:///c:/Acad/Sem%205/DBMS%20Project/docs/ERD.md).
