# Entity-Relationship Diagram (ERD)

## Campus Resource Allocation & Conflict Detection Platform

This document presents the complete relational structure of the campus platform using crow's-foot notation. PostgreSQL serves as the authoritative source of truth for all transactional entities, user accounts, club profiles, advisor relationships, and review history.

```mermaid
erDiagram
    DEPARTMENT ||--o{ USERS : "employs"
    DEPARTMENT ||--o{ RESOURCE : "owns"
    RESOURCE_TYPE ||--o{ RESOURCE : "classifies"
    RESOURCE_TYPE ||--o{ BOOKING_REQUEST : "targets"
    USERS ||--o{ BOOKING_REQUEST : "submits"
    USERS ||--o{ BOOKING : "books"
    USERS ||--o{ MAINTENANCE : "schedules"
    USERS ||--o| CLUB_PROFILE : "registers"
    CLUB_PROFILE ||--o{ CLUB_ADVISOR : "nominated_to"
    USERS ||--o{ CLUB_ADVISOR : "mentors_as_advisor"
    CLUB_PROFILE ||--o{ BOOKING_REQUEST : "originates_event"
    BOOKING_REQUEST ||--o{ REQUEST_REVIEW_HISTORY : "audits_decisions"
    USERS ||--o{ REQUEST_REVIEW_HISTORY : "reviews_and_decides"
    RESOURCE ||--o{ RESOURCE_FACILITY : "houses"
    FACILITY ||--o{ RESOURCE_FACILITY : "installed_in"
    BOOKING_REQUEST ||--o{ RESOURCE_REQUEST_FACILITY : "requires"
    FACILITY ||--o{ RESOURCE_REQUEST_FACILITY : "demanded_by"
    BOOKING_REQUEST ||--o| RESOURCE : "prefers"
    BOOKING_REQUEST ||--o| BOOKING : "originates"
    RESOURCE ||--o{ BOOKING : "allocates"
    RESOURCE ||--o{ MAINTENANCE : "undergoes"

    DEPARTMENT {
        int id PK
        varchar code UK
        varchar name UK
        timestamp created_at
    }

    USERS {
        int id PK
        int department_id FK "nullable for clubs"
        varchar email UK
        varchar password_hash
        varchar name
        varchar role "ADMIN | FACULTY | CLUB"
        varchar verification_status "PENDING | APPROVED | REJECTED"
        timestamp verified_at "nullable"
        int verified_by_user_id FK "nullable"
        text verification_notes "nullable"
        timestamp created_at
    }

    CLUB_PROFILE {
        int id PK
        int user_id FK,UK "1:1 with users"
        varchar club_name UK
        varchar category "Technical | Cultural | Sports | Social | Academic"
        text description
        varchar lead_name
        varchar lead_phone
        int founded_year
        timestamp created_at
        timestamp updated_at
    }

    CLUB_ADVISOR {
        int id PK
        int club_id FK
        int faculty_user_id FK
        varchar status "PENDING | ACCEPTED | DECLINED | REPLACED"
        timestamp assigned_at
        timestamp responded_at "nullable"
        text notes "nullable"
    }

    RESOURCE_TYPE {
        int id PK
        varchar code UK
        varchar name UK
        text description
        timestamp created_at
    }

    RESOURCE {
        int id PK
        int resource_type_id FK
        int department_id FK
        varchar code UK
        varchar name UK
        int capacity "CHECK > 0"
        varchar location
        varchar status "AVAILABLE | MAINTENANCE | UNAVAILABLE"
        timestamp created_at
    }

    FACILITY {
        int id PK
        varchar code UK
        varchar name UK
        text description
        timestamp created_at
    }

    RESOURCE_FACILITY {
        int resource_id PK,FK
        int facility_id PK,FK
        int quantity "CHECK > 0"
    }

    BOOKING_REQUEST {
        int id PK
        int user_id FK
        int resource_type_id FK
        int preferred_resource_id FK "nullable"
        varchar title
        text description
        timestamp start_time
        timestamp end_time
        int expected_capacity "CHECK > 0"
        varchar status "PENDING | APPROVED | REJECTED | CANCELLED"
        varchar request_type "FACULTY | CLUB"
        int club_id FK "nullable"
        varchar advisor_review_status "NOT_APPLICABLE | PENDING_ADVISOR | ENDORSED | REJECTED"
        varchar event_type "nullable"
        int expected_guests "nullable"
        text equipment_notes "nullable"
        text rejection_reason "nullable"
        timestamp created_at
        timestamp updated_at
    }

    REQUEST_REVIEW_HISTORY {
        int id PK
        int request_id FK
        int reviewer_user_id FK
        varchar action "SUBMITTED | ENDORSED | REJECTED_BY_ADVISOR | APPROVED_BY_ADMIN | REJECTED_BY_ADMIN | COMMENT"
        text comments
        timestamp created_at
    }

    RESOURCE_REQUEST_FACILITY {
        int request_id PK,FK
        int facility_id PK,FK
        int min_quantity "CHECK > 0"
    }

    BOOKING {
        int id PK
        int request_id UK,FK "1:1 with request"
        int resource_id FK
        int booked_by_user_id FK
        timestamp start_time
        timestamp end_time
        varchar status "CONFIRMED | CANCELLED"
        timestamp created_at
        timestamp updated_at
    }

    MAINTENANCE {
        int id PK
        int resource_id FK
        int scheduled_by_user_id FK
        timestamp start_time
        timestamp end_time
        varchar status "SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED"
        varchar reason
        text notes
        timestamp created_at
    }
```

