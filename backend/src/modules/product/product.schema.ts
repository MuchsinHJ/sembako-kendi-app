/**
 * modules/product/product.schema.ts
 * Zod schemas untuk validasi request product endpoints.
 */

import { z } from 'zod';
import { ProductStatus, ProductType } from '@prisma/client';

// ─── GET /products (list) ─────────────────────────────────────────────────────
export const listProductsSchema = {
  query: z.object({
    kategori: z.string().optional(),
    status: z.nativeEnum(ProductStatus).optional(),
    // Filter konsinyasi (Tahap 1)
    tipe: z.nativeEnum(ProductType).optional(),
    consignorId: z.string().uuid('ID penitip harus berformat UUID').optional(),
    search: z.string().optional(),
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)).pipe(z.number().int().positive()),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)).pipe(z.number().int().positive().max(100)),
  }),
};

// ─── GET /products/:id ────────────────────────────────────────────────────────
export const getProductSchema = {
  params: z.object({
    id: z.string().uuid('ID produk harus berformat UUID'),
  }),
};

// ─── POST /products (create) ──────────────────────────────────────────────────
export const createProductSchema = {
  body: z
    .object({
      nama: z.string().min(1, 'Nama produk wajib diisi').max(255),
      kategori: z.string().min(1, 'Kategori wajib diisi').max(100),
      hargaJual: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Harga jual harus format desimal valid'),
      hargaModal: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Harga modal harus format desimal valid'),
      stok: z.number().int().min(0, 'Stok tidak boleh negatif').default(0),
      stokMinimum: z.number().int().min(0, 'Stok minimum tidak boleh negatif').default(0),
      // BR-A: default MILIK_SENDIRI agar kompatibel dengan klien lama.
      tipe: z.nativeEnum(ProductType).default(ProductType.MILIK_SENDIRI),
      consignorId: z.string().uuid('ID penitip harus berformat UUID').nullable().optional(),
    })
    .refine(
      (data) => data.tipe !== ProductType.TITIPAN || !!data.consignorId,
      {
        message: 'Produk titipan wajib memiliki consignorId (BR-A).',
        path: ['consignorId'],
      },
    )
    .refine(
      (data) => data.tipe !== ProductType.MILIK_SENDIRI || !data.consignorId,
      {
        message: 'Produk milik sendiri tidak boleh memiliki consignorId (BR-A).',
        path: ['consignorId'],
      },
    ),
};

// ─── PUT /products/:id (update) ───────────────────────────────────────────────
export const updateProductSchema = {
  params: z.object({
    id: z.string().uuid('ID produk harus berformat UUID'),
  }),
  body: z.object({
    nama: z.string().min(1).max(255).optional(),
    kategori: z.string().min(1).max(100).optional(),
    hargaJual: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    hargaModal: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    stokMinimum: z.number().int().min(0).optional(),
    // stok TIDAK ADA di sini - hanya berubah lewat transaksi/adjustment.
    // BR-A: tipe & consignorId immutable — ditolak di service bila dikirim.
    tipe: z.nativeEnum(ProductType).optional(),
    consignorId: z.string().uuid().nullable().optional(),
  }),
};

// ─── DELETE /products/:id ─────────────────────────────────────────────────────
export const deleteProductSchema = {
  params: z.object({
    id: z.string().uuid('ID produk harus berformat UUID'),
  }),
};

// ─── PATCH /products/:id/status ───────────────────────────────────────────────
export const updateStatusSchema = {
  params: z.object({
    id: z.string().uuid('ID produk harus berformat UUID'),
  }),
  body: z.object({
    status: z.nativeEnum(ProductStatus),
  }),
};

// ─── PATCH /products/:id/stock-threshold ──────────────────────────────────────
export const updateStockThresholdSchema = {
  params: z.object({
    id: z.string().uuid('ID produk harus berformat UUID'),
  }),
  body: z.object({
    stokMinimum: z.number().int().min(0, 'Stok minimum tidak boleh negatif'),
  }),
};

// ─── PATCH /products/:id/stock-adjustment ─────────────────────────────────────
export const stockAdjustmentSchema = {
  params: z.object({
    id: z.string().uuid('ID produk harus berformat UUID'),
  }),
  body: z.object({
    delta: z.number().int().refine((val) => val !== 0, 'Delta tidak boleh nol'),
    alasan: z.string().min(1, 'Alasan wajib diisi untuk audit'),
  }),
};

// ─── Types ────────────────────────────────────────────────────────────────────
export type ListProductsQuery = z.infer<typeof listProductsSchema.query>;
export type CreateProductInput = z.infer<typeof createProductSchema.body>;
export type UpdateProductInput = z.infer<typeof updateProductSchema.body>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema.body>;
export type UpdateStockThresholdInput = z.infer<typeof updateStockThresholdSchema.body>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema.body>;
