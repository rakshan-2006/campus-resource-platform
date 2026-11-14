# Contributing Guidelines

## Project Areas

### Core platform

- Overall project scaffolding, Next.js 15 App Router foundation, UI kit, app shell and navigation
- PostgreSQL relational schema (`db/schema.sql`), functions, triggers, procedures, views, and RLS policies
- Database seed script (`db/seed.sql`) and query workbook (`db/query-workbook.sql`)
- MongoDB initialisation and profile schema validation (`db/mongo-init.js`, `db/mongo-seed.js`)
- Auth engine (JWT httpOnly cookies, password hashing, role checks)
- Core API routes: Auth, Metadata, Resource List/Detail (read), Availability, Recommendations, Faculty Requests, Bookings, Admin Request Approval/Rejection
- Core Pages: Login, Dashboard, Resource Explorer/Detail, Availability Timeline, Request Creation & Recommendation, My Requests, My Bookings, Admin Request Approvals, Admin Bookings
- Core marking documentation: `docs/ERD.md`, `docs/RELATIONAL_SCHEMA.md`, `docs/NOSQL_DESIGN.md`, `docs/DATABASE_FEATURES.md`, `docs/API.md`, `docs/CONTRACT.md`, `docs/TEST_PLAN.md`, `docs/DEMO_SCRIPT.md`, `docs/CONTRIBUTIONS.md`, `README.md`

### Admin features

- Admin Resource CRUD UI & API (including Resource Types, Facilities, and MongoDB Profiles)
- Admin Maintenance scheduling & management UI & API
- Admin Analytics dashboards & charts
- `db/demo-data.sql`, `scripts/demo-conflict.sql`, `docs/ADMIN_FEATURES.md`

## Development Workflow
1. Create a feature branch from `main` and follow the interfaces in `docs/CONTRACT.md`.
2. Open a pull request using the repository template.
3. Run `npm run lint`, `npm run typecheck`, and `npm run build` before merging.
4. Code touching multiple PostgreSQL tables must use `withTransaction()`.
5. Parameterized queries are mandatory for all SQL queries (`$1, $2, ...`).
   
