import { z } from 'zod';

export const consignorStatus = z.enum(['AKTIF', 'NONAKTIF']);
export const movementTipe = z.enum(['TERIMA', 'RETUR']);

/** Form tambah/ubah penitip. */
export const consignorFormSchema = z.object({
  nama: z.string().min(1, 'Nama penitip wajib diisi').max(255),
  noHp: z
    .string()
    .max(30, 'No. HP maksimal 30 karakter.')
    .refine((v) => v === '' || /^[0-9+\-\s()]+$/.test(v), 'No. HP tidak valid.')
    .optional(),
  catatan: z.string().max(500, 'Catatan maksimal 500 karakter.').optional(),
});

/** Form catat setoran (BR-D): > 0, ≤ saldo — sisa divalidasi juga di server. */
export const makeSetoranSchema = (saldoAktif: number) =>
  z.object({
    jumlahBayar: z
      .string()
      .min(1, 'Nominal setoran harus lebih dari Rp0.')
      .refine((v) => Number(v) > 0, 'Nominal setoran harus lebih dari Rp0.')
      .refine(
        (v) => Number(v) <= saldoAktif,
        `Nominal setoran melebihi saldo kewajiban. Saldo saat ini Rp${saldoAktif.toLocaleString('id-ID')}.`
      ),
    catatan: z.string().max(500, 'Catatan maksimal 500 karakter.').optional(),
  });

/** Form terima/retur titipan (BR-C / BR-I). */
export const movementSchema = z.object({
  productId: z.string().uuid('Produk tidak valid.'),
  jumlah: z
    .number({ message: 'Jumlah wajib diisi.' })
    .int('Jumlah harus bilangan bulat.')
    .positive('Jumlah harus lebih besar dari 0.'),
  catatan: z.string().max(500, 'Catatan maksimal 500 karakter.').optional(),
});

export type ConsignorStatus = z.infer<typeof consignorStatus>;
export type MovementTipe = z.infer<typeof movementTipe>;
export type ConsignorFormValues = z.infer<typeof consignorFormSchema>;
export type MovementFormValues = z.infer<typeof movementSchema>;
