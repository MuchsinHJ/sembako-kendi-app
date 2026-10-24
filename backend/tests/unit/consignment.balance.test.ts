/**
 * tests/unit/consignment.balance.test.ts
 * Unit tests Tahap 2 — setoran ke penitip & saldo kewajiban.
 *
 * Cakupan: BR-D, BR-F, BR-G (setoran untuk penitip NONAKTIF), konversi
 * Decimal, serta konsistensi laporan dengan saldo per penitip.
 */

import { Prisma, ConsignorStatus } from '@prisma/client';
import { prisma } from '../../src/config/db.js';
import * as consignmentService from '../../src/modules/consignment/consignment.service.js';
import * as transactionService from '../../src/modules/transaction/transaction.service.js';
import { ConsignorOverpaymentError, BusinessRuleError } from '../../src/utils/errors.js';
import { ensureTestUser } from '../helpers/testUser.js';

let userId: string;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONSIGNOR_PREFIX = '__saldo_test__';

const createConsignor = (nama: string, status: ConsignorStatus = ConsignorStatus.AKTIF) =>
  prisma.consignor.create({ data: { nama, status } });

const createTitipanProduct = async (
  consignorId: string,
  opts: { nama?: string; hargaJual?: string; setor?: string; stok?: number } = {},
) =>
  prisma.product.create({
    data: {
      nama: opts.nama ?? `${CONSIGNOR_PREFIX} produk`,
      kategori: 'Titipan',
      hargaJual: new Prisma.Decimal(opts.hargaJual ?? '15000'),
      hargaModal: new Prisma.Decimal(opts.setor ?? '10000'),
      stok: opts.stok ?? 10,
      stokMinimum: 0,
      tipe: 'TITIPAN',
      consignorId,
    },
  });

/** Jual `jumlah` unit lewat service transaksi (LUNAS). */
const sell = async (productId: string, jumlah: number) => {
  const pricePerUnit = 20000 * jumlah; // cukup untuk LUNAS
  return transactionService.createTransaction(
    {
      uangDiterima: pricePerUnit,
      items: [{ productId, jumlah }],
    },
    userId,
  );
};

const cleanupConsignor = async (consignorId: string) => {
  const products = await prisma.product.findMany({
    where: { consignorId },
    select: { id: true },
  });
  const productIds = products.map((p) => p.id);

  const transactions = await prisma.detailTransaction.findMany({
    where: { productId: { in: productIds } },
    select: { transactionId: true },
  });
  const transactionIds = [...new Set(transactions.map((t) => t.transactionId))];

  await prisma.consignorPayment.deleteMany({ where: { consignorId } });
  await prisma.consignmentMovement.deleteMany({
    where: { productId: { in: productIds } },
  });
  await prisma.paymentHistory.deleteMany({
    where: { transactionId: { in: transactionIds } },
  });
  await prisma.detailTransaction.deleteMany({
    where: { transactionId: { in: transactionIds } },
  });
  await prisma.transaction.deleteMany({ where: { id: { in: transactionIds } } });
  await prisma.stockAdjustment.deleteMany({
    where: { productId: { in: productIds } },
  });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  await prisma.consignor.deleteMany({ where: { id: consignorId } });
};

beforeAll(async () => {
  userId = await ensureTestUser();
});

