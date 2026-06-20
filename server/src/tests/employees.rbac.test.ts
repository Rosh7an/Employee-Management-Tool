import request from 'supertest';
import app from '../app';
import User from '../models/User';
import { startDB, stopDB, clearDB, seedTestUsers, TestUsers } from './helpers/setup';

let users: TestUsers;

beforeAll(startDB);
afterAll(stopDB);
beforeEach(async () => { await clearDB(); users = await seedTestUsers(); });

// ─── Employee update RBAC ────────────────────────────────────────
describe('PATCH /api/employees/:id — role restrictions', () => {
  it('admin can update employee designation', async () => {
    const res = await request(app)
      .patch(`/api/employees/${users.employeeRecordId}`)
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({ designation: 'Senior Developer' });
    expect(res.status).toBe(200);
    expect(res.body.data.designation).toBe('Senior Developer');
  });

  it('manager can change employee status to on-leave', async () => {
    const res = await request(app)
      .patch(`/api/employees/${users.employeeRecordId}`)
      .set('Authorization', `Bearer ${users.managerToken}`)
      .send({ status: 'on-leave' });
    expect(res.status).toBe(200);
  });

  // RBAC fix #3: manager cannot update another manager's status
  it('manager cannot update another manager\'s status → 403', async () => {
    // Link managerEmp to a User with role=manager (already done in seedTestUsers)
    const res = await request(app)
      .patch(`/api/employees/${users.managerEmployeeId}`)
      .set('Authorization', `Bearer ${users.managerToken}`)
      .send({ status: 'on-leave' });
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/manager/i);
  });

  it('manager cannot terminate employee → 403', async () => {
    const res = await request(app)
      .patch(`/api/employees/${users.employeeRecordId}`)
      .set('Authorization', `Bearer ${users.managerToken}`)
      .send({ status: 'terminated' });
    expect(res.status).toBe(403);
  });

  it('employee can update their own phone number', async () => {
    const res = await request(app)
      .patch(`/api/employees/${users.employeeRecordId}`)
      .set('Authorization', `Bearer ${users.employeeToken}`)
      .send({ phone: '+1-555-9999' });
    expect(res.status).toBe(200);
  });

  it('employee cannot update their own status → 200 but status field ignored (only phone allowed)', async () => {
    const originalRes = await request(app)
      .get(`/api/employees/${users.employeeRecordId}`)
      .set('Authorization', `Bearer ${users.employeeToken}`);
    const originalStatus = originalRes.body.data.status;

    const res = await request(app)
      .patch(`/api/employees/${users.employeeRecordId}`)
      .set('Authorization', `Bearer ${users.employeeToken}`)
      .send({ status: 'terminated' });
    // Either 200 (status field silently ignored) or 403
    if (res.status === 200) {
      expect(res.body.data.status).toBe(originalStatus);
    } else {
      expect(res.status).toBe(403);
    }
  });

  it('unauthenticated request → 401', async () => {
    const res = await request(app)
      .patch(`/api/employees/${users.employeeRecordId}`)
      .send({ designation: 'Hacker' });
    expect(res.status).toBe(401);
  });
});

// ─── Employee access scoping ────────────────────────────────────
describe('GET /api/employees/:id — scope checks', () => {
  // Assigned employees (departmentId set in seed) can view any employee
  it('assigned employee can read another employee\'s profile → 200', async () => {
    const res = await request(app)
      .get(`/api/employees/${users.managerEmployeeId}`)
      .set('Authorization', `Bearer ${users.employeeToken}`);
    expect(res.status).toBe(200);
  });

  it('employee can read their own profile → 200', async () => {
    const res = await request(app)
      .get(`/api/employees/${users.employeeRecordId}`)
      .set('Authorization', `Bearer ${users.employeeToken}`);
    expect(res.status).toBe(200);
  });

  it('manager can read dept employee profile → 200', async () => {
    const res = await request(app)
      .get(`/api/employees/${users.employeeRecordId}`)
      .set('Authorization', `Bearer ${users.managerToken}`);
    expect(res.status).toBe(200);
  });

  it('salary is hidden from non-admin GET /employees/:id', async () => {
    const res = await request(app)
      .get(`/api/employees/${users.employeeRecordId}`)
      .set('Authorization', `Bearer ${users.employeeToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.salary).toBeUndefined();
  });
});

// ─── Employee list scoping ───────────────────────────────────────
describe('GET /api/employees — employee role scoping', () => {
  it('assigned employee sees all employees in the org', async () => {
    // employeeToken user is in Engineering dept (departmentId set)
    const res = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${users.employeeToken}`);
    expect(res.status).toBe(200);
    // Should see admin, manager, and themselves (3 employees seeded)
    expect(res.body.data.employees?.length ?? res.body.data.length).toBe(3);
  });

  it('assigned employee list does not expose salary', async () => {
    const res = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${users.employeeToken}`);
    expect(res.status).toBe(200);
    const employees = res.body.data.employees ?? res.body.data;
    employees.forEach((e: any) => expect(e.salary).toBeUndefined());
  });
});
