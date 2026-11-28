import { useEffect } from 'react';
import { keepPreviousData, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';

export interface Paged<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface UsePagedQueryOptions<T> {
  /** Kunci dasar (tanpa nomor halaman), mis. `['transactions', 'paged', filters]`. */
  queryKey: QueryKey;
  page: number;
  fetchPage: (page: number) => Promise<Paged<T>>;
  enabled?: boolean;
}

/**
 * Query satu halaman server (dipakai layout md+ dengan paginasi bernomor).
 * - `keepPreviousData`: daftar lama tetap tampil saat pindah halaman (tanpa kedip skeleton).
 * - Halaman berikutnya di-prefetch supaya klik "Berikutnya" terasa instan.
 * Mobile tetap memakai infinite query "Muat lainnya" yang sudah ada.
 */
export function usePagedQuery<T>({ queryKey, page, fetchPage, enabled = true }: UsePagedQueryOptions<T>) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: [...queryKey, page],
    queryFn: () => fetchPage(page),
    placeholderData: keepPreviousData,
    enabled,
  });
  const totalPages = query.data?.pagination.totalPages ?? 0;
  const keyHash = JSON.stringify(queryKey);

  useEffect(() => {
    if (!enabled || page >= totalPages) return;
    void qc.prefetchQuery({ queryKey: [...queryKey, page + 1], queryFn: () => fetchPage(page + 1) });
    // fetchPage/queryKey dibuat ulang tiap render; keyHash mewakili isinya.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc, enabled, page, totalPages, keyHash]);

  return query;
}

/** Nomor yang ditampilkan: 1 … (p-1) p (p+1) … N — maksimal 7 slot agar lebar stabil. */
export function pageWindow(page: number, totalPages: number): Array<number | 'gap'> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= totalPages - 2) [totalPages - 1, totalPages - 2, totalPages - 3].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: Array<number | 'gap'> = [];
  sorted.forEach((p, i) => {
    const prev = sorted[i - 1];
    if (i > 0 && prev !== undefined && p - prev > 1) out.push('gap');
    out.push(p);
  });
  return out;
}
