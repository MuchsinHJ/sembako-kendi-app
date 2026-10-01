/**
 * modules/product/product.routes.ts
 * Routes untuk product & stock endpoints.
 * PENTING: Route statis /low-stock HARUS daftarkan SEBELUM /:id
 */

import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import * as productController from './product.controller.js';
import * as productSchema from './product.schema.js';

const router = Router();

// Semua route product memerlukan autentikasi
router.use(authenticate);

// ─── GET /products/low-stock (HARUS SEBELUM /:id) ────────────────────────────
router.get('/low-stock', productController.getLowStockProducts);

// ─── GET /products ────────────────────────────────────────────────────────────
router.get(
  '/',
  validate(productSchema.listProductsSchema),
  productController.listProducts,
);

// ─── GET /products/:id ────────────────────────────────────────────────────────
router.get(
  '/:id',
  validate(productSchema.getProductSchema),
  productController.getProduct,
);

// ─── POST /products ───────────────────────────────────────────────────────────
router.post(
  '/',
  validate(productSchema.createProductSchema),
  productController.createProduct,
);

// ─── PUT /products/:id ────────────────────────────────────────────────────────
router.put(
  '/:id',
  validate(productSchema.updateProductSchema),
  productController.updateProduct,
);

// ─── DELETE /products/:id ─────────────────────────────────────────────────────
router.delete(
  '/:id',
  validate(productSchema.deleteProductSchema),
  productController.deleteProduct,
);

// ─── PATCH /products/:id/status ───────────────────────────────────────────────
router.patch(
  '/:id/status',
  validate(productSchema.updateStatusSchema),
  productController.updateStatus,
);

// ─── PATCH /products/:id/stock-threshold ──────────────────────────────────────
router.patch(
  '/:id/stock-threshold',
  validate(productSchema.updateStockThresholdSchema),
  productController.updateStockThreshold,
);

// ─── PATCH /products/:id/stock-adjustment ─────────────────────────────────────
router.patch(
  '/:id/stock-adjustment',
  validate(productSchema.stockAdjustmentSchema),
  productController.adjustStock,
);

export default router;
