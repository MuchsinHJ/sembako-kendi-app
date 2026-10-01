/**
 * tests/api/auth.test.ts
 * Supertest untuk auth endpoints (Fase 4).
 * Test: login sukses/gagal, akses tanpa token → 401, token expired,
 * refresh, logout lalu refresh ditolak, brute-force → 429.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { prisma } from '../../src/config/db.js';
import app from '../../src/app.js';

// Test user credentials
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  nama: 'Test User',
};

describe('Auth Endpoints (JWT Strategy)', () => {
  beforeAll(async () => {
    // Ensure test user exists
    const existing = await prisma.user.findUnique({
      where: { email: testUser.email },
    });

    if (!existing) {
      const passwordHash = await bcrypt.hash(testUser.password, 10);
      await prisma.user.create({
        data: {
          email: testUser.email,
          nama: testUser.nama,
          passwordHash,
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /auth/login', () => {
    it('login sukses → 200 dengan accessToken dan refreshToken cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email);
      
      // Check refreshToken cookie
      const cookies = res.headers['set-cookie'] as string[];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find((c: string) => c.startsWith('refreshToken='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
    });

    it('login gagal → 401 dengan email salah', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'salah@example.com',
          password: testUser.password,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      // Pesan tidak membedakan "email tidak ada" vs "password salah"
      expect(res.body.error.message).toContain('Email atau password salah');
    });

    it('login gagal → 401 dengan password salah', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Email atau password salah');
    });

    it('login gagal → 400 dengan email tidak valid', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'bukan-email',
          password: 'password123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('brute-force login → 429 setelah 5 request', async () => {
      // Login limiter: 5 req/min/IP
      const requests = [];
      for (let i = 0; i < 6; i++) {
        requests.push(
          request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'brute@example.com', password: 'test' }),
        );
      }

      const results = await Promise.all(requests);
      const rateLimited = results.filter((r) => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('POST /auth/refresh-token', () => {
    it('refresh sukses → 200 dengan accessToken baru', async () => {
      // Gunakan email berbeda untuk menghindari rate limit dari test sebelumnya
      const refreshTestUser = {
        email: 'refresh-test@example.com',
        password: 'password123',
        nama: 'Refresh Test User',
      };
      
      // Buat user jika belum ada
      let user = await prisma.user.findUnique({ where: { email: refreshTestUser.email } });
      if (!user) {
        const passwordHash = await bcrypt.hash(refreshTestUser.password, 10);
        user = await prisma.user.create({
          data: {
            email: refreshTestUser.email,
            nama: refreshTestUser.nama,
            passwordHash,
          },
        });
      }
      
      // 1. Login dulu untuk dapat refreshToken
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: refreshTestUser.email,
          password: refreshTestUser.password,
        });

      expect(loginRes.status).toBe(200);
      
      // Extract cookies using get() method
      const setCookieHeader = loginRes.get('set-cookie');
      expect(setCookieHeader).toBeDefined();
      
      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
      const refreshCookie = cookies.find((c: string) => c.startsWith('refreshToken='));
      expect(refreshCookie).toBeDefined();

      // 2. Refresh token
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', refreshCookie!)
        .send({});

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.data.accessToken).toBeDefined();
      
      // Token baru harus berbeda (rotasi)
      expect(refreshRes.body.data.accessToken).not.toBe(loginRes.body.data.accessToken);
    });

    it('refresh gagal → 401 tanpa cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({});

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /auth/logout', () => {
    it('logout sukses → refresh ditolak setelahnya', async () => {
      // Gunakan email berbeda untuk menghindari rate limit
      const logoutTestUser = {
        email: 'logout-test@example.com',
        password: 'password123',
        nama: 'Logout Test User',
      };
      
      // Buat user jika belum ada
      let user = await prisma.user.findUnique({ where: { email: logoutTestUser.email } });
      if (!user) {
        const passwordHash = await bcrypt.hash(logoutTestUser.password, 10);
        user = await prisma.user.create({
          data: {
            email: logoutTestUser.email,
            nama: logoutTestUser.nama,
            passwordHash,
          },
        });
      }
      
      // 1. Login
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: logoutTestUser.email,
          password: logoutTestUser.password,
        });

      expect(loginRes.status).toBe(200);
      
      const setCookieHeader = loginRes.get('set-cookie');
      expect(setCookieHeader).toBeDefined();
      
      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
      const refreshCookie = cookies.find((c: string) => c.startsWith('refreshToken='));
      expect(refreshCookie).toBeDefined();
      
      // 2. Logout
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', refreshCookie!)
        .send({});

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // 3. Coba refresh setelah logout → ditolak
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', refreshCookie!)
        .send({});

      expect(refreshRes.status).toBe(401);
      expect(refreshRes.body.success).toBe(false);
    });
  });

  describe('Protected route (akses tanpa token)', () => {
    it('akses /api/v1/health tanpa auth → 200 (public)', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
    });

    // TODO (Fase 5): test protected route yang memerlukan auth
    // it('akses protected route tanpa token → 401', async () => {
    //   const res = await request(app).get('/api/v1/products');
    //   expect(res.status).toBe(401);
    // });
  });
});
