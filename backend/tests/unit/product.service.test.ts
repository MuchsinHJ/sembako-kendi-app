/**
 * tests/unit/product.service.test.ts
 * Unit tests untuk product.service (BR-03, BR-04, BR-12)
 */

import { Prisma } from '@prisma/client';
import * as productService from '../../src/modules/product/product.service.js';
import { prisma } from '../../src/config/db.js';
import { ValidationError, ProductHasTransactionError, BusinessRuleError } from '../../src/utils/errors.js';

describe('Product Service', () => {
  describe('createProduct', () => {
    it('BR-03: hargaJual harus > 0', async () => {
      const input = {
        nama: 'Test Product',
        kategori: 'Test',
        hargaJual: '0', // Tidak valid
        hargaModal: '5000',
        stok: 10,
        stokMinimum: 5,
      };

      await expect(productService.createProduct(input)).rejects.toThrow(ValidationError);
      await expect(productService.createProduct(input)).rejects.toThrow('Harga jual harus lebih besar dari 0');
    });

    it('BR-03: hargaJual negatif ditolak', async () => {
      const input = {
        nama: 'Test Product',
        kategori: 'Test',
        hargaJual: '-100',
        hargaModal: '5000',
        stok: 10,
        stokMinimum: 5,
      };

      await expect(productService.createProduct(input)).rejects.toThrow(ValidationError);
    });

    it('BR-04: stok negatif ditolak', async () => {
      const input = {
        nama: 'Test Product',
        kategori: 'Test',
        hargaJual: '10000',
        hargaModal: '5000',
        stok: -1, // Tidak valid
        stokMinimum: 5,
      };

      await expect(productService.createProduct(input)).rejects.toThrow(ValidationError);
      await expect(productService.createProduct(input)).rejects.toThrow('Stok tidak boleh negatif');
    });

    it('Berhasil membuat produk dengan data valid', async () => {
      const input = {
        nama: 'Produk Valid',
        kategori: 'Makanan',
        hargaJual: '15000',
        hargaModal: '10000',
        stok: 100,
        stokMinimum: 10,
      };

      const product = await productService.createProduct(input);

      expect(product.id).toBeDefined();
      expect(product.nama).toBe(input.nama);
      expect(product.hargaJual.toString()).toBe(input.hargaJual);
      expect(product.stok).toBe(input.stok);

      // Cleanup
      await prisma.product.delete({ where: { id: product.id } });
    });
  });

  describe('updateProduct', () => {
    it('Tidak boleh mengubah stok lewat update (hanya lewat transaksi/adjustment)', async () => {
      // Buat produk dulu
      const product = await prisma.product.create({
        data: {
          nama: 'Test Update',
          kategori: 'Test',
          hargaJual: new Prisma.Decimal('10000'),
          hargaModal: new Prisma.Decimal('5000'),
          stok: 50,
          stokMinimum: 10,
        },
      });

      // Update tidak boleh punya field stok
      const updateInput = {
        nama: 'Test Update Modified',
        hargaJual: '12000',
      };

      const updated = await productService.updateProduct(product.id, updateInput);

      // Stok tidak berubah
      expect(updated.stok).toBe(50);
      expect(updated.nama).toBe('Test Update Modified');

      // Cleanup
      await prisma.product.delete({ where: { id: product.id } });
    });
  });

  describe('deleteProduct', () => {
    it('BR-12: Produk dengan transaksi tidak bisa dihapus', async () => {
      // Buat produk
      const product = await prisma.product.create({
        data: {
          nama: 'Produk Dengan Transaksi',
          kategori: 'Test',
          hargaJual: new Prisma.Decimal('10000'),
          hargaModal: new Prisma.Decimal('5000'),
          stok: 100,
          stokMinimum: 10,
        },
      });

      // Buat user untuk transaksi
      const user = await prisma.user.findFirst();
      if (!user) throw new Error('User tidak ditemukan untuk test');

      // Buat transaksi
      const transaction = await prisma.transaction.create({
        data: {
          dibuatOlehId: user.id,
          total: new Prisma.Decimal('10000'),
          statusTransaksi: 'AKTIF',
          statusPembayaran: 'LUNAS',
          items: {
            create: {
              productId: product.id,
              namaProdukSnapshot: product.nama,
              hargaJualSnapshot: product.hargaJual,
              hargaModalSnapshot: product.hargaModal,
              jumlah: 1,
              subtotal: product.hargaJual,
            },
          },
        },
      });

      // Coba hapus produk → harus ditolak
      await expect(productService.deleteProduct(product.id)).rejects.toThrow(ProductHasTransactionError);
      await expect(productService.deleteProduct(product.id)).rejects.toThrow('sudah memiliki riwayat transaksi');

      // Cleanup
      await prisma.detailTransaction.deleteMany({ where: { transactionId: transaction.id } });
      await prisma.transaction.delete({ where: { id: transaction.id } });
      await prisma.product.delete({ where: { id: product.id } });
    });

    it('BR-12: Produk tanpa transaksi bisa dihapus (hard delete)', async () => {
      const product = await prisma.product.create({
        data: {
          nama: 'Produk Tanpa Transaksi',
          kategori: 'Test',
          hargaJual: new Prisma.Decimal('10000'),
          hargaModal: new Prisma.Decimal('5000'),
          stok: 100,
          stokMinimum: 10,
        },
      });

      await productService.deleteProduct(product.id);

      // Produk benar-benar terhapus
      const deleted = await prisma.product.findUnique({ where: { id: product.id } });
      expect(deleted).toBeNull();
    });
  });

  describe('adjustStock', () => {
    it('BR-04: Stok hasil adjustment tidak boleh negatif', async () => {
      // Buat produk dengan stok 10
      const product = await prisma.product.create({
        data: {
          nama: 'Produk Adjustment',
          kategori: 'Test',
          hargaJual: new Prisma.Decimal('10000'),
          hargaModal: new Prisma.Decimal('5000'),
          stok: 10,
          stokMinimum: 5,
        },
      });

      const user = await prisma.user.findFirst();
      if (!user) throw new Error('User tidak ditemukan untuk test');

      // Coba kurangi stok lebih dari yang ada
      const input = {
        delta: -20, // Hasil: 10 - 20 = -10 (tidak valid)
        alasan: 'Test adjustment negatif',
      };

      await expect(productService.adjustStock(product.id, input, user.id)).rejects.toThrow(BusinessRuleError);
      await expect(productService.adjustStock(product.id, input, user.id)).rejects.toThrow('tidak boleh negatif');

      // Cleanup
      await prisma.product.delete({ where: { id: product.id } });
    });

    it('Adjustment valid berhasil dan tercatat di StockAdjustment', async () => {
      const product = await prisma.product.create({
        data: {
          nama: 'Produk Adjustment Valid',
          kategori: 'Test',
          hargaJual: new Prisma.Decimal('10000'),
          hargaModal: new Prisma.Decimal('5000'),
          stok: 50,
          stokMinimum: 10,
        },
      });

      const user = await prisma.user.findFirst();
      if (!user) throw new Error('User tidak ditemukan untuk test');

      const input = {
        delta: 20,
        alasan: 'Stok opname: temuan di gudang',
      };

      const updated = await productService.adjustStock(product.id, input, user.id);

      expect(updated.stok).toBe(70); // 50 + 20

      // Verifikasi tercatat di StockAdjustment
      const adjustment = await prisma.stockAdjustment.findFirst({
        where: { productId: product.id },
        orderBy: { createdAt: 'desc' },
      });

      expect(adjustment).not.toBeNull();
      expect(adjustment!.delta).toBe(20);
      expect(adjustment!.stokSebelum).toBe(50);
      expect(adjustment!.stokSesudah).toBe(70);
      expect(adjustment!.alasan).toBe(input.alasan);
      expect(adjustment!.dicatatOlehId).toBe(user.id);

      // Cleanup
      await prisma.stockAdjustment.deleteMany({ where: { productId: product.id } });
      await prisma.product.delete({ where: { id: product.id } });
    });
  });
});
