# API Documentation

## Campus Resource Allocation & Conflict Detection Platform

This document describes all RESTful API endpoints, request schemas, authorization rules, and error codes.

---

## 1. Authentication Endpoints

### 1.1 `POST /api/auth/login`
Authenticates a user via institutional email and password, establishing an `httpOnly`, `SameSite=Lax` JWT session cookie.

- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "faculty1@campus.edu",
    "password": "Faculty@123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "data": {
      "user": {
        "id": 2,
        "name": "Dr. Grace Hopper (Faculty CS)",
        "email": "faculty1@campus.edu",
        "role": "FACULTY",
        "department_id": 1,
        "department_name": "Computer Science & Engineering"
      }
    }
  }
  ```
- **Errors**: `400 Bad Request` (Validation error), `401 Unauthorized` (Invalid credentials).

---

### 1.2 `POST /api/auth/logout`
Clears the JWT session cookie.

- **Access**: Public
- **Response (200 OK)**:
  ```json
  {
    "data": {
      "message": "Logged out successfully"
    }
  }
  ```

---

### 1.3 `GET /api/auth/me`
Retrieves currently authenticated session profile.

- **Access**: Authenticated (`ADMIN` or `FACULTY`)
- **Response (200 OK)**:
  ```json
  {
    "data": {
      "user": {
        "id": 2,
        "name": "Dr. Grace Hopper (Faculty CS)",
        "email": "faculty1@campus.edu",
        "role": "FACULTY",
        "department_id": 1,
        "department_name": "Computer Science & Engineering"
      }
    }
  }
  ```

---

## 2. Metadata & Catalog Endpoints

### 2.1 `GET /api/metadata`
Returns core reference taxonomies (departments, resource types, facilities).

- **Access**: Authenticated
- **Response (200 OK)**:
  ```json
  {
    "data": {
      "departments": [ ... ],
      "resource_types": [ ... ],
      "facilities": [ ... ]
    }
  }
  ```

---

### 2.2 `GET /api/resources`
Lists all campus resources with optional filtering by type, minimum capacity, and department.

- **Query Parameters**:
  - `type_id` (optional, integer)
  - `min_capacity` (optional, integer)
  - `department_id` (optional, integer)
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": 1,
        "code": "LH-101",
        "name": "Lecture Hall 101",
        "capacity": 60,
        "location": "Main Academic Block, Floor 1",
        "status": "AVAILABLE",
        "resource_type_id": 1,
        "resource_type_name": "Lecture Classroom",
        "department_name": "Computer Science & Engineering"
      }
    ]
  }
  ```

---

### 2.3 `GET /api/resources/[id]`
Fetches full details of a specific resource, including installed facilities and optional MongoDB specifications profile.

- **Access**: Authenticated
- **Response (200 OK)**:
  ```json
  {
    "data": {
      "id": 3,
      "code": "LAB-CS1",
      "name": "Alan Kay Computing Lab",
      "capacity": 40,
      "location": "Turing IT Complex, Floor 2",
      "status": "AVAILABLE",
      "facilities": [
        { "facility_id": 4, "facility_name": "High-End Workstations", "quantity": 40 }
      ],
      "profile": {
        "pg_resource_id": 3,
        "resource_type": "COMPUTER_LAB",
        "specifications": {
          "cpu": "Intel Core i9-14900K",
          "ram": "64 GB DDR5",
          "software": ["Docker", "PostgreSQL 16 Client"]
        }
      }
    }
  }
  ```
  *(If no MongoDB profile exists, `profile: null` is returned).*

---

## 3. Availability & Recommendations

### 3.1 `GET /api/availability`
Checks whether a given resource is available for a designated time window.

- **Query Parameters**:
  - `resource_id` (required, integer)
  - `start_time` (required, `YYYY-MM-DD HH:mm`)
  - `end_time` (required, `YYYY-MM-DD HH:mm`)
- **Response (200 OK)**:
  ```json
  {
    "data": {
      "resource_id": 1,
      "start_time": "2026-11-20 09:00",
      "end_time": "2026-11-20 11:00",
      "is_available": false,
      "reason": "Resource has an overlapping confirmed booking"
    }
  }
  ```

---

### 3.2 `POST /api/recommendations`
Calls PostgreSQL set-returning function `fn_recommend_resources` to calculate explainable match scores for allocatable resources.

