/**
 * tests/unit/transaction.service.test.ts
 * Unit tests untuk transaction.service (AC-04, AC-05, AC-06, AC-07, AC-08)
 * BR-05: Stok tidak boleh negatif
 * BR-07: Total dihitung dengan Decimal
 * BR-08: UTANG wajib nama pembeli (noHpPembeli opsional)
 * BR-13: Void window validation
 */

import { PaymentStatus, TransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as transactionService from '../../src/modules/transaction/transaction.service.js';
import { isWithinHoursWindow } from '../../src/utils/date.js';
import { prisma } from '../../src/config/db.js';
import {
  NotFoundError,
  ValidationError,
  StockExceededError,
  MissingDebtorInfoError,
  BusinessRuleError,
  VoidWindowExpiredError,
} from '../../src/utils/errors.js';

describe('Transaction Service', () => {
  let testUserId: string;
  let testProductId: string;

  // Setup: Create test user dan product sebelum semua test
  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        nama: 'Test User Transaction',
        email: `test-transaction-${Date.now()}@example.com`,
        passwordHash: 'dummy_hash',
      },
    });
    testUserId = user.id;

    // Create test product
    const product = await prisma.product.create({
      data: {
        nama: 'Test Product for Transaction',
        kategori: 'Test',
        hargaJual: new Decimal('10000'),
        hargaModal: new Decimal('5000'),
        stok: 100,
        stokMinimum: 10,
        status: 'AKTIF',
      },
    });
    testProductId = product.id;
  });

  // Cleanup: Delete semua test data setelah semua test selesai
  afterAll(async () => {
    // Delete payment history first (FK constraint to Transaction)
    await prisma.paymentHistory.deleteMany({
      where: { dicatatOlehId: testUserId },
    });

    // Delete detail transactions (FK constraint to Transaction and Product)
    await prisma.detailTransaction.deleteMany({
      where: {
        transaction: {
          dibuatOlehId: testUserId,
        },
      },
    });

    // Delete transactions
    await prisma.transaction.deleteMany({
      where: { dibuatOlehId: testUserId },
    });

    // Delete product
    await prisma.product.deleteMany({
      where: { id: testProductId },
    });

    // Delete user
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
  });

  describe('createTransaction', () => {
    it('AC-04: BR-05 - Stok tidak mencukupi harus ditolak', async () => {
      const input = {
        uangDiterima: 10000,
        items: [
          {
            productId: testProductId,
            jumlah: 999, // Melebihi stok (100)
          },
        ],
      };

      await expect(
        transactionService.createTransaction(input, testUserId),
      ).rejects.toThrow(StockExceededError);
    });

    it('AC-05: BR-08 - UTANG tanpa nama pembeli harus ditolak', async () => {
      const input = {
        uangDiterima: 10000, // total 5 x 10.000 = 50.000 → kurang bayar
        noHpPembeli: '081234567890',
        items: [
          {
            productId: testProductId,
            jumlah: 5,
          },
        ],
      };

      await expect(
        transactionService.createTransaction(input, testUserId),
      ).rejects.toThrow(MissingDebtorInfoError);
    });

    it('AC-05: BR-08 - UTANG tanpa nomor HP berhasil (noHpPembeli opsional)', async () => {
      const input = {
        uangDiterima: 0,
        namaPembeli: 'Budi Tanpa HP',
        items: [
          {
            productId: testProductId,
            jumlah: 5,
          },
        ],
      };

      const result = await transactionService.createTransaction(input, testUserId);
      expect(result.id).toBeDefined();
      expect(result.namaPembeli).toBe('Budi Tanpa HP');
      expect(result.noHpPembeli).toBeNull();
      expect(result.statusPembayaran).toBe(PaymentStatus.UTANG);
      expect(result.sisaSaldoUtang?.toString()).toBe('50000');
    });

    it('Transaksi LUNAS berhasil tanpa nama/nomor HP', async () => {
      const input = {
        uangDiterima: 20000,
        items: [
          {
            productId: testProductId,
            jumlah: 2,
          },
        ],
      };

      const transaction = await transactionService.createTransaction(
        input,
        testUserId,
      );

      expect(transaction.id).toBeDefined();
      expect(transaction.statusPembayaran).toBe(PaymentStatus.LUNAS);
      expect(transaction.statusTransaksi).toBe(TransactionStatus.AKTIF);
      expect(transaction.total.toString()).toBe('20000'); // 2 * 10000
      expect(transaction.uangDiterima?.toString()).toBe('20000');
      expect(transaction.kembalian?.toString()).toBe('0');
      expect(transaction.sisaSaldoUtang).toBeNull();
      expect(transaction.items).toHaveLength(1);
      expect(transaction.items[0].jumlah).toBe(2);

      // Verify stok berkurang
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });
      expect(product?.stok).toBeLessThan(100);
    });

    it('FR-20: Uang diterima lebih besar dari total → LUNAS dengan kembalian', async () => {
      const transaction = await transactionService.createTransaction(
        {
          uangDiterima: 50000,
          items: [{ productId: testProductId, jumlah: 2 }], // total 20.000
        },
        testUserId,
      );

      expect(transaction.total.toString()).toBe('20000');
      expect(transaction.uangDiterima?.toString()).toBe('50000');
      expect(transaction.kembalian?.toString()).toBe('30000');
      expect(transaction.statusPembayaran).toBe(PaymentStatus.LUNAS);
      expect(transaction.sisaSaldoUtang).toBeNull();
    });

    it('FR-20: Uang diterima kurang dari total → UTANG dengan sisa saldo (uang muka tersimpan di transaksi)', async () => {
      const transaction = await transactionService.createTransaction(
        {
          uangDiterima: 30000,
          namaPembeli: 'Siti DP',
          items: [{ productId: testProductId, jumlah: 5 }], // total 50.000
        },
        testUserId,
      );

      expect(transaction.total.toString()).toBe('50000');
      expect(transaction.uangDiterima?.toString()).toBe('30000');
      expect(transaction.kembalian).toBeNull();
      expect(transaction.statusPembayaran).toBe(PaymentStatus.UTANG);
      expect(transaction.sisaSaldoUtang?.toString()).toBe('20000');
      // Opsi A: uang muka tidak dibuat sebagai entri PaymentHistory,
      // sehingga transaksi masih dapat di-void selama masih dalam window 24 jam (BR-13).
      expect(transaction.payments).toHaveLength(0);
    });

    it('Transaksi UTANG berhasil dengan nama dan nomor HP', async () => {
      const input = {
        uangDiterima: 0,
        namaPembeli: 'Siti',
        noHpPembeli: '081234567890',
        items: [
          {
            productId: testProductId,
            jumlah: 3,
          },
        ],
      };

      const transaction = await transactionService.createTransaction(
        input,
        testUserId,
      );

      expect(transaction.id).toBeDefined();
      expect(transaction.statusPembayaran).toBe(PaymentStatus.UTANG);
      expect(transaction.namaPembeli).toBe('Siti');
      expect(transaction.noHpPembeli).toBe('081234567890');
      expect(transaction.total.toString()).toBe('30000'); // 3 * 10000
      expect(transaction.uangDiterima?.toString()).toBe('0');
      expect(transaction.sisaSaldoUtang?.toString()).toBe('30000');
    });

    it('BR-07: Total dihitung dengan Decimal precision', async () => {
      // Create product dengan harga desimal
      const productDecimal = await prisma.product.create({
        data: {
          nama: 'Product with Decimal Price',
          kategori: 'Test',
          hargaJual: new Decimal('12345.67'),
          hargaModal: new Decimal('10000'),
          stok: 50,
          stokMinimum: 5,
          status: 'AKTIF',
        },
      });

      const input = {
        uangDiterima: 37037.01,
        items: [
          {
            productId: productDecimal.id,
            jumlah: 3,
          },
        ],
      };

      const transaction = await transactionService.createTransaction(
        input,
        testUserId,
      );

      // 3 * 12345.67 = 37037.01
      expect(transaction.total.toString()).toBe('37037.01');
      expect(transaction.items[0].hargaJualSnapshot.toString()).toBe(
        '12345.67',
      );
      expect(transaction.items[0].subtotal.toString()).toBe('37037.01');

      // Cleanup
      await prisma.detailTransaction.deleteMany({
        where: { productId: productDecimal.id },
      });
      await prisma.product.delete({ where: { id: productDecimal.id } });
    });

    it('Produk NONAKTIF tidak bisa ditransaksikan', async () => {
      // Create inactive product
      const inactiveProduct = await prisma.product.create({
        data: {
          nama: 'Inactive Product',
          kategori: 'Test',
          hargaJual: new Decimal('5000'),
          hargaModal: new Decimal('3000'),
          stok: 10,
          stokMinimum: 2,
          status: 'NONAKTIF',
        },
      });

      const input = {
        uangDiterima: 5000,
        items: [
          {
            productId: inactiveProduct.id,
            jumlah: 1,
          },
        ],
      };

      await expect(
        transactionService.createTransaction(input, testUserId),
      ).rejects.toThrow(ValidationError);

      // Cleanup (no transaction created, direct delete OK)
      await prisma.product.delete({ where: { id: inactiveProduct.id } });
    });

    it('Produk tidak ditemukan harus ditolak', async () => {
      const input = {
        uangDiterima: 5000,
        items: [
          {
            productId: '00000000-0000-0000-0000-000000000000',
            jumlah: 1,
          },
        ],
      };

      await expect(
        transactionService.createTransaction(input, testUserId),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('listTransactions', () => {
    beforeAll(async () => {
      // Create test transactions
      await transactionService.createTransaction(
        {
          uangDiterima: 10000,
          items: [{ productId: testProductId, jumlah: 1 }],
        },
        testUserId,
      );

      await transactionService.createTransaction(
        {
          uangDiterima: 0,
          namaPembeli: 'Test Buyer',
          noHpPembeli: '081234567890',
          items: [{ productId: testProductId, jumlah: 2 }],
        },
        testUserId,
      );
    });

    it('AC-06: List semua transaksi dengan pagination', async () => {
      const result = await transactionService.listTransactions({
        page: 1,
        limit: 10,
      });

      expect(result.data).toBeInstanceOf(Array);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBeGreaterThanOrEqual(2);
    });

    it('AC-06: Filter by statusPembayaran', async () => {
      const result = await transactionService.listTransactions({
        statusPembayaran: PaymentStatus.LUNAS,
        page: 1,
        limit: 10,
      });

      expect(result.data.length).toBeGreaterThanOrEqual(1);
      result.data.forEach((tx) => {
        expect(tx.statusPembayaran).toBe(PaymentStatus.LUNAS);
      });
    });

    it('AC-06: Filter by statusTransaksi', async () => {
      const result = await transactionService.listTransactions({
        statusTransaksi: TransactionStatus.AKTIF,
        page: 1,
        limit: 10,
      });

      result.data.forEach((tx) => {
        expect(tx.statusTransaksi).toBe(TransactionStatus.AKTIF);
      });
    });
  });

  describe('getTransactionById', () => {
    let transactionId: string;

    beforeAll(async () => {
      const tx = await transactionService.createTransaction(
        {
          uangDiterima: 10000,
          items: [{ productId: testProductId, jumlah: 1 }],
        },
        testUserId,
      );
      transactionId = tx.id;
    });

    it('AC-07: Get transaction detail dengan items dan payments', async () => {
      const transaction = await transactionService.getTransactionById(
        transactionId,
      );

      expect(transaction.id).toBe(transactionId);
      expect(transaction.items).toBeInstanceOf(Array);
      expect(transaction.items.length).toBeGreaterThan(0);
      expect(transaction.payments).toBeInstanceOf(Array);
      expect(transaction.dibuatOleh).toBeDefined();
      expect(transaction.dibuatOleh.id).toBe(testUserId);
    });

    it('Transaction tidak ditemukan harus throw NotFoundError', async () => {
      await expect(
        transactionService.getTransactionById(
          '00000000-0000-0000-0000-000000000000',
        ),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('voidTransaction', () => {
    it('FR-25: BR-13 - Helper window 24 jam menerima tepat di batas dan menolak setelahnya', () => {
      const created = new Date('2026-10-24T00:00:00.000Z');
      const HOUR = 60 * 60 * 1000;

      // Tepat 24 jam setelah transaksi dibuat → masih dalam window (inklusif)
      expect(
        isWithinHoursWindow(created, new Date(created.getTime() + 24 * HOUR), 24),
      ).toBe(true);
      // 24 jam + 1 ms → sudah lewat
      expect(
        isWithinHoursWindow(
          created,
          new Date(created.getTime() + 24 * HOUR + 1),
          24,
        ),
      ).toBe(false);
      // 1 jam sebelum transaksi dibuat (waktu server mundur) → bukan window valid
      expect(
        isWithinHoursWindow(created, new Date(created.getTime() - HOUR), 24),
      ).toBe(false);
    });

    it('AC-08: BR-13 - Void transaksi hari ini berhasil', async () => {
      // Create new transaction
      const transaction = await transactionService.createTransaction(
        {
          uangDiterima: 10000,
          items: [{ productId: testProductId, jumlah: 1 }],
        },
        testUserId,
      );

      const stokBeforeVoid = await prisma.product.findUnique({
        where: { id: testProductId },
        select: { stok: true },
      });

      // Void transaction
      const voidedTransaction = await transactionService.voidTransaction(
        transaction.id,
      );

      expect(voidedTransaction.statusTransaksi).toBe(
        TransactionStatus.DIBATALKAN,
      );
      expect(voidedTransaction.dibatalkanPada).toBeDefined();

      // Verify stok kembali
      const stokAfterVoid = await prisma.product.findUnique({
        where: { id: testProductId },
        select: { stok: true },
      });
      expect(stokAfterVoid!.stok).toBe(stokBeforeVoid!.stok + 1);
    });

    it('AC-08: BR-13 - Void transaksi lebih dari 24 jam ditolak (VoidWindowExpiredError)', async () => {
      const transaction = await transactionService.createTransaction(
        {
          uangDiterima: 10000,
          items: [{ productId: testProductId, jumlah: 1 }],
        },
        testUserId,
      );

      // Mundurkan createdAt 25 jam → melewati window 24 jam
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
      });

      await expect(
        transactionService.voidTransaction(transaction.id),
      ).rejects.toThrow(VoidWindowExpiredError);

      // Pastikan transaksi tidak berubah status
      const unchanged = await prisma.transaction.findUnique({
        where: { id: transaction.id },
        select: { statusTransaksi: true },
      });
      expect(unchanged!.statusTransaksi).toBe(TransactionStatus.AKTIF);

      // Cleanup transaksi uji agar tidak mengganggu assertion lain
      await prisma.detailTransaction.deleteMany({
        where: { transactionId: transaction.id },
      });
      await prisma.transaction.delete({ where: { id: transaction.id } });
    });

    it('FR-25 + AC-08: Transaksi 23 jam lalu masih dapat di-void (rolling window, bukan hari kalender)', async () => {
      const transaction = await transactionService.createTransaction(
        {
          uangDiterima: 10000,
          items: [{ productId: testProductId, jumlah: 1 }],
        },
        testUserId,
      );

      // 23 jam lalu: sudah beda hari kalender bila dibuat dekat tengah malam,
      // tetapi masih di dalam window 24 jam sehingga harus tetap bisa di-void.
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000) },
      });

      const voided = await transactionService.voidTransaction(transaction.id);
      expect(voided.statusTransaksi).toBe(TransactionStatus.DIBATALKAN);
    });

    it('AC-08: Void transaksi yang sudah dibatalkan harus ditolak', async () => {
      // Create and void transaction
      const transaction = await transactionService.createTransaction(
        {
          uangDiterima: 10000,
          items: [{ productId: testProductId, jumlah: 1 }],
        },
        testUserId,
      );
      await transactionService.voidTransaction(transaction.id);

      // Try to void again
      await expect(
        transactionService.voidTransaction(transaction.id),
      ).rejects.toThrow(BusinessRuleError);
    });

    it('AC-08: Void transaksi UTANG dengan cicilan harus ditolak (Open Question)', async () => {
      // Create UTANG transaction
      const transaction = await transactionService.createTransaction(
        {
          uangDiterima: 0,
          namaPembeli: 'Test Buyer',
          noHpPembeli: '081234567890',
          items: [{ productId: testProductId, jumlah: 1 }],
        },
        testUserId,
      );

      // Add payment (simulate cicilan)
      await prisma.paymentHistory.create({
        data: {
          transactionId: transaction.id,
          jumlahBayar: new Decimal('5000'),
          saldoSetelahBayar: new Decimal('5000'),
          dicatatOlehId: testUserId,
        },
      });

      // Try to void
      await expect(
        transactionService.voidTransaction(transaction.id),
      ).rejects.toThrow(BusinessRuleError);
    });

    it('FR-20 + AC-08: UTANG dengan uang muka (tanpa cicilan) masih bisa di-void dalam window 24 jam', async () => {
      // Opsi A: uang muka disimpan pada Transaction, bukan PaymentHistory,
      // sehingga aturan BR-13 "sudah ada cicilan" tidak memblokir void.
      const transaction = await transactionService.createTransaction(
        {
          uangDiterima: 5000,
          namaPembeli: 'Buyer DP',
          items: [{ productId: testProductId, jumlah: 1 }], // total 10.000
        },
        testUserId,
      );

      expect(transaction.statusPembayaran).toBe(PaymentStatus.UTANG);
      expect(transaction.sisaSaldoUtang?.toString()).toBe('5000');

      const voided = await transactionService.voidTransaction(transaction.id);
      expect(voided.statusTransaksi).toBe(TransactionStatus.DIBATALKAN);
    });

    it('Transaction tidak ditemukan harus throw NotFoundError', async () => {
      await expect(
        transactionService.voidTransaction(
          '00000000-0000-0000-0000-000000000000',
        ),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('Concurrency Safety', () => {
    it('Dua transaksi paralel tidak boleh bikin stok negatif', async () => {
      // Create product dengan stok terbatas
      const limitedProduct = await prisma.product.create({
        data: {
          nama: 'Limited Stock Product',
          kategori: 'Test',
          hargaJual: new Decimal('5000'),
          hargaModal: new Decimal('3000'),
          stok: 5, // Hanya 5 unit
          stokMinimum: 1,
          status: 'AKTIF',
        },
      });

      // Dua transaksi paralel yang masing-masing minta 4 unit
      const promise1 = transactionService.createTransaction(
        {
          uangDiterima: 20000,
          items: [{ productId: limitedProduct.id, jumlah: 4 }],
        },
        testUserId,
      );

      const promise2 = transactionService.createTransaction(
        {
          uangDiterima: 20000,
          items: [{ productId: limitedProduct.id, jumlah: 4 }],
        },
        testUserId,
      );

      // Salah satu harus berhasil, yang lain harus gagal
      const results = await Promise.allSettled([promise1, promise2]);

      const successCount = results.filter((r) => r.status === 'fulfilled')
        .length;
      const failureCount = results.filter((r) => r.status === 'rejected')
        .length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);

      // Verify error adalah StockExceededError
      const failedResult = results.find((r) => r.status === 'rejected') as
        | PromiseRejectedResult
        | undefined;
      if (failedResult) {
        expect(failedResult.reason).toBeInstanceOf(StockExceededError);
      }

      // Verify stok tidak negatif
      const finalProduct = await prisma.product.findUnique({
        where: { id: limitedProduct.id },
      });
      expect(finalProduct!.stok).toBeGreaterThanOrEqual(0);
      expect(finalProduct!.stok).toBe(1); // 5 - 4 = 1

      // Cleanup
      await prisma.detailTransaction.deleteMany({
        where: { productId: limitedProduct.id },
      });
      await prisma.product.delete({ where: { id: limitedProduct.id } });
    });
  });
});
