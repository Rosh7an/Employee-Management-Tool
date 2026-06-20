import request from 'supertest';
import app from '../app';
import { startDB, stopDB, clearDB, seedTestUsers, TestUsers } from './helpers/setup';

let users: TestUsers;

beforeAll(startDB);
afterAll(stopDB);
beforeEach(async () => {
  await clearDB();
  users = await seedTestUsers();
  await request(app)
    .post('/api/performance/quarters')
    .set('Authorization', `Bearer ${users.adminToken}`)
    .send({ period: 'Q2 2026', dueDate: '2030-12-31' });
});

const VALID_NOTES = 'Excellent performance observed across all areas this quarter.';

// ─── POST /api/performance ───────────────────────────────────────
describe('POST /api/performance', () => {
  it('admin creates a review → 201', async () => {
    const res = await request(app)
      .post('/api/performance')
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({ employeeId: users.employeeRecordId, period: 'Q2 2026', rating: 4, notes: VALID_NOTES });
    expect(res.status).toBe(201);
    expect(res.body.data.rating).toBe(4);
  });

  it('manager creates review for dept employee → 201', async () => {
    const res = await request(app)
      .post('/api/performance')
      .set('Authorization', `Bearer ${users.managerToken}`)
      .send({ employeeId: users.employeeRecordId, period: 'Q2 2026', rating: 3, notes: VALID_NOTES });
    expect(res.status).toBe(201);
  });

  it('employee cannot create a review → 403', async () => {
    const res = await request(app)
      .post('/api/performance')
      .set('Authorization', `Bearer ${users.employeeToken}`)
      .send({ employeeId: users.employeeRecordId, period: 'Q2 2026', rating: 5, notes: VALID_NOTES });
    expect(res.status).toBe(403);
  });

  // RBAC fix #9: manager cannot self-review
  it('manager cannot create a review for themselves → 403', async () => {
    const res = await request(app)
      .post('/api/performance')
      .set('Authorization', `Bearer ${users.managerToken}`)
      .send({ employeeId: users.managerEmployeeId, period: 'Q2 2026', rating: 5, notes: VALID_NOTES });
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/themselves/i);
  });

  it('duplicate review for same employee + period → 409', async () => {
    const body = { employeeId: users.employeeRecordId, period: 'Q2 2026', rating: 4, notes: VALID_NOTES };
    await request(app).post('/api/performance').set('Authorization', `Bearer ${users.adminToken}`).send(body);
    const res = await request(app).post('/api/performance').set('Authorization', `Bearer ${users.adminToken}`).send(body);
    expect(res.status).toBe(409);
  });

  it('returns 422 for rating > 5', async () => {
    const res = await request(app)
      .post('/api/performance')
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({ employeeId: users.employeeRecordId, period: 'Q2 2026', rating: 6, notes: VALID_NOTES });
    expect(res.status).toBe(422);
  });

  it('returns 422 when notes have fewer than 5 words', async () => {
    const res = await request(app)
      .post('/api/performance')
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({ employeeId: users.employeeRecordId, period: 'Q2 2026', rating: 4, notes: 'Too short.' });
    expect(res.status).toBe(422);
    expect(res.body.error.field).toBe('notes');
  });

  it('returns 404 for non-existent employee', async () => {
    const res = await request(app)
      .post('/api/performance')
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({ employeeId: '000000000000000000000000', period: 'Q2 2026', rating: 3, notes: VALID_NOTES });
    expect(res.status).toBe(404);
  });

  it('returns 422 if no quarter exists for the period', async () => {
    const res = await request(app)
      .post('/api/performance')
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({ employeeId: users.employeeRecordId, period: 'Q1 2020', rating: 3, notes: VALID_NOTES });
    expect(res.status).toBe(422);
    expect(res.body.error.field).toBe('period');
  });
});

// ─── GET /api/performance ────────────────────────────────────────
describe('GET /api/performance', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/performance')
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({ employeeId: users.employeeRecordId, period: 'Q2 2026', rating: 4, notes: VALID_NOTES });
  });

  it('admin sees all reviews', async () => {
    const res = await request(app).get('/api/performance').set('Authorization', `Bearer ${users.adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('employee sees only their own reviews', async () => {
    const res = await request(app).get('/api/performance').set('Authorization', `Bearer ${users.employeeToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((r: any) => {
      expect(r.employeeId._id || r.employeeId).toBe(users.employeeRecordId);
    });
  });
});

// ─── GET /api/performance/employee/:empId ────────────────────────
describe('GET /api/performance/employee/:empId', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/performance')
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({ employeeId: users.employeeRecordId, period: 'Q2 2026', rating: 4, notes: VALID_NOTES });
  });

  // RBAC fix #1: was no access control — now properly scoped
  it('employee can view their own reviews', async () => {
    const res = await request(app)
      .get(`/api/performance/employee/${users.employeeRecordId}`)
      .set('Authorization', `Bearer ${users.employeeToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('employee cannot view another employee\'s reviews → 403', async () => {
    const res = await request(app)
      .get(`/api/performance/employee/${users.managerEmployeeId}`)
      .set('Authorization', `Bearer ${users.employeeToken}`);
    expect(res.status).toBe(403);
  });

  it('manager can view dept employee reviews', async () => {
    const res = await request(app)
      .get(`/api/performance/employee/${users.employeeRecordId}`)
      .set('Authorization', `Bearer ${users.managerToken}`);
    expect(res.status).toBe(200);
  });

  it('manager cannot view reviews for employee outside their dept → 403', async () => {
    // adminEmp has no department — outside manager's scope
    const res = await request(app)
      .get(`/api/performance/employee/${users.adminEmployeeId}`)
      .set('Authorization', `Bearer ${users.managerToken}`);
    expect(res.status).toBe(403);
  });

  it('admin can view any employee reviews', async () => {
    const res = await request(app)
      .get(`/api/performance/employee/${users.employeeRecordId}`)
      .set('Authorization', `Bearer ${users.adminToken}`);
    expect(res.status).toBe(200);
  });

  it('unauthenticated request → 401', async () => {
    const res = await request(app).get(`/api/performance/employee/${users.employeeRecordId}`);
    expect(res.status).toBe(401);
  });
});
