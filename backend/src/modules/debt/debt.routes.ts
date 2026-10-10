/**
 * modules/debt/debt.routes.ts
 * Routes untuk debt endpoints.
 * Semua route memerlukan autentikasi.
 */

import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import * as debtController from './debt.controller.js';
import * as debtSchema from './debt.schema.js';

const router = Router();

// Semua route debt memerlukan autentikasi
router.use(authenticate);

// ─── GET /debts ───────────────────────────────────────────────────────────────
router.get(
  '/',
  validate(debtSchema.listDebtsSchema),
  debtController.listDebts,
);

// ─── GET /debts/:transactionId/payments ───────────────────────────────────────
router.get(
  '/:transactionId/payments',
  validate(debtSchema.getPaymentHistorySchema),
  debtController.getPaymentHistory,
);

// ─── POST /debts/:transactionId/payments ──────────────────────────────────────
router.post(
  '/:transactionId/payments',
  validate(debtSchema.recordPaymentSchema),
  debtController.recordPayment,
);

export default router;
