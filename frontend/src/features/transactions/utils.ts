/**
 * Fungsi murni turunan (SDD FE §8.3) — cermin aturan backend BR-08/BR-13.
 * Digunakan untuk state UI (status pembayaran otomatis, tombol void).
 */

export const VOID_WINDOW_HOURS = 24;

export type StatusPembayaran = 'LUNAS' | 'UTANG';

/** BR-08: status diturunkan dari perbandingan uang diterima vs total. */
export function derivasiStatusPembayaran(
  total: number,
  uangDiterima: number
): StatusPembayaran {
  return uangDiterima >= total ? 'LUNAS' : 'UTANG';
}

/**
 * BR-13: void hanya dalam 24 jam rolling sejak createdAt (waktu server iso
 * `now`; backend memakai selisih epoch, bebas zona waktu).
 */
export function hitungSisaVoid(createdAt: string | Date, now: Date = new Date()): boolean {
  const diffMs = now.getTime() - new Date(createdAt).getTime();
  return diffMs >= 0 && diffMs <= VOID_WINDOW_HOURS * 60 * 60 * 1000;
}

/** Format tanggal id-ID ringkas untuk UI (tanggal, jam). */
export function formatTanggal(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
