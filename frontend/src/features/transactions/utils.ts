import type { Transaction, TransactionItem } from './types';

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

/**
 * Umur transaksi dalam jam + menit sejak createdAt (SRS IR-06: penjelasan void
 * di luar jendela wajib memakai satuan jam, bukan hari kalender).
 */
export function hitungUmurJam(createdAt: string | Date, now: Date = new Date()): string {
  const diffMs = Math.max(0, now.getTime() - new Date(createdAt).getTime());
  const totalMenit = Math.floor(diffMs / 60000);
  const jam = Math.floor(totalMenit / 60);
  const menit = totalMenit % 60;
  if (jam === 0) return `${menit} menit`;
  return menit === 0 ? `${jam} jam` : `${jam} jam ${menit} menit`;
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

/** Format tanggal tanpa jam — untuk nilai Rentang Tanggal (pen: "1 Okt 2026 – 17 Okt 2026"). */
export function formatTanggalPendek(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

/** ISO → `YYYY-MM-DD` lokal, utk `<input type="date">` (hindari geser hari akibat TZ). */
export function isoToInputValue(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Buat ringkasan produk untuk header transaksi (mis. "Beras Ramos 5 kg", "Beras Ramos 5 kg, Kopi Sachet", atau "Beras Ramos 5 kg, Minyak 1 L (+2 lainnya)").
 */
export function ringkasanProdukTransaksi(items?: TransactionItem[]): string {
  if (!items || items.length === 0) return 'Transaksi Penjualan';
  const names = items.map((i) => i.namaProdukSnapshot).filter(Boolean);
  if (names.length === 0) return 'Transaksi Penjualan';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}, ${names[1]}`;
  return `${names[0]}, ${names[1]} (+${names.length - 2} lainnya)`;
}

/**
 * Header transaksi yang deskriptif dan jelas bagi admin:
 * Menampilkan nama pembeli jika ada dan produk yang dibeli.
 * Contoh: "Bu Sri · Beras Ramos 5 kg, Kopi Sachet" atau "Beras Ramos 5 kg, Minyak Goreng 1 L"
 */
export function judulTransaksi(t: Transaction): string {
  const ringkasan = ringkasanProdukTransaksi(t.items);
  if (t.namaPembeli && t.namaPembeli.trim()) {
    return `${t.namaPembeli.trim()} · ${ringkasan}`;
  }
  return ringkasan;
}

/** Format tanggal lengkap dan jam untuk identitas detail (pen Q8YY2: "Sabtu, 17 Oktober 2026 · 09.41"). */
export function formatTanggalLengkap(iso: string): string {
  const d = new Date(iso);
  const tgl = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
  const jam = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d).replace(':', '.');
  return `${tgl} · ${jam}`;
}
