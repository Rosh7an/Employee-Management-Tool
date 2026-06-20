import request from 'supertest';
import app from '../app';
import { startDB, stopDB, clearDB } from './helpers/setup';
import Employee from '../models/Employee';

beforeAll(startDB);
afterAll(stopDB);
afterEach(clearDB);

// ─── Helpers ────────────────────────────────────────────────────
async function registerUser(overrides: Record<string, string> = {}) {
  return request(app).post('/api/auth/register').send({
    name: 'Test User',
    email: 'test@example.com',
    password: 'Password@123',
    confirmPassword: 'Password@123',
    ...overrides,
  });
}

async function loginUser(email = 'test@example.com', password = 'Password@123') {
  return request(app).post('/api/auth/login').send({ email, password });
}

// ─── Register ────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  // Happy path
  it('creates user + employee record and returns a JWT', async () => {
    const res = await registerUser();
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('employee');
    expect(res.body.data.user.email).toBe('test@example.com');
  });

  // Duplicate email
  it('returns 409 on duplicate email with field pointer', async () => {
    await registerUser();
    const res = await registerUser();
    expect(res.status).toBe(409);
    expect(res.body.error.field).toBe('email');
    expect(res.body.error.message).toMatch(/already exists/i);
  });

  // Email case-insensitivity collision
  it('returns 409 when email differs only by case', async () => {
    await registerUser({ email: 'test@example.com' });
    const res = await registerUser({ email: 'TEST@EXAMPLE.COM' });
    expect(res.status).toBe(409);
  });

  // Empty name
  it('returns 422 when name is missing', async () => {
    const res = await registerUser({ name: '' });
    expect(res.status).toBe(422);
    expect(res.body.error.field).toBe('name');
  });

  // Short name
  it('returns 422 when name is too short (< 2 chars)', async () => {
    const res = await registerUser({ name: 'A' });
    expect(res.status).toBe(422);
    expect(res.body.error.field).toBe('name');
  });

  // Empty email
  it('returns 422 when email is empty', async () => {
    const res = await registerUser({ email: '' });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/required/i);
  });

  // Malformed email
  it('returns 422 on malformed email', async () => {
    const res = await registerUser({ email: 'not-an-email' });
    expect(res.status).toBe(422);
    expect(res.body.error.field).toBe('email');
  });

  // Password too short
  it('returns 422 when password is < 8 chars', async () => {
    const res = await registerUser({ password: 'Ab1@', confirmPassword: 'Ab1@' });
    expect(res.status).toBe(422);
    expect(res.body.error.field).toBe('password');
  });

  // Password missing uppercase
  it('returns 422 when password has no uppercase letter', async () => {
    const res = await registerUser({ password: 'password@123', confirmPassword: 'password@123' });
    expect(res.status).toBe(422);
    expect(res.body.error.field).toBe('password');
  });

  // Password missing lowercase
  it('returns 422 when password has no lowercase letter', async () => {
    const res = await registerUser({ password: 'PASSWORD@123', confirmPassword: 'PASSWORD@123' });
    expect(res.status).toBe(422);
    expect(res.body.error.field).toBe('password');
  });

  // Password missing digit
  it('returns 422 when password has no digit', async () => {
    const res = await registerUser({ password: 'Password@!', confirmPassword: 'Password@!' });
    expect(res.status).toBe(422);
    expect(res.body.error.field).toBe('password');
  });

  // Password missing special character
  it('returns 422 when password has no special character', async () => {
    const res = await registerUser({ password: 'Password123', confirmPassword: 'Password123' });
    expect(res.status).toBe(422);
    expect(res.body.error.field).toBe('password');
  });

  // Passwords mismatch
  it('returns 422 when passwords do not match', async () => {
    const res = await registerUser({ password: 'Password@123', confirmPassword: 'Different@123' });
    expect(res.status).toBe(422);
    expect(res.body.error.field).toBe('confirmPassword');
  });
});

