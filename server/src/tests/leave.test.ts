import request from 'supertest';
import app from '../app';
import Employee from '../models/Employee';
import { startDB, stopDB, clearDB, seedTestUsers, TestUsers } from './helpers/setup';

let users: TestUsers;

// Far-future dates so they remain valid regardless of pinned or real clock
const futureStart = '2030-01-07'; // Monday
const futureEnd = '2030-01-11';   // Friday

// Pin to a Wed 10 AM UTC — inside the time window — so tests pass on any day/hour
const BUSINESS_HOURS = new Date('2026-06-17T10:00:00.000Z');

beforeAll(startDB);
afterAll(stopDB);
beforeEach(async () => {
  jest.useFakeTimers({
    doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
  });
  jest.setSystemTime(BUSINESS_HOURS);
  await clearDB();
  users = await seedTestUsers();
});
afterEach(() => jest.useRealTimers());

describe('POST /api/leave (submit)', () => {
  it('employee can submit a leave request', async () => {
    const res = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${users.employeeToken}`)
      .send({ type: 'casual', startDate: futureStart, endDate: futureEnd, reason: 'Vacation' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');
  });

  it('returns 422 for past start date', async () => {
    const res = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${users.employeeToken}`)
      .send({ type: 'sick', startDate: '2020-01-01', endDate: '2020-01-02', reason: 'Old leave' });
    expect(res.status).toBe(422);
  });

  it('returns 409 for overlapping leave request', async () => {
    await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${users.employeeToken}`)
      .send({ type: 'casual', startDate: futureStart, endDate: futureEnd, reason: 'First' });
    const res = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${users.employeeToken}`)
      .send({ type: 'sick', startDate: futureStart, endDate: futureEnd, reason: 'Overlap' });
    expect(res.status).toBe(409);
  });

  it('blocks leave submission for terminated employees', async () => {
    await Employee.findByIdAndUpdate(users.employeeRecordId, { status: 'terminated' });
    const res = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${users.employeeToken}`)
      .send({ type: 'casual', startDate: futureStart, endDate: futureEnd, reason: 'Test' });
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/leave/:id/review', () => {
  let leaveId: string;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${users.employeeToken}`)
      .send({ type: 'casual', startDate: futureStart, endDate: futureEnd, reason: 'Test' });
    leaveId = res.body.data._id;
  });

  it('manager can approve leave in their department', async () => {
    const res = await request(app)
      .patch(`/api/leave/${leaveId}/review`)
      .set('Authorization', `Bearer ${users.managerToken}`)
      .send({ status: 'approved' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('approved');
  });

  it('employee cannot approve leave', async () => {
    const res = await request(app)
      .patch(`/api/leave/${leaveId}/review`)
      .set('Authorization', `Bearer ${users.employeeToken}`)
      .send({ status: 'approved' });
    expect(res.status).toBe(403);
  });

  it('cannot approve leave for terminated employee', async () => {
    await Employee.findByIdAndUpdate(users.employeeRecordId, { status: 'terminated' });
    const res = await request(app)
      .patch(`/api/leave/${leaveId}/review`)
      .set('Authorization', `Bearer ${users.managerToken}`)
      .send({ status: 'approved' });
    expect(res.status).toBe(403);
  });
});

// ─── GET /api/leave/:id ─────────────────────────────────────────────────────
describe('GET /api/leave/:id', () => {
  let leaveId: string;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${users.employeeToken}`)
      .send({ type: 'casual', startDate: futureStart, endDate: futureEnd, reason: 'Detail test' });
    leaveId = res.body.data._id;
  });

  it('employee can view their own leave request → 200 with populated fields', async () => {
    const res = await request(app)
      .get(`/api/leave/${leaveId}`)
      .set('Authorization', `Bearer ${users.employeeToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(leaveId);
    expect(res.body.data.employeeId).toBeDefined();
    expect(res.body.data.type).toBe('casual');
    expect(res.body.data.status).toBe('pending');
  });

  it('admin can view any leave request → 200', async () => {
    const res = await request(app)
      .get(`/api/leave/${leaveId}`)
      .set('Authorization', `Bearer ${users.adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(leaveId);
  });

  it('manager can view leave for an employee in their department → 200', async () => {
    const res = await request(app)
      .get(`/api/leave/${leaveId}`)
      .set('Authorization', `Bearer ${users.managerToken}`);
    expect(res.status).toBe(200);
  });

  it('employee cannot view another employee\'s leave → 403', async () => {
    // Create a second employee and their leave
    const emp2Res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send({
        name: 'Other Employee',
        email: 'other@test.com',
        designation: 'Designer',
        department: users.departmentId,
        dateOfJoining: new Date().toISOString(),
      });
    const emp2Id = emp2Res.body.data._id;

    // Create leave for emp2 directly via model
    const { default: LeaveRequest } = await import('../models/LeaveRequest');
    const otherLeave = await LeaveRequest.create({
      employeeId: emp2Id,
      type: 'sick',
      startDate: new Date(futureStart),
      endDate: new Date(futureEnd),
      reason: 'Other person leave',
      status: 'pending',
    });

    const res = await request(app)
      .get(`/api/leave/${otherLeave._id}`)
      .set('Authorization', `Bearer ${users.employeeToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent leave ID', async () => {
    const res = await request(app)
      .get('/api/leave/000000000000000000000000')
      .set('Authorization', `Bearer ${users.adminToken}`);
    expect(res.status).toBe(404);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get(`/api/leave/${leaveId}`);
    expect(res.status).toBe(401);
  });
});

describe('GET /api/leave', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${users.employeeToken}`)
      .send({ type: 'casual', startDate: futureStart, endDate: futureEnd, reason: 'Test' });
  });

  it('employee sees only their own leave', async () => {
    const res = await request(app)
      .get('/api/leave')
      .set('Authorization', `Bearer ${users.employeeToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((l: any) => {
      expect(l.employeeId._id || l.employeeId).toBe(users.employeeRecordId);
    });
  });

  it('admin sees all leave requests', async () => {
    const res = await request(app)
      .get('/api/leave')
      .set('Authorization', `Bearer ${users.adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
