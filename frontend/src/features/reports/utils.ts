import { useEffect, useMemo, useState } from 'react';
import type { ReportRange } from './types';

/** Tanggal lokal → `YYYY-MM-DD` (query backend terima format tanggal). */
export function toInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function isValidRange(startDate: string, endDate: string): boolean {
  return !!startDate && !!endDate && new Date(startDate) <= new Date(endDate);
}

/** Rentang default: bulan berjalan. */
export function useDefaultMonthRange(): ReportRange {
  return useMemo(() => {
    const now = new Date();
    return { startDate: toInputValue(startOfMonth(now)), endDate: toInputValue(now) };
  }, []);
}

/** Paginasi sisi klien untuk daftar laporan (data laporan sudah termuat utuh dari satu endpoint). */
export function useClientPage<T>(list: T[], size: number) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(list.length / size));
  useEffect(() => {
    setPage(1);
  }, [list]);
  const safe = Math.min(page, totalPages);
  return { page: safe, setPage, totalPages, rows: list.slice((safe - 1) * size, safe * size) };
}