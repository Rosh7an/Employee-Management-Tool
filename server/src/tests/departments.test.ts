import request from 'supertest';
import app from '../app';
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
});

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
});

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
