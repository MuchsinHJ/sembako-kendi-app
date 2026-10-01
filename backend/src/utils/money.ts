/**
 * utils/money.ts
 * Helpers untuk perhitungan uang menggunakan Prisma.Decimal (SDD §3.13, Fase 3 §5).
 *
 * Keputusan arsitektur: semua nilai uang selalu dikirim sebagai STRING desimal
 * di JSON response, bukan number, untuk menghindari masalah presisi float JS.
 * Ini konsisten dengan konvensi yang didokumentasikan di utils/response.ts.
 */

import { Prisma } from '@prisma/client';

/**
 * Konversi nilai (string | number | Decimal) ke Prisma.Decimal.
 * Gunakan ini di service sebelum operasi aritmetika.
 */
export const toDecimal = (
  value: string | number | Prisma.Decimal,
): Prisma.Decimal => new Prisma.Decimal(value);

/**
 * Konversi Decimal ke string desimal untuk dikirim ke client.
 * Mengembalikan null jika input null/undefined.
 */
export const decimalToString = (
  value: Prisma.Decimal | null | undefined,
): string | null => {
  if (value == null) return null;
  return value.toFixed(2); // selalu 2 desimal agar konsisten
};

/**
 * Format Rupiah untuk kebutuhan EKSPOR / LABEL (BR-16).
 * Jangan gunakan ini untuk response JSON API — gunakan decimalToString().
 */
export const formatRupiah = (
  amount: string | number | Prisma.Decimal,
): string => {
  const num = toDecimal(amount).toNumber();
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};
