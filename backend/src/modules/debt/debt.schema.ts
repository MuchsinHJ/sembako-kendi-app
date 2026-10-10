/**
 * modules/debt/debt.schema.ts
 * Zod schemas untuk validasi request debt endpoints.
 * Fase 8: List debts, payment history, record payment
 */

import { z } from 'zod';

// ─── GET /debts (list) ────────────────────────────────────────────────────────

export const listDebtsSchema = {
  query: z.object({
    // Pagination
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .pipe(z.number().int().positive()),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 20))
      .pipe(z.number().int().positive().max(100)),
  }),
};

// ─── GET /debts/:transactionId/payments ───────────────────────────────────────

export const getPaymentHistorySchema = {
  params: z.object({
    transactionId: z.string().uuid('ID transaksi harus berformat UUID'),
  }),
};

// ─── POST /debts/:transactionId/payments ──────────────────────────────────────

export const recordPaymentSchema = {
  params: z.object({
    transactionId: z.string().uuid('ID transaksi harus berformat UUID'),
  }),
  body: z.object({
    jumlahBayar: z
      .number()
      .positive('Jumlah pembayaran harus lebih besar dari 0')
      .refine(
        (val) => {
          // Validasi bahwa number memiliki max 2 decimal places (sesuai Decimal(12,2))
          const decimalPart = val.toString().split('.')[1];
          return !decimalPart || decimalPart.length <= 2;
        },
        {
          message: 'Jumlah pembayaran maksimal 2 angka desimal',
        },
      ),
  }),
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type ListDebtsQuery = z.infer<typeof listDebtsSchema.query>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema.body>;
