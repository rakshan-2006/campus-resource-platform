# Entity-Relationship Diagram (ERD)

## Campus Resource Allocation & Conflict Detection Platform

This document presents the relational structure of the campus platform using crow's-foot notation. PostgreSQL serves as the authoritative source of truth for all transactional entities.

```mermaid
erDiagram
    DEPARTMENT ||--o{ USERS : "employs"
    DEPARTMENT ||--o{ RESOURCE : "owns"
    RESOURCE_TYPE ||--o{ RESOURCE : "classifies"
    RESOURCE_TYPE ||--o{ BOOKING_REQUEST : "targets"
    USERS ||--o{ BOOKING_REQUEST : "submits"
    USERS ||--o{ BOOKING : "books"
    USERS ||--o{ MAINTENANCE : "schedules"
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
        int department_id FK
        varchar email UK
        varchar password_hash
        varchar name
        varchar role "ADMIN | FACULTY"
        timestamp created_at
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
        text rejection_reason
        timestamp created_at
        timestamp updated_at
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

1. **Department to Users (`1:N`)**: Each user belongs to exactly one department. A department employs zero or more users.
2. **Department to Resource (`1:N`)**: Each resource belongs to one administrative department (e.g. CS Lab owned by CS Department).
3. **Resource Type to Resource (`1:N`)**: A resource type (Classroom, Computer Lab, Seminar Hall, Conference Room, Auditorium) classifies multiple resources.
4. **Resource to Facility (`M:N` via `resource_facility`)**: A resource can have multiple physical facilities with tracked positive quantities (e.g. 40 Workstations, 1 Projector).
5. **Booking Request to Facilities (`M:N` via `resource_request_facility`)**: Faculty specify minimum facility quantities required for their session.
6. **Booking Request to Booking (`1:0..1`)**: A request has at most one confirmed booking (`request_id UNIQUE` in `booking`). Pending, rejected, or cancelled requests have no active booking.
7. **Resource to Booking (`1:N`)**: A resource can be booked for multiple distinct, non-overlapping time intervals. Overlapping confirmed bookings are strictly forbidden by a PostgreSQL GiST exclusion constraint.
8. **Resource to Maintenance (`1:N`)**: A resource can undergo multiple scheduled or emergency maintenance periods.
9. **Single Users Table**: Exactly one `users` entity with role discriminator `role IN ('ADMIN', 'FACULTY')`. No redundant admin/faculty tables.
10. **MongoDB Cross-Store Reference**: MongoDB collection `campus_resource_profiles` maintains variable, semi-structured hardware/seating specifications linked via `pg_resource_id` (`1:0..1` relationship).