- **Request Body**:
  ```json
  {
    "resource_type_id": 2,
    "expected_capacity": 30,
    "start_time": "2026-11-20 11:00",
    "end_time": "2026-11-20 13:00",
    "required_facilities": [
      { "facility_id": 4, "min_quantity": 30 }
    ]
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "resource_id": 4,
        "resource_code": "LAB-CS2",
        "resource_name": "Ada Lovelace Systems Lab",
        "capacity": 35,
        "total_score": 98.29,
        "capacity_score": 94.29,
        "facilities_score": 100.00,
        "availability_score": 100.00,
        "type_score": 100.00,
        "location_score": 100.00,
        "facility_breakdown": [
          {
            "facility_id": 4,
            "facility_name": "High-End Workstations",
            "required_qty": 30,
            "available_qty": 35,
            "satisfied": true
          }
        ]
      }
    ]
  }
  ```

---

## 4. Booking Requests & Workflows

### 4.1 `GET /api/requests`
Lists booking requests. For faculty, returns own requests (governed by RLS). For admin, returns all requests.

- **Query Parameters**:
  - `status` (optional: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`)
- **Response (200 OK)**:
  ```json
  {
    "data": [ ... ]
  }
  ```

---

### 4.2 `POST /api/requests`
Submits a new booking request. Wrapped in a dedicated PostgreSQL transaction.

- **Request Body**:
  ```json
  {
    "resource_type_id": 1,
    "preferred_resource_id": 1,
    "title": "Discrete Mathematics Lecture",
    "description": "Graph theory introduction",
    "start_time": "2026-11-24 10:00",
    "end_time": "2026-11-24 12:00",
    "expected_capacity": 55,
    "required_facilities": [
      { "facility_id": 1, "min_quantity": 1 }
    ]
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "data": {
      "id": 5,
      "status": "PENDING"
    }
  }
  ```

---

### 4.3 `PUT /api/requests/[id]`
Modifies a pending booking request.

- **Access**: Faculty (request owner only, when status = `PENDING`) or Admin
- **Request Body**: (same fields as POST)

---

### 4.4 `DELETE /api/requests/[id]`
Cancels a booking request. Automatically triggers booking cancellation via PostgreSQL trigger if an approved booking was present.

- **Response (200 OK)**:
  ```json
  {
    "data": {
      "message": "Request cancelled successfully"
    }
  }
  ```

---

## 5. Admin Approvals & Triage

### 5.1 `POST /api/admin/requests/[id]/approve`
Executes stored procedure `sp_approve_request(request_id, admin_id, assigned_resource_id)` under row lock.

- **Access**: `ADMIN` only
- **Request Body** (optional override):
  ```json
  {
    "assigned_resource_id": 1
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "data": {
      "message": "Request approved and booking confirmed successfully"
    }
  }
  ```
- **Errors**: `409 Conflict` (`RESOURCE_CONFLICT`), `400 Bad Request` (Invalid state).

---

### 5.2 `POST /api/admin/requests/[id]/reject`
Rejects a pending booking request with an explanatory reason.

- **Access**: `ADMIN` only
- **Request Body**:
  ```json
  {
    "reason": "Scheduled university symposium requires the entire block"
  }
  ```

---

## 6. Bookings Management

### 6.1 `GET /api/bookings`

Faculty booking lists show their own reservations. The shared schedule uses
`view=schedule&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` and returns confirmed
room occupancy to faculty without request titles or account details. Admins
can list campus-wide confirmed or historical bookings.

- **Query Parameters**:
  - `resource_id` (optional, integer)
  - `start_date` (optional, `YYYY-MM-DD`)
  - `end_date` (optional, `YYYY-MM-DD`)
  - `view=schedule` (optional, requires both dates)

---

### 6.2 `POST /api/bookings/[id]/cancel`
Cancels an active confirmed booking.

---

### 6.3 `POST /api/bookings/[id]/reschedule`
Reschedules an existing confirmed booking to a new time window, protected by the GiST exclusion constraint.

- **Request Body**:
  ```json
  {
    "new_start_time": "2026-11-20 12:00",
    "new_end_time": "2026-11-20 14:00"
  }
  ```

---

## 7. Operational Dashboard & Health

### 7.1 `GET /api/dashboard`
Returns operational metrics customized by role:
- Faculty: Recent requests, upcoming confirmed reservations, quick statistics.
- Admin: Pending triage count, utilization overview, peak hours summary.

---

### 7.2 `GET /api/health`
Health check validating both PostgreSQL and MongoDB connectivity.
- **Response (200 OK)**:
  ```json
  {
    "data": {
      "status": "healthy",
      "postgres": "connected",
      "mongodb": "connected",
      "timestamp": "2026-11-13T19:00:00.000Z"
    }
  }
  ```
