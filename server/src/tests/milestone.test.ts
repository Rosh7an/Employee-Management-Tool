import request from 'supertest';
import app from '../app';
import { startDB, stopDB, clearDB, seedTestUsers, TestUsers } from './helpers/setup';

let users: TestUsers;

beforeAll(startDB);
afterAll(stopDB);
beforeEach(async () => { await clearDB(); users = await seedTestUsers(); });

const futureDate = '2099-01-01';

async function createMilestone(token: string, overrides: Record<string, unknown> = {}) {
  return request(app)
    .post('/api/milestones')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Test Milestone', targetDate: futureDate, status: 'not-started', ...overrides });
}

// ─── POST /api/milestones ────────────────────────────────────────
describe('POST /api/milestones', () => {
  it('any authenticated user can create a milestone → 201', async () => {
    const res = await createMilestone(users.employeeToken);
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Test Milestone');
  });

  it('manager can create a milestone → 201', async () => {
    const res = await createMilestone(users.managerToken);
    expect(res.status).toBe(201);
  });

  it('admin can create a milestone → 201', async () => {
    const res = await createMilestone(users.adminToken);
    expect(res.status).toBe(201);
  });

  it('returns 422 when title is missing', async () => {
    const res = await createMilestone(users.employeeToken, { title: '' });
    expect(res.status).toBe(422);
  });

  // RBAC fix #14 (confirmed already implemented): targetDate in the past → 422
  it('returns 422 when targetDate is in the past', async () => {
    const res = await createMilestone(users.employeeToken, { targetDate: '2000-01-01' });
    expect(res.status).toBe(422);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/milestones')
      .send({ title: 'X', targetDate: futureDate });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/milestones ─────────────────────────────────────────
describe('GET /api/milestones — scoping', () => {
  beforeEach(async () => {
    await createMilestone(users.employeeToken, { title: 'Employee Milestone' });
    await createMilestone(users.managerToken, { title: 'Manager Milestone' });
    await createMilestone(users.adminToken, { title: 'Admin Milestone' });
  });

  it('admin sees all milestones', async () => {
    const res = await request(app).get('/api/milestones').set('Authorization', `Bearer ${users.adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(3);
  });

  it('employee sees only their own milestones', async () => {
    const res = await request(app).get('/api/milestones').set('Authorization', `Bearer ${users.employeeToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe('Employee Milestone');
  });

  // RBAC fix #12: manager should see own + dept employee milestones
  it('manager sees own + dept employee milestones', async () => {
    const res = await request(app).get('/api/milestones').set('Authorization', `Bearer ${users.managerToken}`);
    expect(res.status).toBe(200);
    const titles = res.body.data.map((m: any) => m.title);
    expect(titles).toContain('Manager Milestone');
    expect(titles).toContain('Employee Milestone'); // dept employee
    expect(titles).not.toContain('Admin Milestone'); // admin is in no dept
  });
});

// ─── PATCH /api/milestones/:id ───────────────────────────────────
describe('PATCH /api/milestones/:id', () => {
  it('owner can update their milestone', async () => {
    const created = await createMilestone(users.employeeToken, { title: 'Original' });
    const id = created.body.data._id;
    const res = await request(app)
      .patch(`/api/milestones/${id}`)
      .set('Authorization', `Bearer ${users.employeeToken}`)
      .send({ title: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated');
  });

  it('non-owner cannot update another\'s milestone → 403', async () => {
    const created = await createMilestone(users.employeeToken);
    const id = created.body.data._id;
    const res = await request(app)
      .patch(`/api/milestones/${id}`)
      .set('Authorization', `Bearer ${users.managerToken}`)
      .send({ title: 'Stolen' });
    expect(res.status).toBe(403);
  });

  it('admin can update any milestone', async () => {
    const created = await createMilestone(users.employeeToken);
    const id = created.body.data._id;
    const res = await request(app)
      .patch(`/api/milestones/${id}`)
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({ title: 'Admin Override' });
    expect(res.status).toBe(200);
  });
});

// ─── DELETE /api/milestones/:id ──────────────────────────────────
describe('DELETE /api/milestones/:id', () => {
  it('owner can delete a not-started milestone → 200', async () => {
    const created = await createMilestone(users.employeeToken);
    const id = created.body.data._id;
    const res = await request(app)
      .delete(`/api/milestones/${id}`)
      .set('Authorization', `Bearer ${users.employeeToken}`);
    expect(res.status).toBe(200);
  });

  it('cannot delete an in-progress milestone → 409', async () => {
    const created = await createMilestone(users.employeeToken, { status: 'not-started' });
    const id = created.body.data._id;
    await request(app)
      .patch(`/api/milestones/${id}`)
      .set('Authorization', `Bearer ${users.employeeToken}`)
      .send({ status: 'in-progress' });
    const res = await request(app)
      .delete(`/api/milestones/${id}`)
      .set('Authorization', `Bearer ${users.employeeToken}`);
    expect(res.status).toBe(409);
  });

  it('non-owner cannot delete → 403', async () => {
    const created = await createMilestone(users.employeeToken);
    const id = created.body.data._id;
    const res = await request(app)
      .delete(`/api/milestones/${id}`)
      .set('Authorization', `Bearer ${users.managerToken}`);
    expect(res.status).toBe(403);
  });
});
