import request from 'supertest';
import app from '../app';
import LeaveRequest from '../models/LeaveRequest';
import { startDB, stopDB, clearDB, seedTestUsers, TestUsers } from './helpers/setup';

let users: TestUsers;

beforeAll(startDB);
afterAll(stopDB);
beforeEach(async () => { await clearDB(); users = await seedTestUsers(); });

describe('GET /api/employees', () => {
  it('admin sees all employees', async () => {
    const res = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${users.adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('manager sees only their department employees', async () => {
    const res = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${users.managerToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((emp: any) => {
      expect(emp.department._id || emp.department).toBe(users.departmentId);
    });
  });

  it('assigned employee sees all employees in the org', async () => {
    const res = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${users.employeeToken}`);
    expect(res.status).toBe(200);
    // Seeded employees: admin, manager, employee (3 total)
    const employees = res.body.data.employees ?? res.body.data;
    expect(employees.length).toBe(3);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/employees');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/employees', () => {
  it('admin can create an employee', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({
        name: 'New Employee',
        email: 'newemployee@test.com',
        designation: 'Developer',
        employmentType: 'full-time',
        dateOfJoining: new Date().toISOString(),
      });
    expect(res.status).toBe(201);
    expect(res.body.data.employeeId).toMatch(/^EMP-/);
  });

  it('returns 409 on duplicate email', async () => {
    const payload = {
      name: 'Dup Employee',
      email: 'employee@test.com',
      designation: 'Developer',
      employmentType: 'full-time',
      dateOfJoining: new Date().toISOString(),
    };
    await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send(payload);
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send(payload);
    expect(res.status).toBe(409);
    expect(res.body.error.field).toBe('email');
  });

  it('manager cannot create an employee', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${users.managerToken}`)
      .send({ name: 'X', email: 'x@test.com', designation: 'X', dateOfJoining: new Date().toISOString() });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/employees/:id', () => {
  it('admin can view any employee', async () => {
    const res = await request(app)
      .get(`/api/employees/${users.employeeRecordId}`)
      .set('Authorization', `Bearer ${users.adminToken}`);
    expect(res.status).toBe(200);
  });

  it('assigned employee can view another employee\'s record', async () => {
    const res = await request(app)
      .get(`/api/employees/${users.managerEmployeeId}`)
      .set('Authorization', `Bearer ${users.employeeToken}`);
    expect(res.status).toBe(200);
  });

  it('salary is stripped for non-admin', async () => {
    const res = await request(app)
      .get(`/api/employees/${users.employeeRecordId}`)
      .set('Authorization', `Bearer ${users.employeeToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.salary).toBeUndefined();
  });

  it('salary is included for admin', async () => {
    const res = await request(app)
      .get(`/api/employees/${users.employeeRecordId}`)
      .set('Authorization', `Bearer ${users.adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.salary).toBeDefined();
  });
});

describe('DELETE /api/employees/:id (terminate)', () => {
  it('admin can terminate an employee', async () => {
    const res = await request(app)
      .delete(`/api/employees/${users.employeeRecordId}`)
      .set('Authorization', `Bearer ${users.adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('terminated');
  });

  it('auto-rejects pending leaves when employee is terminated', async () => {
    await LeaveRequest.create({
      employeeId: users.employeeRecordId,
      type: 'casual',
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 86400000 * 2),
      reason: 'Test leave',
      status: 'pending',
    });

    await request(app)
      .delete(`/api/employees/${users.employeeRecordId}`)
      .set('Authorization', `Bearer ${users.adminToken}`);

    const pending = await LeaveRequest.findOne({
      employeeId: users.employeeRecordId,
      status: 'pending',
    });
    expect(pending).toBeNull();
  });

  it('manager cannot terminate an employee', async () => {
    const res = await request(app)
      .delete(`/api/employees/${users.employeeRecordId}`)
      .set('Authorization', `Bearer ${users.managerToken}`);
    expect(res.status).toBe(403);
  });
});
