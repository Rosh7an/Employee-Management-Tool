# Employee Management Tool

A full-stack HR management system built with React and Express. Covers the core employee lifecycle — from onboarding and payroll to leave requests, performance reviews, and audit trails.

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 19, TypeScript, Vite, TanStack Query, Zustand, React Router v7, Recharts |
| Backend | Node.js, Express, TypeScript, MongoDB (Mongoose), Zod |
| Auth | JWT (Bearer token, stateless) |
| Testing | Jest, Supertest, mongodb-memory-server |

---

## Features

- **Dashboard** — HR metrics and summary charts
- **Employee Management** — full CRUD with department assignment
- **Departments** — create and manage org structure
- **Leave Management** — request, approve, and track leave
- **Payroll** — run and view payroll records
- **Performance** — reviews, ratings, and quarter management
- **Milestones** — track employee achievements
- **Audit Log** — tamper-evident log of all admin actions
- **Profile** — account management

---

## Prerequisites

- **Node.js** v18+
- **npm** v9+ (workspaces support required)
- **MongoDB** v6+ — *optional for development* (the server auto-starts an in-memory database if MongoDB is unreachable)

---

## Installation

### 1. Clone the repository

```bash
git clone <repo-url>
cd Employee-Management-Tool
```

### 2. Install all dependencies

The project uses npm workspaces. A single install from the root covers both `client` and `server`.

```bash
npm install
```

### 3. Configure environment variables

**Server** — copy the example file and fill in your values:

```bash
cp server/.env.example server/.env
```

Open `server/.env` and set:

```env
PORT=5001
MONGODB_URI=mongodb://127.0.0.1:27017/ems
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

**Client** — the `.env.local` file already exists after cloning. Update if your server runs on a different port:

```env
VITE_API_URL=http://localhost:5001
```

---

## Running in Development

Start both the client and server with a single command from the project root:

```bash
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5001 |
| Health check | http://localhost:5001/health |

> **No MongoDB?** The server detects an unreachable MongoDB instance and automatically falls back to an in-memory database, then seeds it with demo data. No extra setup needed.

---

## Seed Data

To populate the database with demo employees, departments, and payroll records:

```bash
npm run seed
```

The password for every seeded account is `Password@123`.

### Departments

| Department | Description |
|------------|-------------|
| Engineering | Builds and maintains all software products |
| Product | Product strategy, design, and roadmap |
| Marketing | Brand, growth, and customer acquisition |
| HR & People | Talent, culture, and employee experience |

### Seeded Employees

| ID | Name | Email | Role | Designation | Department | Type | Salary (USD) |
|----|------|-------|------|-------------|------------|------|-------------|
| EMP-0001 | Michael Chen | director@company.com | admin + Director | Company Director | HR & People | Full-time | $18,000 |
| EMP-0002 | Sarah Mitchell | hr.manager@company.com | admin | HR Manager | HR & People | Full-time | $12,000 |
| EMP-0003 | Ryan Park | team.lead@company.com | manager | Engineering Lead | Engineering | Full-time | $14,000 |
| EMP-0004 | Jessica Torres | product.manager@company.com | manager | Product Manager | Product | Full-time | $13,000 |
| EMP-0005 | David Kim | marketing.manager@company.com | manager | Marketing Manager | Marketing | Full-time | $12,000 |
| EMP-0006 | Sophia Lewis | alice.dev@company.com | employee | Senior Software Engineer | Engineering | Full-time | $10,500 |
| EMP-0007 | Ethan Wright | bob.dev@company.com | employee | Software Engineer | Engineering | Full-time | $8,000 |
| EMP-0008 | Lucas Brown | lucas.brown@company.com | employee | Frontend Engineer | Engineering | Full-time | $8,500 |
| EMP-0009 | Olivia Martinez | olivia.martinez@company.com | employee | UX Designer | Product | Full-time | $9,000 |
| EMP-0010 | Noah Thompson | noah.thompson@company.com | employee | Business Analyst | Product | Full-time | $7,500 |
| EMP-0011 | Ava Johnson | carol.mkt@company.com | employee | Marketing Analyst | Marketing | Full-time | $7,200 |
| EMP-0012 | Liam Anderson | dave.mkt@company.com | employee | Content Strategist | Marketing | Part-time | $5,500 |
| EMP-0013 | Emma Wilson | eve.hr@company.com | employee | HR Coordinator | HR & People | Full-time | $7,500 |
| EMP-0014 | James Davis | frank.hr@company.com | employee | Recruiter | HR & People | Contract | $6,500 |

