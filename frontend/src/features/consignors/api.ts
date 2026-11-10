import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/http';
import type {
  Consignor,
  ConsignorBalance,
  ConsignorDetail,
  ConsignorFilters,
  ConsignorPayment,
  ConsignmentMovement,
  MovementTipe,
  PagedResult,
} from './types';

// ─── GET /consignors ──────────────────────────────────────────────────────────

export function listConsignorsApi(
  params: ConsignorFilters & { page: number; limit?: number }
): Promise<PagedResult<Consignor>> {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.search) q.set('search', params.search);
  if (params.punyaSaldo !== undefined) q.set('punyaSaldo', String(params.punyaSaldo));
  q.set('page', String(params.page));
  q.set('limit', String(params.limit ?? 20));
  return apiFetch<PagedResult<Consignor>>(`/consignors?${q.toString()}`);
}

/** Query key konvensi §5.5: `['consignors', filters]`. */
export function useConsignors(filters: ConsignorFilters) {
  return useInfiniteQuery({
    queryKey: ['consignors', filters],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => listConsignorsApi({ ...filters, page: pageParam }),
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined,
  });
}

// ─── GET /consignors/:id ──────────────────────────────────────────────────────

export function getConsignorApi(id: string): Promise<ConsignorDetail> {
  return apiFetch<ConsignorDetail>(`/consignors/${id}`);
}

export function useConsignor(id: string) {
  return useQuery({
    queryKey: ['consignors', id],
    queryFn: () => getConsignorApi(id),
    enabled: !!id,
  });
}

// ─── GET /consignors/:id/balance ──────────────────────────────────────────────

export function getConsignorBalanceApi(id: string): Promise<ConsignorBalance> {
  return apiFetch<ConsignorBalance>(`/consignors/${id}/balance`);
}

export function useConsignorBalance(id: string) {
  return useQuery({
    queryKey: ['consignors', id, 'balance'],
    queryFn: () => getConsignorBalanceApi(id),
    enabled: !!id,
  });
}

// ─── GET /consignors/:id/payments ─────────────────────────────────────────────

export function listConsignorPaymentsApi(
  id: string,
  params: { page: number; limit?: number }
): Promise<PagedResult<ConsignorPayment>> {
  const q = new URLSearchParams();
  q.set('page', String(params.page));
  q.set('limit', String(params.limit ?? 20));
  return apiFetch<PagedResult<ConsignorPayment>>(`/consignors/${id}/payments?${q.toString()}`);
}

/** Query key konvensi §5.5: `['consignors', id, 'payments']`. */
export function useConsignorPayments(id: string) {
  return useInfiniteQuery({
    queryKey: ['consignors', id, 'payments'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => listConsignorPaymentsApi(id, { page: pageParam }),
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined,
    enabled: !!id,
  });
}

// ─── POST /consignors ─────────────────────────────────────────────────────────

export interface CreateConsignorPayload {
  nama: string;
  noHp?: string | null;
  catatan?: string | null;
}

export type UpdateConsignorPayload = Omit<CreateConsignorPayload, 'nama'> & { nama?: string };

export function createConsignorApi(input: CreateConsignorPayload): Promise<ConsignorDetail> {
  return apiFetch<ConsignorDetail>('/consignors', { method: 'POST', body: JSON.stringify(input) });
}

export function updateConsignorApi(id: string, input: UpdateConsignorPayload): Promise<ConsignorDetail> {
  return apiFetch<ConsignorDetail>(`/consignors/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function useCreateConsignor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createConsignorApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consignors'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });
}

export function useUpdateConsignor(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateConsignorPayload) => updateConsignorApi(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consignors', id] });
      qc.invalidateQueries({ queryKey: ['consignors'] });
    },
  });
}

// ─── PATCH /consignors/:id/status (BR-E) ──────────────────────────────────────

export function updateConsignorStatusApi(id: string, status: 'AKTIF' | 'NONAKTIF'): Promise<ConsignorDetail> {
  return apiFetch<ConsignorDetail>(`/consignors/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function useUpdateConsignorStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: 'AKTIF' | 'NONAKTIF') => updateConsignorStatusApi(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consignors'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ─── POST /consignors/:id/payments (BR-D, append-only) ────────────────────────

export interface CreateConsignorPaymentPayload {
  jumlahBayar: number;
  catatan?: string | null;
}

export function createConsignorPaymentApi(
  id: string,
  input: CreateConsignorPaymentPayload
): Promise<ConsignorPayment> {
  return apiFetch<ConsignorPayment>(`/consignors/${id}/payments`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function useCreateConsignorPayment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateConsignorPaymentPayload) => createConsignorPaymentApi(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consignors', id, 'balance'] });
      qc.invalidateQueries({ queryKey: ['consignors', id, 'payments'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });
}

// ─── POST /consignment/receipts & /returns ────────────────────────────────────

export interface MovementPayload {
  productId: string;
  jumlah: number;
  catatan?: string | null;
}

export function createMovementApi(tipe: MovementTipe, input: MovementPayload): Promise<ConsignmentMovement> {
  const path = tipe === 'TERIMA' ? '/consignment/receipts' : '/consignment/returns';
  return apiFetch<ConsignmentMovement>(path, { method: 'POST', body: JSON.stringify(input) });
}

export function useCreateMovement(tipe: MovementTipe) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MovementPayload) => createMovementApi(tipe, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['consignors'] });
      qc.invalidateQueries({ queryKey: ['consignment', 'movements'] });
      qc.invalidateQueries({ queryKey: ['consignors', 'balance'] });
    },
  });
}

// ─── GET /consignment/movements ───────────────────────────────────────────────

export interface MovementFilters {
  consignorId?: string;
  productId?: string;
  tipe?: MovementTipe;
}

export function listMovementsApi(
  params: MovementFilters & { page: number; limit?: number }
): Promise<PagedResult<ConsignmentMovement>> {
  const q = new URLSearchParams();
  if (params.consignorId) q.set('consignorId', params.consignorId);
  if (params.productId) q.set('productId', params.productId);
  if (params.tipe) q.set('tipe', params.tipe);
  q.set('page', String(params.page));
  q.set('limit', String(params.limit ?? 20));
  return apiFetch<PagedResult<ConsignmentMovement>>(`/consignment/movements?${q.toString()}`);
}

export function useMovements(filters: MovementFilters) {
  return useInfiniteQuery({
    queryKey: ['consignment', 'movements', filters],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => listMovementsApi({ ...filters, page: pageParam }),
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined,
    enabled: !!(filters.consignorId || filters.productId),
  });
}
