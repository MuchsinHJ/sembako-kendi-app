/**
 * tests/api/debt.test.ts
 * API tests untuk debt endpoints (AC-10, AC-11, AC-12)
 * GET /debts, GET /debts/:transactionId/payments, POST /debts/:transactionId/payments
 */

import request from 'supertest';
import app from '../../src/app.js';
import { prisma } from '../../src/config/db.js';
import { TEST_USER, ensureTestUser } from '../helpers/testUser.js';

let authToken: string;
let testUserId: string;
let testProductId: string;
let testTransactionUtangId: string;

beforeAll(async () => {
  // Pastikan user seed tersedia (tidak bergantung pada urutan suite lain)
  await ensureTestUser();

  // Login untuk mendapat token
  const loginRes = await request(app).post('/api/v1/auth/login').send({
    email: TEST_USER.email,
    password: TEST_USER.password,
  });

  authToken = loginRes.body.data.accessToken;
  testUserId = loginRes.body.data.user.id;

  // Create test product
  const productRes = await request(app)
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      nama: 'Test Product for Debt',
      kategori: 'Test',
      hargaJual: '10000',
      hargaModal: '5000',
      stok: 1000, // High stock to prevent depletion
      stokMinimum: 10,
    });

  testProductId = productRes.body.data.id;

  // Create UTANG transaction
  const transactionRes = await request(app)
    .post('/api/v1/transactions')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      uangDiterima: 0,
      namaPembeli: 'Test Customer Debt',
      noHpPembeli: '081234567890',
      items: [
        {
          productId: testProductId,
          jumlah: 10,
        },
      ],
    });

  testTransactionUtangId = transactionRes.body.data.id;
});

afterAll(async () => {
  // Cleanup
  await prisma.paymentHistory.deleteMany({
    where: { dicatatOlehId: testUserId },
  });

  await prisma.detailTransaction.deleteMany({
    where: {
      transaction: {
        dibuatOlehId: testUserId,
      },
    },
  });

  await prisma.transaction.deleteMany({
    where: { dibuatOlehId: testUserId },
  });

  await prisma.product.deleteMany({
    where: { id: testProductId },
  });
});

