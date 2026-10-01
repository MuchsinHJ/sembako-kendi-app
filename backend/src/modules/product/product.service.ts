/**
 * modules/product/product.service.ts
 * Business logic untuk manajemen produk dan stok.
 * BR-03: hargaJual > 0
 * BR-04: stok >= 0
 * BR-12: delete produk dengan transaksi ditolak
 * BR-15: low-stock = stok <= stokMinimum
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db.js';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../utils/errors.js';
import { ProductHasTransactionError } from '../../utils/errors.js';
import type {
  ListProductsQuery,
  CreateProductInput,
  UpdateProductInput,
  UpdateStatusInput,
  UpdateStockThresholdInput,
  StockAdjustmentInput,
} from './product.schema.js';
import type { IObjectStorage } from './storage.interface.js';
import { FakeObjectStorage } from './storage.interface.js';

// Singleton fake storage untuk Fase 5
const storage: IObjectStorage = new FakeObjectStorage();

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── List Products ────────────────────────────────────────────────────────────

export const listProducts = async (
  query: ListProductsQuery,
): Promise<PaginatedResult<Prisma.ProductGetPayload<object>>> => {
  const { kategori, status, search, page = 1, limit = 20 } = query;

  const where: Prisma.ProductWhereInput = {};

  if (kategori) {
    where.kategori = kategori;
  }

  if (status) {
    where.status = status;
  }

  if (search) {
    where.nama = {
      contains: search,
      mode: 'insensitive',
    };
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ─── Get Product by ID ────────────────────────────────────────────────────────

export const getProductById = async (id: string) => {
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new NotFoundError(`Produk dengan ID ${id} tidak ditemukan.`);
  }

  return product;
};

// ─── Create Product ───────────────────────────────────────────────────────────

export const createProduct = async (input: CreateProductInput) => {
  const { nama, kategori, hargaJual, hargaModal, stok, stokMinimum } = input;

  // BR-03: hargaJual > 0
  const hargaJualDecimal = new Prisma.Decimal(hargaJual);
  if (hargaJualDecimal.lte(0)) {
    throw new ValidationError('Harga jual harus lebih besar dari 0.');
  }

  const hargaModalDecimal = new Prisma.Decimal(hargaModal);
  if (hargaModalDecimal.lte(0)) {
    throw new ValidationError('Harga modal harus lebih besar dari 0.');
  }

  // BR-04: stok >= 0 (sudah divalidasi Zod, double check di service)
  if (stok < 0) {
    throw new ValidationError('Stok tidak boleh negatif.');
  }

  const product = await prisma.product.create({
    data: {
      nama,
      kategori,
      hargaJual: hargaJualDecimal,
      hargaModal: hargaModalDecimal,
      stok,
      stokMinimum,
    },
  });

  return product;
};

// ─── Update Product ───────────────────────────────────────────────────────────

export const updateProduct = async (id: string, input: UpdateProductInput) => {
  // Cek produk ada
  await getProductById(id);

  const updateData: Prisma.ProductUpdateInput = {};

  if (input.nama !== undefined) {
    updateData.nama = input.nama;
  }

  if (input.kategori !== undefined) {
    updateData.kategori = input.kategori;
  }

  if (input.hargaJual !== undefined) {
    const hargaJualDecimal = new Prisma.Decimal(input.hargaJual);
    if (hargaJualDecimal.lte(0)) {
      throw new ValidationError('Harga jual harus lebih besar dari 0.');
    }
    updateData.hargaJual = hargaJualDecimal;
  }

  if (input.hargaModal !== undefined) {
    const hargaModalDecimal = new Prisma.Decimal(input.hargaModal);
    if (hargaModalDecimal.lte(0)) {
      throw new ValidationError('Harga modal harus lebih besar dari 0.');
    }
    updateData.hargaModal = hargaModalDecimal;
  }

  if (input.stokMinimum !== undefined) {
    updateData.stokMinimum = input.stokMinimum;
  }

  // PENTING: stok TIDAK boleh diubah di sini
  // Stok hanya berubah lewat transaksi, void, atau stock-adjustment

  const product = await prisma.product.update({
    where: { id },
    data: updateData,
  });

  return product;
};

// ─── Delete Product ───────────────────────────────────────────────────────────

export const deleteProduct = async (id: string): Promise<void> => {
  const product = await getProductById(id);

  // BR-12: Cek apakah produk punya DetailTransaction
  const detailCount = await prisma.detailTransaction.count({
    where: { productId: id },
  });

  if (detailCount > 0) {
    throw new ProductHasTransactionError(
      'Produk tidak dapat dihapus karena sudah memiliki riwayat transaksi.',
    );
  }

  // Hapus foto di R2 jika ada (menggunakan fake storage di Fase 5)
  if (product.fotoKey) {
    await storage.deleteObject(product.fotoKey);
  }

  // Hard delete
  await prisma.product.delete({
    where: { id },
  });
};

// ─── Update Status ────────────────────────────────────────────────────────────

export const updateProductStatus = async (id: string, input: UpdateStatusInput) => {
  await getProductById(id);

  const product = await prisma.product.update({
    where: { id },
    data: { status: input.status },
  });

  return product;
};

// ─── Update Stock Threshold ───────────────────────────────────────────────────

export const updateStockThreshold = async (
  id: string,
  input: UpdateStockThresholdInput,
) => {
  await getProductById(id);

  const product = await prisma.product.update({
    where: { id },
    data: { stokMinimum: input.stokMinimum },
  });

  return product;
};

// ─── Get Low Stock Products ───────────────────────────────────────────────────

export const getLowStockProducts = async () => {
  // BR-15: low-stock dihitung saat query (stok <= stokMinimum)
  // Karena Prisma tidak support column comparison langsung, gunakan raw query
  const products = await prisma.$queryRaw<Prisma.ProductGetPayload<object>[]>`
    SELECT * FROM "Product"
    WHERE "stok" <= "stokMinimum"
      AND "status" = 'AKTIF'
    ORDER BY "stok" ASC
  `;

  return products;
};

// ─── Stock Adjustment ─────────────────────────────────────────────────────────

export const adjustStock = async (
  id: string,
  input: StockAdjustmentInput,
  userId: string,
) => {
  const { delta, alasan } = input;

  // Jalankan dalam transaction
  const result = await prisma.$transaction(async (tx) => {
    // Lock produk dan baca stok terkini
    const product = await tx.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundError(`Produk dengan ID ${id} tidak ditemukan.`);
    }

    const stokSebelum = product.stok;
    const stokSesudah = stokSebelum + delta;

    // BR-04: stok hasil tidak boleh negatif
    if (stokSesudah < 0) {
      throw new BusinessRuleError(
        `Penyesuaian stok ditolak. Stok hasil (${stokSesudah}) tidak boleh negatif.`,
      );
    }

    // Update stok produk
    const updatedProduct = await tx.product.update({
      where: { id },
      data: { stok: stokSesudah },
    });

    // Catat ke StockAdjustment untuk audit
    await tx.stockAdjustment.create({
      data: {
        productId: id,
        delta,
        alasan,
        stokSebelum,
        stokSesudah,
        dicatatOlehId: userId,
      },
    });

    return updatedProduct;
  });

  return result;
};
