/**
 * tests/api/product.test.ts
 * API tests untuk product endpoints (AC-01, AC-02, AC-03)
 */

import request from 'supertest';
import { Prisma } from '@prisma/client';
import app from '../../src/app.js';
import { prisma } from '../../src/config/db.js';

let authToken: string;
let testUserId: string;

beforeAll(async () => {
  // Login untuk mendapat token
  const loginRes = await request(app).post('/api/v1/auth/login').send({
    email: 'test@example.com',
    password: 'password123',
  });

  authToken = loginRes.body.data.accessToken;
  testUserId = loginRes.body.data.user.id;
});

describe('Product API (AC-01, AC-02, AC-03)', () => {
  describe('AC-01: CRUD Produk', () => {
    let productId: string;

    it('POST /products - Membuat produk baru', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nama: 'Beras Premium 5kg',
          kategori: 'Bahan Pokok',
          hargaJual: '75000',
          hargaModal: '65000',
          stok: 50,
          stokMinimum: 10,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nama).toBe('Beras Premium 5kg');
      expect(res.body.data.hargaJual).toBe('75000');
      expect(res.body.data.stok).toBe(50);
      expect(res.body.data.id).toBeDefined();

      productId = res.body.data.id;
    });

    it('GET /products/:id - Membaca detail produk', async () => {
      const res = await request(app)
        .get(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(productId);
      expect(res.body.data.nama).toBe('Beras Premium 5kg');
    });

    it('GET /products - List produk dengan pagination', async () => {
      const res = await request(app)
        .get('/api/v1/products?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.data).toBeInstanceOf(Array);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(10);
    });

    it('GET /products - Filter by kategori', async () => {
      const res = await request(app)
        .get('/api/v1/products?kategori=Bahan Pokok')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.data.length).toBeGreaterThan(0);
      expect(res.body.data.data[0].kategori).toBe('Bahan Pokok');
    });

    it('GET /products - Search by nama', async () => {
      const res = await request(app)
        .get('/api/v1/products?search=Beras')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.data.length).toBeGreaterThan(0);
      expect(res.body.data.data[0].nama).toContain('Beras');
    });

    it('PUT /products/:id - Mengubah produk (tidak mengubah stok)', async () => {
      const res = await request(app)
        .put(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nama: 'Beras Premium 5kg (Updated)',
          hargaJual: '77000',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.nama).toBe('Beras Premium 5kg (Updated)');
      expect(res.body.data.hargaJual).toBe('77000');
      expect(res.body.data.stok).toBe(50); // Stok tidak berubah
    });

    it('PATCH /products/:id/status - Mengubah status produk', async () => {
      const res = await request(app)
        .patch(`/api/v1/products/${productId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'NONAKTIF' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('NONAKTIF');
    });

    it('DELETE /products/:id - Menghapus produk tanpa transaksi', async () => {
      const res = await request(app)
        .delete(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verifikasi benar-benar terhapus
      const checkRes = await request(app)
        .get(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(checkRes.status).toBe(404);
    });

    it('BR-03: Harga jual <= 0 ditolak', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nama: 'Produk Invalid',
          kategori: 'Test',
          hargaJual: '0',
          hargaModal: '5000',
          stok: 10,
          stokMinimum: 5,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('BR-12: Produk dengan transaksi tidak bisa dihapus', async () => {
      // Buat produk
      const createRes = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nama: 'Produk Dengan Transaksi',
          kategori: 'Test',
          hargaJual: '10000',
          hargaModal: '5000',
          stok: 100,
          stokMinimum: 10,
        });

      const prodId = createRes.body.data.id;

      // Buat transaksi dengan produk ini
      await prisma.transaction.create({
        data: {
          dibuatOlehId: testUserId,
          total: new Prisma.Decimal('10000'),
          statusTransaksi: 'AKTIF',
          statusPembayaran: 'LUNAS',
          items: {
            create: {
              productId: prodId,
              namaProdukSnapshot: 'Produk Dengan Transaksi',
              hargaJualSnapshot: new Prisma.Decimal('10000'),
              hargaModalSnapshot: new Prisma.Decimal('5000'),
              jumlah: 1,
              subtotal: new Prisma.Decimal('10000'),
            },
          },
        },
      });

      // Coba hapus
      const deleteRes = await request(app)
        .delete(`/api/v1/products/${prodId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteRes.status).toBe(422);
      expect(deleteRes.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
      expect(deleteRes.body.error.message).toContain('riwayat transaksi');

      // Cleanup manual - delete in correct FK order
      const txToDelete = await prisma.transaction.findMany({ where: { dibuatOlehId: testUserId } });
      for (const tx of txToDelete) {
        await prisma.detailTransaction.deleteMany({ where: { transactionId: tx.id } });
      }
      await prisma.transaction.deleteMany({ where: { dibuatOlehId: testUserId } });
      await prisma.product.delete({ where: { id: prodId } });
    });
  });

  describe('AC-02: Ambang Batas Stok', () => {
    let productId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nama: 'Produk Low Stock',
          kategori: 'Test',
          hargaJual: '10000',
          hargaModal: '5000',
          stok: 5,
          stokMinimum: 10,
        });

      productId = res.body.data.id;
    });

    afterAll(async () => {
      await prisma.product.delete({ where: { id: productId } }).catch(() => {});
    });

    it('PATCH /products/:id/stock-threshold - Mengatur stok minimum', async () => {
      const res = await request(app)
        .patch(`/api/v1/products/${productId}/stock-threshold`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ stokMinimum: 15 });

      expect(res.status).toBe(200);
      expect(res.body.data.stokMinimum).toBe(15);
    });

    it('GET /products/low-stock - Menampilkan produk dengan stok <= stokMinimum', async () => {
      const res = await request(app)
        .get('/api/v1/products/low-stock')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);

      // Produk kita seharusnya muncul (stok=5, stokMinimum=15)
      const found = res.body.data.find((p: any) => p.id === productId);
      expect(found).toBeDefined();
    });
  });

  describe('AC-03: Penyesuaian Stok Manual', () => {
    let productId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nama: 'Produk Adjustment',
          kategori: 'Test',
          hargaJual: '10000',
          hargaModal: '5000',
          stok: 50,
          stokMinimum: 10,
        });

      productId = res.body.data.id;
    });

    afterAll(async () => {
      await prisma.stockAdjustment.deleteMany({ where: { productId } });
      await prisma.product.delete({ where: { id: productId } }).catch(() => {});
    });

    it('PATCH /products/:id/stock-adjustment - Menambah stok dengan alasan', async () => {
      const res = await request(app)
        .patch(`/api/v1/products/${productId}/stock-adjustment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          delta: 20,
          alasan: 'Stok opname: ditemukan barang di gudang belakang',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.stok).toBe(70); // 50 + 20
    });

    it('PATCH /products/:id/stock-adjustment - Mengurangi stok', async () => {
      const res = await request(app)
        .patch(`/api/v1/products/${productId}/stock-adjustment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          delta: -10,
          alasan: 'Koreksi: barang rusak',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.stok).toBe(60); // 70 - 10
    });

    it('BR-04: Adjustment yang membuat stok negatif ditolak', async () => {
      const res = await request(app)
        .patch(`/api/v1/products/${productId}/stock-adjustment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          delta: -100, // 60 - 100 = -40 (invalid)
          alasan: 'Test invalid',
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
      expect(res.body.error.message).toContain('tidak boleh negatif');
    });

    it('Alasan wajib diisi untuk audit', async () => {
      const res = await request(app)
        .patch(`/api/v1/products/${productId}/stock-adjustment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          delta: 5,
          alasan: '', // Kosong
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Authorization', () => {
    it('Request tanpa token ditolak', async () => {
      const res = await request(app).get('/api/v1/products');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
