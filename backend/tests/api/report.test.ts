/**
 * tests/api/report.test.ts
 * API tests untuk endpoint laporan & ekspor (AC-13–AC-16: FR-35–FR-42).
 *
 * Catatan: nilai uang pada response JSON wajib string desimal (SDD §5.1).
 */

import request from 'supertest';
import app from '../../src/app.js';
import { prisma } from '../../src/config/db.js';
import { TEST_USER, ensureTestUser } from '../helpers/testUser.js';

let authToken: string;
let productId: string;
let transactionIds: string[] = [];

const startDate = '2020-01-01';
const endDate = '2099-12-31';

const uniqueName = `Produk Report ${Date.now()}`;

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
      nama: uniqueName,
      kategori: 'Report Test',
      hargaJual: '20000',
      hargaModal: '12000',
      stok: 20,
      stokMinimum: 2,
    });

  productId = productRes.body.data.id;

  // Transaksi LUNAS: 2 x 20.000 = 40.000
  const lunasRes = await request(app)
    .post('/api/v1/transactions')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      uangDiterima: 40000,
      items: [{ productId, jumlah: 2 }],
    });
  expect(lunasRes.status).toBe(201);
  transactionIds.push(lunasRes.body.data.id);

  // Transaksi UTANG: 1 x 20.000
  const utangRes = await request(app)
    .post('/api/v1/transactions')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      uangDiterima: 0,
      namaPembeli: 'Pembeli Report',
      noHpPembeli: '081200000000',
      items: [{ productId, jumlah: 1 }],
    });
  expect(utangRes.status).toBe(201);
  transactionIds.push(utangRes.body.data.id);
});

afterAll(async () => {
  await prisma.paymentHistory.deleteMany({
    where: { transactionId: { in: transactionIds } },
  });
  await prisma.detailTransaction.deleteMany({
    where: { transactionId: { in: transactionIds } },
  });
  await prisma.transaction.deleteMany({ where: { id: { in: transactionIds } } });
  await prisma.product.deleteMany({ where: { id: productId } });
});

