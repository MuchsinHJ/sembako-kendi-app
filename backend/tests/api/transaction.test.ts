/**
 * tests/api/transaction.test.ts
 * API tests untuk transaction endpoints (AC-04 hingga AC-08)
 */

import request from 'supertest';
import app from '../../src/app.js';
import { prisma } from '../../src/config/db.js';

let authToken: string;
let testUserId: string;
let testProductId: string;

beforeAll(async () => {
  // Login untuk mendapat token
  const loginRes = await request(app).post('/api/v1/auth/login').send({
    email: 'test@example.com',
    password: 'password123',
  });

  authToken = loginRes.body.data.accessToken;
  testUserId = loginRes.body.data.user.id;

  // Create test product
  const productRes = await request(app)
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      nama: 'Test Product for Transaction',
      kategori: 'Test',
      hargaJual: '10000',
      hargaModal: '5000',
      stok: 100,
      stokMinimum: 10,
    });

  testProductId = productRes.body.data.id;
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

describe('Transaction API (AC-04 hingga AC-08)', () => {
  describe('POST /transactions - Create Transaction', () => {
    it('AC-04: Berhasil membuat transaksi LUNAS', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          statusPembayaran: 'LUNAS',
          items: [
            {
              productId: testProductId,
              jumlah: 2,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.statusPembayaran).toBe('LUNAS');
      expect(res.body.data.statusTransaksi).toBe('AKTIF');
      expect(res.body.data.total).toBe('20000');
      expect(res.body.data.sisaSaldoUtang).toBeNull();
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].jumlah).toBe(2);
    });

    it('AC-05: Berhasil membuat transaksi UTANG dengan nama dan nomor HP', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          statusPembayaran: 'UTANG',
          namaPembeli: 'Siti',
          noHpPembeli: '081234567890',
          items: [
            {
              productId: testProductId,
              jumlah: 3,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.statusPembayaran).toBe('UTANG');
      expect(res.body.data.namaPembeli).toBe('Siti');
      expect(res.body.data.noHpPembeli).toBe('081234567890');
      expect(res.body.data.total).toBe('30000');
      expect(res.body.data.sisaSaldoUtang).toBe('30000');
    });

    it('AC-05: BR-08 - Transaksi UTANG tanpa nama pembeli ditolak', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          statusPembayaran: 'UTANG',
          noHpPembeli: '081234567890',
          items: [
            {
              productId: testProductId,
              jumlah: 1,
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('AC-05: BR-08 - Transaksi UTANG tanpa nomor HP ditolak', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          statusPembayaran: 'UTANG',
          namaPembeli: 'Budi',
          items: [
            {
              productId: testProductId,
              jumlah: 1,
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('AC-04: BR-05 - Stok tidak mencukupi ditolak', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          statusPembayaran: 'LUNAS',
          items: [
            {
              productId: testProductId,
              jumlah: 9999, // Melebihi stok
            },
          ],
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    });

    it('Transaksi tanpa items ditolak', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          statusPembayaran: 'LUNAS',
          items: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Transaksi tanpa autentikasi ditolak', async () => {
      const res = await request(app).post('/api/v1/transactions').send({
        statusPembayaran: 'LUNAS',
        items: [
          {
            productId: testProductId,
            jumlah: 1,
          },
        ],
      });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /transactions - List Transactions', () => {
    let transaction1Id: string;
    let transaction2Id: string;

    beforeAll(async () => {
      // Create test transactions
      const res1 = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          statusPembayaran: 'LUNAS',
          items: [{ productId: testProductId, jumlah: 1 }],
        });
      transaction1Id = res1.body.data.id;

      const res2 = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          statusPembayaran: 'UTANG',
          namaPembeli: 'Test Buyer',
          noHpPembeli: '081234567890',
          items: [{ productId: testProductId, jumlah: 2 }],
        });
      transaction2Id = res2.body.data.id;
    });

    it('AC-06: List transaksi dengan pagination', async () => {
      const res = await request(app)
        .get('/api/v1/transactions?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      if (res.status !== 200) {
        console.log('Error response:', JSON.stringify(res.body, null, 2));
      }
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.data).toBeInstanceOf(Array);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(10);
    });

    it('AC-06: Filter by statusPembayaran', async () => {
      const res = await request(app)
        .get('/api/v1/transactions?statusPembayaran=LUNAS')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.data.forEach((tx: any) => {
        expect(tx.statusPembayaran).toBe('LUNAS');
      });
    });

    it('AC-06: Filter by statusTransaksi', async () => {
      const res = await request(app)
        .get('/api/v1/transactions?statusTransaksi=AKTIF')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      res.body.data.data.forEach((tx: any) => {
        expect(tx.statusTransaksi).toBe('AKTIF');
      });
    });

    it('AC-06: Filter by periode', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // 7 hari lalu
      const endDate = new Date();

      const res = await request(app)
        .get(
          `/api/v1/transactions?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        )
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('List tanpa autentikasi ditolak', async () => {
      const res = await request(app).get('/api/v1/transactions');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /transactions/:id - Get Transaction Detail', () => {
    let transactionId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          statusPembayaran: 'LUNAS',
          items: [{ productId: testProductId, jumlah: 1 }],
        });
      transactionId = res.body.data.id;
    });

    it('AC-07: Get detail transaksi dengan items dan payments', async () => {
      const res = await request(app)
        .get(`/api/v1/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(transactionId);
      expect(res.body.data.items).toBeInstanceOf(Array);
      expect(res.body.data.items.length).toBeGreaterThan(0);
      expect(res.body.data.payments).toBeInstanceOf(Array);
      expect(res.body.data.dibuatOleh).toBeDefined();
    });

    it('Transaksi tidak ditemukan return 404', async () => {
      const res = await request(app)
        .get('/api/v1/transactions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('Get detail tanpa autentikasi ditolak', async () => {
      const res = await request(app).get(`/api/v1/transactions/${transactionId}`);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /transactions/:id/void - Void Transaction', () => {
    it('AC-08: BR-13 - Berhasil void transaksi hari ini', async () => {
      // Create new transaction
      const createRes = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          statusPembayaran: 'LUNAS',
          items: [{ productId: testProductId, jumlah: 1 }],
        });
      const transactionId = createRes.body.data.id;

      // Get stok before void
      const productBefore = await prisma.product.findUnique({
        where: { id: testProductId },
        select: { stok: true },
      });

      // Void transaction
      const voidRes = await request(app)
        .post(`/api/v1/transactions/${transactionId}/void`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(voidRes.status).toBe(200);
      expect(voidRes.body.success).toBe(true);
      expect(voidRes.body.data.statusTransaksi).toBe('DIBATALKAN');
      expect(voidRes.body.data.dibatalkanPada).toBeDefined();

      // Verify stok kembali
      const productAfter = await prisma.product.findUnique({
        where: { id: testProductId },
        select: { stok: true },
      });
      expect(productAfter!.stok).toBe(productBefore!.stok + 1);
    });

    it('AC-08: Void transaksi yang sudah dibatalkan ditolak', async () => {
      // Create and void transaction
      const createRes = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          statusPembayaran: 'LUNAS',
          items: [{ productId: testProductId, jumlah: 1 }],
        });
      const transactionId = createRes.body.data.id;

      await request(app)
        .post(`/api/v1/transactions/${transactionId}/void`)
        .set('Authorization', `Bearer ${authToken}`);

      // Try to void again
      const res = await request(app)
        .post(`/api/v1/transactions/${transactionId}/void`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    });

    it('Transaksi tidak ditemukan return 404', async () => {
      const res = await request(app)
        .post('/api/v1/transactions/00000000-0000-0000-0000-000000000000/void')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('Void tanpa autentikasi ditolak', async () => {
      const createRes = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          statusPembayaran: 'LUNAS',
          items: [{ productId: testProductId, jumlah: 1 }],
        });

      const res = await request(app).post(
        `/api/v1/transactions/${createRes.body.data.id}/void`,
      );

      expect(res.status).toBe(401);
    });
  });
});