afterAll(async () => {
  // Bersihkan sisa data test bila ada (mis. karena assertion gagal di tengah).
  const leftovers = await prisma.consignor.findMany({
    where: { nama: { startsWith: CONSIGNOR_PREFIX } },
    select: { id: true },
  });
  for (const c of leftovers) {
    await cleanupConsignor(c.id);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// Saldo & setoran
// ═════════════════════════════════════════════════════════════════════════════

describe('Saldo penitip (BR-D)', () => {
  let consignorId: string;
  let productId: string;

  beforeEach(async () => {
    const consignor = await createConsignor(`${CONSIGNOR_PREFIX} saldo`);
    consignorId = consignor.id;
    const product = await createTitipanProduct(consignorId, { setor: '10000', hargaJual: '15000' });
    productId = product.id;
  });

  afterEach(async () => {
    await cleanupConsignor(consignorId);
  });

  it('saldo awal penitip baru = 0', async () => {
    const balance = await consignmentService.getConsignorBalance(consignorId);

    expect(balance.totalTerjualModal).toBe('0.00');
    expect(balance.totalDisetor).toBe('0.00');
    expect(balance.saldo).toBe('0.00');
  });

  it('saldo bertambah sebesar jumlah × harga setor saat barang terjual', async () => {
    // Jual 3 unit → kewajiban 3 × 10.000 = 30.000
    await sell(productId, 3);

    const balance = await consignmentService.getConsignorBalance(consignorId);

    expect(balance.totalTerjualModal).toBe('30000.00');
    expect(balance.totalDisetor).toBe('0.00');
    expect(balance.saldo).toBe('30000.00');
  });

  it('kewajiban timbul juga untuk transaksi UTANG (belum dibayar pembeli)', async () => {
    const transaction = await transactionService.createTransaction(
      {
        uangDiterima: 0,
        namaPembeli: 'Pembeli Utang Saldo',
        items: [{ productId, jumlah: 2 }],
      },
      userId,
    );

    expect(transaction.statusPembayaran).toBe('UTANG');

    const balance = await consignmentService.getConsignorBalance(consignorId);
    expect(balance.saldo).toBe('20000.00');
  });

  it('BR-D: setoran mengurangi saldo dan menyimpan snapshot saldoSetelahBayar', async () => {
    await sell(productId, 3); // saldo 30.000

    const payment = await consignmentService.createConsignorPayment(
      consignorId,
      { jumlahBayar: 12000, catatan: 'Setoran pertama' },
      userId,
    );

    expect(payment.jumlahBayar.toString()).toBe('12000');
    expect(payment.saldoSetelahBayar.toString()).toBe('18000');
    expect(payment.dicatatOleh.id).toBe(userId);

    const balance = await consignmentService.getConsignorBalance(consignorId);
    expect(balance.totalDisetor).toBe('12000.00');
    expect(balance.saldo).toBe('18000.00');
  });

  it('BR-D: setoran melebihi saldo ditolak', async () => {
    await sell(productId, 1); // saldo 10.000

    await expect(
      consignmentService.createConsignorPayment(consignorId, { jumlahBayar: 10000.01 }, userId),
    ).rejects.toThrow(ConsignorOverpaymentError);

    const balance = await consignmentService.getConsignorBalance(consignorId);
    expect(balance.saldo).toBe('10000.00');
  });

  it('BR-D: setoran saat saldo 0 ditolak', async () => {
    await expect(
      consignmentService.createConsignorPayment(consignorId, { jumlahBayar: 1000 }, userId),
    ).rejects.toThrow(ConsignorOverpaymentError);
  });

  it('BR-D: setoran tepat sebesar saldo membuat saldo 0', async () => {
    await sell(productId, 2); // saldo 20.000

    const payment = await consignmentService.createConsignorPayment(
      consignorId,
      { jumlahBayar: 20000 },
      userId,
    );

    expect(payment.saldoSetelahBayar.toString()).toBe('0');

    const balance = await consignmentService.getConsignorBalance(consignorId);
    expect(balance.saldo).toBe('0.00');
  });

  it('BR-D: jumlah setoran 0 / negatif ditolak service', async () => {
    await sell(productId, 2);

    await expect(
      consignmentService.createConsignorPayment(consignorId, { jumlahBayar: 0 }, userId),
    ).rejects.toThrow(BusinessRuleError);
  });

  it('setoran TIDAK boleh membuat saldo negatif', async () => {
    // Tanpa penjualan → saldo 0, setoran ditolak, saldo tetap 0
    await expect(
      consignmentService.createConsignorPayment(consignorId, { jumlahBayar: 5000 }, userId),
    ).rejects.toThrow(ConsignorOverpaymentError);

    const payments = await prisma.consignorPayment.findMany({ where: { consignorId } });
    expect(payments).toHaveLength(0);
  });

  it('riwayat setoran terurut dan dapat dipaginasi', async () => {
    await sell(productId, 5); // saldo 50.000
    await consignmentService.createConsignorPayment(consignorId, { jumlahBayar: 10000 }, userId);
    await consignmentService.createConsignorPayment(consignorId, { jumlahBayar: 15000 }, userId);

    const result = await consignmentService.listConsignorPayments(consignorId, {
      page: 1,
      limit: 20,
    });

    expect(result.pagination.total).toBe(2);
    expect(result.data).toHaveLength(2);
    expect(result.data.map((p) => p.jumlahBayar.toString()).sort()).toEqual([
      '10000',
      '15000',
    ]);
  });

  it('CONCURRENCY: dua setoran paralel tidak membuat saldo negatif', async () => {
    await sell(productId, 5); // saldo 50.000

    // Dua setoran @35.000 → hanya satu yang boleh lolos.
    const results = await Promise.allSettled([
      consignmentService.createConsignorPayment(consignorId, { jumlahBayar: 35000 }, userId),
      consignmentService.createConsignorPayment(consignorId, { jumlahBayar: 35000 }, userId),
    ]);

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failCount = results.filter((r) => r.status === 'rejected').length;

    expect(successCount).toBe(1);
    expect(failCount).toBe(1);

    const rejected = results.find((r) => r.status === 'rejected') as
      | PromiseRejectedResult
      | undefined;
    expect(rejected?.reason).toBeInstanceOf(ConsignorOverpaymentError);

    const balance = await consignmentService.getConsignorBalance(consignorId);
    expect(balance.saldo).toBe('15000.00');

    const payments = await prisma.consignorPayment.findMany({ where: { consignorId } });
    expect(payments).toHaveLength(1);
  });

  it('BR-G: setoran tetap diizinkan untuk penitip NONAKTIF', async () => {
    await sell(productId, 2); // saldo 20.000

    await prisma.consignor.update({
      where: { id: consignorId },
      data: { status: ConsignorStatus.NONAKTIF },
    });

    const payment = await consignmentService.createConsignorPayment(
      consignorId,
      { jumlahBayar: 20000 },
      userId,
    );

    expect(payment.saldoSetelahBayar.toString()).toBe('0');

    const balance = await consignmentService.getConsignorBalance(consignorId);
    expect(balance.saldo).toBe('0.00');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// BR-F: void setelah setoran
// ═════════════════════════════════════════════════════════════════════════════

describe('BR-F: void transaksi setelah setoran', () => {
  let consignorId: string;
  let productId: string;

  beforeEach(async () => {
    const consignor = await createConsignor(`${CONSIGNOR_PREFIX} void`);
    consignorId = consignor.id;
    const product = await createTitipanProduct(consignorId, { setor: '10000' });
    productId = product.id;
  });

  afterEach(async () => {
    await cleanupConsignor(consignorId);
  });

  it('void mengurangi saldo; saldo boleh negatif dan tidak diblokir', async () => {
    // Jual 2 unit → saldo 20.000, lalu setor penuh 20.000 → saldo 0
    const transaction = await sell(productId, 2);
    await consignmentService.createConsignorPayment(
      consignorId,
      { jumlahBayar: 20000 },
      userId,
    );

    let balance = await consignmentService.getConsignorBalance(consignorId);
    expect(balance.saldo).toBe('0.00');

    // Void → kewajiban hilang, setoran tetap tercatat → saldo -20.000
    await expect(transactionService.voidTransaction(transaction.id)).resolves.toBeDefined();

    balance = await consignmentService.getConsignorBalance(consignorId);
    expect(balance.totalTerjualModal).toBe('0.00');
    expect(balance.totalDisetor).toBe('20000.00');
    expect(balance.saldo).toBe('-20000.00');
  });

  it('setelah saldo negatif, setoran baru ditolak sampai ada penjualan lagi', async () => {
    const transaction = await sell(productId, 1); // saldo 10.000
    await consignmentService.createConsignorPayment(consignorId, { jumlahBayar: 10000 }, userId);
    await transactionService.voidTransaction(transaction.id); // saldo -10.000

    await expect(
      consignmentService.createConsignorPayment(consignorId, { jumlahBayar: 1000 }, userId),
    ).rejects.toThrow(ConsignorOverpaymentError);

    // Penjualan baru menaikkan saldo kembali ke 0 → setoran tetap ditolak (saldo ≤ 0)
    await sell(productId, 1); // saldo 0
    await expect(
      consignmentService.createConsignorPayment(consignorId, { jumlahBayar: 1000 }, userId),
    ).rejects.toThrow(ConsignorOverpaymentError);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Filter punyaSaldo & laporan
// ═════════════════════════════════════════════════════════════════════════════

describe('Filter punyaSaldo & laporan konsinyasi', () => {
  let consignorId: string;
  let productId: string;

  beforeEach(async () => {
    const consignor = await createConsignor(`${CONSIGNOR_PREFIX} laporan`);
    consignorId = consignor.id;
    const product = await createTitipanProduct(consignorId, { setor: '10000' });
    productId = product.id;
  });

  afterEach(async () => {
    await cleanupConsignor(consignorId);
  });

  it('consignor NONAKTIF bersaldo muncul di filter punyaSaldo=true', async () => {
    await sell(productId, 2); // saldo 20.000

    await prisma.consignor.update({
      where: { id: consignorId },
      data: { status: ConsignorStatus.NONAKTIF },
    });

    const withSaldo = await consignmentService.listConsignors({
      search: `${CONSIGNOR_PREFIX} laporan`,
      punyaSaldo: true,
      page: 1,
      limit: 20,
    });

    expect(withSaldo.data.map((c) => c.id)).toContain(consignorId);

    // Setelah disetor penuh, hilang dari filter punyaSaldo=true
    await consignmentService.createConsignorPayment(
      consignorId,
      { jumlahBayar: 20000 },
      userId,
    );

    const afterPayment = await consignmentService.listConsignors({
      search: `${CONSIGNOR_PREFIX} laporan`,
      punyaSaldo: true,
      page: 1,
      limit: 20,
    });

    expect(afterPayment.data.map((c) => c.id)).not.toContain(consignorId);
  });

  it('filter punyaSaldo=false menampilkan penitip bersaldo 0', async () => {
    const result = await consignmentService.listConsignors({
      search: `${CONSIGNOR_PREFIX} laporan`,
      punyaSaldo: false,
      page: 1,
      limit: 20,
    });

    expect(result.data.map((c) => c.id)).toContain(consignorId);
  });

  it('laporan konsinyasi konsisten dengan saldo per penitip', async () => {
    await sell(productId, 4); // modal 40.000
    await consignmentService.createConsignorPayment(
      consignorId,
      { jumlahBayar: 15000 },
      userId,
    );

    const report = await consignmentService.getConsignmentReport({
      startDate: '2020-01-01',
      endDate: '2099-12-31',
    });

    const row = report.consignors.find((c) => c.consignorId === consignorId);
    expect(row).toBeDefined();
    expect(row?.modalPeriode).toBe('40000.00');
    expect(row?.disetorPeriode).toBe('15000.00');
    expect(row?.saldoAkhir).toBe('25000.00');
    expect(row?.terjualPeriode).toBe('60000.00'); // 4 × 15.000

    const balance = await consignmentService.getConsignorBalance(consignorId);
    expect(row?.saldoAkhir).toBe(balance.saldo);
  });

  it('saldoAkhir tidak terpengaruh periode laporan', async () => {
    await sell(productId, 2); // saldo all-time 20.000

    // Periode kosong (masa depan) → tidak ada transaksi, tetapi saldo tetap
    const report = await consignmentService.getConsignmentReport({
      startDate: '2099-01-01',
      endDate: '2099-12-31',
    });

    const row = report.consignors.find((c) => c.consignorId === consignorId);
    expect(row?.modalPeriode).toBe('0.00');
    expect(row?.disetorPeriode).toBe('0.00');
    expect(row?.saldoAkhir).toBe('20000.00');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// totalKewajibanPenitip
// ═════════════════════════════════════════════════════════════════════════════

describe('totalKewajibanPenitip', () => {
  let positiveId: string;
  let negativeId: string;

  beforeEach(async () => {
    const positive = await createConsignor(`${CONSIGNOR_PREFIX} positif`);
    positiveId = positive.id;
    const product = await createTitipanProduct(positiveId, { setor: '10000' });
    await sell(product.id, 3); // +30.000

    // Penitip kedua: disetor lebih dari kewajiban → saldo negatif
    const negative = await createConsignor(`${CONSIGNOR_PREFIX} negatif`);
    negativeId = negative.id;
    const product2 = await createTitipanProduct(negativeId, { setor: '10000' });
    const transaction = await sell(product2.id, 2); // +20.000
    await consignmentService.createConsignorPayment(
      negativeId,
      { jumlahBayar: 20000 },
      userId,
    );
    await transactionService.voidTransaction(transaction.id); // -20.000
  });

  afterEach(async () => {
    await cleanupConsignor(positiveId);
    await cleanupConsignor(negativeId);
  });

  it('hanya menjumlahkan saldo positif dan mengabaikan saldo negatif', async () => {
    const before = await consignmentService.getTotalKewajibanPenitip();
    const beforeDecimal = new Prisma.Decimal(before);

    const balancePositive = await consignmentService.getConsignorBalance(positiveId);
    const balanceNegative = await consignmentService.getConsignorBalance(negativeId);
    expect(balancePositive.saldo).toBe('30000.00');
    expect(balanceNegative.saldo).toBe('-20000.00');

    const globalAll = await prisma.consignor.findMany({ select: { id: true } });
    const allSaldo = await Promise.all(
      globalAll.map((c) => consignmentService.getConsignorBalance(c.id)),
    );
    const expected = allSaldo.reduce(
      (sum, b) => (new Prisma.Decimal(b.saldo).gt(0) ? sum.add(b.saldo) : sum),
      new Prisma.Decimal(0),
    );

    expect(beforeDecimal.toString()).toBe(expected.toString());
  });

  it('penitip NONAKTIF dengan saldo > 0 tetap dihitung dalam total kewajiban', async () => {
    const totalWithActive = new Prisma.Decimal(
      await consignmentService.getTotalKewajibanPenitip(),
    );

    await prisma.consignor.update({
      where: { id: positiveId },
      data: { status: ConsignorStatus.NONAKTIF },
    });

    const totalWithInactive = new Prisma.Decimal(
      await consignmentService.getTotalKewajibanPenitip(),
    );

    // Status penitip tidak memengaruhi kewajiban toko (keputusan desain no. 6).
    expect(totalWithInactive.toString()).toBe(totalWithActive.toString());
    expect(totalWithInactive.gte('30000')).toBe(true);
  });
});