**Notes:**
- Michael Chen has `isDirector: true` — he can review leave requests across all departments, not just his own.
- Sarah Mitchell is also `admin` — she can perform all admin actions but is not the Director.
- Managers (Ryan, Jessica, David) can review leave only for employees in their department.

### Other seeded data

- **Payroll** — 12 months of records (July 2025 – June 2026) for every employee
- **Performance reviews** — 14 quarters (Q1 2023 – Q2 2026) per employee with realistic rating trajectories
- **Performance quarters** — Q1 2026 (locked) and Q2 2026 (open)
- **Leave requests** — mix of approved, rejected, and pending requests across all employees
- **Milestones** — company-wide, department-level, and individual goals

---

## Running Tests

Tests run against an isolated in-memory MongoDB instance — no external database needed.

```bash
npm test
```

Test suites cover: auth, employees, departments, leave, payroll, performance, audit, and time-based access control.

---

## Project Structure

```
Employee-Management-Tool/
├── client/                       # React frontend (Vite)
│   └── src/
│       ├── features/             # Feature modules (employees, payroll, leave …)
│       ├── components/           # Shared UI components
│       ├── hooks/                # Custom React hooks
│       ├── store/                # Zustand global state
│       ├── lib/                  # Axios instance, utilities
│       └── router.tsx            # App routes
│
└── server/
    └── src/
        ├── modules/              # Feature modules — one folder per domain
        │   └── <module>/
        │       ├── *.routes.ts   # Express router
        │       ├── *.controller.ts
        │       ├── *.service.ts  # Business logic
        │       └── *.schema.ts   # Zod validation schemas
        ├── models/               # Mongoose models (shared across modules)
        ├── config/               # DB connection, env parsing, constants
        ├── shared/
        │   ├── middleware/       # authenticate, authorise, auditLog, timeWindow, errorHandler
        │   └── utils/            # ApiError, asyncWrapper, pagination
        ├── types/                # TypeScript augmentations (express.d.ts)
        └── seed.ts               # Demo data seeder
```

---

## Backend — In Depth

### Architecture

The server follows a **modular, layered** structure. Each domain (employees, leave, payroll, etc.) lives in its own folder under `src/modules/` with four files:

- `*.routes.ts` — declares the Express router and wires middleware
- `*.controller.ts` — thin HTTP adapter; calls the service and sends the response
- `*.service.ts` — all business logic and database access
- `*.schema.ts` — Zod schemas used to validate incoming request bodies

Mongoose models live in `src/models/` and are shared across modules.

---

### Roles

Three roles are supported. The role is embedded in the JWT at login and checked by the `authorise` middleware.

| Role | Description |
|------|-------------|
| `admin` | Full access. Can create/delete employees and departments, run payroll, view audit logs, lock performance quarters. |
| `manager` | Can review leave requests for their department, create/update performance reviews, view all employees. |
| `employee` | Can view their own data, submit leave requests, view their payroll records. |

There is also an `isDirector` flag on the User model. Directors can review leave requests outside their own department.

---

### Authentication

All protected routes require a **Bearer token** in the `Authorization` header:

```
Authorization: Bearer <token>
```

**Obtain a token:**

```
POST /api/auth/login
Content-Type: application/json

{ "email": "hr.admin@company.com", "password": "Password@123" }
```

Response:

```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "user": { "_id": "...", "name": "HR Admin", "email": "...", "role": "admin" }
  }
}
```

