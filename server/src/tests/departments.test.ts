import request from 'supertest';
import app from '../app';
import Employee from '../models/Employee';
import { startDB, stopDB, clearDB, seedTestUsers, TestUsers } from './helpers/setup';

let users: TestUsers;

beforeAll(startDB);
afterAll(stopDB);
beforeEach(async () => { await clearDB(); users = await seedTestUsers(); });

describe('GET /api/departments', () => {
  it('any authenticated user can view departments', async () => {
    const res = await request(app)
      .get('/api/departments')
      .set('Authorization', `Bearer ${users.employeeToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/departments');
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/departments/:id ────────────────────────────────────────────────
describe('GET /api/departments/:id', () => {
  it('returns department with employees, headcount, and metrics', async () => {
    const res = await request(app)
      .get(`/api/departments/${users.departmentId}`)
      .set('Authorization', `Bearer ${users.adminToken}`);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.name).toBe('Engineering');
    expect(typeof d.headcount).toBe('number');
    expect(d.headcount).toBeGreaterThan(0);
    expect(Array.isArray(d.employees)).toBe(true);
    expect(typeof d.ongoingProjects).toBe('number');
    expect(typeof d.progression).toBe('number');
  });

  it('employees array excludes terminated staff', async () => {
    await Employee.findByIdAndUpdate(users.employeeRecordId, { status: 'terminated' });
    const res = await request(app)
      .get(`/api/departments/${users.departmentId}`)
      .set('Authorization', `Bearer ${users.adminToken}`);
    expect(res.status).toBe(200);
    const ids = res.body.data.employees.map((e: any) => e._id);
    expect(ids).not.toContain(users.employeeRecordId);
  });

  it('headcount matches non-terminated employee count', async () => {
    const res = await request(app)
      .get(`/api/departments/${users.departmentId}`)
      .set('Authorization', `Bearer ${users.adminToken}`);
    const { headcount, employees } = res.body.data;
    expect(headcount).toBe(employees.length);
  });

  it('progression is 0 when no milestones exist', async () => {
    const res = await request(app)
      .get(`/api/departments/${users.departmentId}`)
      .set('Authorization', `Bearer ${users.adminToken}`);
    expect(res.body.data.progression).toBe(0);
    expect(res.body.data.ongoingProjects).toBe(0);
  });

  it('any authenticated user can view a department detail', async () => {
    const res = await request(app)
      .get(`/api/departments/${users.departmentId}`)
      .set('Authorization', `Bearer ${users.employeeToken}`);
    expect(res.status).toBe(200);
  });

  it('returns 404 for non-existent department', async () => {
    const res = await request(app)
      .get('/api/departments/000000000000000000000000')
      .set('Authorization', `Bearer ${users.adminToken}`);
    expect(res.status).toBe(404);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .get(`/api/departments/${users.departmentId}`);
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/departments ───────────────────────────────────────────────────
describe('POST /api/departments', () => {
  it('admin can create a department', async () => {
    const res = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({ name: 'Finance' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Finance');
  });

  it('non-admin cannot create a department', async () => {
    const res = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${users.managerToken}`)
      .send({ name: 'Finance' });
    expect(res.status).toBe(403);
  });

  it('rejects duplicate department name (case-insensitive)', async () => {
    const res = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({ name: 'engineering' }); // seed already has "Engineering"
    expect(res.status).toBe(409);
  });
});

// ─── PATCH /api/departments/:id — manager cascade ────────────────────────────
describe('PATCH /api/departments/:id — manager cascade', () => {
  it('admin can update department name', async () => {
    const res = await request(app)
      .patch(`/api/departments/${users.departmentId}`)
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({ name: 'Engineering & Product' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Engineering & Product');
  });

  it('changing the manager cascades managerId to all active employees in the dept', async () => {
    // Create a new employee to act as the incoming manager
    const newMgrRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({
        name: 'New Manager',
        email: 'newmgr@test.com',
        designation: 'Director of Eng',
        department: users.departmentId,
        dateOfJoining: new Date().toISOString(),
      });
    const newMgrId = newMgrRes.body.data._id;

    await request(app)
      .patch(`/api/departments/${users.departmentId}`)
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({ managerId: newMgrId, description: 'Engineering department' });

    // regularEmp (not the new manager) should now report to newMgr
    const updated = await Employee.findById(users.employeeRecordId).lean();
    expect(updated?.managerId?.toString()).toBe(newMgrId);
  });

  it('new manager is not assigned as their own managerId', async () => {
    const newMgrRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({
        name: 'Self Manager',
        email: 'selfmgr@test.com',
        designation: 'Head of Dept',
        department: users.departmentId,
        dateOfJoining: new Date().toISOString(),
      });
    const newMgrId = newMgrRes.body.data._id;

    await request(app)
      .patch(`/api/departments/${users.departmentId}`)
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({ managerId: newMgrId, description: 'Engineering department' });

    const mgr = await Employee.findById(newMgrId).lean();
    expect(mgr?.managerId?.toString()).not.toBe(newMgrId);
  });

  it('terminated employees are NOT updated when manager changes', async () => {
    await Employee.findByIdAndUpdate(users.employeeRecordId, { status: 'terminated' });

    const newMgrRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({
        name: 'Another Manager',
        email: 'anothermgr@test.com',
        designation: 'Lead',
        department: users.departmentId,
        dateOfJoining: new Date().toISOString(),
      });
    const newMgrId = newMgrRes.body.data._id;

    const originalManagerId = (await Employee.findById(users.employeeRecordId).lean())?.managerId;

    await request(app)
      .patch(`/api/departments/${users.departmentId}`)
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({ managerId: newMgrId, description: 'Engineering department' });

    const terminated = await Employee.findById(users.employeeRecordId).lean();
    // managerId should remain unchanged for terminated employee
    expect(terminated?.managerId?.toString()).toBe(originalManagerId?.toString() ?? undefined);
  });

  it('updating only name does not cascade managerId', async () => {
    const before = await Employee.findById(users.employeeRecordId).lean();

    await request(app)
      .patch(`/api/departments/${users.departmentId}`)
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({ name: 'Renamed Dept' });

    const after = await Employee.findById(users.employeeRecordId).lean();
    expect(after?.managerId?.toString()).toBe(before?.managerId?.toString());
  });

  it('non-admin cannot update a department', async () => {
    const res = await request(app)
      .patch(`/api/departments/${users.departmentId}`)
      .set('Authorization', `Bearer ${users.managerToken}`)
      .send({ name: 'Hacked' });
    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent department', async () => {
    const res = await request(app)
      .patch('/api/departments/000000000000000000000000')
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/departments/:id ─────────────────────────────────────────────
describe('DELETE /api/departments/:id', () => {
  it('blocks deletion when department has employees', async () => {
    const res = await request(app)
      .delete(`/api/departments/${users.departmentId}`)
      .set('Authorization', `Bearer ${users.adminToken}`);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/Reassign/);
  });

  it('allows deletion of empty department', async () => {
    const res = await request(app)
      .delete(`/api/departments/${users.otherDepartmentId}`)
      .set('Authorization', `Bearer ${users.adminToken}`);
    expect(res.status).toBe(200);
  });
});
