import { z } from 'zod';

/** Enum — cermin `PaymentStatus`/`TransactionStatus` backend. */
export const statusPembayaran = z.enum(['LUNAS', 'UTANG']);
export const statusTransaksi = z.enum(['AKTIF', 'DIBATALKAN']);

/** Form transaksi (BR-08): status diturunkan, nama pembeli wajib saat utang. */
export const createTransactionSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        jumlah: z.number().int().positive(),
      })
    )
    .min(1, 'Keranjang kosong'),
  uangDiterima: z.number().min(0, 'Uang diterima tidak boleh negatif'),
  namaPembeli: z.string().optional(),
  noHpPembeli: z.string().optional().nullable(),
});

/** Form catat cicilan (BR-14): > 0, ≤ sisa utang. */
export const recordPaymentSchema = z.object({
  jumlahBayar: z.string().refine((v) => Number(v) > 0, 'Nominal cicilan harus lebih dari Rp0.'),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
