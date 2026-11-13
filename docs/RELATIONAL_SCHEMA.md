# Relational Schema & Data Dictionary

## Campus Resource Allocation & Conflict Detection Platform

This document defines the physical data dictionary for all relational tables, column data types, constraints, and the mathematical normalization rationale.

---

## 1. Data Dictionary

### 1.1 `department`
Stores academic and administrative campus divisions.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Unique surrogate department identifier |
| `code` | `VARCHAR(20)` | `NOT NULL, UNIQUE (uq_department_code)` | Standard department abbreviation (e.g. `CS`, `EC`) |
| `name` | `VARCHAR(100)` | `NOT NULL, UNIQUE (uq_department_name)` | Full department title |
| `created_at` | `TIMESTAMP` | `NOT NULL, DEFAULT CURRENT_TIMESTAMP` | Record creation timestamp |

### 1.2 `users`
Single authoritative entity for all faculty and system administrators.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Unique surrogate user identifier |
| `department_id` | `INT` | `NOT NULL, FK -> department(id) ON DELETE RESTRICT` | Associated campus department |
| `email` | `VARCHAR(255)` | `NOT NULL, UNIQUE (uq_users_email)` | Institutional login email |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | Bcrypt salt and hash string |
| `name` | `VARCHAR(100)` | `NOT NULL` | Full legal or display name |
| `role` | `VARCHAR(20)` | `NOT NULL, CHECK (role IN ('ADMIN', 'FACULTY'))` | Role-based authorization discriminator |
| `created_at` | `TIMESTAMP` | `NOT NULL, DEFAULT CURRENT_TIMESTAMP` | Account registration timestamp |

### 1.3 `resource_type`
Categorization of rooms and venues.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Type surrogate key |
| `code` | `VARCHAR(30)` | `NOT NULL, UNIQUE (uq_resource_type_code)` | Machine code (`CLASSROOM`, `COMPUTER_LAB`, etc.) |
| `name` | `VARCHAR(100)` | `NOT NULL, UNIQUE (uq_resource_type_name)` | Human-readable category name |
| `description` | `TEXT` | `NULL` | Operational notes regarding type usage |
| `created_at` | `TIMESTAMP` | `NOT NULL, DEFAULT CURRENT_TIMESTAMP` | Type registration timestamp |

### 1.4 `resource`
Physical campus facilities allocatable to faculty.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Resource surrogate key |
| `resource_type_id` | `INT` | `NOT NULL, FK -> resource_type(id) ON DELETE RESTRICT` | Classification reference |
| `department_id` | `INT` | `NOT NULL, FK -> department(id) ON DELETE RESTRICT` | Owning/managing department |
| `code` | `VARCHAR(30)` | `NOT NULL, UNIQUE (uq_resource_code)` | Room number or code (e.g. `LH-101`) |
| `name` | `VARCHAR(100)` | `NOT NULL, UNIQUE (uq_resource_name)` | Full room name (e.g. `Lecture Hall 101`) |
| `capacity` | `INT` | `NOT NULL, CHECK (capacity > 0)` | Maximum safe seating capacity |
| `location` | `VARCHAR(150)` | `NOT NULL` | Building, block and floor address |
| `status` | `VARCHAR(20)` | `NOT NULL, DEFAULT 'AVAILABLE', CHECK (status IN ('AVAILABLE', 'MAINTENANCE', 'UNAVAILABLE'))` | Current lifecycle state |
| `created_at` | `TIMESTAMP` | `NOT NULL, DEFAULT CURRENT_TIMESTAMP` | Date added to campus registry |

### 1.5 `facility`
Standard hardware, audio/visual, and physical amenities available across campus.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Facility surrogate key |
| `code` | `VARCHAR(30)` | `NOT NULL, UNIQUE (uq_facility_code)` | Code (e.g. `PROJECTOR`, `SMART_BOARD`) |
| `name` | `VARCHAR(100)` | `NOT NULL, UNIQUE (uq_facility_name)` | Full item descriptor |
| `description` | `TEXT` | `NULL` | Item specifications |
| `created_at` | `TIMESTAMP` | `NOT NULL, DEFAULT CURRENT_TIMESTAMP` | Registration date |

### 1.6 `resource_facility`
Junction table mapping amenities installed in specific resources.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `resource_id` | `INT` | `NOT NULL, FK -> resource(id) ON DELETE RESTRICT` | Target resource |
| `facility_id` | `INT` | `NOT NULL, FK -> facility(id) ON DELETE RESTRICT` | Installed facility |
| `quantity` | `INT` | `NOT NULL, DEFAULT 1, CHECK (quantity > 0)` | Number of installed functional units |
| **PK** | | `PRIMARY KEY (resource_id, facility_id)` | Composite primary key |

### 1.7 `booking_request`
Formal reservation request submitted by faculty.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Request surrogate key |
| `user_id` | `INT` | `NOT NULL, FK -> users(id) ON DELETE RESTRICT` | Faculty applicant |
| `resource_type_id` | `INT` | `NOT NULL, FK -> resource_type(id) ON DELETE RESTRICT` | Requested resource type |
| `preferred_resource_id`| `INT` | `NULL, FK -> resource(id) ON DELETE SET NULL` | Optional requested room preference |
| `title` | `VARCHAR(150)` | `NOT NULL` | Event or lecture title |
| `description` | `TEXT` | `NULL` | Purpose, syllabus, or speaker notes |
| `start_time` | `TIMESTAMP` | `NOT NULL` | Session start (`TIMESTAMP WITHOUT TIME ZONE`) |
| `end_time` | `TIMESTAMP` | `NOT NULL` | Session end (`TIMESTAMP WITHOUT TIME ZONE`) |
| `expected_capacity` | `INT` | `NOT NULL, CHECK (expected_capacity > 0)` | Expected student/attendee count |
| `status` | `VARCHAR(20)` | `NOT NULL, DEFAULT 'PENDING', CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'))` | Approval workflow status |
| `rejection_reason` | `TEXT` | `NULL` | Feedback provided if admin rejects |
| `created_at` | `TIMESTAMP` | `NOT NULL, DEFAULT CURRENT_TIMESTAMP` | Submission timestamp |
| `updated_at` | `TIMESTAMP` | `NOT NULL, DEFAULT CURRENT_TIMESTAMP` | Last status modification |
| **Table Check** | | `CHECK (end_time > start_time)` | Enforces positive time duration |

