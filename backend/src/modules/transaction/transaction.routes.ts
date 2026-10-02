/**
 * modules/transaction/transaction.routes.ts
 * Routes untuk transaction endpoints.
 * Semua route memerlukan autentikasi.
 */

import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import * as transactionController from './transaction.controller.js';
import * as transactionSchema from './transaction.schema.js';

const router = Router();

// Semua route transaction memerlukan autentikasi
router.use(authenticate);

// ─── POST /transactions ───────────────────────────────────────────────────────
router.post(
  '/',
  validate(transactionSchema.createTransactionSchema),
  transactionController.createTransaction,
);

// ─── GET /transactions ────────────────────────────────────────────────────────
router.get(
  '/',
  validate(transactionSchema.listTransactionsSchema),
  transactionController.listTransactions,
);

// ─── GET /transactions/:id ────────────────────────────────────────────────────
router.get(
  '/:id',
  validate(transactionSchema.getTransactionSchema),
  transactionController.getTransaction,
);

// ─── POST /transactions/:id/void ──────────────────────────────────────────────
router.post(
  '/:id/void',
  validate(transactionSchema.voidTransactionSchema),
  transactionController.voidTransaction,
);

export default router;
