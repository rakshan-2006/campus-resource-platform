# NoSQL Design & Cross-Store Boundary

## Campus Resource Allocation & Conflict Detection Platform

This document outlines the architectural boundary between PostgreSQL and MongoDB, detailing the schema structure of `campus_resource_profiles` and explaining why resource profiles belong in MongoDB while bookings and authorization must strictly remain in PostgreSQL.

---

## 1. Architectural Boundary Summary

| Domain Responsibility | Primary Store | Rationale |
| :--- | :--- | :--- |
| **Authentication & Authorization** | PostgreSQL (`users`, `department`, RLS) | Strict ACID transactional consistency, relational integrity, row-level security policies, role-based grants. |
| **Core Inventory** | PostgreSQL (`resource`, `facility`, `resource_type`) | Normalized relational schema with strict positive capacity and unique code constraints. |
| **Bookings & Requests** | PostgreSQL (`booking`, `booking_request`) | Serializability, multi-row row locking (`FOR UPDATE`), and PostgreSQL GiST exclusion constraint preventing double-booking. |
| **Maintenance & Availability** | PostgreSQL (`maintenance`, `fn_is_available`) | Time range overlap logic (`tsrange`) and transactional status synchronization triggers. |
| **Variable Resource Profiles** | MongoDB (`campus_resource_profiles`) | Semi-structured, polymorphic hardware/software/staging specifications that differ wildly by resource type. |

> [!IMPORTANT]
> **No Duplication Rule**: MongoDB **never** stores or caches booking states, user credentials, approval decisions, or access permissions. PostgreSQL is the single source of truth.

---

## 2. Why Resource Profiles Fit MongoDB

Campus resources have fundamentally divergent, deeply nested, and rapidly evolving operational attributes:

1. **Polymorphic Schema**:
   - A **Computer Lab** needs fields like `cpu`, `ram`, `gpu_model`, `installed_os`, and an array of 20+ software packages (`["Docker", "MATLAB", "VS Code"]`).
   - An **Auditorium** requires `stage_dimensions`, `acoustics_rt60`, `lighting_rig_spots`, `green_rooms_count`, and `curtain_motorization`.
   - A **Seminar Hall** requires `microphones_count`, `video_conference_codec`, `tiered_seating_type`, and `hearing_loop_assistance`.
   - Forcing these disparate properties into PostgreSQL would either require dozens of nullable columns (schema pollution) or rigid EAV (Entity-Attribute-Value) anti-patterns that destroy query ergonomics and referential performance.

2. **Hierarchical & Multikey Indexing**:
   - MongoDB documents natively represent arrays and nested sub-documents (e.g. `stage: { width_m: 16, depth_m: 10 }`).
   - MongoDB's **multikey indexes** allow lightning-fast lookups on elements within arrays:
     ```javascript
     db.campus_resource_profiles.createIndex({ "specifications.software": 1 })
     ```
   - Faculty can easily search for "labs containing Docker and Wireshark" without expensive relational junction table traversals.

3. **Autonomous Lifecycle**:
   - Profile specifications are informational and advisory. A failure or delay in saving an optional software profile update does not compromise the transactional integrity of campus bookings.

---

## 3. Why Bookings & Requests CANNOT Fit MongoDB

Storing bookings, requests, or conflict detection in MongoDB would violate critical engineering and database principles:

1. **Absence of Generalized Exclusion Constraints**:
   - In PostgreSQL, concurrent double-booking is prevented at the engine level via the GiST exclusion constraint:
     ```sql
     CONSTRAINT exclude_overlapping_confirmed_bookings 
     EXCLUDE USING gist (resource_id WITH =, tsrange(start_time, end_time) WITH &&) 
     WHERE (status = 'CONFIRMED');
     ```
   - MongoDB lacks generalized temporal exclusion constraints. Preventing overlapping bookings in MongoDB would require custom optimistic locking or distributed locks in the application layer, which are inherently vulnerable to race conditions under heavy concurrent traffic.

2. **Multi-Table Relational Dependencies**:
   - Approving a request requires:
     1. Verifying admin privileges in `users`.
     2. Checking `resource.status` and `maintenance`.
     3. Atomic transition of `booking_request.status` to `APPROVED`.
     4. Insertion of a confirmed row into `booking`.
     5. Cascading updates to associated requests.
   - PostgreSQL provides ACID serializability through native row-locking (`FOR UPDATE`) and stored procedures (`sp_approve_request`).

3. **Row-Level Security (RLS)**:
   - PostgreSQL allows fine-grained, database-level security policies (`ALTER TABLE booking_request ENABLE ROW LEVEL SECURITY`) driven by transaction context (`app.current_user_id`), isolating faculty records even if an application bug bypassed higher-level checks.

---

## 4. MongoDB Collection Schema: `campus_resource_profiles`

### 4.1 JSON Schema Validation Rules
Enforced in `db/mongo-init.js`:

```javascript
{
  $jsonSchema: {
    bsonType: "object",
    required: ["pg_resource_id", "resource_type", "updated_at", "specifications"],
    properties: {
      pg_resource_id: {
        bsonType: "int",
        description: "Foreign key reference to PostgreSQL resource.id - must be an integer"
      },
      resource_type: {
        bsonType: "string",
        description: "Classification string (e.g. COMPUTER_LAB, AUDITORIUM)"
      },
      updated_at: {
        bsonType: ["date", "string"],
        description: "ISO timestamp of last update"
      },
      specifications: {
        bsonType: "object",
        description: "Flexible, polymorphic hardware, software, or architectural specifications",
        additionalProperties: true
      }
    }
  }
}
```

### 4.2 Index Strategy
1. `{ pg_resource_id: 1 }` (`unique: true`) — Guarantees strict 1:0..1 mapping between PostgreSQL resource record and MongoDB profile.
2. `{ resource_type: 1 }` — Enables fast type-scoped profile filtering.
3. `{ "specifications.software": 1 }` — Multikey index for software capability queries.

### 4.3 Fallback Semantics
When a resource does not have an entry in `campus_resource_profiles`, the API returns `profile: null`. The frontend renders:
`"No extended specifications recorded"`
This is treated as a valid operational state, **not an error**.
