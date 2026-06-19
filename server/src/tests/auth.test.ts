import request from 'supertest';
import app from '../app';
import { startDB, stopDB, clearDB } from './helpers/setup';

beforeAll(startDB);
afterAll(stopDB);
afterEach(clearDB);

describe('POST /api/auth/register', () => {
  it('creates a user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password@123',
      confirmPassword: 'Password@123',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('employee');
  });

  it('returns 409 on duplicate email', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'User One',
      email: 'dup@example.com',
      password: 'Password@123',
      confirmPassword: 'Password@123',
    });
    const res = await request(app).post('/api/auth/register').send({
      name: 'User Two',
      email: 'dup@example.com',
      password: 'Password@123',
      confirmPassword: 'Password@123',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.field).toBe('email');
  });

  it('returns 422 when passwords do not match', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test',
      email: 'x@example.com',
      password: 'Password@123',
      confirmPassword: 'WrongPass',
    });
    expect(res.status).toBe(422);
  });

  it('returns 422 when password is too short', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test',
      email: 'short@example.com',
      password: 'abc',
      confirmPassword: 'abc',
    });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Login User',
      email: 'login@example.com',
      password: 'Password@123',
      confirmPassword: 'Password@123',
    });
  });

  it('returns a token on valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com',
      password: 'Password@123',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  it('returns 401 on wrong password — generic message (no account enumeration)', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com',
      password: 'WrongPassword',
    });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password.');
  });

  it('returns 401 on unknown email — same generic message', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'Password@123',
    });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password.');
  });
});

describe('GET /api/auth/me', () => {
  it('returns user profile when authenticated', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Me User',
      email: 'me@example.com',
      password: 'Password@123',
      confirmPassword: 'Password@123',
    });
    const token = reg.body.data.token;
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('me@example.com');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with tampered token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer tampered.token.value');
    expect(res.status).toBe(401);
  });
});
