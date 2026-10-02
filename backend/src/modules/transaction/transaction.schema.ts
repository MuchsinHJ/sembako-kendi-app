/**
 * modules/transaction/transaction.schema.ts
 * Zod schemas untuk validasi request transaction endpoints.
 * Fase 7: Create, List, Detail, Void
 */

import { z } from 'zod';
import { PaymentStatus, TransactionStatus } from '@prisma/client';

// ─── POST /transactions (create) ──────────────────────────────────────────────

export const createTransactionSchema = {
  body: z.object({
    statusPembayaran: z.nativeEnum(PaymentStatus),
    namaPembeli: z.string().min(1).max(255).optional(),
    noHpPembeli: z.string().min(1).max(20).optional(),
    items: z
      .array(
        z.object({
          productId: z.string().uuid('ID produk harus berformat UUID'),
          jumlah: z.number().int().positive('Jumlah harus integer positif'),
        }),
      )
      .min(1, 'Transaksi harus memiliki minimal 1 item'),
  })
    .refine(
      (data) => {
        // BR-08: Transaksi UTANG wajib memiliki namaPembeli dan noHpPembeli
        if (data.statusPembayaran === 'UTANG') {
          return (
            data.namaPembeli &&
            data.namaPembeli.trim().length > 0 &&
            data.noHpPembeli &&
            data.noHpPembeli.trim().length > 0
          );
        }
        return true;
      },
      {
        message: 'Nama pembeli dan nomor HP wajib diisi untuk transaksi UTANG',
        path: ['namaPembeli'], // Error ditampilkan di field namaPembeli
      },
    ),
};

// ─── GET /transactions (list) ─────────────────────────────────────────────────

export const listTransactionsSchema = {
  query: z.object({
    // Filter periode (ISO 8601 date string)
    startDate: z
      .string()
      .optional()
      .refine(
        (val) => !val || !isNaN(Date.parse(val)),
        'startDate harus berformat ISO 8601 yang valid',
      ),
    endDate: z
      .string()
      .optional()
      .refine(
        (val) => !val || !isNaN(Date.parse(val)),
        'endDate harus berformat ISO 8601 yang valid',
      ),
    statusTransaksi: z.nativeEnum(TransactionStatus).optional(),
    statusPembayaran: z.nativeEnum(PaymentStatus).optional(),
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

// ─── GET /transactions/:id ────────────────────────────────────────────────────

export const getTransactionSchema = {
  params: z.object({
    id: z.string().uuid('ID transaksi harus berformat UUID'),
  }),
};

// ─── POST /transactions/:id/void ──────────────────────────────────────────────

export const voidTransactionSchema = {
  params: z.object({
    id: z.string().uuid('ID transaksi harus berformat UUID'),
  }),
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateTransactionInput = z.infer<typeof createTransactionSchema.body>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsSchema.query>;