describe('Report API (AC-13–AC-16: FR-35–FR-42)', () => {
  describe('Auth & validasi periode', () => {
    it('tanpa access token → 401 UNAUTHORIZED', async () => {
      const res = await request(app).get(
        `/api/v1/reports/sales?startDate=${startDate}&endDate=${endDate}`,
      );

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('tanpa startDate/endDate → 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('tanggal tidak valid → 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales?startDate=bukan-tanggal&endDate=2024-12-31')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('startDate setelah endDate → 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales?startDate=2024-12-31&endDate=2024-01-01')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /reports/sales (FR-35, FR-36, AC-13)', () => {
    it('mengembalikan omzet & profit sebagai string desimal', async () => {
      const res = await request(app)
        .get(`/api/v1/reports/sales?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.periode).toEqual({ start: startDate, end: endDate });
      expect(typeof data.omzet).toBe('string');
      expect(typeof data.profit).toBe('string');
      expect(data.omzet).toMatch(/^\d+\.\d{2}$/);
      expect(data.profit).toMatch(/^-?\d+\.\d{2}$/);
      expect(typeof data.transactionCount).toBe('number');
      expect(data.transactions).toBeInstanceOf(Array);
    });

    it('FR-36: profit = Σ(harga jual − modal) × jumlah, dihitung dari snapshot', async () => {
      const res = await request(app)
        .get(`/api/v1/reports/sales?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);

      // 3 unit × (20.000 − 12.000) = 24.000 (transaksi LUNAS 2 unit + UTANG 1 unit)
      const profit = Number(res.body.data.profit);
      expect(profit).toBe(24000);
    });

    it('FR-39: transaksi DIBATALKAN tidak masuk omzet/profit', async () => {
      const before = await request(app)
        .get(`/api/v1/reports/sales?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`);

      const omzetBefore = Number(before.body.data.omzet);
      const countBefore = before.body.data.transactionCount as number;

      // Buat transaksi lalu langsung void
      const createRes = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ uangDiterima: 20000, items: [{ productId, jumlah: 1 }] });
      expect(createRes.status).toBe(201);
      transactionIds.push(createRes.body.data.id);

      const voidRes = await request(app)
        .post(`/api/v1/transactions/${createRes.body.data.id}/void`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(voidRes.status).toBe(200);

      const after = await request(app)
        .get(`/api/v1/reports/sales?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(Number(after.body.data.omzet)).toBe(omzetBefore);
      expect(after.body.data.transactionCount).toBe(countBefore);
    });
  });

  describe('GET /reports/debts (FR-37, AC-14)', () => {
    it('mengembalikan daftar utang dengan riwayat cicilan & sisa saldo string', async () => {
      const res = await request(app)
        .get(`/api/v1/reports/debts?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(typeof data.totalSaldoUtang).toBe('string');
      expect(data.totalSaldoUtang).toMatch(/^\d+\.\d{2}$/);
      expect(typeof data.debtCount).toBe('number');
      expect(data.debts).toBeInstanceOf(Array);

      const debt = (data.debts as Array<{ namaPembeli: string; payments: unknown[]; sisaSaldoUtang: string }>).find(
        (d) => d.namaPembeli === 'Pembeli Report',
      );
      expect(debt).toBeDefined();
      expect(Array.isArray(debt?.payments)).toBe(true);
      expect(typeof debt?.sisaSaldoUtang).toBe('string');
    });
  });

  describe('GET /reports/product-trend (FR-38, AC-16)', () => {
    it('mengembalikan maksimal 5 produk terlaris urut descending', async () => {
      const res = await request(app)
        .get(
          `/api/v1/reports/product-trend?startDate=${startDate}&endDate=${endDate}`,
        )
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const topProducts = res.body.data.topProducts as Array<{
        totalQuantitySold: number;
        totalRevenue: string;
      }>;

      expect(Array.isArray(topProducts)).toBe(true);
      expect(topProducts.length).toBeLessThanOrEqual(5);

      for (const p of topProducts) {
        expect(typeof p.totalRevenue).toBe('string');
        expect(p.totalRevenue).toMatch(/^\d+\.\d{2}$/);
      }

      const quantities = topProducts.map((p) => p.totalQuantitySold);
      const sorted = [...quantities].sort((a, b) => b - a);
      expect(quantities).toEqual(sorted);
    });
  });

  describe('GET /reports/*/export (FR-40–FR-42, AC-15)', () => {
    it('ekspor penjualan format xlsx → 200 dengan content-type Excel', async () => {
      const res = await request(app)
        .get(
          `/api/v1/reports/sales/export?format=xlsx&startDate=${startDate}&endDate=${endDate}`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .buffer(true)
        .parse((res2, cb) => {
          const chunks: Buffer[] = [];
          res2.on('data', (c: Buffer) => chunks.push(c));
          res2.on('end', () => cb(null, Buffer.concat(chunks)));
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.headers['content-disposition']).toContain('laporan-penjualan_');
      expect((res.body as Buffer).length).toBeGreaterThan(0);
    });

    it('ekspor penjualan format pdf → 200 dengan content-type PDF', async () => {
      const res = await request(app)
        .get(
          `/api/v1/reports/sales/export?format=pdf&startDate=${startDate}&endDate=${endDate}`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .buffer(true)
        .parse((res2, cb) => {
          const chunks: Buffer[] = [];
          res2.on('data', (c: Buffer) => chunks.push(c));
          res2.on('end', () => cb(null, Buffer.concat(chunks)));
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain('laporan-penjualan_');
      expect((res.body as Buffer).length).toBeGreaterThan(0);
    });

    it('ekspor utang format xlsx → 200 dengan content-type Excel', async () => {
      const res = await request(app)
        .get(
          `/api/v1/reports/debts/export?format=xlsx&startDate=${startDate}&endDate=${endDate}`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .buffer(true)
        .parse((res2, cb) => {
          const chunks: Buffer[] = [];
          res2.on('data', (c: Buffer) => chunks.push(c));
          res2.on('end', () => cb(null, Buffer.concat(chunks)));
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.headers['content-disposition']).toContain('laporan-utang_');
    });

    it('format tidak dikenal → 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get(
          `/api/v1/reports/sales/export?format=csv&startDate=${startDate}&endDate=${endDate}`,
        )
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
