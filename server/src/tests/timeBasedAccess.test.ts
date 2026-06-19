import request from 'supertest';
import app from '../app';
import { startDB, stopDB, clearDB, seedTestUsers, TestUsers } from './helpers/setup';

// Far-future dates — always valid regardless of what clock is pinned below
const FUTURE_START = '2030-01-07'; // Monday
const FUTURE_END = '2030-01-11';   // Friday

const LEAVE_BODY = { type: 'casual', startDate: FUTURE_START, endDate: FUTURE_END, reason: 'Holiday' };

// ─── Reference timestamps (all UTC) ────────────────────────────────────────
const WED_10AM  = new Date('2026-06-17T10:00:00.000Z'); // Wednesday  10:00 — inside window
const MON_12PM  = new Date('2026-06-15T12:00:00.000Z'); // Monday     12:00 — inside window
const WED_8AM   = new Date('2026-06-17T08:00:00.000Z'); // Wednesday  08:00 — start boundary (inclusive)
const WED_759AM = new Date('2026-06-17T07:59:00.000Z'); // Wednesday  07:59 — before window opens
const WED_20PM  = new Date('2026-06-17T20:00:00.000Z'); // Wednesday  20:00 — end boundary (exclusive)
const WED_23PM  = new Date('2026-06-17T23:00:00.000Z'); // Wednesday  23:00 — after window closes
const SAT_10AM  = new Date('2026-06-20T10:00:00.000Z'); // Saturday   10:00 — weekend
const SUN_12PM  = new Date('2026-06-21T12:00:00.000Z'); // Sunday     12:00 — weekend

function pinTime(d: Date) {
  jest.useFakeTimers({
    // Only mock Date — leave all timers intact so async DB ops are unaffected
    doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
  });
  jest.setSystemTime(d);
}

let users: TestUsers;

beforeAll(startDB);
afterAll(stopDB);
beforeEach(async () => { await clearDB(); users = await seedTestUsers(); });
afterEach(() => jest.useRealTimers());

// ═══════════════════════════════════════════════════════════════════════════
// Allowed windows
// ═══════════════════════════════════════════════════════════════════════════
describe('Time-window: allowed access', () => {
  it('employee can submit leave — Wednesday 10:00 AM UTC', async () => {
    pinTime(WED_10AM);
    const res = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${users.employeeToken}`)
      .send(LEAVE_BODY);
    expect(res.status).toBe(201);
  });

  it('employee can submit leave — Monday noon UTC', async () => {
    pinTime(MON_12PM);
    const res = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${users.employeeToken}`)
      .send({ ...LEAVE_BODY, type: 'sick' });
    expect(res.status).toBe(201);
  });

  it('employee can submit leave — exactly at startHour 08:00 UTC (inclusive)', async () => {
    pinTime(WED_8AM);
    const res = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${users.employeeToken}`)
      .send({ ...LEAVE_BODY, type: 'earned' });
    expect(res.status).toBe(201);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Blocked windows
// ═══════════════════════════════════════════════════════════════════════════
describe('Time-window: blocked access', () => {
  it('blocks employee — Wednesday 11:00 PM UTC (after hours)', async () => {
    pinTime(WED_23PM);
    const res = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${users.employeeToken}`)
      .send(LEAVE_BODY);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('TIME_RESTRICTED');
  });

  it('blocks employee — Saturday 10:00 AM UTC (weekend)', async () => {
    pinTime(SAT_10AM);
    const res = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${users.employeeToken}`)
      .send(LEAVE_BODY);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('TIME_RESTRICTED');
  });

  it('blocks employee — Sunday noon UTC (weekend)', async () => {
    pinTime(SUN_12PM);
    const res = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${users.employeeToken}`)
      .send(LEAVE_BODY);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('TIME_RESTRICTED');
  });

  it('blocks employee — exactly at endHour 20:00 UTC (exclusive boundary)', async () => {
    pinTime(WED_20PM);
    const res = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${users.employeeToken}`)
      .send(LEAVE_BODY);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('TIME_RESTRICTED');
  });

  it('blocks employee — 07:59 AM UTC (one minute before window opens)', async () => {
    pinTime(WED_759AM);
    const res = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${users.employeeToken}`)
      .send(LEAVE_BODY);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('TIME_RESTRICTED');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Role bypass
// ═══════════════════════════════════════════════════════════════════════════
describe('Time-window: role bypass', () => {
  it('admin bypasses restriction — Saturday 10:00 AM UTC', async () => {
    pinTime(SAT_10AM);
    const res = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${users.adminToken}`)
      .send(LEAVE_BODY);
    expect(res.status).toBe(201);
  });

  it('manager bypasses restriction — Saturday 10:00 AM UTC', async () => {
    pinTime(SAT_10AM);
    const res = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${users.managerToken}`)
      .send({ ...LEAVE_BODY, type: 'earned' });
    expect(res.status).toBe(201);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Response shape
// ═══════════════════════════════════════════════════════════════════════════
describe('Time-window: error response shape', () => {
  it('returns a well-formed error body with TIME_RESTRICTED code', async () => {
    pinTime(SAT_10AM);
    const res = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${users.employeeToken}`)
      .send(LEAVE_BODY);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('TIME_RESTRICTED');
    expect(typeof res.body.error.message).toBe('string');
    expect(res.body.error.message.length).toBeGreaterThan(0);
  });
});
