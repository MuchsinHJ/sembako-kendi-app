/**
 * modules/product/product.controller.ts
 * HTTP handlers untuk product endpoints.
 */

import type { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/response.js';
import * as productService from './product.service.js';
import type { ProductWithConsignor } from './product.service.js';
import type { ListProductsQuery } from './product.schema.js';

// ─── Serializer ───────────────────────────────────────────────────────────────

type SerializableProduct =
  | ProductWithConsignor
  | Prisma.ProductGetPayload<object>;

/**
 * Konversi Decimal ke string dan pipihkan relasi penitip menjadi
 * `consignor: { id, nama } | null` sesuai kontrak konsinyasi (Tahap 1).
 * Produk MILIK_SENDIRI maupun hasil raw query (low-stock) → `consignor: null`.
 */
const serializeProduct = (p: SerializableProduct) => ({
  ...p,
  hargaJual: p.hargaJual.toString(),
  hargaModal: p.hargaModal.toString(),
  consignor:
    'consignor' in p && p.consignor
      ? { id: p.consignor.id, nama: p.consignor.nama }
      : null,
});

// ─── GET /products ────────────────────────────────────────────────────────────

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListProductsQuery;
  const result = await productService.listProducts(query);

  sendSuccess(res, 200, {
    data: result.data.map(serializeProduct),
    pagination: result.pagination,
  });
});

// ─── GET /products/:id ────────────────────────────────────────────────────────

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const product = await productService.getProductById(id);

  sendSuccess(res, 200, serializeProduct(product));
});

// ─── POST /products ───────────────────────────────────────────────────────────

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req.body);

  sendSuccess(res, 201, serializeProduct(product));
});

// ─── PUT /products/:id ────────────────────────────────────────────────────────

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const product = await productService.updateProduct(id, req.body);

  sendSuccess(res, 200, serializeProduct(product));
});

// ─── DELETE /products/:id ─────────────────────────────────────────────────────

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await productService.deleteProduct(id);

  sendSuccess(res, 200, { message: 'Produk berhasil dihapus.' });
});

// ─── PATCH /products/:id/status ───────────────────────────────────────────────

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const product = await productService.updateProductStatus(id, req.body);

  sendSuccess(res, 200, serializeProduct(product));
});

// ─── PATCH /products/:id/stock-threshold ──────────────────────────────────────

export const updateStockThreshold = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const product = await productService.updateStockThreshold(id, req.body);

  sendSuccess(res, 200, serializeProduct(product));
});

// ─── GET /products/low-stock ──────────────────────────────────────────────────

export const getLowStockProducts = asyncHandler(async (req: Request, res: Response) => {
  const products = await productService.getLowStockProducts();

  sendSuccess(res, 200, products.map(serializeProduct));
});

// ─── PATCH /products/:id/stock-adjustment ─────────────────────────────────────

export const adjustStock = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const userId = req.user!.id; // dari auth middleware

  const product = await productService.adjustStock(id, req.body, userId);

  sendSuccess(res, 200, serializeProduct(product));
});