The JWT payload contains: `userId`, `role`, `employeeId`, `departmentId`, `isDirector`.

Tokens expire according to `JWT_EXPIRES_IN` (default `7d`). There is no refresh endpoint — re-login to get a new token.

---

### Middleware

| Middleware | File | Purpose |
|------------|------|---------|
| `authenticate` | `shared/middleware/authenticate.ts` | Verifies the Bearer JWT and attaches `req.user` |
| `authorise(...roles)` | `shared/middleware/authorise.ts` | Rejects requests from roles not in the allowlist |
| `auditLog(opts)` | `shared/middleware/audit.ts` | Writes an `AuditLog` record after every successful mutating request |
| `timeWindow(opts)` | `shared/middleware/timeWindow.ts` | Restricts an endpoint to Mon–Fri 08:00–20:00 UTC; bypasses for `admin` and `manager` by default |
| `errorHandler` | `shared/middleware/errorHandler.ts` | Central error handler — normalises `ApiError`, `ZodError`, and Mongo duplicate-key errors |

---

### API Endpoints

All routes require authentication unless noted otherwise.

#### Auth — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/register` | None | Create a new user account (role defaults to `employee`) |
| `POST` | `/login` | None | Log in and receive a JWT |
| `GET` | `/me` | Any | Return the current user and their linked employee record |

---

#### Employees — `/api/employees`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Any | List all employees (paginated) |
| `POST` | `/` | `admin` | Create a new employee |
| `GET` | `/:id` | Scoped¹ | Get a single employee |
| `PATCH` | `/:id` | Scoped¹ | Update an employee |
| `DELETE` | `/:id` | `admin` | Terminate an employee (soft delete) |

¹ Employees can only access their own record; admins and managers can access any record in their scope.

---

#### Departments — `/api/departments`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Any | List all departments |
| `GET` | `/:id` | Any | Get a single department |
| `POST` | `/` | `admin` | Create a department |
| `PATCH` | `/:id` | `admin` | Update a department |
| `DELETE` | `/:id` | `admin` | Delete a department |

---

#### Leave — `/api/leave`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Any | List leave requests (scoped by role) |
| `POST` | `/` | Any | Submit a leave request (time-windowed²) |
| `PATCH` | `/:id/review` | `manager` / `admin` / director | Approve or reject a request |

² Leave submission is restricted to Mon–Fri 08:00–20:00 UTC for regular employees. Admins and managers bypass this window.

---

#### Payroll — `/api/payroll`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Any | List payroll records (employees see only their own) |
| `POST` | `/` | `admin` | Create a payroll record |

---

#### Performance — `/api/performance`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Any | List all performance reviews |
| `GET` | `/employee/:empId` | Any | Reviews for a specific employee |
| `POST` | `/` | `admin` / `manager` | Create a review |
| `PATCH` | `/:id` | `admin` / `manager` | Update a review |
| `DELETE` | `/:id` | `admin` / `manager` | Delete a review |
| `GET` | `/quarters` | Any | List performance quarters |
| `POST` | `/quarters` | `admin` | Create a quarter |
| `PATCH` | `/quarters/:id/lock` | `admin` | Lock a quarter (prevents new reviews) |
| `PATCH` | `/quarters/:id/unlock` | `admin` | Unlock a quarter |

---

#### Milestones — `/api/milestones`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Any | List milestones |
| `POST` | `/` | Any | Create a milestone |
| `PATCH` | `/:id` | Any | Update a milestone |
| `DELETE` | `/:id` | Any | Delete a milestone |

---

#### Audit Log — `/api/audit`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | `admin` only | List all audit log entries (read-only) |

---

#### Dashboard — `/api/dashboard`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/stats` | Any | Aggregated HR metrics for the dashboard |

---

### Data Models

#### User

