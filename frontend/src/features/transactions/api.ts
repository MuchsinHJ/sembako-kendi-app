import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/http';
import { usePagedQuery } from '@/lib/usePagedQuery';
import type { PagedResult, Payment, Transaction, TransactionFilters } from './types';

export interface CreateTransactionPayload {
  items: Array<{ productId: string; jumlah: number }>;
  uangDiterima: number;
  namaPembeli?: string;
  noHpPembeli?: string | null;
}

// ─── GET /transactions ────────────────────────────────────────────────────────

export function listTransactionsApi(
  params: TransactionFilters & { page: number; limit?: number },
): Promise<PagedResult<Transaction>> {
  const q = new URLSearchParams();
  if (params.startDate) q.set('startDate', params.startDate);
  if (params.endDate) q.set('endDate', params.endDate);
  if (params.statusPembayaran) q.set('statusPembayaran', params.statusPembayaran);
  if (params.statusTransaksi) q.set('statusTransaksi', params.statusTransaksi);
  q.set('page', String(params.page));
  q.set('limit', String(params.limit ?? 20));
  return apiFetch<PagedResult<Transaction>>(`/transactions?${q.toString()}`);
}

/** Query key konvensi §5.5: `['transactions', filters]`. */
export function useTransactions(filters: TransactionFilters, options?: { enabled?: boolean }) {
  return useInfiniteQuery({
    queryKey: ['transactions', filters],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => listTransactionsApi({ ...filters, page: pageParam }),
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined,
    enabled: options?.enabled ?? true,
  });
}

/** Satu halaman transaksi (md+, paginasi bernomor + prefetch halaman berikutnya). */
export function useTransactionsPage(
  filters: TransactionFilters,
  page: number,
  options?: { enabled?: boolean },
) {
  return usePagedQuery({
    queryKey: ['transactions', 'paged', filters],
    page,
    fetchPage: (p) => listTransactionsApi({ ...filters, page: p }),
    enabled: options?.enabled ?? true,
  });
}

// ─── GET /transactions/:id ────────────────────────────────────────────────────

export function getTransactionApi(id: string): Promise<Transaction> {
  return apiFetch<Transaction>(`/transactions/${id}`);
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: ['transactions', id],
    queryFn: () => getTransactionApi(id),
    enabled: !!id,
  });
}

// ─── POST /transactions ───────────────────────────────────────────────────────

export function createTransactionApi(input: CreateTransactionPayload): Promise<Transaction> {
  return apiFetch<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(input) });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTransactionApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['consignors'] });
      // Omzet, profit, tren, utang & konsinyasi berubah setelah transaksi dibuat/dibatalkan.
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

// ─── POST /transactions/:id/void ──────────────────────────────────────────────

export function voidTransactionApi(id: string): Promise<Transaction> {
  return apiFetch<Transaction>(`/transactions/${id}/void`, { method: 'POST' });
}

export function useVoidTransaction(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => voidTransactionApi(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['debts'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['consignors'] });
      // Omzet, profit, tren, utang & konsinyasi berubah setelah transaksi dibuat/dibatalkan.
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

// ─── GET /debts ───────────────────────────────────────────────────────────────

export function listDebtsApi(params: {
  page: number;
  limit?: number;
}): Promise<PagedResult<Transaction>> {
  const q = new URLSearchParams();
  q.set('page', String(params.page));
  q.set('limit', String(params.limit ?? 20));
  return apiFetch<PagedResult<Transaction>>(`/debts?${q.toString()}`);
}

export function useDebts(options?: { enabled?: boolean }) {
  return useInfiniteQuery({
    queryKey: ['debts'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => listDebtsApi({ page: pageParam }),
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined,
    enabled: options?.enabled ?? true,
  });
}

/** Satu halaman utang aktif (md+). */
export function useDebtsPage(page: number, limit: number, options?: { enabled?: boolean }) {
  return usePagedQuery({
    queryKey: ['debts', 'paged', limit],
    page,
    fetchPage: (p) => listDebtsApi({ page: p, limit }),
    enabled: options?.enabled ?? true,
  });
}

// ─── GET /debts/:transactionId/payments ───────────────────────────────────────

export function getPaymentHistoryApi(transactionId: string): Promise<Payment[]> {
  return apiFetch<Payment[]>(`/debts/${transactionId}/payments`);
}

export function usePaymentHistory(transactionId: string) {
  return useQuery({
    queryKey: ['debts', transactionId, 'payments'],
    queryFn: () => getPaymentHistoryApi(transactionId),
    enabled: !!transactionId,
  });
}

// ─── POST /debts/:transactionId/payments ──────────────────────────────────────

export function recordPaymentApi(transactionId: string, jumlahBayar: number): Promise<Transaction> {
  return apiFetch<Transaction>(`/debts/${transactionId}/payments`, {
    method: 'POST',
    body: JSON.stringify({ jumlahBayar }),
  });
}

export function useRecordPayment(transactionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jumlahBayar: number) => recordPaymentApi(transactionId, jumlahBayar),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts'] });
      qc.invalidateQueries({ queryKey: ['transactions', transactionId] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export type { RecordPaymentInput } from './schemas';
export type { CreateTransactionInput } from './schemas';
