import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConsignors } from '../api';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchField } from '@/components/SearchField';
import { ChipFilter } from '@/components/ChipFilter';
import type { ConsignorFilters, ConsignorStatus } from '../types';

/** Filter sisi klien Semua/Aktif/Nonaktif; `punyaSaldo` dikirim ke server. */
const FILTER_OPTIONS = [
  { value: 'SEMUA', label: 'Semua' },
  { value: 'PUNYA_SALDO', label: 'Punya saldo' },
  { value: 'AKTIF', label: 'Aktif' },
] as const;

type ListFilter = (typeof FILTER_OPTIONS)[number]['value'];

function filterToParams(f: ListFilter): ConsignorFilters {
  if (f === 'AKTIF') return { status: 'AKTIF' as ConsignorStatus };
  if (f === 'PUNYA_SALDO') return { punyaSaldo: true };
  return {};
}

function inisial(nama: string): string {
  return nama
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((k) => k[0])
    .join('')
    .toUpperCase();
}

/** Kartu grid penitip (06 §5.7) — inisial + nama + noHP + badge status. */
function ConsignorCard({ nama, noHp, status, onClick }: { nama: string; noHp: string | null; status: ConsignorStatus; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press-scale flex flex-col items-start gap-2.5 rounded-card border border-line-soft bg-surface p-4 text-left focus:outline-none focus:ring-2 focus:ring-accent/40"
    >
      <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-primary">
        {inisial(nama)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-primary">{nama}</p>
        <p className="truncate text-xs text-muted">{noHp ?? 'Tanpa no. HP'}</p>
      </div>
      {status === 'NONAKTIF' && <Badge variant="netral" label="Nonaktif" />}
    </button>
  );
}

/** Layar Daftar Penitip (03; 06 §5.7 grid 2/3 kolom). */
export function DaftarPenitipPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ListFilter>('SEMUA');
  const [search, setSearch] = useState('');

  const filters = { ...filterToParams(filter), ...(search ? { search } : {}) };
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useConsignors(filters);
  const consignors = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader onBack={() => navigate('/')} eyebrow="KONSINYASI" title="Penitip" />

      <SearchField value={search} onChange={setSearch} placeholder="Cari penitip…" />
      <div role="group" aria-label="Filter penitip" className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((o) => (
          <ChipFilter key={o.value} active={filter === o.value} onClick={() => setFilter(o.value)}>
            {o.label}
          </ChipFilter>
        ))}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-card border border-line-soft bg-surface" />
          ))}
        </div>
      )}

      {isError && (
        <Card variant="warning" className="items-start">
          <p className="text-sm font-semibold text-warning">Gagal memuat penitip.</p>
          <Button variant="secondary" className="mt-1 h-10 px-4 text-xs" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </Card>
      )}

      {!isLoading && !isError && consignors.length === 0 && (
        <Card variant="list" className="flex flex-col items-center gap-1 py-10 text-center">
          <p className="text-sm font-semibold text-primary">
            {search ? `Tidak ada penitip untuk '${search}'` : 'Belum ada penitip'}
          </p>
          <p className="text-xs text-muted">
            {search ? 'Coba kata kunci lain.' : 'Tambahkan penitip untuk mulai mencatat barang titipan.'}
          </p>
        </Card>
      )}

      {!isLoading && !isError && consignors.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:gap-[18px]">
          {consignors.map((c) => (
            <ConsignorCard key={c.id} nama={c.nama} noHp={c.noHp} status={c.status} onClick={() => navigate(`/penitip/${c.id}`)} />
          ))}
        </div>
      )}

      {hasNextPage && (
        <Button
          variant="secondary"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="self-center"
        >
          {isFetchingNextPage ? 'Memuat…' : 'Muat lebih banyak'}
        </Button>
      )}
    </div>
  );
}
