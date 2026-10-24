/**
 * modules/consignment/consignment.routes.ts
 * Routes untuk penitipan barang (konsinyasi).
 *
 * Dua prefix dipakai sesuai kontrak fitur:
 *   /api/v1/consignors   → data penitip
 *   /api/v1/consignment  → penerimaan, retur, riwayat pergerakan
 *
 * Semua route memerlukan autentikasi.
 */

import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import * as consignmentController from './consignment.controller.js';
import * as consignmentSchema from './consignment.schema.js';

// ─── /api/v1/consignors ───────────────────────────────────────────────────────

export const consignorsRouter = Router();

consignorsRouter.use(authenticate);

consignorsRouter.get(
  '/',
  validate(consignmentSchema.listConsignorsSchema),
  consignmentController.listConsignors,
);

consignorsRouter.post(
  '/',
  validate(consignmentSchema.createConsignorSchema),
  consignmentController.createConsignor,
);

consignorsRouter.get(
  '/:id',
  validate(consignmentSchema.getConsignorSchema),
  consignmentController.getConsignor,
);

consignorsRouter.put(
  '/:id',
  validate(consignmentSchema.updateConsignorSchema),
  consignmentController.updateConsignor,
);

consignorsRouter.patch(
  '/:id/status',
  validate(consignmentSchema.updateConsignorStatusSchema),
  consignmentController.updateConsignorStatus,
);

// ─── Saldo & setoran (Tahap 2) ────────────────────────────────────────────────
// PENTING: rute statis `/balance` & `/payments` didaftarkan setelah `/:id`,
// tetapi Express mencocokkan berdasarkan path lengkap sehingga aman.
consignorsRouter.get(
  '/:id/balance',
  validate(consignmentSchema.getConsignorBalanceSchema),
  consignmentController.getConsignorBalance,
);

consignorsRouter.get(
  '/:id/payments',
  validate(consignmentSchema.listConsignorPaymentsSchema),
  consignmentController.listConsignorPayments,
);

consignorsRouter.post(
  '/:id/payments',
  validate(consignmentSchema.createConsignorPaymentSchema),
  consignmentController.createConsignorPayment,
);

// ─── /api/v1/consignment ──────────────────────────────────────────────────────

export const consignmentRouter = Router();

consignmentRouter.use(authenticate);

consignmentRouter.post(
  '/receipts',
  validate(consignmentSchema.createReceiptSchema),
  consignmentController.createReceipt,
);

consignmentRouter.post(
  '/returns',
  validate(consignmentSchema.createReturnSchema),
  consignmentController.createReturn,
);

consignmentRouter.get(
  '/movements',
  validate(consignmentSchema.listMovementsSchema),
  consignmentController.listMovements,
);
