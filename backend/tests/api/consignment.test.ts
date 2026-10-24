/**
 * tests/api/consignment.test.ts
 * API tests untuk fitur penitipan barang (konsinyasi) Tahap 1.
 *
 * Cakupan: endpoint consignor, penerimaan/retur titipan, filter produk,
 * BR-B/BR-E/BR-G/BR-H/BR-I, serta breakdown `perTipe` pada laporan penjualan.
 */

import request from 'supertest';
import app from '../../src/app.js';
import { prisma } from '../../src/config/db.js';
import { TEST_USER, ensureTestUser } from '../helpers/testUser.js';

let authToken: string;

const createdConsignorIds: string[] = [];
const createdProductIds: string[] = [];

const auth = () => ({ Authorization: `Bearer ${authToken}` });

const cleanupOwnData = async () => {
  if (createdProductIds.length > 0) {
    await prisma.consignmentMovement.deleteMany({
      where: { productId: { in: createdProductIds } },
    });
    await prisma.detailTransaction.deleteMany({
      where: { productId: { in: createdProductIds } },
    });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
  }
  if (createdConsignorIds.length > 0) {
    // Tahap 2: setoran memiliki FK RESTRICT ke Consignor
    await prisma.consignorPayment.deleteMany({
      where: { consignorId: { in: createdConsignorIds } },
    });
    await prisma.consignor.deleteMany({ where: { id: { in: createdConsignorIds } } });
  }
};

beforeAll(async () => {
  await ensureTestUser();

  const loginRes = await request(app).post('/api/v1/auth/login').send({
    email: TEST_USER.email,
    password: TEST_USER.password,
  });

  authToken = loginRes.body.data.accessToken;
});

afterAll(async () => {
  await cleanupOwnData();
});

