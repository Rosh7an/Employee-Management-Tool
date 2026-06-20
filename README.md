# Employee Management Tool

A full-stack HR platform — employees, departments, leave, payroll, performance, and milestones. Built with React + Express + MongoDB.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Vite, TanStack Query, Zustand |
| Backend | Node.js 18+, Express, TypeScript, MongoDB, Zod |
| Auth | JWT (7-day expiry, auto-logout on 401) |
| API Docs | Swagger UI at `/api/docs` |

---

## Prerequisites

- **Node.js** ≥ 18 — [nodejs.org](https://nodejs.org)
- **MongoDB** — local install *or* a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

> No MongoDB? The server falls back to an in-memory database automatically and seeds demo data.

---

## Setup

```bash
# 1. Clone and install
git clone https://github.com/Rosh7an/Employee-Management-Tool.git
cd Employee-Management-Tool
npm install

# 2. Create the server env file
cp server/.env.example server/.env
```

Open `server/.env` and set your values:

```env
PORT=5001                          # API port
MONGODB_URI=mongodb://127.0.0.1:27017/ems   # your MongoDB connection string
JWT_SECRET=replace_with_a_long_random_string # e.g. openssl rand -hex 32
JWT_EXPIRES_IN=7d
```

```bash
# 3. Seed demo accounts
npm run seed

# 4. Start dev servers (frontend + backend together)
npm run dev
```

| Service | URL |
|---|---|
| App | http://localhost:5173 |
| API | http://localhost:5001 |
| Swagger | http://localhost:5001/api/docs |

---

## Demo Accounts

All accounts use the password: **`Password@123`**

| Email | Role |
|---|---|
| director@company.com | Admin + Director |
| hr.manager@company.com | Admin |
| team.lead@company.com | Manager |
| alice.dev@company.com | Employee |

---

## Features

| Module | What it does |
|---|---|
| **Dashboard** | Live headcount, leave, payroll, and performance summary |
| **Employees** | Full profile management; self-registered users go into a *Pending Setup* queue |
| **Departments** | Create departments, assign managers; detail page shows org hierarchy tree |
| **Leave** | Submit, approve, and reject requests; employees restricted to business hours |
| **Payroll** | Monthly records; net pay computed server-side |
| **Performance** | Quarterly reviews with ratings; admins open/lock quarters |
| **Milestones** | Personal and team goal tracking with status progression |
| **Audit Logs** | Tamper-evident log of all admin actions; searchable with date filters |
| **Profile** | Change password, view own performance history, logout |

---

## Roles

| Role | Access |
|---|---|
| `admin` | Everything — create/edit employees, run payroll, manage departments, view audit logs |
| `manager` | Review leave and update status for their own department's employees |
| `employee` | View own data, submit leave, update phone number |

`isDirector` flag allows cross-department leave review and removes the reporting hierarchy for that user.

---

## Tests

```bash
# Run all server tests
npm test

# Run a specific suite
cd server && npx jest --testPathPattern="departments" --forceExit

# Watch mode
cd server && npx jest --watch
```

> Tests use an in-memory MongoDB instance — no real database needed.

---

## Roadmap

- [ ] Email notifications (leave approvals, payroll slips)
- [ ] Document uploads (contracts, ID proofs)
- [ ] Multi-currency payroll support
- [ ] Bulk employee import via CSV
- [ ] Mobile-responsive layout
- [ ] Role assignment UI (promote employee → manager in-app)
- [ ] Reporting exports (PDF payslips, CSV attendance)
