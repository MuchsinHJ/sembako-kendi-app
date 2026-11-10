import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/http';

export interface PeriodSummary {
  omzet: string;
  profit: string;
  transactionCount: number;
}

export interface LowStockProduct {
  id: string;
  nama: string;
  stok: number;
  stokMinimum: number;
  kategori: string;
}

/** `GET /dashboard/summary` (SDD §3.9; FR-43–45, BR-11/15/16). */
export interface DashboardSummary {
  hariIni: PeriodSummary;
  bulanBerjalan: PeriodSummary;
  produkLowStock: LowStockProduct[];
  totalSaldoUtang: string;
  totalKewajibanPenitip: string;
}

export function getDashboardSummaryApi(): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>('/dashboard/summary');
}

export function useDashboardSummary() {
  return useQuery({ queryKey: ['dashboard', 'summary'], queryFn: getDashboardSummaryApi });
}