| Field | Type | Notes |
|-------|------|-------|
| `name` | String | |
| `email` | String | Unique, lowercased |
| `passwordHash` | String | bcrypt, cost 10 |
| `role` | `admin` \| `manager` \| `employee` | |
| `employeeId` | ObjectId → Employee | Linked employee record |
| `isDirector` | Boolean | Allows cross-department leave review |

#### Employee

| Field | Type | Notes |
|-------|------|-------|
| `employeeId` | String | Auto-generated: `EMP-1001`, `EMP-1002`, … |
| `name` | String | |
| `email` | String | Unique |
| `phone` | String | Optional |
| `department` | ObjectId → Department | |
| `designation` | String | |
| `managerId` | ObjectId → Employee | |
| `employmentType` | `full-time` \| `part-time` \| `contract` | |
| `status` | `active` \| `on-leave` \| `terminated` | |
| `dateOfJoining` | Date | |
| `salary.base` | Number | |
| `salary.currency` | String | Default `USD` |

#### LeaveRequest

| Field | Type | Notes |
|-------|------|-------|
| `employeeId` | ObjectId → Employee | |
| `type` | `sick` \| `casual` \| `earned` | |
| `startDate` / `endDate` | Date | |
| `reason` | String | |
| `status` | `pending` \| `approved` \| `rejected` | |
| `reviewedBy` | ObjectId → Employee | Set on review |
| `reviewedAt` | Date | Set on review |

#### Payroll

| Field | Type | Notes |
|-------|------|-------|
| `employeeId` | ObjectId → Employee | |
| `payPeriod` | String | e.g. `"2024-06"` |
| `base` | Number | |
| `bonuses` | Number | |
| `deductions` | Number | |
| `netPay` | Number | |
| `currency` | String | Default `USD` |

#### PerformanceReview

| Field | Type | Notes |
|-------|------|-------|
| `employeeId` | ObjectId → Employee | |
| `reviewerId` | ObjectId → Employee | |
| `period` | String | e.g. `"Q2 2024"` |
| `rating` | `1` – `5` | |
| `notes` | String | |

#### Milestone

| Field | Type | Notes |
|-------|------|-------|
| `title` | String | |
| `description` | String | Optional |
| `targetDate` | Date | |
| `status` | `not-started` \| `in-progress` \| `achieved` | |
| `createdBy` | ObjectId → User | |

#### AuditLog

| Field | Type | Notes |
|-------|------|-------|
| `actorId` | ObjectId → User | Who performed the action |
| `actorRole` | String | Role at time of action |
| `action` | String | e.g. `employee.create`, `leave.review` |
| `targetId` | String | ID of the affected document |
| `targetModel` | String | e.g. `Employee`, `LeaveRequest` |
| `diff` | Mixed | Request body captured at time of action |
| `ip` | String | |
| `timestamp` | Date | |

---

### Request & Response Shape

**Success:**

```json
{ "success": true, "data": { ... } }
```

Paginated responses include a `meta` field:

```json
{
  "success": true,
  "data": [...],
  "meta": { "page": 1, "limit": 20, "total": 84, "pages": 5 }
}
```

Pagination query params: `?page=1&limit=20` (limit capped at 100).

**Error:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "email is required",
    "field": "email"
  }
}
```

| HTTP Status | Code | Cause |
|-------------|------|-------|
| 401 | `UNAUTHENTICATED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Role not permitted for this action |
| 403 | `TIME_RESTRICTED` | Request outside the allowed time window |
| 404 | `NOT_FOUND` | Document does not exist |
| 409 | `CONFLICT` | Unique constraint violation |
| 422 | `VALIDATION_ERROR` | Zod schema validation failed |
| 500 | `INTERNAL` | Unexpected server error |

---

## Building for Production

```bash
# Build the frontend
npm run build --workspace=client
# Output: client/dist/
```

The backend runs directly with `tsx` (no separate build step required):

```bash
NODE_ENV=production npm run start --workspace=server
```

> In production, `NODE_ENV=production` disables the in-memory MongoDB fallback. The server will exit if `MONGODB_URI` is unreachable.
