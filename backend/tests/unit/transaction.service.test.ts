/**
 * tests/unit/transaction.service.test.ts
 * Unit tests untuk transaction.service (AC-04, AC-05, AC-06, AC-07, AC-08)
 * BR-05: Stok tidak boleh negatif
 * BR-07: Total dihitung dengan Decimal
 * BR-08: UTANG wajib nama + noHP
 * BR-13: Void window validation
 */

import { PaymentStatus, TransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as transactionService from '../../src/modules/transaction/transaction.service.js';
import { prisma } from '../../src/config/db.js';
import {
  NotFoundError,
  ValidationError,
  StockExceededError,
  VoidWindowExpiredError,
  BusinessRuleError,
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
        statusPembayaran: PaymentStatus.LUNAS,
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
        statusPembayaran: PaymentStatus.UTANG,
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
      ).rejects.toThrow(ValidationError);
    });

    it('AC-05: BR-08 - UTANG tanpa nomor HP harus ditolak', async () => {
      const input = {
        statusPembayaran: PaymentStatus.UTANG,
        namaPembeli: 'Budi',
        items: [
          {
            productId: testProductId,
            jumlah: 5,
          },
        ],
      };

      await expect(
        transactionService.createTransaction(input, testUserId),
      ).rejects.toThrow(ValidationError);
    });

    it('Transaksi LUNAS berhasil tanpa nama/nomor HP', async () => {
      const input = {
        statusPembayaran: PaymentStatus.LUNAS,
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
      expect(transaction.sisaSaldoUtang).toBeNull();
      expect(transaction.items).toHaveLength(1);
      expect(transaction.items[0].jumlah).toBe(2);

      // Verify stok berkurang
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });
      expect(product?.stok).toBeLessThan(100);
    });

    it('Transaksi UTANG berhasil dengan nama dan nomor HP', async () => {
      const input = {
        statusPembayaran: PaymentStatus.UTANG,
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
        statusPembayaran: PaymentStatus.LUNAS,
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
        statusPembayaran: PaymentStatus.LUNAS,
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
        statusPembayaran: PaymentStatus.LUNAS,
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
    let transaction1Id: string;
    let transaction2Id: string;

    beforeAll(async () => {
      // Create test transactions
      const tx1 = await transactionService.createTransaction(
        {
          statusPembayaran: PaymentStatus.LUNAS,
          items: [{ productId: testProductId, jumlah: 1 }],
        },
        testUserId,
      );
      transaction1Id = tx1.id;

      const tx2 = await transactionService.createTransaction(
        {
          statusPembayaran: PaymentStatus.UTANG,
          namaPembeli: 'Test Buyer',
          noHpPembeli: '081234567890',
          items: [{ productId: testProductId, jumlah: 2 }],
        },
        testUserId,
      );
      transaction2Id = tx2.id;
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
          statusPembayaran: PaymentStatus.LUNAS,
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
    it('AC-08: BR-13 - Void transaksi hari ini berhasil', async () => {
      // Create new transaction
      const transaction = await transactionService.createTransaction(
        {
          statusPembayaran: PaymentStatus.LUNAS,
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

    it('AC-08: Void transaksi yang sudah dibatalkan harus ditolak', async () => {
      // Create and void transaction
      const transaction = await transactionService.createTransaction(
        {
          statusPembayaran: PaymentStatus.LUNAS,
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
          statusPembayaran: PaymentStatus.UTANG,
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
          statusPembayaran: PaymentStatus.LUNAS,
          items: [{ productId: limitedProduct.id, jumlah: 4 }],
        },
        testUserId,
      );

      const promise2 = transactionService.createTransaction(
        {
          statusPembayaran: PaymentStatus.LUNAS,
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
