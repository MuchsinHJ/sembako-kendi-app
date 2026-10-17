/**
 * tests/unit/debt.service.test.ts
 * Unit tests untuk debt.service (AC-10, AC-11, AC-12)
 * BR-14: Validasi overpayment
 * Concurrency test: race condition untuk pembayaran paralel
 */

import { PaymentStatus, TransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as debtService from '../../src/modules/debt/debt.service.js';
import { prisma } from '../../src/config/db.js';
import {
  NotFoundError,
  ValidationError,
  BusinessRuleError,
  DebtOverpaymentError,
} from '../../src/utils/errors.js';

describe('Debt Service', () => {
  let testUserId: string;
  let testProductId: string;
  let testTransactionId: string;

  // Setup: Create test user, product, dan transaction UTANG
  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        nama: 'Test User Debt',
        email: `test-debt-${Date.now()}@example.com`,
        passwordHash: 'dummy_hash',
      },
    });
    testUserId = user.id;

    // Create test product
    const product = await prisma.product.create({
      data: {
        nama: 'Test Product for Debt',
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

  // Cleanup setelah semua test
  afterAll(async () => {
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

    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
  });

  // Reset transaction sebelum setiap test
  beforeEach(async () => {
    // Create fresh transaction UTANG untuk setiap test
    const transaction = await prisma.transaction.create({
      data: {
        statusPembayaran: PaymentStatus.UTANG,
        statusTransaksi: TransactionStatus.AKTIF,
        total: new Decimal('100000'),
        uangDiterima: new Decimal('0'),
        sisaSaldoUtang: new Decimal('100000'),
        namaPembeli: 'Test Customer',
        noHpPembeli: '081234567890',
        dibuatOlehId: testUserId,
        items: {
          create: [
            {
              productId: testProductId,
              namaProdukSnapshot: 'Test Product for Debt',
              jumlah: 10,
              hargaJualSnapshot: new Decimal('10000'),
              hargaModalSnapshot: new Decimal('5000'),
              subtotal: new Decimal('100000'),
            },
          ],
        },
      },
    });
    testTransactionId = transaction.id;
  });

  afterEach(async () => {
    // Cleanup payment history dan transaction untuk test berikutnya
    await prisma.paymentHistory.deleteMany({
      where: { transactionId: testTransactionId },
    });

    await prisma.detailTransaction.deleteMany({
      where: { transactionId: testTransactionId },
    });

    await prisma.transaction.deleteMany({
      where: { id: testTransactionId },
    });
  });

  // ─── List Debts ───────────────────────────────────────────────────────────────

  describe('listDebts', () => {
    it('should return paginated debts with UTANG status and AKTIF', async () => {
      const result = await debtService.listDebts({ page: 1, limit: 20 });

      expect(result.data).toBeInstanceOf(Array);
      expect(result.pagination).toHaveProperty('page', 1);
      expect(result.pagination).toHaveProperty('limit', 20);
      expect(result.pagination).toHaveProperty('total');
      expect(result.pagination).toHaveProperty('totalPages');

      // Verify all transactions are UTANG and AKTIF
      result.data.forEach((transaction) => {
        expect(transaction.statusPembayaran).toBe(PaymentStatus.UTANG);
        expect(transaction.statusTransaksi).toBe(TransactionStatus.AKTIF);
        expect(transaction.sisaSaldoUtang).not.toBeNull();
        expect(transaction.sisaSaldoUtang!.toNumber()).toBeGreaterThan(0);
      });
    });

    it('should not return LUNAS transactions', async () => {
      // Create LUNAS transaction
      await prisma.transaction.create({
        data: {
          statusPembayaran: PaymentStatus.LUNAS,
          statusTransaksi: TransactionStatus.AKTIF,
          total: new Decimal('50000'),
          uangDiterima: new Decimal('50000'),
          kembalian: new Decimal('0'),
          sisaSaldoUtang: new Decimal('0'),
          dibuatOlehId: testUserId,
          items: {
            create: [
              {
                productId: testProductId,
                namaProdukSnapshot: 'Test Product for Debt',
                jumlah: 5,
                hargaJualSnapshot: new Decimal('10000'),
                hargaModalSnapshot: new Decimal('5000'),
                subtotal: new Decimal('50000'),
              },
            ],
          },
        },
      });

      const result = await debtService.listDebts({ page: 1, limit: 20 });

      // Verify no LUNAS in results
      const lunasFound = result.data.some(
        (t) => t.statusPembayaran === PaymentStatus.LUNAS,
      );
      expect(lunasFound).toBe(false);
    });

    it('should not return DIBATALKAN transactions', async () => {
      // Update test transaction to DIBATALKAN
      await prisma.transaction.update({
        where: { id: testTransactionId },
        data: { statusTransaksi: TransactionStatus.DIBATALKAN },
      });

      const result = await debtService.listDebts({ page: 1, limit: 20 });

      // Verify this transaction is not in results
      const foundTransaction = result.data.find(
        (t) => t.id === testTransactionId,
      );
      expect(foundTransaction).toBeUndefined();
    });
  });

  // ─── Get Payment History ──────────────────────────────────────────────────────

  describe('getPaymentHistory', () => {
    it('should return payment history for valid UTANG transaction', async () => {
      // Create payment history
      await prisma.paymentHistory.create({
        data: {
          transactionId: testTransactionId,
          jumlahBayar: new Decimal('30000'),
          saldoSetelahBayar: new Decimal('70000'),
          dicatatOlehId: testUserId,
        },
      });

      const payments = await debtService.getPaymentHistory(testTransactionId);

      expect(payments).toBeInstanceOf(Array);
      expect(payments.length).toBe(1);
      expect(payments[0].jumlahBayar.toString()).toBe('30000');
      expect(payments[0].saldoSetelahBayar.toString()).toBe('70000');
      expect(payments[0].dicatatOlehId).toBe(testUserId);
    });

    it('should throw NotFoundError for non-existent transaction', async () => {
      await expect(
        debtService.getPaymentHistory('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundError);
    });

    it('should return payment history for LUNAS transaction (that was originally UTANG)', async () => {
      // First pay partially
      await debtService.recordPayment(testTransactionId, 50000, testUserId);
      
      // Then pay the rest to make it LUNAS
      await debtService.recordPayment(testTransactionId, 50000, testUserId);

      // Should still be able to view payment history
      const payments = await debtService.getPaymentHistory(testTransactionId);

      expect(payments).toBeInstanceOf(Array);
      expect(payments.length).toBe(2);
    });

    it('should throw ValidationError for cash LUNAS transaction (never UTANG)', async () => {
      // Create cash LUNAS transaction
      const cashTransaction = await prisma.transaction.create({
        data: {
          statusPembayaran: PaymentStatus.LUNAS,
          statusTransaksi: TransactionStatus.AKTIF,
          total: new Decimal('50000'),
          uangDiterima: new Decimal('50000'),
          kembalian: new Decimal('0'),
          sisaSaldoUtang: null, // NULL indicates it was never UTANG
          dibuatOlehId: testUserId,
          items: {
            create: [
              {
                productId: testProductId,
                namaProdukSnapshot: 'Test Product for Debt',
                jumlah: 5,
                hargaJualSnapshot: new Decimal('10000'),
                hargaModalSnapshot: new Decimal('5000'),
                subtotal: new Decimal('50000'),
              },
            ],
          },
        },
      });

      await expect(
        debtService.getPaymentHistory(cashTransaction.id),
      ).rejects.toThrow(ValidationError);
    });

    it('should return empty array for UTANG with no payments', async () => {
      const payments = await debtService.getPaymentHistory(testTransactionId);

      expect(payments).toBeInstanceOf(Array);
      expect(payments.length).toBe(0);
    });
  });

  // ─── Record Payment ───────────────────────────────────────────────────────────

  describe('recordPayment', () => {
    // AC-10: Partial payment reduces balance
    it('AC-10: should reduce sisaSaldoUtang after partial payment (Rp100.000 → Rp60.000)', async () => {
      const result = await debtService.recordPayment(
        testTransactionId,
        40000,
        testUserId,
      );

      expect(result.sisaSaldoUtang?.toString()).toBe('60000');
      expect(result.statusPembayaran).toBe(PaymentStatus.UTANG);
      expect(result.payments.length).toBe(1);
      expect(result.payments[0].jumlahBayar.toString()).toBe('40000');
      expect(result.payments[0].saldoSetelahBayar.toString()).toBe('60000');
    });

    // AC-11: Full payment sets status to LUNAS
    it('AC-11: should set statusPembayaran to LUNAS when fully paid', async () => {
      const result = await debtService.recordPayment(
        testTransactionId,
        100000,
        testUserId,
      );

      expect(result.sisaSaldoUtang?.toString()).toBe('0');
      expect(result.statusPembayaran).toBe(PaymentStatus.LUNAS);
      expect(result.payments.length).toBe(1);
      expect(result.payments[0].saldoSetelahBayar.toString()).toBe('0');
    });

    // AC-12: Overpayment should be rejected
    it('AC-12: should throw DebtOverpaymentError when payment exceeds balance', async () => {
      await expect(
        debtService.recordPayment(testTransactionId, 150000, testUserId),
      ).rejects.toThrow(DebtOverpaymentError);

      // Verify balance unchanged
      const transaction = await prisma.transaction.findUnique({
        where: { id: testTransactionId },
      });
      expect(transaction?.sisaSaldoUtang?.toString()).toBe('100000');
    });

    it('should throw NotFoundError for non-existent transaction', async () => {
      await expect(
        debtService.recordPayment(
          '00000000-0000-0000-0000-000000000000',
          50000,
          testUserId,
        ),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw BusinessRuleError for LUNAS transaction', async () => {
      // Update to LUNAS
      await prisma.transaction.update({
        where: { id: testTransactionId },
        data: {
          statusPembayaran: PaymentStatus.LUNAS,
          sisaSaldoUtang: new Decimal('0'),
        },
      });

      await expect(
        debtService.recordPayment(testTransactionId, 10000, testUserId),
      ).rejects.toThrow(BusinessRuleError);
    });

    it('should throw BusinessRuleError for DIBATALKAN transaction', async () => {
      // Update to DIBATALKAN
      await prisma.transaction.update({
        where: { id: testTransactionId },
        data: { statusTransaksi: TransactionStatus.DIBATALKAN },
      });

      await expect(
        debtService.recordPayment(testTransactionId, 10000, testUserId),
      ).rejects.toThrow(BusinessRuleError);
    });

    it('should create PaymentHistory record (append-only)', async () => {
      await debtService.recordPayment(testTransactionId, 30000, testUserId);
      await debtService.recordPayment(testTransactionId, 20000, testUserId);

      const payments = await prisma.paymentHistory.findMany({
        where: { transactionId: testTransactionId },
        orderBy: { tanggalBayar: 'asc' },
      });

      expect(payments.length).toBe(2);
      expect(payments[0].jumlahBayar.toString()).toBe('30000');
      expect(payments[0].saldoSetelahBayar.toString()).toBe('70000');
      expect(payments[1].jumlahBayar.toString()).toBe('20000');
      expect(payments[1].saldoSetelahBayar.toString()).toBe('50000');
    });

    // Race condition test
    it('CONCURRENCY: two parallel payments should not result in negative balance', async () => {
      // Scenario: saldo Rp100.000, dua pembayaran paralel masing-masing Rp60.000
      // Expected: satu berhasil, satu ditolak dengan DebtOverpaymentError

      const payment1Promise = debtService.recordPayment(
        testTransactionId,
        60000,
        testUserId,
      );
      const payment2Promise = debtService.recordPayment(
        testTransactionId,
        60000,
        testUserId,
      );

      const results = await Promise.allSettled([
        payment1Promise,
        payment2Promise,
      ]);

      // One should succeed, one should fail
      const successCount = results.filter((r) => r.status === 'fulfilled')
        .length;
      const failCount = results.filter((r) => r.status === 'rejected').length;

      expect(successCount).toBe(1);
      expect(failCount).toBe(1);

      // Verify the failed one is DebtOverpaymentError
      const rejectedResult = results.find((r) => r.status === 'rejected') as
        | PromiseRejectedResult
        | undefined;
      expect(rejectedResult?.reason).toBeInstanceOf(DebtOverpaymentError);

      // Verify final balance is correct (40000)
      const finalTransaction = await prisma.transaction.findUnique({
        where: { id: testTransactionId },
      });
      expect(finalTransaction?.sisaSaldoUtang?.toString()).toBe('40000');
      expect(finalTransaction?.statusPembayaran).toBe(PaymentStatus.UTANG);

      // Verify only one payment was recorded
      const payments = await prisma.paymentHistory.findMany({
        where: { transactionId: testTransactionId },
      });
      expect(payments.length).toBe(1);
    });
  });
});
