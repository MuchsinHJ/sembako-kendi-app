/**
 * tests/api/dashboard.test.ts
 * API tests untuk endpoint dashboard (AC-17: FR-43–FR-45).
 */

import request from 'supertest';
import { Prisma } from '@prisma/client';
import app from '../../src/app.js';
import { prisma } from '../../src/config/db.js';
import { TEST_USER, ensureTestUser } from '../helpers/testUser.js';

let authToken: string;
let lowStockProductId: string;
let debtTransactionId: string;

const uniqueName = `Produk Dashboard ${Date.now()}`;

beforeAll(async () => {
  await ensureTestUser();

  const loginRes = await request(app).post('/api/v1/auth/login').send({
    email: TEST_USER.email,
    password: TEST_USER.password,
  });

  authToken = loginRes.body.data.accessToken;

  // Produk low-stock (stok <= stokMinimum)
  const lowStockRes = await request(app)
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      nama: uniqueName,
      kategori: 'Dashboard Test',
      hargaJual: '10000',
      hargaModal: '6000',
      stok: 1,
      stokMinimum: 5,
    });

  lowStockProductId = lowStockRes.body.data.id;

  // Transaksi UTANG agar totalSaldoUtang > 0
  const debtRes = await request(app)
    .post('/api/v1/transactions')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      uangDiterima: 0,
      namaPembeli: 'Pembeli Dashboard',
      items: [{ productId: lowStockProductId, jumlah: 1 }],
    });

  debtTransactionId = debtRes.body.data.id;
});

afterAll(async () => {
  await prisma.paymentHistory.deleteMany({
    where: { transactionId: debtTransactionId },
  });
  await prisma.detailTransaction.deleteMany({
    where: { transactionId: debtTransactionId },
  });
  await prisma.transaction.deleteMany({ where: { id: debtTransactionId } });
  await prisma.product.deleteMany({ where: { id: lowStockProductId } });
});

describe('Dashboard API (AC-17: FR-43–FR-45)', () => {
  it('tanpa access token → 401 UNAUTHORIZED', async () => {
    const res = await request(app).get('/api/v1/dashboard/summary');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('FR-43: mengembalikan omzet & profit hari ini dan bulan berjalan sebagai string desimal', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { hariIni, bulanBerjalan } = res.body.data;

    expect(hariIni).toBeDefined();
    expect(bulanBerjalan).toBeDefined();
    expect(typeof hariIni.omzet).toBe('string');
    expect(typeof hariIni.profit).toBe('string');
    expect(typeof hariIni.transactionCount).toBe('number');
    expect(typeof bulanBerjalan.omzet).toBe('string');
    expect(typeof bulanBerjalan.profit).toBe('string');

    // Nilai uang memakai 2 angka desimal (SDD §5.1)
    expect(hariIni.omzet).toMatch(/^\d+\.\d{2}$/);
    expect(hariIni.profit).toMatch(/^-?\d+\.\d{2}$/);
  });

  it('FR-44: produk low-stock muncul di daftar (stok <= stokMinimum)', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.produkLowStock).toBeInstanceOf(Array);

    const found = (res.body.data.produkLowStock as Array<{ id: string }>).find(
      (p) => p.id === lowStockProductId,
    );
    expect(found).toBeDefined();
  });

  it('FR-45: total saldo utang belum lunas dikirim sebagai string desimal dan > 0', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.data.totalSaldoUtang).toBe('string');
    expect(res.body.data.totalSaldoUtang).toMatch(/^\d+\.\d{2}$/);
    expect(Number(res.body.data.totalSaldoUtang)).toBeGreaterThan(0);
  });

  it('parameter query yang tidak didukung diabaikan (SDD §5.7: tanpa parameter periode)', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/summary?period=bulanan&startDate=2020-01-01')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('transaksi void tidak dihitung pada omzet hari ini (FR-39)', async () => {
    const before = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${authToken}`);

    const omzetBefore = new Prisma.Decimal(before.body.data.hariIni.omzet);

    const voidRes = await request(app)
      .post(`/api/v1/transactions/${debtTransactionId}/void`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(voidRes.status).toBe(200);

    const after = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${authToken}`);

    const omzetAfter = new Prisma.Decimal(after.body.data.hariIni.omzet);

    expect(omzetAfter.lt(omzetBefore)).toBe(true);
  });
});
