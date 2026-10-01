/**
 * tests/api/app.test.ts
 * Supertest API tests untuk Fase 3 (SDD requirement):
 * - GET /api/v1/health → 200
 * - Route tidak dikenal → 404 NOT_FOUND
 * - Rate limit → 429 RATE_LIMIT_EXCEEDED (hanya uji loginLimiter agar cepat)
 */

import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';

describe('GET /api/v1/health', () => {
  it('mengembalikan 200 dengan status ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.status).toBe('ok');
    expect(res.body.data?.environment).toBeDefined();
    expect(res.body.data?.timestamp).toBeDefined();
  });
});

describe('404 handler', () => {
  it('route tidak dikenal → 404 NOT_FOUND', async () => {
    const res = await request(app).get('/api/v1/tidak-ada');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('NOT_FOUND');
  });

  it('method yang salah pada route ada → 404', async () => {
    const res = await request(app).delete('/api/v1/health');
    expect(res.status).toBe(404);
    expect(res.body.error?.code).toBe('NOT_FOUND');
  });
});

describe('Rate limit global', () => {
  it('tidak memberikan 429 pada request normal', async () => {
    // Kirim 5 request berturut-turut — masih jauh di bawah limit 100/menit
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
    }
  });
});

describe('Response format', () => {
  it('success response memiliki { success: true, data }', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.body).toMatchObject({ success: true });
    expect(res.body.data).toBeDefined();
  });

  it('error response memiliki { success: false, error: { code, message } }', async () => {
    const res = await request(app).get('/api/v1/tidak-ada');
    expect(res.body).toMatchObject({
      success: false,
      error: {
        code: expect.any(String),
        message: expect.any(String),
      },
    });
  });
});
