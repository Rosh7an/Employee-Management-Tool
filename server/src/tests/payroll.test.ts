import request from 'supertest';
import app from '../app';
import Payroll from '../models/Payroll';
import Employee from '../models/Employee';
import { startDB, stopDB, clearDB, seedTestUsers, TestUsers } from './helpers/setup';

let users: TestUsers;

beforeAll(startDB);
afterAll(stopDB);
beforeEach(async () => { await clearDB(); users = await seedTestUsers(); });

async function seedPayroll(employeeId: string, period = 'June 2026') {
  return Payroll.create({
    employeeId,
    payPeriod: period,
    base: 8000,
    bonuses: 500,
    deductions: 300,
    netPay: 8200,
    currency: 'USD',
  });
}

// ─── GET /api/payroll ────────────────────────────────────────────
describe('GET /api/payroll', () => {
  it('admin sees all payroll records', async () => {
    await seedPayroll(users.employeeRecordId);
    await seedPayroll(users.managerEmployeeId);
    const res = await request(app).get('/api/payroll').set('Authorization', `Bearer ${users.adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
  });

  it('employee sees only their own payroll', async () => {
    await seedPayroll(users.employeeRecordId);
    await seedPayroll(users.managerEmployeeId);
    const res = await request(app).get('/api/payroll').set('Authorization', `Bearer ${users.employeeToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((p: any) => {
      expect(p.employeeId._id || p.employeeId).toBe(users.employeeRecordId);
    });
  });

  it('manager sees payroll only for their department', async () => {
    await seedPayroll(users.employeeRecordId);
    await seedPayroll(users.adminEmployeeId);
    const res = await request(app).get('/api/payroll').set('Authorization', `Bearer ${users.managerToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((p: any) => {
      const id = p.employeeId._id || p.employeeId;
      expect([users.employeeRecordId, users.managerEmployeeId]).toContain(id);
    });
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/payroll');
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/payroll/employee/:empId ───────────────────────────
describe('GET /api/payroll/employee/:empId', () => {
  beforeEach(async () => { await seedPayroll(users.employeeRecordId); });

  it('employee can view their own payroll by empId', async () => {
    const res = await request(app)
      .get(`/api/payroll/employee/${users.employeeRecordId}`)
      .set('Authorization', `Bearer ${users.employeeToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('employee cannot view another employee\'s payroll → 403', async () => {
    const res = await request(app)
      .get(`/api/payroll/employee/${users.managerEmployeeId}`)
      .set('Authorization', `Bearer ${users.employeeToken}`);
    expect(res.status).toBe(403);
  });

  it('manager can view dept employee payroll by empId', async () => {
    const res = await request(app)
      .get(`/api/payroll/employee/${users.employeeRecordId}`)
      .set('Authorization', `Bearer ${users.managerToken}`);
    expect(res.status).toBe(200);
  });

  it('manager cannot view payroll for employee outside their dept → 403', async () => {
    await seedPayroll(users.adminEmployeeId);
    const res = await request(app)
      .get(`/api/payroll/employee/${users.adminEmployeeId}`)
      .set('Authorization', `Bearer ${users.managerToken}`);
    expect(res.status).toBe(403);
  });

  it('admin can view any employee payroll by empId', async () => {
    const res = await request(app)
      .get(`/api/payroll/employee/${users.employeeRecordId}`)
      .set('Authorization', `Bearer ${users.adminToken}`);
    expect(res.status).toBe(200);
  });
});

// ─── POST /api/payroll ───────────────────────────────────────────
describe('POST /api/payroll', () => {
  it('admin creates a payroll record → 201', async () => {
    const res = await request(app)
      .post('/api/payroll')
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({ employeeId: users.employeeRecordId, payPeriod: 'July 2026', base: 8000, bonuses: 500, deductions: 300 });
    expect(res.status).toBe(201);
    expect(res.body.data.netPay).toBe(8200);
  });

  it('non-admin cannot create payroll → 403', async () => {
    const res = await request(app)
      .post('/api/payroll')
      .set('Authorization', `Bearer ${users.managerToken}`)
      .send({ employeeId: users.employeeRecordId, payPeriod: 'July 2026', base: 8000 });
    expect(res.status).toBe(403);
  });

  it('duplicate payroll for same employee + period → 409', async () => {
    const body = { employeeId: users.employeeRecordId, payPeriod: 'July 2026', base: 8000, bonuses: 0, deductions: 0 };
    await request(app).post('/api/payroll').set('Authorization', `Bearer ${users.adminToken}`).send(body);
    const res = await request(app).post('/api/payroll').set('Authorization', `Bearer ${users.adminToken}`).send(body);
    expect(res.status).toBe(409);
  });

  // RBAC fix #5: terminated employee cannot receive payroll
  it('returns 400 for terminated employee → 400', async () => {
    await Employee.findByIdAndUpdate(users.employeeRecordId, { status: 'terminated' });
    const res = await request(app)
      .post('/api/payroll')
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({ employeeId: users.employeeRecordId, payPeriod: 'July 2026', base: 8000, bonuses: 0, deductions: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/terminated/i);
  });

  // RBAC fix #10: negative net pay guard
  it('returns 400 when deductions exceed base + bonuses → 400', async () => {
    const res = await request(app)
      .post('/api/payroll')
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({ employeeId: users.employeeRecordId, payPeriod: 'July 2026', base: 1000, bonuses: 0, deductions: 2000 });
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('deductions');
  });

  it('returns 404 for non-existent employee', async () => {
    const res = await request(app)
      .post('/api/payroll')
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({ employeeId: '000000000000000000000000', payPeriod: 'July 2026', base: 8000, bonuses: 0, deductions: 0 });
    expect(res.status).toBe(404);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/payroll').send({ employeeId: users.employeeRecordId, payPeriod: 'July 2026', base: 8000 });
    expect(res.status).toBe(401);
  });
});
