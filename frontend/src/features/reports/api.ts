import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/http';
import type { DebtReport, ProductTrend, ReportRange, SalesReport } from './types';
import type { ConsignmentReport } from '@/features/consignors/types';

function rangeQuery(range: ReportRange): string {
  return new URLSearchParams({ startDate: range.startDate, endDate: range.endDate }).toString();
}

// ─── GET /reports/sales ───────────────────────────────────────────────────────

export function getSalesReportApi(range: ReportRange): Promise<SalesReport> {
  return apiFetch<SalesReport>(`/reports/sales?${rangeQuery(range)}`);
}

/** Query key konvensi §5.5: `['reports','sales',range]` (deterministik). */
export function useSalesReport(range: ReportRange) {
  return useQuery({
    queryKey: ['reports', 'sales', range],
    queryFn: () => getSalesReportApi(range),
  });
}

// ─── GET /reports/debts ───────────────────────────────────────────────────────

export function getDebtReportApi(range: ReportRange): Promise<DebtReport> {
  return apiFetch<DebtReport>(`/reports/debts?${rangeQuery(range)}`);
}

export function useDebtReport(range: ReportRange) {
  return useQuery({
    queryKey: ['reports', 'debts', range],
    queryFn: () => getDebtReportApi(range),
  });
}

// ─── GET /reports/product-trend ───────────────────────────────────────────────

export function getProductTrendApi(range: ReportRange): Promise<ProductTrend> {
  return apiFetch<ProductTrend>(`/reports/product-trend?${rangeQuery(range)}`);
}

export function useProductTrend(range: ReportRange) {
  return useQuery({
    queryKey: ['reports', 'product-trend', range],
    queryFn: () => getProductTrendApi(range),
  });
}

// ─── GET /reports/consignment ─────────────────────────────────────────────────

export function getConsignmentReportApi(range: ReportRange): Promise<ConsignmentReport> {
  return apiFetch<ConsignmentReport>(`/reports/consignment?${rangeQuery(range)}`);
}

export function useConsignmentReport(range: ReportRange) {
  return useQuery({
    queryKey: ['reports', 'consignment', range],
    queryFn: () => getConsignmentReportApi(range),
  });
}

// ─── GET /reports/{sales,debts}/export?format=xlsx|pdf ────────────────────────

/**
 * Unduh file ekspor (FR-40/41/42). Gunakan `raw` agar `apiFetch` tidak mencoba
 * parse JSON; blob → object URL → anchor download.
 */
export async function exportReportApi(
  resource: 'sales' | 'debts',
  range: ReportRange & { format: 'xlsx' | 'pdf' }
) {
  const params = new URLSearchParams({ startDate: range.startDate, endDate: range.endDate, format: range.format });
  const res = await apiFetch<Response>(`/reports/${resource}/export?${params.toString()}`, { raw: true });
  const blob = await res.blob();

  // Fallback nama file bila header Content-Disposition tidak tersedia.
  let filename = `laporan-${resource}_${range.startDate}_${range.endDate}.${range.format}`;
  const match = res.headers.get('Content-Disposition')?.match(/filename="?([^"]+)"?/);
  if (match?.[1]) filename = match[1];

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
