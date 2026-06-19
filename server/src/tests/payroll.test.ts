import request from 'supertest';
import app from '../app';
import Payroll from '../models/Payroll';
import { startDB, stopDB, clearDB, seedTestUsers, TestUsers } from './helpers/setup';

let users: TestUsers;

beforeAll(startDB);
afterAll(stopDB);
beforeEach(async () => { await clearDB(); users = await seedTestUsers(); });

async function seedPayroll(employeeId: string) {
  return Payroll.create({
    employeeId,
    payPeriod: 'June 2026',
    base: 8000,
    bonuses: 500,
    deductions: 300,
    netPay: 8200,
    currency: 'USD',
  });
}

describe('GET /api/payroll', () => {
  it('admin sees all payroll records', async () => {
    await seedPayroll(users.employeeRecordId);
    await seedPayroll(users.managerEmployeeId);
    const res = await request(app)
      .get('/api/payroll')
      .set('Authorization', `Bearer ${users.adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
  });

  it('employee sees only their own payroll', async () => {
    await seedPayroll(users.employeeRecordId);
    await seedPayroll(users.managerEmployeeId);
    const res = await request(app)
      .get('/api/payroll')
      .set('Authorization', `Bearer ${users.employeeToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((p: any) => {
      expect(p.employeeId._id || p.employeeId).toBe(users.employeeRecordId);
    });
  });

  it('manager sees payroll only for their department', async () => {
    await seedPayroll(users.employeeRecordId);
    await seedPayroll(users.adminEmployeeId);
    const res = await request(app)
      .get('/api/payroll')
      .set('Authorization', `Bearer ${users.managerToken}`);
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

describe('POST /api/payroll', () => {
  it('admin can create a payroll record', async () => {
    const res = await request(app)
      .post('/api/payroll')
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({
        employeeId: users.employeeRecordId,
        payPeriod: 'July 2026',
        base: 8000,
        bonuses: 500,
        deductions: 300,
        netPay: 8200,
      });
    expect(res.status).toBe(201);
  });

  it('non-admin cannot create payroll', async () => {
    const res = await request(app)
      .post('/api/payroll')
      .set('Authorization', `Bearer ${users.managerToken}`)
      .send({ employeeId: users.employeeRecordId, payPeriod: 'July 2026', base: 8000, netPay: 8000 });
    expect(res.status).toBe(403);
  });
});
