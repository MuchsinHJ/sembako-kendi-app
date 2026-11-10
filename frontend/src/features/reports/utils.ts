import { useMemo } from 'react';
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