describe('Consignment API — Consignor (BR-A, BR-E, BR-G)', () => {
  let consignorId: string;

  it('POST /consignors - menambah penitip', async () => {
    const res = await request(app)
      .post('/api/v1/consignors')
      .set(auth())
      .send({ nama: 'Penitip API Test', noHp: '081211112222' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nama).toBe('Penitip API Test');
    expect(res.body.data.status).toBe('AKTIF');
    expect(res.body.data.ringkasan).toEqual({
      jumlahProdukTitipanAktif: 0,
      totalStokTitipan: 0,
    });

    consignorId = res.body.data.id;
    createdConsignorIds.push(consignorId);
  });

  it('GET /consignors - list dengan search nama', async () => {
    const res = await request(app)
      .get('/api/v1/consignors?search=Penitip API Test')
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.data).toBeInstanceOf(Array);
    expect(
      (res.body.data.data as Array<{ id: string }>).some((c) => c.id === consignorId),
    ).toBe(true);
  });

  it('PUT /consignors/:id - mengubah data penitip', async () => {
    const res = await request(app)
      .put(`/api/v1/consignors/${consignorId}`)
      .set(auth())
      .send({ catatan: 'Titipan mingguan' });

    expect(res.status).toBe(200);
    expect(res.body.data.catatan).toBe('Titipan mingguan');
  });

  it('GET /consignors/:id - detail menyertakan ringkasan', async () => {
    const res = await request(app)
      .get(`/api/v1/consignors/${consignorId}`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.ringkasan).toEqual({
      jumlahProdukTitipanAktif: 0,
      totalStokTitipan: 0,
    });
  });

  it('GET /consignors - validasi status tidak dikenal → 400', async () => {
    const res = await request(app)
      .get('/api/v1/consignors?status=TIDAKADA')
      .set(auth());

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('tanpa token → 401 UNAUTHORIZED', async () => {
    const res = await request(app).get('/api/v1/consignors');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('Consignment API — Produk titipan (BR-A, BR-B, BR-H)', () => {
  let consignorId: string;
  let productId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/consignors')
      .set(auth())
      .send({ nama: 'Penitip Produk API' });

    consignorId = res.body.data.id;
    createdConsignorIds.push(consignorId);
  });

  it('POST /products - membuat produk titipan menampilkan consignor', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set(auth())
      .send({
        nama: 'Keripik Titipan',
        kategori: 'Titipan',
        hargaJual: '15000',
        hargaModal: '10000',
        stok: 0,
        stokMinimum: 0,
        tipe: 'TITIPAN',
        consignorId,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.tipe).toBe('TITIPAN');
    expect(res.body.data.consignor).toEqual({
      id: consignorId,
      nama: 'Penitip Produk API',
    });

    productId = res.body.data.id;
    createdProductIds.push(productId);
  });

  it('BR-A: TITIPAN tanpa consignorId ditolak Zod', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set(auth())
      .send({
        nama: 'Titipan Tanpa Penitip',
        kategori: 'Titipan',
        hargaJual: '15000',
        hargaModal: '10000',
        tipe: 'TITIPAN',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('BR-B: harga jual di bawah harga setor ditolak → 422', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set(auth())
      .send({
        nama: 'Titipan Rugi',
        kategori: 'Titipan',
        hargaJual: '9000',
        hargaModal: '10000',
        tipe: 'TITIPAN',
        consignorId,
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    expect(res.body.error.message).toContain('harga setor');
  });

  it('BR-A: tipe tidak dapat diubah lewat PUT /products/:id', async () => {
    const res = await request(app)
      .put(`/api/v1/products/${productId}`)
      .set(auth())
      .send({ tipe: 'MILIK_SENDIRI' });

    expect(res.status).toBe(422);
    expect(res.body.error.message).toContain('tidak dapat diubah');
  });

  it('GET /products?tipe=TITIPAN - filter tipe', async () => {
    const res = await request(app)
      .get('/api/v1/products?tipe=TITIPAN&consignorId=' + consignorId)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.data).toBeInstanceOf(Array);
    expect(
      (res.body.data.data as Array<{ tipe: string }>).every((p) => p.tipe === 'TITIPAN'),
    ).toBe(true);
  });

  it('BR-H: menonaktifkan produk titipan berstok ditolak → 422', async () => {
    // Terima stok dulu
    const receipt = await request(app)
      .post('/api/v1/consignment/receipts')
      .set(auth())
      .send({ productId, jumlah: 5, catatan: 'Titipan awal' });
    expect(receipt.status).toBe(201);

    const res = await request(app)
      .patch(`/api/v1/products/${productId}/status`)
      .set(auth())
      .send({ status: 'NONAKTIF' });

    expect(res.status).toBe(422);
    expect(res.body.error.message).toContain('masih memiliki stok');
  });
});

describe('Consignment API — Penerimaan & retur (BR-C, BR-I)', () => {
  let consignorId: string;
  let productId: string;

  beforeAll(async () => {
    const consignorRes = await request(app)
      .post('/api/v1/consignors')
      .set(auth())
      .send({ nama: 'Penitip Receipt API' });
    consignorId = consignorRes.body.data.id;
    createdConsignorIds.push(consignorId);

    const productRes = await request(app)
      .post('/api/v1/products')
      .set(auth())
      .send({
        nama: 'Produk Receipt API',
        kategori: 'Titipan',
        hargaJual: '12000',
        hargaModal: '8000',
        stok: 0,
        tipe: 'TITIPAN',
        consignorId,
      });
    productId = productRes.body.data.id;
    createdProductIds.push(productId);
  });

  it('POST /consignment/receipts - menambah stok', async () => {
    const res = await request(app)
      .post('/api/v1/consignment/receipts')
      .set(auth())
      .send({ productId, jumlah: 10 });

    expect(res.status).toBe(201);
    expect(res.body.data.tipe).toBe('TERIMA');
    expect(res.body.data.stokSebelum).toBe(0);
    expect(res.body.data.stokSesudah).toBe(10);
    expect(res.body.data.consignor.id).toBe(consignorId);
  });

  it('POST /consignment/returns - mengurangi stok', async () => {
    const res = await request(app)
      .post('/api/v1/consignment/returns')
      .set(auth())
      .send({ productId, jumlah: 3 });

    expect(res.status).toBe(201);
    expect(res.body.data.tipe).toBe('RETUR');
    expect(res.body.data.stokSebelum).toBe(10);
    expect(res.body.data.stokSesudah).toBe(7);
  });

  it('BR-C: retur melebihi stok ditolak → 422', async () => {
    const res = await request(app)
      .post('/api/v1/consignment/returns')
      .set(auth())
      .send({ productId, jumlah: 8 });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    expect(res.body.error.message).toContain('melebihi stok');
  });

  it('POST /consignment/receipts - jumlah 0 ditolak Zod', async () => {
    const res = await request(app)
      .post('/api/v1/consignment/receipts')
      .set(auth())
      .send({ productId, jumlah: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /consignment/movements - riwayat dengan filter & pagination', async () => {
    const res = await request(app)
      .get(`/api/v1/consignment/movements?productId=${productId}&page=1&limit=10`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.total).toBe(2);
    expect(res.body.data.data[0].product.id).toBe(productId);
  });

  it('BR-E: nonaktifkan consignor dengan stok > 0 → 422 + details', async () => {
    const res = await request(app)
      .patch(`/api/v1/consignors/${consignorId}/status`)
      .set(auth())
      .send({ status: 'NONAKTIF' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    expect(res.body.error.details.products).toHaveLength(1);
    expect(res.body.error.details.products[0].id).toBe(productId);
    expect(res.body.error.details.products[0].stok).toBe(7);
  });

  it('BR-E: setelah stok 0, nonaktifkan consignor berhasil dan produk ikut nonaktif', async () => {
    // Retur seluruh sisa stok
    const retur = await request(app)
      .post('/api/v1/consignment/returns')
      .set(auth())
      .send({ productId, jumlah: 7 });
    expect(retur.status).toBe(201);

    const res = await request(app)
      .patch(`/api/v1/consignors/${consignorId}/status`)
      .set(auth())
      .send({ status: 'NONAKTIF' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('NONAKTIF');

    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product?.status).toBe('NONAKTIF');
  });

  it('BR-G: receipt untuk produk NONAKTIF ditolak → 422', async () => {
    const res = await request(app)
      .post('/api/v1/consignment/receipts')
      .set(auth())
      .send({ productId, jumlah: 1 });

    expect(res.status).toBe(422);
    expect(res.body.error.message).toContain('NONAKTIF');
  });

  it('BR-E: mengaktifkan kembali consignor diizinkan, produk tidak ikut aktif', async () => {
    const res = await request(app)
      .patch(`/api/v1/consignors/${consignorId}/status`)
      .set(auth())
      .send({ status: 'AKTIF' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('AKTIF');

    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product?.status).toBe('NONAKTIF');
  });
});

describe('Report API — breakdown perTipe (Tahap 1)', () => {
  let consignorId: string;
  let titipanProductId: string;
  let ownProductId: string;
  const transactionIds: string[] = [];

  const startDate = '2020-01-01';
  const endDate = '2099-12-31';

  beforeAll(async () => {
    const consignorRes = await request(app)
      .post('/api/v1/consignors')
      .set(auth())
      .send({ nama: 'Penitip Report PerTipe' });
    consignorId = consignorRes.body.data.id;
    createdConsignorIds.push(consignorId);

    const titipanRes = await request(app)
      .post('/api/v1/products')
      .set(auth())
      .send({
        nama: `Titipan Report ${Date.now()}`,
        kategori: 'Report Test',
        hargaJual: '20000',
        hargaModal: '12000',
        stok: 20,
        tipe: 'TITIPAN',
        consignorId,
      });
    titipanProductId = titipanRes.body.data.id;
    createdProductIds.push(titipanProductId);

    const ownRes = await request(app)
      .post('/api/v1/products')
      .set(auth())
      .send({
        nama: `Milik Report ${Date.now()}`,
        kategori: 'Report Test',
        hargaJual: '20000',
        hargaModal: '12000',
        stok: 20,
      });
    ownProductId = ownRes.body.data.id;
    createdProductIds.push(ownProductId);

    // Titipan: 2 unit → omzet 40.000, profit 16.000
    const tx1 = await request(app)
      .post('/api/v1/transactions')
      .set(auth())
      .send({ uangDiterima: 40000, items: [{ productId: titipanProductId, jumlah: 2 }] });
    expect(tx1.status).toBe(201);
    transactionIds.push(tx1.body.data.id);

    // Milik sendiri: 1 unit → omzet 20.000, profit 8.000
    const tx2 = await request(app)
      .post('/api/v1/transactions')
      .set(auth())
      .send({ uangDiterima: 20000, items: [{ productId: ownProductId, jumlah: 1 }] });
    expect(tx2.status).toBe(201);
    transactionIds.push(tx2.body.data.id);
  });

  afterAll(async () => {
    await prisma.detailTransaction.deleteMany({
      where: { transactionId: { in: transactionIds } },
    });
    await prisma.transaction.deleteMany({ where: { id: { in: transactionIds } } });
    await cleanupOwnData();
  });

  it('GET /reports/sales mengembalikan perTipe tanpa mengubah field lama', async () => {
    const res = await request(app)
      .get(`/api/v1/reports/sales?startDate=${startDate}&endDate=${endDate}`)
      .set(auth());

    expect(res.status).toBe(200);

    const data = res.body.data;
    // Field lama tetap ada
    expect(typeof data.omzet).toBe('string');
    expect(typeof data.profit).toBe('string');
    expect(typeof data.transactionCount).toBe('number');
    expect(data.transactions).toBeInstanceOf(Array);

    // Breakdown baru
    expect(data.perTipe).toBeDefined();
    expect(data.perTipe.MILIK_SENDIRI.omzet).toBe('20000.00');
    expect(data.perTipe.MILIK_SENDIRI.profit).toBe('8000.00');
    expect(data.perTipe.TITIPAN.omzet).toBe('40000.00');
    expect(data.perTipe.TITIPAN.profit).toBe('16000.00');

    // Konsistensi: total = jumlah kedua tipe
    expect(Number(data.perTipe.MILIK_SENDIRI.omzet) + Number(data.perTipe.TITIPAN.omzet)).toBe(
      Number(data.omzet),
    );
    expect(Number(data.perTipe.MILIK_SENDIRI.profit) + Number(data.perTipe.TITIPAN.profit)).toBe(
      Number(data.profit),
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Tahap 2 — Saldo & setoran ke penitip (BR-D, BR-F, BR-G)
// ═════════════════════════════════════════════════════════════════════════════

describe('Consignment API — Saldo & setoran (BR-D, BR-F, BR-G)', () => {
  let consignorId: string;
  let productId: string;
  const transactionIds: string[] = [];

  const cleanup = async () => {
    await prisma.consignorPayment.deleteMany({ where: { consignorId } });
    await prisma.detailTransaction.deleteMany({
      where: { transactionId: { in: transactionIds } },
    });
    await prisma.transaction.deleteMany({ where: { id: { in: transactionIds } } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.consignor.deleteMany({ where: { id: consignorId } });
  };

  beforeAll(async () => {
    const consignorRes = await request(app)
      .post('/api/v1/consignors')
      .set(auth())
      .send({ nama: 'Penitip Saldo API' });
    consignorId = consignorRes.body.data.id;

    const productRes = await request(app)
      .post('/api/v1/products')
      .set(auth())
      .send({
        nama: 'Produk Saldo API',
        kategori: 'Titipan',
        hargaJual: '15000',
        hargaModal: '10000',
        stok: 20,
        tipe: 'TITIPAN',
        consignorId,
      });
    expect(productRes.status).toBe(201);
    productId = productRes.body.data.id;
  });

  afterAll(async () => {
    await cleanup();
  });

  it('GET /consignors/:id/balance - saldo awal 0', async () => {
    const res = await request(app)
      .get(`/api/v1/consignors/${consignorId}/balance`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      consignorId,
      totalTerjualModal: '0.00',
      totalDisetor: '0.00',
      saldo: '0.00',
    });
  });

  it('GET /consignors/:id/balance - 404 untuk penitip tidak ada', async () => {
    const res = await request(app)
      .get('/api/v1/consignors/00000000-0000-4000-8000-000000000000/balance')
      .set(auth());

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('saldo naik setelah penjualan barang titipan', async () => {
    const tx = await request(app)
      .post('/api/v1/transactions')
      .set(auth())
      .send({ uangDiterima: 30000, items: [{ productId, jumlah: 2 }] });
    expect(tx.status).toBe(201);
    transactionIds.push(tx.body.data.id);

    const res = await request(app)
      .get(`/api/v1/consignors/${consignorId}/balance`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.totalTerjualModal).toBe('20000.00');
    expect(res.body.data.saldo).toBe('20000.00');
  });

  it('POST /consignors/:id/payments - mencatat setoran dan mengurangi saldo', async () => {
    const res = await request(app)
      .post(`/api/v1/consignors/${consignorId}/payments`)
      .set(auth())
      .send({ jumlahBayar: 12500, catatan: 'Setoran API' });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Setoran ke penitip berhasil dicatat.');
    expect(res.body.data.jumlahBayar).toBe('12500');
    expect(res.body.data.saldoSetelahBayar).toBe('7500');
    expect(res.body.data.catatan).toBe('Setoran API');
    expect(res.body.data.dicatatOleh.email).toBe(TEST_USER.email);

    const balance = await request(app)
      .get(`/api/v1/consignors/${consignorId}/balance`)
      .set(auth());
    expect(balance.body.data.totalDisetor).toBe('12500.00');
    expect(balance.body.data.saldo).toBe('7500.00');
  });

  it('BR-D: setoran melebihi saldo ditolak → 422', async () => {
    const res = await request(app)
      .post(`/api/v1/consignors/${consignorId}/payments`)
      .set(auth())
      .send({ jumlahBayar: 7500.01 });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    expect(res.body.error.message).toContain('melebihi saldo');
  });

  it('BR-D: jumlahBayar 0 ditolak Zod → 400', async () => {
    const res = await request(app)
      .post(`/api/v1/consignors/${consignorId}/payments`)
      .set(auth())
      .send({ jumlahBayar: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('BR-D: jumlahBayar dengan 3 desimal ditolak Zod → 400', async () => {
    const res = await request(app)
      .post(`/api/v1/consignors/${consignorId}/payments`)
      .set(auth())
      .send({ jumlahBayar: 100.555 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /consignors/:id/payments - riwayat setoran', async () => {
    const res = await request(app)
      .get(`/api/v1/consignors/${consignorId}/payments?page=1&limit=10`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.data[0].jumlahBayar).toBe('12500');
    expect(res.body.data.pagination.total).toBe(1);
  });

  it('GET /consignors?punyaSaldo=true - menyertakan penitip bersaldo', async () => {
    const res = await request(app)
      .get('/api/v1/consignors?punyaSaldo=true&search=Penitip Saldo API')
      .set(auth());

    expect(res.status).toBe(200);
    expect(
      (res.body.data.data as Array<{ id: string }>).some((c) => c.id === consignorId),
    ).toBe(true);
  });

  it('GET /consignors?punyaSaldo=abc - nilai tidak valid → 400', async () => {
    const res = await request(app)
      .get('/api/v1/consignors?punyaSaldo=abc')
      .set(auth());

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /reports/consignment - konsisten dengan saldo penitip', async () => {
    const res = await request(app)
      .get('/api/v1/reports/consignment?startDate=2020-01-01&endDate=2099-12-31')
      .set(auth());

    expect(res.status).toBe(200);

    const row = (res.body.data.consignors as Array<{ consignorId: string }>).find(
      (c) => c.consignorId === consignorId,
    ) as
      | {
          terjualPeriode: string;
          modalPeriode: string;
          disetorPeriode: string;
          saldoAkhir: string;
        }
      | undefined;

    expect(row).toBeDefined();
    expect(row?.terjualPeriode).toBe('30000.00');
    expect(row?.modalPeriode).toBe('20000.00');
    expect(row?.disetorPeriode).toBe('12500.00');
    expect(row?.saldoAkhir).toBe('7500.00');
  });

  it('GET /reports/consignment - startDate wajib → 400', async () => {
    const res = await request(app)
      .get('/api/v1/reports/consignment?endDate=2099-12-31')
      .set(auth());

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /reports/consignment - startDate > endDate → 400', async () => {
    const res = await request(app)
      .get('/api/v1/reports/consignment?startDate=2099-01-01&endDate=2020-01-01')
      .set(auth());

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /dashboard/summary - menyertakan totalKewajibanPenitip', async () => {
    const res = await request(app).get('/api/v1/dashboard/summary').set(auth());

    expect(res.status).toBe(200);
    expect(typeof res.body.data.totalKewajibanPenitip).toBe('string');
    // Kewajiban global ≥ saldo positif penitip ini
    expect(Number(res.body.data.totalKewajibanPenitip)).toBeGreaterThanOrEqual(0);
  });

  it('BR-F: void setelah setoran membuat saldo negatif tanpa error', async () => {
    // Setor sisa saldo lebih dulu → saldo 0
    const pay = await request(app)
      .post(`/api/v1/consignors/${consignorId}/payments`)
      .set(auth())
      .send({ jumlahBayar: 7500 });
    expect(pay.status).toBe(201);

    const beforeVoid = await request(app)
      .get(`/api/v1/consignors/${consignorId}/balance`)
      .set(auth());
    expect(beforeVoid.body.data.saldo).toBe('0.00');

    // Void transaksi pertama → kewajiban hilang
    const voidRes = await request(app)
      .post(`/api/v1/transactions/${transactionIds[0]}/void`)
      .set(auth());
    expect(voidRes.status).toBe(200);

    const afterVoid = await request(app)
      .get(`/api/v1/consignors/${consignorId}/balance`)
      .set(auth());
    expect(afterVoid.body.data.totalTerjualModal).toBe('0.00');
    expect(afterVoid.body.data.totalDisetor).toBe('20000.00');
    expect(afterVoid.body.data.saldo).toBe('-20000.00');
  });

  it('BR-G: setoran untuk penitip NONAKTIF tetap diizinkan', async () => {
    // Buat penitip & produk baru agar tidak bergantung pada saldo sebelumnya
    const consignorRes = await request(app)
      .post('/api/v1/consignors')
      .set(auth())
      .send({ nama: 'Penitip Saldo Nonaktif API' });
    const inactiveId: string = consignorRes.body.data.id;

    const productRes = await request(app)
      .post('/api/v1/products')
      .set(auth())
      .send({
        nama: 'Produk Saldo Nonaktif API',
        kategori: 'Titipan',
        hargaJual: '15000',
        hargaModal: '10000',
        stok: 5,
        tipe: 'TITIPAN',
        consignorId: inactiveId,
      });
    const inactiveProductId: string = productRes.body.data.id;

    const tx = await request(app)
      .post('/api/v1/transactions')
      .set(auth())
      .send({ uangDiterima: 15000, items: [{ productId: inactiveProductId, jumlah: 1 }] });
    expect(tx.status).toBe(201);

    // Nonaktifkan penitip (stok masih > 0 → harus diretur dulu)
    const retur = await request(app)
      .post('/api/v1/consignment/returns')
      .set(auth())
      .send({ productId: inactiveProductId, jumlah: 4 });
    expect(retur.status).toBe(201);

    const patch = await request(app)
      .patch(`/api/v1/consignors/${inactiveId}/status`)
      .set(auth())
      .send({ status: 'NONAKTIF' });
    expect(patch.status).toBe(200);

    const pay = await request(app)
      .post(`/api/v1/consignors/${inactiveId}/payments`)
      .set(auth())
      .send({ jumlahBayar: 10000 });
    expect(pay.status).toBe(201);
    expect(pay.body.data.saldoSetelahBayar).toBe('0');

    // Cleanup data tambahan
    await prisma.consignorPayment.deleteMany({ where: { consignorId: inactiveId } });
    await prisma.detailTransaction.deleteMany({
      where: { transactionId: tx.body.data.id },
    });
    await prisma.transaction.delete({ where: { id: tx.body.data.id } });
    await prisma.consignmentMovement.deleteMany({
      where: { productId: inactiveProductId },
    });
    await prisma.product.delete({ where: { id: inactiveProductId } });
    await prisma.consignor.delete({ where: { id: inactiveId } });
  });
});
