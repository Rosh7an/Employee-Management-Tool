# Employee Management Tool

A full-stack HR platform for managing employees, payroll, leave, and performance — built with React and Express.

---

## Stack

| | |
|---|---|
| Frontend | React 19, TypeScript, Vite, TanStack Query, Zustand |
| Backend | Node.js, Express, TypeScript, MongoDB, Zod |
| Auth | JWT (7-day expiry, auto-logout on 401) |
| Docs | Swagger UI at `/api/docs` |

---

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure server
cp server/.env.example server/.env
# Edit server/.env — set MONGODB_URI and JWT_SECRET

# 3. Run (dev)
npm run dev
```

| Service | URL |
|---|---|
| App | http://localhost:5173 |
| API | http://localhost:5001 |
| Swagger | http://localhost:5001/api/docs |

> No MongoDB? The server falls back to an in-memory database automatically and seeds demo data.

---

## Seed Accounts

```bash
npm run seed
```

Password for all accounts: `Password@123`

| Email | Role |
|---|---|
| director@company.com | Admin + Director |
| hr.manager@company.com | Admin |
| team.lead@company.com | Manager |
| alice.dev@company.com | Employee |

---

## Features

- **Dashboard** — headcount, leave, payroll, and performance at a glance
- **Employees** — full profile management; self-registered users appear in a *Pending Setup* queue
- **Departments** — create structure, assign managers
- **Leave** — request, approve, reject; time-windowed for employees
- **Payroll** — monthly records; net pay computed server-side
- **Performance** — quarterly reviews with ratings and quarter locking
- **Milestones** — personal and team goal tracking
- **Audit Logs** — tamper-evident log of all admin actions with search and date filters
- **Profile** — change password, logout — all via modal

---

## Roles

| Role | Can do |
|---|---|
| `admin` | Everything — create employees, run payroll, view audit logs |
| `manager` | Review leave and performance for their department |
| `employee` | View own data, submit leave, update phone number |

Director flag (`isDirector`) allows cross-department leave review.

---

## Roadmap

- [ ] Email notifications (leave approvals, payroll slips)
- [ ] Document uploads (contracts, ID proofs)
- [ ] Org chart view
- [ ] Multi-currency payroll support
- [ ] Bulk employee import via CSV
- [ ] Mobile-responsive layout
- [ ] Role assignment UI (promote employee → manager)
- [ ] Reporting exports (PDF payslips, CSV attendance)
