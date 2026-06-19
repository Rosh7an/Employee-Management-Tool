import request from 'supertest';
import app from '../app';
import { startDB, stopDB, clearDB, seedTestUsers, TestUsers } from './helpers/setup';

let users: TestUsers;

beforeAll(startDB);
afterAll(stopDB);
beforeEach(async () => {
  await clearDB();
  users = await seedTestUsers();
  // Open the Q2 2026 review period — required by the service before any review can be created
  await request(app)
    .post('/api/performance/quarters')
    .set('Authorization', `Bearer ${users.adminToken}`)
    .send({ period: 'Q2 2026', dueDate: '2030-12-31' });
});

describe('POST /api/performance', () => {
  it('admin can create a performance review', async () => {
    const res = await request(app)
      .post('/api/performance')
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({
        employeeId: users.employeeRecordId,
        period: 'Q2 2026',
        rating: 4,
        notes: 'Excellent work this quarter overall.',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.rating).toBe(4);
  });

  it('manager can create a review for employee in their department', async () => {
    const res = await request(app)
      .post('/api/performance')
      .set('Authorization', `Bearer ${users.managerToken}`)
      .send({
        employeeId: users.employeeRecordId,
        period: 'Q2 2026',
        rating: 3,
        notes: 'Good progress made this quarter.',
      });
    expect(res.status).toBe(201);
  });

  it('employee cannot create a performance review', async () => {
    const res = await request(app)
      .post('/api/performance')
      .set('Authorization', `Bearer ${users.employeeToken}`)
      .send({
        employeeId: users.employeeRecordId,
        period: 'Q2 2026',
        rating: 5,
        notes: 'Self review.',
      });
    expect(res.status).toBe(403);
  });

  it('returns 422 for invalid rating', async () => {
    const res = await request(app)
      .post('/api/performance')
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({ employeeId: users.employeeRecordId, period: 'Q2 2026', rating: 6, notes: 'X' });
    expect(res.status).toBe(422);
  });
});

describe('GET /api/performance', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/performance')
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({ employeeId: users.employeeRecordId, period: 'Q2 2026', rating: 4, notes: 'Good performance during this review period.' });
  });

  it('admin sees all reviews', async () => {
    const res = await request(app)
      .get('/api/performance')
      .set('Authorization', `Bearer ${users.adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('employee sees only their own reviews', async () => {
    const res = await request(app)
      .get('/api/performance')
      .set('Authorization', `Bearer ${users.employeeToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((r: any) => {
      const id = r.employeeId._id || r.employeeId;
      expect(id).toBe(users.employeeRecordId);
    });
  });
});