### 1.8 `resource_request_facility`
Junction table recording required amenities for a booking request.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `request_id` | `INT` | `NOT NULL, FK -> booking_request(id) ON DELETE CASCADE` | Associated request |
| `facility_id` | `INT` | `NOT NULL, FK -> facility(id) ON DELETE RESTRICT` | Required amenity |
| `min_quantity` | `INT` | `NOT NULL, DEFAULT 1, CHECK (min_quantity > 0)` | Minimum acceptable quantity |
| **PK** | | `PRIMARY KEY (request_id, facility_id)` | Composite primary key |

### 1.9 `booking`
Authoritative confirmed campus resource reservation. Exactly zero or one booking per request.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Booking surrogate key |
| `request_id` | `INT` | `NOT NULL, UNIQUE (uq_booking_request_id), FK -> booking_request(id) ON DELETE RESTRICT` | Strict 1:1 link to request |
| `resource_id` | `INT` | `NOT NULL, FK -> resource(id) ON DELETE RESTRICT` | Reserved room |
| `booked_by_user_id` | `INT` | `NOT NULL, FK -> users(id) ON DELETE RESTRICT` | Faculty holding the booking |
| `start_time` | `TIMESTAMP` | `NOT NULL` | Session start (`TIMESTAMP WITHOUT TIME ZONE`) |
| `end_time` | `TIMESTAMP` | `NOT NULL` | Session end (`TIMESTAMP WITHOUT TIME ZONE`) |
| `status` | `VARCHAR(20)` | `NOT NULL, DEFAULT 'CONFIRMED', CHECK (status IN ('CONFIRMED', 'CANCELLED'))` | Reservation state |
| `created_at` | `TIMESTAMP` | `NOT NULL, DEFAULT CURRENT_TIMESTAMP` | Booking confirmation timestamp |
| `updated_at` | `TIMESTAMP` | `NOT NULL, DEFAULT CURRENT_TIMESTAMP` | Last update timestamp |
| **Table Check** | | `CHECK (end_time > start_time)` | Enforces positive duration |
| **Exclusion** | | `EXCLUDE USING gist (resource_id WITH =, tsrange(start_time, end_time) WITH &&) WHERE (status = 'CONFIRMED')` | Prevents overlapping confirmed bookings |

### 1.10 `maintenance`
Scheduled or active downtime for resource upkeep, repairs, or upgrades.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Maintenance surrogate key |
| `resource_id` | `INT` | `NOT NULL, FK -> resource(id) ON DELETE RESTRICT` | Undergoing resource |
| `scheduled_by_user_id`| `INT` | `NOT NULL, FK -> users(id) ON DELETE RESTRICT` | Admin who ordered maintenance |
| `start_time` | `TIMESTAMP` | `NOT NULL` | Downtime window start |
| `end_time` | `TIMESTAMP` | `NOT NULL` | Downtime window end |
| `status` | `VARCHAR(20)` | `NOT NULL, DEFAULT 'SCHEDULED', CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'))` | Maintenance progress state |
| `reason` | `VARCHAR(255)` | `NOT NULL` | Brief cause (e.g. HVAC servicing) |
| `notes` | `TEXT` | `NULL` | Detailed logs or vendor report |
| `created_at` | `TIMESTAMP` | `NOT NULL, DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |
| **Table Check** | | `CHECK (end_time > start_time)` | Enforces positive maintenance window |

---

## 2. Normalization Rationale

The database schema is strictly designed to satisfy **Boyce-Codd Normal Form (BCNF)** across all entities.

### 2.1 First Normal Form (1NF)
- All attribute values are strictly atomic. There are no repeating groups, comma-separated lists, or nested multi-valued attributes in relational tables.
- Variable, non-atomic specifications (such as array of installed software or complex stage lighting specifications) are explicitly segregated into MongoDB document store (`campus_resource_profiles`).
- Every table has a clearly designated Primary Key.

### 2.2 Second Normal Form (2NF)
- Satisfies 1NF.
- All non-key attributes are fully functionally dependent on the entire primary key.
- In composite key junction tables (`resource_facility` and `resource_request_facility`), the quantity attribute depends on the full composite key `(resource_id, facility_id)` or `(request_id, facility_id)`, with no partial dependencies.

### 2.3 Third Normal Form (3NF)
- Satisfies 2NF.
- There are no transitive dependencies: non-prime attributes depend only on the candidate key.
  - In `users`, user attributes depend directly on `id`; department metadata is not duplicated in `users`, but referenced via `department_id`.
  - In `resource`, capacity, code, and location depend on `id`; type attributes are isolated in `resource_type`.
  - In `booking`, room details and user details are referenced via `resource_id` and `booked_by_user_id`.

### 2.4 Boyce-Codd Normal Form (BCNF)
- For every non-trivial functional dependency $X \rightarrow Y$, the determinant $X$ is a superkey.
- All alternate natural keys (`department.code`, `resource.code`, `users.email`, `facility.code`, `resource_type.code`) are enforced with `UNIQUE` constraints and backed by unique b-tree indexes.
- No functional dependency exists where a determinant is not a candidate key.