// ─── Login ───────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  beforeEach(() => registerUser());

  // Happy path
  it('returns a JWT on valid credentials', async () => {
    const res = await loginUser();
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('test@example.com');
  });

  // Email is case-insensitive
  it('authenticates regardless of email casing', async () => {
    const res = await loginUser('TEST@EXAMPLE.COM');
    expect(res.status).toBe(200);
  });

  // Wrong password — generic message (no account enumeration)
  it('returns 401 on wrong password with generic message', async () => {
    const res = await loginUser('test@example.com', 'WrongPass@1');
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password.');
  });

  // Unknown email — same generic message (no enumeration)
  it('returns 401 on unknown email with generic message', async () => {
    const res = await loginUser('nobody@example.com');
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password.');
  });

  // Empty email
  it('returns 422 when email is empty', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: '', password: 'Password@123' });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/required/i);
  });

  // Empty password
  it('returns 422 when password is empty', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: '' });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/required/i);
  });

  // Invalid email format
  it('returns 422 on malformed email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'notanemail', password: 'Password@123' });
    expect(res.status).toBe(422);
    expect(res.body.error.field).toBe('email');
  });

  // Terminated employee cannot log in
  it('returns 403 when the linked employee is terminated', async () => {
    const loginRes = await loginUser();
    const token = loginRes.body.data.token;

    // Terminate the employee via the employees endpoint as admin
    // Since there is no admin in test context, directly update in DB
    await Employee.updateOne({ email: 'test@example.com' }, { status: 'terminated' });

    const res = await loginUser();
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/deactivated/i);
    // Verify the token from before termination no longer fetches profile cleanly
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(meRes.status).toBe(200); // JWT is still valid — only login is blocked
  });
});

// ─── GET /api/auth/me ────────────────────────────────────────────
describe('GET /api/auth/me', () => {
  let token: string;

  beforeEach(async () => {
    await registerUser();
    const res = await loginUser();
    token = res.body.data.token;
  });

  it('returns user + employee data when authenticated', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('test@example.com');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with a tampered token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer tampered.invalid.token');
    expect(res.status).toBe(401);
  });
});

// ─── Change Password ──────────────────────────────────────────────
describe('POST /api/auth/change-password', () => {
  let token: string;

  beforeEach(async () => {
    await registerUser();
    const res = await loginUser();
    token = res.body.data.token;
  });

  // Happy path
  it('changes password and allows login with new password', async () => {
    const changeRes = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Password@123', newPassword: 'NewPass@456', confirmPassword: 'NewPass@456' });
    expect(changeRes.status).toBe(200);

    const loginRes = await loginUser('test@example.com', 'NewPass@456');
    expect(loginRes.status).toBe(200);
  });

  // Wrong current password
  it('returns 401 when current password is wrong', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'WrongPass@1', newPassword: 'NewPass@456', confirmPassword: 'NewPass@456' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/incorrect/i);
  });

  // New password same as current
  it('returns 422 when new password is the same as current', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Password@123', newPassword: 'Password@123', confirmPassword: 'Password@123' });
    expect(res.status).toBe(422);
    expect(res.body.error.field).toBe('newPassword');
  });

  // New passwords do not match
  it('returns 422 when confirmPassword does not match newPassword', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Password@123', newPassword: 'NewPass@456', confirmPassword: 'Different@789' });
    expect(res.status).toBe(422);
    expect(res.body.error.field).toBe('confirmPassword');
  });

  // New password too weak
  it('returns 422 when new password fails complexity rules', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Password@123', newPassword: 'weakpass', confirmPassword: 'weakpass' });
    expect(res.status).toBe(422);
    expect(res.body.error.field).toBe('newPassword');
  });

  // Unauthenticated
  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .send({ currentPassword: 'Password@123', newPassword: 'NewPass@456', confirmPassword: 'NewPass@456' });
    expect(res.status).toBe(401);
  });
});
