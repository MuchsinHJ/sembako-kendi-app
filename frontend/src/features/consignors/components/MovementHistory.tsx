import { useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, History } from 'lucide-react';
import { ChipFilter } from '@/components/ChipFilter';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/Button';
import { cn } from '@/lib/cn';
import { formatWaktuRelatif } from '@/features/transactions/utils';
import { useMovementsPage, type MovementFilters } from '../api';
import type { MovementFilter } from '../types';

const PER_HALAMAN = 8;
const FILTER: Array<{ value: MovementFilter; label: string }> = [
  { value: 'SEMUA', label: 'Semua' },
  { value: 'TERIMA', label: 'Terima' },
  { value: 'RETUR', label: 'Retur' },
];

/**
 * Riwayat Pergerakan Titipan (turunan pen hNO05 mobile) sebagai panel md+:
 * filter Terima/Retur, baris stok sebelum → sesudah, paginasi bernomor + prefetch.
 * Dipakai di Detail Produk titipan (per produk) dan Detail Penitip (per penitip).
 */
export function MovementHistory({
  scope,
  showProduct = false,
  className,
}: {
  scope: Pick<MovementFilters, 'consignorId' | 'productId'>;
  /** Tampilkan nama produk di tiap baris (riwayat per penitip). */
  showProduct?: boolean;
  className?: string;
}) {
  const [tipe, setTipe] = useState<MovementFilter>('SEMUA');
  const [page, setPage] = useState(1);
  const filters: MovementFilters = { ...scope, ...(tipe !== 'SEMUA' ? { tipe } : {}) };
  const { data, isLoading, isError, refetch, isPlaceholderData } = useMovementsPage(filters, page, PER_HALAMAN);
  const rows = data?.data ?? [];

  return (
    <section
      aria-label="Riwayat pergerakan titipan"
      className={cn('flex min-w-0 flex-col gap-3 rounded-[20px] border border-line-soft bg-surface p-4', className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-primary">
          <History className="size-[18px] text-primary-soft" strokeWidth={2.25} aria-hidden="true" />
          Riwayat pergerakan titipan
        </h2>
        <div role="group" aria-label="Filter pergerakan" className="flex gap-1.5">
          {FILTER.map((f) => (
            <ChipFilter
              key={f.value}
              active={tipe === f.value}
              onClick={() => {
                setTipe(f.value);
                setPage(1);
              }}
            >
              {f.label}
            </ChipFilter>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-[12px] bg-surface-muted" />
          ))}
        </div>
      )}
      {isError && (
        <div className="flex items-center justify-between gap-3 rounded-[12px] bg-warning-soft px-3 py-2.5">
          <p className="text-[12.5px] font-medium text-warning">Gagal memuat riwayat pergerakan.</p>
          <Button variant="secondary" className="h-10 px-4 text-xs" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </div>
      )}
      {!isLoading && !isError && rows.length === 0 && (
        <p className="rounded-[12px] bg-surface-muted px-3 py-6 text-center text-[13px] text-muted">
          {tipe === 'SEMUA'
            ? 'Belum ada penerimaan atau retur titipan.'
            : `Belum ada catatan ${tipe === 'TERIMA' ? 'penerimaan' : 'retur'}.`}
        </p>
      )}
      {rows.length > 0 && (
        <ul className={cn('flex flex-col transition-opacity duration-150 ease-out', isPlaceholderData && 'opacity-60')}>
          {rows.map((m, i) => {
            const terima = m.tipe === 'TERIMA';
            const Icon = terima ? ArrowDownToLine : ArrowUpFromLine;
            return (
              <li key={m.id} className={cn('flex min-h-14 items-center gap-3 py-2', i > 0 && 'border-t border-line-soft')}>
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-full',
                    terima ? 'bg-success-soft text-primary-soft' : 'bg-warning-soft text-warning',
                  )}
                >
                  <Icon className="size-4" strokeWidth={2.25} aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="truncate text-[13.5px] font-semibold text-primary">
                    {terima ? 'Terima titipan' : 'Retur ke penitip'}
                    {showProduct && <span className="font-medium text-muted"> · {m.product.nama}</span>}
                  </span>
                  <span className="truncate text-xs text-muted">
                    {formatWaktuRelatif(m.createdAt)}
                    {m.catatan ? ` · ${m.catatan}` : ''}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-px">
                  <span className={cn('text-[14px] font-bold tabular-nums', terima ? 'text-primary' : 'text-warning')}>
                    {terima ? '+' : '−'}
                    {m.jumlah}
                  </span>
                  <span className="text-xs tabular-nums text-muted">
                    Stok {m.stokSebelum} → {m.stokSesudah}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination
        page={page}
        totalPages={data?.pagination.totalPages ?? 1}
        total={data?.pagination.total ?? 0}
        pageSize={PER_HALAMAN}
        onPage={setPage}
        itemLabel="catatan"
        busy={isPlaceholderData}
        compact
      />
    </section>
  );
}
