/**
 * modules/product/product.service.ts
 * Business logic untuk manajemen produk dan stok.
 * BR-03: hargaJual > 0
 * BR-04: stok >= 0
 * BR-12: delete produk dengan transaksi ditolak
 * BR-15: low-stock = stok <= stokMinimum
 *
 * Konsinyasi (Tahap 1):
 * BR-A: TITIPAN wajib consignorId, MILIK_SENDIRI wajib null; keduanya immutable
 * BR-B: produk TITIPAN wajib hargaJual >= hargaModal (harga setor)
 * BR-G: consignor NONAKTIF tidak boleh dipakai untuk produk titipan baru
 * BR-H: produk TITIPAN hanya NONAKTIF bila stok 0; AKTIF hanya bila consignor AKTIF
 * BR-J: produk titipan yang punya riwayat tetap tidak bisa di-hard-delete
 */

import { Prisma, ProductStatus, ProductType, ConsignorStatus } from '@prisma/client';
import { prisma } from '../../config/db.js';
import {
  NotFoundError,
  ValidationError,
  BusinessRuleError,
  ProductHasTransactionError,
  ConsignorInactiveError,
  ProductHasStockError,
} from '../../utils/errors.js';
import type {
  ListProductsQuery,
  CreateProductInput,
  UpdateProductInput,
  UpdateStatusInput,
  UpdateStockThresholdInput,
  StockAdjustmentInput,
} from './product.schema.js';
// Import real media service for photo deletion (Fase 6)
import { deletePhotoOnProductDelete } from '../media/media.service.js';

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

/** Produk beserta penitip (null untuk MILIK_SENDIRI) untuk response. */
export type ProductWithConsignor = Prisma.ProductGetPayload<{
  include: {
    consignor: {
      select: {
        id: true;
        nama: true;
        status: true;
      };
    };
  };
}>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * BR-B: harga jual produk titipan tidak boleh di bawah harga setor.
 * Dipanggil saat create dan saat harga berubah pada update.
 */
const assertSellingPriceNotBelowCost = (
  tipe: ProductType,
  hargaJual: Prisma.Decimal,
  hargaModal: Prisma.Decimal,
): void => {
  if (tipe === ProductType.TITIPAN && hargaJual.lt(hargaModal)) {
    throw new BusinessRuleError(
      'Harga jual produk titipan tidak boleh lebih rendah dari harga setor ke penitip (BR-B).',
    );
  }
};

/**
 * BR-G: penitip harus ada dan berstatus AKTIF untuk operasi yang menuntutnya
 * (membuat produk titipan baru, menerima titipan, mengaktifkan produk titipan).
 */
const assertConsignorActive = async (consignorId: string): Promise<void> => {
  const consignor = await prisma.consignor.findUnique({
    where: { id: consignorId },
    select: { id: true, status: true },
  });

  if (!consignor) {
    throw new NotFoundError(`Penitip dengan ID ${consignorId} tidak ditemukan.`);
  }

  if (consignor.status !== ConsignorStatus.AKTIF) {
    throw new ConsignorInactiveError(
      'Penitip berstatus NONAKTIF sehingga tidak dapat dipakai untuk produk titipan baru (BR-G).',
    );
  }
};

// ─── List Products ────────────────────────────────────────────────────────────

export const listProducts = async (
  query: ListProductsQuery,
): Promise<PaginatedResult<ProductWithConsignor>> => {
  const { kategori, status, tipe, consignorId, search, page = 1, limit = 20 } = query;

  const where: Prisma.ProductWhereInput = {};

  if (kategori) {
    where.kategori = kategori;
  }

  if (status) {
    where.status = status;
  }

  // Filter konsinyasi (Tahap 1)
  if (tipe) {
    where.tipe = tipe;
  }

  if (consignorId) {
    where.consignorId = consignorId;
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
      include: {
        consignor: {
          select: { id: true, nama: true, status: true },
        },
      },
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

export const getProductById = async (id: string): Promise<ProductWithConsignor> => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      consignor: {
        select: { id: true, nama: true, status: true },
      },
    },
  });

  if (!product) {
    throw new NotFoundError(`Produk dengan ID ${id} tidak ditemukan.`);
  }

  return product;
};

// ─── Create Product ───────────────────────────────────────────────────────────

export const createProduct = async (input: CreateProductInput) => {
  const {
    nama,
    kategori,
    hargaJual,
    hargaModal,
    stok,
    stokMinimum,
    tipe,
    consignorId,
  } = input;

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

  // BR-A: konsistensi tipe terhadap consignorId
  const isTitipan = tipe === ProductType.TITIPAN;
  if (isTitipan && !consignorId) {
    throw new BusinessRuleError(
      'Produk titipan wajib memiliki penitip (consignorId) (BR-A).',
    );
  }
  if (!isTitipan && consignorId) {
    throw new BusinessRuleError(
      'Produk milik sendiri tidak boleh memiliki penitip (consignorId) (BR-A).',
    );
  }

  // BR-G: penitip harus AKTIF saat membuat produk titipan baru
  if (isTitipan && consignorId) {
    await assertConsignorActive(consignorId);
  }

  // BR-B: harga jual >= harga setor untuk produk titipan
  assertSellingPriceNotBelowCost(tipe, hargaJualDecimal, hargaModalDecimal);

  const product = await prisma.product.create({
    data: {
      nama,
      kategori,
      hargaJual: hargaJualDecimal,
      hargaModal: hargaModalDecimal,
      stok,
      stokMinimum,
      tipe,
      consignorId: consignorId ?? null,
    },
    include: {
      consignor: {
        select: { id: true, nama: true, status: true },
      },
    },
  });

  return product;
};

