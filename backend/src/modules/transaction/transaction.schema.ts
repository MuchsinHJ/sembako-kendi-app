/**
 * modules/transaction/transaction.schema.ts
 * Zod schemas untuk validasi request transaction endpoints.
 * Fase 7: Create, List, Detail, Void
 */

import { z } from 'zod';
import { PaymentStatus, TransactionStatus } from '@prisma/client';

/**
 * Nilai uang pada request: number >= 0 dengan maksimal 2 angka desimal
 * (sesuai kolom Decimal(12,2)).
 */
const moneyInput = (label: string) =>
  z
    .number()
    .min(0, `${label} tidak boleh negatif`)
    .refine(
      (val) => {
        const decimalPart = val.toString().split('.')[1];
        return !decimalPart || decimalPart.length <= 2;
      },
      { message: `${label} maksimal 2 angka desimal` },
    );

// ─── POST /transactions (create) ──────────────────────────────────────────────

export const createTransactionSchema = {
  body: z.object({
    // Uang tunai yang diserahkan pembeli. Status pembayaran diturunkan dari
    // perbandingan nilai ini dengan total transaksi (lihat transaction.service):
    //   uangDiterima >= total -> LUNAS (kembalian = uangDiterima - total)
    //   uangDiterima <  total -> UTANG (sisaSaldoUtang = total - uangDiterima)
    uangDiterima: moneyInput('Uang diterima'),
    namaPembeli: z.string().min(1).max(255).optional(),
    noHpPembeli: z.string().max(20).optional().nullable(),
    items: z
      .array(
        z.object({
          productId: z.string().uuid('ID produk harus berformat UUID'),
          jumlah: z.number().int().positive('Jumlah harus integer positif'),
        }),
      )
      .min(1, 'Transaksi harus memiliki minimal 1 item'),
  }),
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
