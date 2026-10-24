/**
 * modules/consignment/consignment.schema.ts
 * Zod schemas untuk validasi request endpoint penitipan barang (konsinyasi).
 *
 * Referensi: Fitur Penitipan Barang Tahap 1 (BR-A…BR-J).
 */

import { z } from 'zod';
import {
  ConsignorStatus,
  ConsignmentMovementType,
} from '@prisma/client';

// ─── Komponen bersama ─────────────────────────────────────────────────────────

const paginationFields = {
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
};

const idParam = z.object({
  id: z.string().uuid('ID penitip harus berformat UUID'),
});

const tanggalQuery = (label: string) =>
  z
    .string()
    .optional()
    .refine((val) => val === undefined || !isNaN(Date.parse(val)), {
      message: `Format ${label} harus berupa tanggal yang valid (mis. YYYY-MM-DD atau ISO 8601)`,
    });

// ─── GET /consignors (list) ───────────────────────────────────────────────────

export const listConsignorsSchema = {
  query: z.object({
    status: z.nativeEnum(ConsignorStatus).optional(),
    search: z.string().optional(),
    /**
     * Tahap 2: `punyaSaldo=true` hanya menampilkan penitip dengan saldo ≠ 0.
     * Dipakai agar penitip NONAKTIF yang masih punya saldo tidak "hilang".
     */
    punyaSaldo: z
      .enum(['true', 'false'])
      .optional()
      .transform((val) => (val === undefined ? undefined : val === 'true')),
    ...paginationFields,
  }),
};

// ─── GET /consignors/:id ──────────────────────────────────────────────────────

export const getConsignorSchema = {
  params: idParam,
};

// ─── POST /consignors ─────────────────────────────────────────────────────────

export const createConsignorSchema = {
  body: z.object({
    nama: z.string().min(1, 'Nama penitip wajib diisi').max(255),
    noHp: z.string().max(30).nullable().optional(),
    catatan: z.string().max(500).nullable().optional(),
  }),
};

// ─── PUT /consignors/:id ──────────────────────────────────────────────────────

export const updateConsignorSchema = {
  params: idParam,
  body: z.object({
    nama: z.string().min(1).max(255).optional(),
    noHp: z.string().max(30).nullable().optional(),
    catatan: z.string().max(500).nullable().optional(),
  }),
};

// ─── PATCH /consignors/:id/status ─────────────────────────────────────────────

export const updateConsignorStatusSchema = {
  params: idParam,
  body: z.object({
    status: z.nativeEnum(ConsignorStatus),
  }),
};

// ─── POST /consignment/receipts ───────────────────────────────────────────────

export const createReceiptSchema = {
  body: z.object({
    productId: z.string().uuid('ID produk harus berformat UUID'),
    jumlah: z
      .number()
      .int('Jumlah harus bilangan bulat')
      .positive('Jumlah harus lebih besar dari 0'),
    catatan: z.string().max(500).nullable().optional(),
  }),
};

// ─── POST /consignment/returns ────────────────────────────────────────────────

export const createReturnSchema = createReceiptSchema;

// ─── GET /consignment/movements ───────────────────────────────────────────────

export const listMovementsSchema = {
  query: z.object({
    consignorId: z.string().uuid('ID penitip harus berformat UUID').optional(),
    productId: z.string().uuid('ID produk harus berformat UUID').optional(),
    tipe: z.nativeEnum(ConsignmentMovementType).optional(),
    startDate: tanggalQuery('startDate'),
    endDate: tanggalQuery('endDate'),
    ...paginationFields,
  }),
};

// ─── GET /consignors/:id/balance (Tahap 2) ────────────────────────────────────

export const getConsignorBalanceSchema = {
  params: idParam,
};

// ─── GET /consignors/:id/payments (Tahap 2) ───────────────────────────────────

export const listConsignorPaymentsSchema = {
  params: idParam,
  query: z.object({
    ...paginationFields,
  }),
};

// ─── POST /consignors/:id/payments (Tahap 2) ──────────────────────────────────

export const createConsignorPaymentSchema = {
  params: idParam,
  body: z.object({
    jumlahBayar: z
      .number()
      .positive('Jumlah setoran harus lebih besar dari 0')
      .refine(
        (val) => {
          // Sesuai kolom Decimal(12,2)
          const decimalPart = val.toString().split('.')[1];
          return !decimalPart || decimalPart.length <= 2;
        },
        { message: 'Jumlah setoran maksimal 2 angka desimal' },
      ),
    catatan: z.string().max(500).nullable().optional(),
  }),
};

// ─── GET /reports/consignment (Tahap 2) ───────────────────────────────────────

/** Query schema laporan konsinyasi (dipakai langsung oleh `validate({ query })`). */
export const consignmentReportQuerySchema = z
  .object({
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message:
        'Format startDate harus berupa tanggal yang valid (mis. YYYY-MM-DD atau ISO 8601)',
    }),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message:
        'Format endDate harus berupa tanggal yang valid (mis. YYYY-MM-DD atau ISO 8601)',
    }),
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: 'startDate harus sebelum atau sama dengan endDate',
    path: ['startDate'],
  });

// ─── Types ────────────────────────────────────────────────────────────────────

export type ListConsignorsQuery = z.infer<typeof listConsignorsSchema.query>;
export type CreateConsignorInput = z.infer<typeof createConsignorSchema.body>;
export type UpdateConsignorInput = z.infer<typeof updateConsignorSchema.body>;
export type UpdateConsignorStatusInput = z.infer<
  typeof updateConsignorStatusSchema.body
>;
export type CreateReceiptInput = z.infer<typeof createReceiptSchema.body>;
export type CreateReturnInput = z.infer<typeof createReturnSchema.body>;
export type ListMovementsQuery = z.infer<typeof listMovementsSchema.query>;
export type ListConsignorPaymentsQuery = z.infer<
  typeof listConsignorPaymentsSchema.query
>;
export type CreateConsignorPaymentInput = z.infer<
  typeof createConsignorPaymentSchema.body
>;
export type ConsignmentReportQuery = z.infer<typeof consignmentReportQuerySchema>;