## Cardinality & Business Rules Summary

1. **Department to Users (`1:N`)**: Academic faculty belong to an academic department. Student Clubs associate with the Student Affairs department (`SA`).
2. **Users & Club Profiles (`1:1`)**: When an applicant registers with `role = 'CLUB'`, a corresponding record in `club_profile` stores organization metadata (lead contact, category, description, founded year) rather than cluttering the generic `users` table.
3. **Faculty Advisor Relationship (`M:N` via `club_advisor`)**: "Faculty Advisor" is an institutional mentorship relationship, not a separate global role. A faculty member retains `role = 'FACULTY'` and can advise multiple clubs. Each active club has exactly one `ACCEPTED` advisor enforced by a partial unique index (`uq_club_active_advisor`).
4. **Multi-Stage Review Workflow (`booking_request` & `request_review_history`)**:
   - Faculty academic requests have `request_type = 'FACULTY'` and `advisor_review_status = 'NOT_APPLICABLE'`, flowing directly to administrative triage.
   - Club requests have `request_type = 'CLUB'` and start in `advisor_review_status = 'PENDING_ADVISOR'`.
   - The designated faculty advisor must review and `ENDORSE` the proposal before it advances to admin triage.
   - Advisor endorsement signals academic support; it never creates a confirmed booking.
   - Administrative allocation calls the engine-level stored procedure `sp_approve_request`, which verifies advisor endorsement and runs availability conflict checks before inserting a confirmed booking.
5. **Review History Audit Trail (`request_review_history`)**: Every state transition (`SUBMITTED`, `ENDORSED`, `REJECTED_BY_ADVISOR`, `APPROVED_BY_ADMIN`, `REJECTED_BY_ADMIN`) logs reviewer ID, timestamp, and comments for full institutional transparency.
6. **Booking Request to Booking (`1:0..1`)**: A request produces at most one confirmed booking (`request_id UNIQUE` in `booking`).
7. **Resource to Booking (`1:N`)**: A resource can be booked for multiple distinct, non-overlapping intervals. Overlapping confirmed bookings are strictly blocked at the engine level by a PostgreSQL GiST exclusion constraint (`btree_gist`).
8. **MongoDB Extended Profile (`1:0..1`)**: MongoDB collection `campus_resource_profiles` maintains variable, semi-structured hardware/seating specifications linked via `pg_resource_id`.
