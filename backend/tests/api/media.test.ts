/**
 * tests/api/media.test.ts
 * API tests untuk upload/hapus foto produk.
 *
 * Label: "Perluasan FR-07/FR-09: upload foto produk" (SDD §8.5 — belum ada ID AC
 * resmi di SRS, direkomendasikan menjadi AC-18 pada revisi berikutnya).
 *
 * Catatan: skenario upload sukses sengaja tidak diuji di sini karena memerlukan
 * koneksi ke Cloudflare R2. Yang diuji adalah seluruh jalur validasi yang
 * berhenti SEBELUM menyentuh object storage, plus otorisasi.
 */

import request from 'supertest';
import app from '../../src/app.js';
import { prisma } from '../../src/config/db.js';
import { TEST_USER, ensureTestUser } from '../helpers/testUser.js';

let authToken: string;
let productId: string;

beforeAll(async () => {
  await ensureTestUser();

  const loginRes = await request(app).post('/api/v1/auth/login').send({
    email: TEST_USER.email,
    password: TEST_USER.password,
  });

  authToken = loginRes.body.data.accessToken;

  const productRes = await request(app)
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      nama: 'Produk Media Test',
      kategori: 'Test',
      hargaJual: '10000',
      hargaModal: '5000',
      stok: 10,
      stokMinimum: 2,
    });

  productId = productRes.body.data.id;
});

afterAll(async () => {
  await prisma.product.deleteMany({ where: { id: productId } });
});

describe('Perluasan FR-07/FR-09: upload foto produk', () => {
  describe('POST /products/:id/photo', () => {
    it('tanpa access token → 401 UNAUTHORIZED', async () => {
      const res = await request(app)
        .post(`/api/v1/products/${productId}/photo`)
        .attach('photo', Buffer.from('bukan gambar'), 'test.png');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('ID produk bukan UUID → 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/products/bukan-uuid/photo')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', Buffer.from('bukan gambar'), 'test.png');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('tanpa file → 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post(`/api/v1/products/${productId}/photo`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('tipe file tidak didukung (.txt) → 415 INVALID_FILE_TYPE', async () => {
      const res = await request(app)
        .post(`/api/v1/products/${productId}/photo`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', Buffer.from('plain text'), {
          filename: 'catatan.txt',
          contentType: 'text/plain',
        });

      expect(res.status).toBe(415);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
    });

    it('produk tidak ditemukan → 404 NOT_FOUND (validasi file lolos)', async () => {
      const res = await request(app)
        .post('/api/v1/products/00000000-0000-4000-8000-000000000000/photo')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', Buffer.from('\x89PNG\r\n\x1a\nbukan-gambar-valid'), {
          filename: 'gambar.png',
          contentType: 'image/png',
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('MIME gambar tapi isi corrupt → 400 VALIDATION_ERROR (Sharp menolak)', async () => {
      const res = await request(app)
        .post(`/api/v1/products/${productId}/photo`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', Buffer.from('ini bukan data gambar sama sekali'), {
          filename: 'palsu.png',
          contentType: 'image/png',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('gambar');
    });
  });

  describe('DELETE /products/:id/photo', () => {
    it('produk belum punya foto → 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .delete(`/api/v1/products/${productId}/photo`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('produk tidak ditemukan → 404 NOT_FOUND', async () => {
      const res = await request(app)
        .delete('/api/v1/products/00000000-0000-4000-8000-000000000000/photo')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
