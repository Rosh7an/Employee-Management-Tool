import request from 'supertest';
import app from '../app';
import AuditLog from '../models/AuditLog';
import { startDB, stopDB, clearDB, seedTestUsers, TestUsers } from './helpers/setup';
import mongoose from 'mongoose';

let users: TestUsers;

beforeAll(startDB);
afterAll(stopDB);
beforeEach(async () => { await clearDB(); users = await seedTestUsers(); });

async function seedAuditLog(actorId: string) {
  return AuditLog.create({
    actorId: new mongoose.Types.ObjectId(actorId),
    actorRole: 'admin',
    action: 'employee.create',
    targetId: new mongoose.Types.ObjectId().toString(),
    targetModel: 'Employee',
    diff: { name: 'Test' },
    ip: '127.0.0.1',
    timestamp: new Date(),
  });
}

describe('GET /api/audit', () => {
  it('admin can view audit logs', async () => {
    await seedAuditLog(users.adminEmployeeId);
    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${users.adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('manager is forbidden from audit logs', async () => {
    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${users.managerToken}`);
    expect(res.status).toBe(403);
  });

  it('employee is forbidden from audit logs', async () => {
    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${users.employeeToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/audit');
    expect(res.status).toBe(401);
  });
});
