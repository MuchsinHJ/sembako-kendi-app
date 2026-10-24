/**
 * utils/date.ts
 * Helpers tanggal & waktu menggunakan date-fns + date-fns-tz (SDD §3.13).
 * Semua operasi yang melibatkan "hari kalender" (mis. batas "hari ini"/"bulan
 * berjalan" dashboard, rentang laporan) wajib memakai fungsi ini agar konsisten
 * di zona Asia/Jakarta. Void window (BR-13) bersifat rolling 24 jam sehingga
 * memakai `isWithinHoursWindow` (selisih epoch, bebas zona waktu).
 */

import { startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { toZonedTime, fromZonedTime, format as formatTZ } from 'date-fns-tz';

export const TIMEZONE = 'Asia/Jakarta';

// ─── Helpers utama ────────────────────────────────────────────────────────────

/** Waktu saat ini (UTC Date) */
export const getNow = (): Date => new Date();

/**
 * Konversi UTC Date ke representasi "zoned" Asia/Jakarta.
 * Gunakan untuk kalkulasi batas hari, bukan untuk penyimpanan.
 */
export const toJakartaTime = (date: Date): Date =>
  toZonedTime(date, TIMEZONE);

/**
 * Format Date ke string dengan timezone Jakarta.
 * @param formatStr - format date-fns, default ISO-like
 */
export const formatJakarta = (
  date: Date,
  formatStr: string = "yyyy-MM-dd'T'HH:mm:ssxxx",
): string => formatTZ(toJakartaTime(date), formatStr, { timeZone: TIMEZONE });

// ─── Boundary helpers ─────────────────────────────────────────────────────────

/** Awal hari (00:00:00) dalam zona Jakarta, dikembalikan sebagai UTC Date */
export const getStartOfDayJakarta = (date: Date = getNow()): Date => {
  const zoned = toZonedTime(date, TIMEZONE);
  return fromZonedTime(startOfDay(zoned), TIMEZONE);
};

/** Akhir hari (23:59:59.999) dalam zona Jakarta, dikembalikan sebagai UTC Date */
export const getEndOfDayJakarta = (date: Date = getNow()): Date => {
  const zoned = toZonedTime(date, TIMEZONE);
  return fromZonedTime(endOfDay(zoned), TIMEZONE);
};

/** Awal bulan dalam zona Jakarta, dikembalikan sebagai UTC Date */
export const getStartOfMonthJakarta = (date: Date = getNow()): Date => {
  const zoned = toZonedTime(date, TIMEZONE);
  return fromZonedTime(startOfMonth(zoned), TIMEZONE);
};

/** Akhir bulan dalam zona Jakarta, dikembalikan sebagai UTC Date */
export const getEndOfMonthJakarta = (date: Date = getNow()): Date => {
  const zoned = toZonedTime(date, TIMEZONE);
  return fromZonedTime(endOfMonth(zoned), TIMEZONE);
};

/**
 * Cek apakah `reference` masih berada dalam rentang `hours` jam **setelah**
 * `target`. Diperkenalkan untuk void window BR-13 (revisi: 24 jam sejak
 * transaksi dibuat), yang bersifat rolling window — bukan batas hari kalender.
 *
 * Perhitungan memakai selisih epoch (UTC), sehingga tidak terpengaruh zona
 * waktu maupun pergantian hari kalender.
 *
 * @returns `false` bila `reference` lebih awal dari `target` (selisih negatif).
 */
export const isWithinHoursWindow = (
  target: Date,
  reference: Date,
  hours: number,
): boolean => {
  const diffMs = reference.getTime() - target.getTime();
  return diffMs >= 0 && diffMs <= hours * 60 * 60 * 1000;
};
