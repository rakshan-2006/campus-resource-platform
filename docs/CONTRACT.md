# Integration Contract

## Campus Resource Allocation & Conflict Detection Platform

This document describes the shared API, TypeScript, database, UI, and error-handling conventions for the admin features.

---

## 1. Admin Feature Paths

- **Pages**:
  - `/src/app/admin/resources/` (Admin Resource CRUD, Types, Facilities & Mongo Profiles)
  - `/src/app/admin/maintenance/` (Admin Maintenance Scheduling & Management)
  - `/src/app/admin/analytics/` (Admin Analytics, Utilization & Peak Hour Visuals)
- **API Routes**:
  - `/src/app/api/admin/resources/` (CRUD endpoints for resources, types, facilities, and Mongo profiles)
  - `/src/app/api/admin/maintenance/` (CRUD endpoints for maintenance windows)
  - `/src/app/api/admin/analytics/` (Analytics aggregation endpoints)
- **Artifacts**:
  - `db/demo-data.sql` (Demo conflict datasets)
  - `scripts/demo-conflict.sql` (Demonstration script for concurrent approvals / conflict detection)
  - `docs/ADMIN_FEATURES.md` (admin feature documentation)

---

## 2. API Response Envelope

All API routes must use the standard envelope:

### Success Response:
```json
{
  "data": { ... }
}
```
HTTP Status: `200 OK` or `201 Created`.

### Error Response:
```json
{
  "error": {
    "message": "Human readable error description",
    "code": "ERROR_CODE_STRING",
    "details": { ... } // optional validation errors
  }
}
```
HTTP Status: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, or `500 Internal Server Error`.

---

## 3. Server-Side Shared Utilities

### 3.1 Database Access (`src/lib/db.ts`)
```typescript
import { query, withTransaction, withUserContext } from "@/lib/db";

// 1. Parameterized Read Query
const result = await query<ResourceRow>(
  "SELECT * FROM resource WHERE department_id = $1 ORDER BY code ASC",
  [departmentId]
);
const resources = result.rows;

// 2. Multi-Table Mutation Transaction
await withTransaction(async (client) => {
  const insertRes = await client.query(
    "INSERT INTO resource (code, name, capacity, location, resource_type_id, department_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
    [code, name, capacity, location, typeId, deptId]
  );
  const resourceId = insertRes.rows[0].id;
  
  for (const fac of facilities) {
    await client.query(
      "INSERT INTO resource_facility (resource_id, facility_id, quantity) VALUES ($1, $2, $3)",
      [resourceId, fac.id, fac.quantity]
    );
  }
});
```

### 3.2 MongoDB Client & Typed Profiles (`src/lib/mongo.ts`)
```typescript
import { getProfilesCollection, ResourceProfileDocument } from "@/lib/mongo";

// Fetch extended specifications profile
const coll = await getProfilesCollection();
const profile = await coll.findOne({ pg_resource_id: resourceId });

// Upsert profile
await coll.updateOne(
  { pg_resource_id: resourceId },
  {
    $set: {
      resource_type: "COMPUTER_LAB",
      updated_at: new Date().toISOString(),
      specifications: {
        computer_count: 40,
        cpu: "Intel i9",
        software: ["Docker", "PostgreSQL"]
      }
    }
  },
  { upsert: true }
);

// Delete profile
await coll.deleteOne({ pg_resource_id: resourceId });
```

### 3.3 Auth & Role Verification (`src/lib/auth.ts`)
```typescript
import { getSessionUser, requireRole } from "@/lib/auth";

// Inside an API route handler:
const user = await getSessionUser();
if (!user) {
  return Response.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, { status: 401 });
}

// Require ADMIN role
try {
  requireRole(user, "ADMIN");
} catch {
  return Response.json({ error: { message: "Forbidden: Admin access required", code: "FORBIDDEN" } }, { status: 403 });
}
```

### 3.4 Route Wrapper (`src/lib/api-response.ts`)
```typescript
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    const data = await fetchSomething();
    return apiSuccess(data);
  } catch (error) {
    return apiError(error);
  }
}
```

---

## 4. TypeScript Interface Definitions

```typescript
export interface Department {
  id: number;
  code: string;
  name: string;
}

export interface ResourceType {
  id: number;
  code: string;
  name: string;
  description: string | null;
}

export interface Facility {
  id: number;
  code: string;
  name: string;
  description: string | null;
}

export interface ResourceItem {
  id: number;
  code: string;
  name: string;
  capacity: number;
  location: string;
  status: "AVAILABLE" | "MAINTENANCE" | "UNAVAILABLE";
  resource_type_id: number;
  resource_type_name: string;
  department_id: number;
  department_name: string;
  facilities?: Array<{
    facility_id: number;
    facility_name: string;
    facility_code: string;
    quantity: number;
  }>;
  profile?: ResourceProfileDocument | null;
}

export interface MaintenanceRecord {
  id: number;
  resource_id: number;
  resource_name: string;
  scheduled_by_user_id: number;
  scheduler_name: string;
  start_time: string; // YYYY-MM-DD HH:mm
  end_time: string;   // YYYY-MM-DD HH:mm
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  reason: string;
  notes: string | null;
}

export interface ResourceProfileDocument {
  _id?: any;
  pg_resource_id: number;
  resource_type: string;
  updated_at: string;
  specifications: Record<string, any>;
}
```

---

## 5. UI Kit Components

Shared design system components live in `src/components/ui/`:
- `Button`: Primary, secondary, outline, danger variants with loading states.
- `Badge`: Status badges (`AVAILABLE`, `MAINTENANCE`, `PENDING`, `APPROVED`, etc.).
- `Input`, `Select`, `Textarea`: Standard accessible form controls.
- `Table`, `Thead`, `Tbody`, `Tr`, `Th`, `Td`: Dense tabular layouts.
- `ScoreBar`: Visual progress and component score bars.
- `Timeline`: 07:00-20:00 schedule visualizer.

### Design Principles:
- Dense, calm, operational aesthetic.
- Neutral color palette (slate/navy).
- No emojis, gradients, huge cards, or mock data.
- Accessible focus outlines on all interactive elements.