// ─── Update Product ───────────────────────────────────────────────────────────

export const updateProduct = async (id: string, input: UpdateProductInput) => {
  const existing = await getProductById(id);

  // BR-A: tipe & consignorId immutable setelah produk dibuat
  if (input.tipe !== undefined && input.tipe !== existing.tipe) {
    throw new BusinessRuleError(
      'Tipe produk tidak dapat diubah setelah produk dibuat (BR-A).',
    );
  }

  if (
    input.consignorId !== undefined &&
    (input.consignorId ?? null) !== existing.consignorId
  ) {
    throw new BusinessRuleError(
      'Penitip produk tidak dapat diubah setelah produk dibuat (BR-A).',
    );
  }

  const updateData: Prisma.ProductUpdateInput = {};

  if (input.nama !== undefined) {
    updateData.nama = input.nama;
  }

  if (input.kategori !== undefined) {
    updateData.kategori = input.kategori;
  }

  const nextHargaJual =
    input.hargaJual !== undefined
      ? new Prisma.Decimal(input.hargaJual)
      : existing.hargaJual;

  if (input.hargaJual !== undefined) {
    if (nextHargaJual.lte(0)) {
      throw new ValidationError('Harga jual harus lebih besar dari 0.');
    }
    updateData.hargaJual = nextHargaJual;
  }

  const nextHargaModal =
    input.hargaModal !== undefined
      ? new Prisma.Decimal(input.hargaModal)
      : existing.hargaModal;

  if (input.hargaModal !== undefined) {
    if (nextHargaModal.lte(0)) {
      throw new ValidationError('Harga modal harus lebih besar dari 0.');
    }
    updateData.hargaModal = nextHargaModal;
  }

  // BR-B: tetap diperiksa saat harga berubah pada produk titipan
  if (input.hargaJual !== undefined || input.hargaModal !== undefined) {
    assertSellingPriceNotBelowCost(existing.tipe, nextHargaJual, nextHargaModal);
  }

  if (input.stokMinimum !== undefined) {
    updateData.stokMinimum = input.stokMinimum;
  }

  // PENTING: stok TIDAK boleh diubah di sini
  // Stok hanya berubah lewat transaksi, void, stock-adjustment, atau konsinyasi

  const product = await prisma.product.update({
    where: { id },
    data: updateData,
    include: {
      consignor: {
        select: { id: true, nama: true, status: true },
      },
    },
  });

  return product;
};

// ─── Delete Product ───────────────────────────────────────────────────────────

export const deleteProduct = async (id: string): Promise<void> => {
  const product = await getProductById(id);

  // BR-12 / BR-J: Cek apakah produk punya DetailTransaction
  const detailCount = await prisma.detailTransaction.count({
    where: { productId: id },
  });

  if (detailCount > 0) {
    throw new ProductHasTransactionError(
      'Produk tidak dapat dihapus karena sudah memiliki riwayat transaksi.',
    );
  }

  // Riwayat pergerakan titipan juga membuat produk tidak boleh dihapus
  // (append-only; FK ON DELETE RESTRICT akan menolak, jadi dicek lebih dulu
  // agar klien menerima pesan yang jelas).
  const movementCount = await prisma.consignmentMovement.count({
    where: { productId: id },
  });

  if (movementCount > 0) {
    throw new ProductHasTransactionError(
      'Produk tidak dapat dihapus karena sudah memiliki riwayat penerimaan/retur titipan (BR-J).',
    );
  }

  // Hapus foto di R2 jika ada (Fase 6: real implementation)
  await deletePhotoOnProductDelete(product.fotoKey);

  // Hard delete
  await prisma.product.delete({
    where: { id },
  });
};

// ─── Update Status ────────────────────────────────────────────────────────────

export const updateProductStatus = async (id: string, input: UpdateStatusInput) => {
  const existing = await getProductById(id);

  // BR-H: aturan tambahan khusus produk TITIPAN
  if (existing.tipe === ProductType.TITIPAN) {
    if (input.status === ProductStatus.NONAKTIF && existing.stok > 0) {
      throw new ProductHasStockError(
        `Produk titipan masih memiliki stok ${existing.stok}, sehingga tidak dapat dinonaktifkan (BR-H).`,
      );
    }

    if (input.status === ProductStatus.AKTIF && existing.consignorId) {
      // BR-G: penitip NONAKTIF tidak boleh dipakai mengaktifkan produknya
      await assertConsignorActive(existing.consignorId);
    }
  }

  const product = await prisma.product.update({
    where: { id },
    data: { status: input.status },
    include: {
      consignor: {
        select: { id: true, nama: true, status: true },
      },
    },
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
