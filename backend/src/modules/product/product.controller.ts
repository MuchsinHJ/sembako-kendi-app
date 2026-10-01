/**
 * modules/product/product.controller.ts
 * HTTP handlers untuk product endpoints.
 */

import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/response.js';
import * as productService from './product.service.js';
import type { ListProductsQuery } from './product.schema.js';

// ─── GET /products ────────────────────────────────────────────────────────────

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListProductsQuery;
  const result = await productService.listProducts(query);

  // Convert Decimal to string untuk response
  const data = result.data.map((p) => ({
    ...p,
    hargaJual: p.hargaJual.toString(),
    hargaModal: p.hargaModal.toString(),
  }));

  sendSuccess(res, 200, {
    data,
    pagination: result.pagination,
  });
});

// ─── GET /products/:id ────────────────────────────────────────────────────────

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const product = await productService.getProductById(id);

  sendSuccess(
    res,
    200,
    {
      ...product,
      hargaJual: product.hargaJual.toString(),
      hargaModal: product.hargaModal.toString(),
    },
  );
});

// ─── POST /products ───────────────────────────────────────────────────────────

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req.body);

  sendSuccess(
    res,
    201,
    {
      ...product,
      hargaJual: product.hargaJual.toString(),
      hargaModal: product.hargaModal.toString(),
    },
  );
});

// ─── PUT /products/:id ────────────────────────────────────────────────────────

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const product = await productService.updateProduct(id, req.body);

  sendSuccess(
    res,
    200,
    {
      ...product,
      hargaJual: product.hargaJual.toString(),
      hargaModal: product.hargaModal.toString(),
    },
  );
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

  sendSuccess(
    res,
    200,
    {
      ...product,
      hargaJual: product.hargaJual.toString(),
      hargaModal: product.hargaModal.toString(),
    },
  );
});

// ─── PATCH /products/:id/stock-threshold ──────────────────────────────────────

export const updateStockThreshold = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const product = await productService.updateStockThreshold(id, req.body);

  sendSuccess(
    res,
    200,
    {
      ...product,
      hargaJual: product.hargaJual.toString(),
      hargaModal: product.hargaModal.toString(),
    },
  );
});

// ─── GET /products/low-stock ──────────────────────────────────────────────────

export const getLowStockProducts = asyncHandler(async (req: Request, res: Response) => {
  const products = await productService.getLowStockProducts();

  const data = products.map((p) => ({
    ...p,
    hargaJual: p.hargaJual.toString(),
    hargaModal: p.hargaModal.toString(),
  }));

  sendSuccess(res, 200, data);
});

// ─── PATCH /products/:id/stock-adjustment ─────────────────────────────────────

export const adjustStock = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const userId = req.user!.id; // dari auth middleware

  const product = await productService.adjustStock(id, req.body, userId);

  sendSuccess(
    res,
    200,
    {
      ...product,
      hargaJual: product.hargaJual.toString(),
      hargaModal: product.hargaModal.toString(),
    },
  );
});