describe('Debt API (AC-10, AC-11, AC-12)', () => {
  // ─── GET /debts ─────────────────────────────────────────────────────────────

  describe('GET /debts - List Debts', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/v1/debts');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return paginated list of UTANG transactions', async () => {
      const res = await request(app)
        .get('/api/v1/debts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('pagination');
      expect(res.body.data.pagination).toHaveProperty('page', 1);
      expect(res.body.data.pagination).toHaveProperty('limit', 20);
      expect(res.body.data.pagination).toHaveProperty('total');
      expect(res.body.data.pagination).toHaveProperty('totalPages');

      // Verify all are UTANG and AKTIF
      expect(Array.isArray(res.body.data.data)).toBe(true);
      res.body.data.data.forEach(
        (transaction: {
          statusPembayaran: string;
          statusTransaksi: string;
          sisaSaldoUtang: string | null;
        }) => {
          expect(transaction.statusPembayaran).toBe('UTANG');
          expect(transaction.statusTransaksi).toBe('AKTIF');
          expect(transaction.sisaSaldoUtang).not.toBeNull();
          expect(parseFloat(transaction.sisaSaldoUtang ?? '0')).toBeGreaterThan(0);
        },
      );
    });

    it('should support pagination with page and limit query params', async () => {
      const res = await request(app)
        .get('/api/v1/debts?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(5);
    });

    it('should return 400 for invalid pagination params', async () => {
      const res = await request(app)
        .get('/api/v1/debts?page=0')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should include transaction items and payment history', async () => {
      const res = await request(app)
        .get('/api/v1/debts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      const firstTransaction = res.body.data.data[0];
      if (firstTransaction) {
        expect(firstTransaction).toHaveProperty('items');
        expect(firstTransaction).toHaveProperty('payments');
        expect(Array.isArray(firstTransaction.items)).toBe(true);
        expect(Array.isArray(firstTransaction.payments)).toBe(true);
      }
    });
  });

  // ─── GET /debts/:transactionId/payments ─────────────────────────────────────

  describe('GET /debts/:transactionId/payments - Get Payment History', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get(
        `/api/v1/debts/${testTransactionUtangId}/payments`,
      );

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return empty array for UTANG with no payments', async () => {
      const res = await request(app)
        .get(`/api/v1/debts/${testTransactionUtangId}/payments`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
    });

    it('should return payment history after payments recorded', async () => {
      // Record a payment first
      await request(app)
        .post(`/api/v1/debts/${testTransactionUtangId}/payments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jumlahBayar: 30000 });

      const res = await request(app)
        .get(`/api/v1/debts/${testTransactionUtangId}/payments`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0]).toHaveProperty('jumlahBayar', '30000');
      expect(res.body.data[0]).toHaveProperty('saldoSetelahBayar', '70000');
      expect(res.body.data[0]).toHaveProperty('dicatatOleh');
      expect(res.body.data[0]).toHaveProperty('tanggalBayar');
    });

    it('should return 404 for non-existent transaction', async () => {
      const res = await request(app)
        .get('/api/v1/debts/00000000-0000-0000-0000-000000000000/payments')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid UUID format', async () => {
      const res = await request(app)
        .get('/api/v1/debts/invalid-uuid/payments')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return payment history for LUNAS transaction (that was originally UTANG)', async () => {
      // Create LUNAS transaction that was originally UTANG by paying it off
      const utangRes = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          uangDiterima: 0,
          namaPembeli: 'Customer',
          noHpPembeli: '081234567890',
          items: [
            {
              productId: testProductId,
              jumlah: 2,
            },
          ],
        });

      const utangId = utangRes.body.data.id;

      // Pay it off fully
      await request(app)
        .post(`/api/v1/debts/${utangId}/payments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jumlahBayar: 20000 });

      // Should be able to view payment history even though it's now LUNAS
      const res = await request(app)
        .get(`/api/v1/debts/${utangId}/payments`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
    });

    it('should return 400 for cash LUNAS transaction (never UTANG)', async () => {
      // Create cash LUNAS transaction
      const lunasRes = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          uangDiterima: 20000,
          items: [
            {
              productId: testProductId,
              jumlah: 2,
            },
          ],
        });

      const lunasId = lunasRes.body.data.id;

      const res = await request(app)
        .get(`/api/v1/debts/${lunasId}/payments`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/transaksi tunai/i);
    });
  });

  // ─── POST /debts/:transactionId/payments ────────────────────────────────────

  describe('POST /debts/:transactionId/payments - Record Payment', () => {
    let freshTransactionId: string;

    // Create fresh UTANG transaction before each test
    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          uangDiterima: 0,
          namaPembeli: 'Fresh Customer',
          noHpPembeli: '081234567890',
          items: [
            {
              productId: testProductId,
              jumlah: 10, // 10 * 10000 = Rp100.000
            },
          ],
        });

      freshTransactionId = res.body.data.id;
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post(`/api/v1/debts/${freshTransactionId}/payments`)
        .send({ jumlahBayar: 50000 });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('AC-10: should reduce sisaSaldoUtang after partial payment (Rp100.000 → Rp60.000)', async () => {
      const res = await request(app)
        .post(`/api/v1/debts/${freshTransactionId}/payments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jumlahBayar: 40000 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sisaSaldoUtang).toBe('60000');
      expect(res.body.data.statusPembayaran).toBe('UTANG');
      expect(res.body.data.payments.length).toBe(1);
      expect(res.body.data.payments[0].jumlahBayar).toBe('40000');
      expect(res.body.data.payments[0].saldoSetelahBayar).toBe('60000');
    });

    it('AC-11: should set statusPembayaran to LUNAS when fully paid', async () => {
      const res = await request(app)
        .post(`/api/v1/debts/${freshTransactionId}/payments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jumlahBayar: 100000 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sisaSaldoUtang).toBe('0');
      expect(res.body.data.statusPembayaran).toBe('LUNAS');
      expect(res.body.data.payments.length).toBe(1);
      expect(res.body.data.payments[0].saldoSetelahBayar).toBe('0');
    });

    it('AC-12: should return 400 when payment exceeds balance (overpayment)', async () => {
      const res = await request(app)
        .post(`/api/v1/debts/${freshTransactionId}/payments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jumlahBayar: 150000 });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
      expect(res.body.error.message).toMatch(/melebihi sisa saldo utang/i);

      // Verify balance unchanged
      const checkRes = await request(app)
        .get(`/api/v1/transactions/${freshTransactionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(checkRes.body.data.sisaSaldoUtang).toBe('100000');
    });

    it('should allow multiple partial payments (cicilan)', async () => {
      // First payment: Rp30.000
      const res1 = await request(app)
        .post(`/api/v1/debts/${freshTransactionId}/payments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jumlahBayar: 30000 });

      expect(res1.status).toBe(201);
      expect(res1.body.data.sisaSaldoUtang).toBe('70000');
      expect(res1.body.data.statusPembayaran).toBe('UTANG');

      // Second payment: Rp20.000
      const res2 = await request(app)
        .post(`/api/v1/debts/${freshTransactionId}/payments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jumlahBayar: 20000 });

      expect(res2.status).toBe(201);
      expect(res2.body.data.sisaSaldoUtang).toBe('50000');
      expect(res2.body.data.statusPembayaran).toBe('UTANG');

      // Third payment: Rp50.000 (full payment)
      const res3 = await request(app)
        .post(`/api/v1/debts/${freshTransactionId}/payments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jumlahBayar: 50000 });

      expect(res3.status).toBe(201);
      expect(res3.body.data.sisaSaldoUtang).toBe('0');
      expect(res3.body.data.statusPembayaran).toBe('LUNAS');

      // Verify payment history
      const historyRes = await request(app)
        .get(`/api/v1/debts/${freshTransactionId}/payments`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(historyRes.body.data.length).toBe(3);
    });

    it('should return 400 for missing jumlahBayar', async () => {
      const res = await request(app)
        .post(`/api/v1/debts/${freshTransactionId}/payments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for negative jumlahBayar', async () => {
      const res = await request(app)
        .post(`/api/v1/debts/${freshTransactionId}/payments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jumlahBayar: -5000 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for zero jumlahBayar', async () => {
      const res = await request(app)
        .post(`/api/v1/debts/${freshTransactionId}/payments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jumlahBayar: 0 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid decimal places (more than 2)', async () => {
      const res = await request(app)
        .post(`/api/v1/debts/${freshTransactionId}/payments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jumlahBayar: 50000.123 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent transaction', async () => {
      const res = await request(app)
        .post('/api/v1/debts/00000000-0000-0000-0000-000000000000/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jumlahBayar: 50000 });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid UUID format', async () => {
      const res = await request(app)
        .post('/api/v1/debts/invalid-uuid/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jumlahBayar: 50000 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when recording payment on already LUNAS transaction', async () => {
      // Pay full amount first
      await request(app)
        .post(`/api/v1/debts/${freshTransactionId}/payments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jumlahBayar: 100000 });

      // Try to pay again
      const res = await request(app)
        .post(`/api/v1/debts/${freshTransactionId}/payments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jumlahBayar: 10000 });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Pembayaran hanya dapat dicatat untuk transaksi berstatus Utang/i);
    });

    it('should return 400 for DIBATALKAN transaction', async () => {
      // Void the transaction
      await request(app)
        .post(`/api/v1/transactions/${freshTransactionId}/void`)
        .set('Authorization', `Bearer ${authToken}`);

      const res = await request(app)
        .post(`/api/v1/debts/${freshTransactionId}/payments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jumlahBayar: 50000 });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/dibatalkan/i);
    });

    it('should include dicatatOleh user information in response', async () => {
      const res = await request(app)
        .post(`/api/v1/debts/${freshTransactionId}/payments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jumlahBayar: 50000 });

      expect(res.status).toBe(201);
      expect(res.body.data.payments[0]).toHaveProperty('dicatatOleh');
      expect(res.body.data.payments[0].dicatatOleh).toHaveProperty('id');
      expect(res.body.data.payments[0].dicatatOleh).toHaveProperty('nama');
      expect(res.body.data.payments[0].dicatatOleh).toHaveProperty('email');
      expect(res.body.data.payments[0].dicatatOleh.id).toBe(testUserId);
    });
  });
});
