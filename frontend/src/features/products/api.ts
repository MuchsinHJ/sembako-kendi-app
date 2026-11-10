import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { apiFetch } from '@/lib/http';
import type {
  ConsignorOption,
  Product,
  ProductFilters,
  ProductListResult,
  ProductPayload,
  UpdateProductPayload,
} from './types';

// ─── GET /products ────────────────────────────────────────────────────────────

export function listProductsApi(
  params: ProductFilters & { page: number; limit?: number }
): Promise<ProductListResult> {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.status && params.status !== 'SEMUA') q.set('status', params.status);
  if (params.tipe && params.tipe !== 'SEMUA') q.set('tipe', params.tipe);
  if (params.consignorId) q.set('consignorId', params.consignorId);
  q.set('page', String(params.page));
  q.set('limit', String(params.limit ?? 20));
  const qs = q.toString();
  return apiFetch<ProductListResult>(`/products${qs ? `?${qs}` : ''}`);
}

/** Query key konvensi §5.5: `['products', filters]` (filter deterministik). */
export function useProducts(filters: ProductFilters) {
  return useInfiniteQuery({
    queryKey: ['products', filters],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => listProductsApi({ ...filters, page: pageParam }),
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined,
  });
}

// ─── GET /products/:id ────────────────────────────────────────────────────────

export function getProductApi(id: string): Promise<Product> {
  return apiFetch<Product>(`/products/${id}`);
}

export function useProduct(id: string) {
  return useQuery({ queryKey: ['products', id], queryFn: () => getProductApi(id), enabled: !!id });
}

// ─── POST /products ───────────────────────────────────────────────────────────

export function createProductApi(input: ProductPayload): Promise<Product> {
  return apiFetch<Product>('/products', { method: 'POST', body: JSON.stringify(input) });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createProductApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

// ─── PUT /products/:id ────────────────────────────────────────────────────────

export function updateProductApi(id: string, input: UpdateProductPayload): Promise<Product> {
  return apiFetch<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProductPayload) => updateProductApi(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', id] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ─── DELETE /products/:id ─────────────────────────────────────────────────────

export function deleteProductApi(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/products/${id}`, { method: 'DELETE' });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteProductApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

// ─── PATCH /products/:id/status ───────────────────────────────────────────────

export function updateStatusApi(id: string, status: Product['status']): Promise<Product> {
  return apiFetch<Product>(`/products/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function useUpdateStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: Product['status']) => updateStatusApi(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', id] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['products', 'low-stock'] });
    },
  });
}

// ─── PATCH /products/:id/stock-threshold ──────────────────────────────────────

export function updateStockThresholdApi(id: string, stokMinimum: number): Promise<Product> {
  return apiFetch<Product>(`/products/${id}/stock-threshold`, {
    method: 'PATCH',
    body: JSON.stringify({ stokMinimum }),
  });
}

export function useUpdateStockThreshold(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (stokMinimum: number) => updateStockThresholdApi(id, stokMinimum),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', id] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ─── PATCH /products/:id/stock-adjustment ─────────────────────────────────────

export function adjustStockApi(id: string, input: { delta: number; alasan: string }): Promise<Product> {
  return apiFetch<Product>(`/products/${id}/stock-adjustment`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function useAdjustStock(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { delta: number; alasan: string }) => adjustStockApi(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', id] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['products', 'low-stock'] });
    },
  });
}

// ─── Foto: POST / DELETE /products/:id/photo ──────────────────────────────────

export function uploadPhotoApi(id: string, file: File): Promise<{ fotoUrl: string; fotoKey: string }> {
  const form = new FormData();
  form.append('photo', file);
  return apiFetch<{ fotoUrl: string; fotoKey: string }>(`/products/${id}/photo`, {
    method: 'POST',
    body: form,
  });
}

export function deletePhotoApi(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/products/${id}/photo`, { method: 'DELETE' });
}

// ─── GET /consignors (opsi penitip aktif utk form titipan) ────────────────────

export function listActiveConsignorsApi(): Promise<ConsignorOption[]> {
  return apiFetch<{ data: ConsignorOption[] }>('/consignors?status=AKTIF&limit=100').then(
    (r) => r.data
  );
}

export function useActiveConsignors() {
  return useQuery({
    queryKey: ['consignors', { status: 'AKTIF', limit: 100 }],
    queryFn: listActiveConsignorsApi,
  });
}
