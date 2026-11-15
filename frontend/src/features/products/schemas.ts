import { z } from 'zod';

/** Enum produk — cermin `ProductType`/`ProductStatus` backend (BR-A). */
export const tipeProduk = z.enum(['MILIK_SENDIRI', 'TITIPAN']);
export const statusProduk = z.enum(['AKTIF', 'NONAKTIF']);

/**
 * Form Tambah/Ubah Produk (SDD FE §6, BR-17/BR-18) + AC-20/AC-21.
 * Backend sumber kebenaran — schema ini untuk umpan balik form saja.
 * `stokAwal` hanya mode tambah; edit tidak mengirim stok (SDD §3.5).
 */
export const productFormSchema = z
  .object({
    nama: z.string().min(1, 'Nama produk wajib diisi'),
    // Trim + rapikan spasi agar " Snack " tidak jadi kategori berbeda.
    kategori: z.string().trim().min(1, 'Kategori wajib dipilih'),
    hargaJual: z.string().refine((v) => Number(v) > 0, 'Harga jual harus lebih dari 0'),
    hargaModal: z.string().min(1, 'Harga modal wajib diisi'),
    stokAwal: z.string().optional(),
    stokMinimum: z.string(),
    tipe: tipeProduk.default('MILIK_SENDIRI'),
    consignorId: z.string().uuid().nullable().optional(),
    foto: z.instanceof(File).nullable().optional(),
  })
  .superRefine((val, ctx) => {
    // BR-18: produk titipan — harga jual ≥ harga setor (hargaModal = harga setor).
    if (val.tipe === 'TITIPAN' && Number(val.hargaJual) < Number(val.hargaModal)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hargaJual'],
        message: 'Harga jual produk titipan harus sama dengan atau lebih tinggi dari harga setor.',
      });
    }
  });

/** Form Sesuaikan Stok (04 §3): arah + jumlah + alasan wajib (audit). */
export const stockAdjustSchema = z
  .object({
    arah: z.enum(['tambah', 'kurangi']),
    jumlah: z.string().refine((v) => Number(v) > 0, 'Jumlah harus lebih dari 0'),
    alasan: z.string(),
    alasanLain: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.alasan === 'Lainnya' && !val.alasanLain?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['alasanLain'],
        message: 'Pilih atau tulis alasan penyesuaian stok.',
      });
    }
  });

export type ProductFormValues = z.infer<typeof productFormSchema>;
export type StockAdjustValues = z.infer<typeof stockAdjustSchema>;
