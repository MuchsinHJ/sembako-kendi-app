import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRoundPlus, Users } from 'lucide-react';
import { useConsignors, useConsignorBalance, useConsignorsPage } from '../api';
import { useDashboardSummary } from '@/features/dashboard/api';
import { Pagination } from '@/components/Pagination';
import { MQ } from '@/lib/breakpoints';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { useProducts } from '@/features/products/api';
import { ConsignorFormModal } from './ConsignorFormModal';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchField } from '@/components/SearchField';
import { ChipFilter } from '@/components/ChipFilter';
import { formatRupiah } from '@/lib/money';
import { cn } from '@/lib/cn';
import type { ConsignorFilters, ConsignorStatus } from '../types';

/** Filter Semua / Punya saldo (server `punyaSaldo`) / Aktif (server `status`). */
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

/**
 * Kartu penitip (pen Penitip Bu Ratna): surface r14 p12 gap8 stroke line-soft.
 * Atas: nama 14.5/600 + no HP 12 muted · badge tanpa dot [3,10]. Bawah: jumlah produk 11.5 · saldo 14/700.
 */
function ConsignorCard({
  id,
  nama,
  noHp,
  status,
  activeProductCount,
  onClick,
  wide = false,
}: {
  id: string;
  nama: string;
  noHp: string | null;
  status: ConsignorStatus;
  activeProductCount: number;
  onClick: () => void;
  /** md+: kartu grid dengan inisial + label saldo. */
  wide?: boolean;
}) {
  const { data: balance } = useConsignorBalance(id);
  const saldo = Number(balance?.saldo ?? '0');
  const nonaktif = status === 'NONAKTIF';

  if (wide) {
    const inisial = nama
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('');
    return (
      <button
        type="button"
        onClick={onClick}
        className="press-scale flex flex-col gap-3 rounded-[18px] border border-line-soft bg-surface p-4 text-left transition-colors duration-150 ease-out hover:bg-surface-muted"
      >
        <div className="flex w-full items-center gap-3">
          <span
            aria-hidden="true"
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-full text-[13px] font-bold',
              nonaktif ? 'bg-muted-soft text-muted' : 'bg-accent-soft text-primary',
            )}
          >
            {inisial || '?'}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              className={cn(
                'truncate text-[15px] font-semibold',
                nonaktif ? 'text-muted' : 'text-primary',
              )}
            >
              {nama}
            </span>
            <span className="truncate text-xs text-muted">{noHp ?? 'Tanpa no. HP'}</span>
          </span>
          <Badge
            variant={nonaktif ? 'netral' : 'lunas'}
            label={nonaktif ? 'Nonaktif' : 'Aktif'}
            dot={false}
          />
        </div>
        <div className="flex w-full items-end justify-between gap-2 rounded-[12px] bg-surface-muted px-3 py-2.5">
          <span className="flex flex-col gap-px">
            <span className="text-xs text-muted">Produk titipan aktif</span>
            <span className="text-[15px] font-bold tabular-nums text-primary">
              {activeProductCount}
            </span>
          </span>
          <span className="flex flex-col items-end gap-px">
            <span className="text-xs text-muted">Saldo kewajiban</span>
            <span
              className={cn(
                'text-[15px] font-bold tabular-nums',
                saldo < 0 ? 'text-danger' : saldo === 0 ? 'text-muted' : 'text-primary',
              )}
            >
              {balance ? formatRupiah(balance.saldo) : '…'}
            </span>
          </span>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="press-scale flex flex-col gap-2 rounded-[14px] border border-line-soft bg-surface p-3 text-left transition-colors duration-150 ease-out hover:bg-surface-muted"
    >
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[14.5px] font-semibold text-primary">{nama}</span>
          <span className="truncate text-xs text-muted">{noHp ?? 'Tanpa no. HP'}</span>
        </div>
        <Badge
          variant={status === 'NONAKTIF' ? 'netral' : 'lunas'}
          label={status === 'NONAKTIF' ? 'Nonaktif' : 'Aktif'}
          dot={false}
        />
      </div>
      <div className="flex w-full items-center justify-between gap-2">
        <span className="text-[11.5px] text-muted">
          {activeProductCount > 0
            ? `${activeProductCount} produk titipan aktif`
            : 'Tidak ada produk aktif'}
        </span>
        <span
          className={cn(
            'text-sm font-bold tabular-nums',
            saldo < 0 ? 'text-danger' : saldo === 0 ? 'text-muted' : 'text-primary',
          )}
        >
          {balance ? formatRupiah(balance.saldo) : '…'}
        </span>
      </div>
    </button>
  );
}

const PAGE_SIZE = 12;

/** Layar Daftar Penitip (pen q0uRhl). Tambahan: tombol tambah penitip di header (ikon pada mobile). */
export function DaftarPenitipPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ListFilter>('SEMUA');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const isMd = useMediaQuery(MQ.md);
  const [page, setPage] = useState(1);
  const filters = { ...filterToParams(filter), ...(debounced ? { search: debounced } : {}) };
  useEffect(() => setPage(1), [filter, debounced]);
  // Mobile: infinite "Muat lebih banyak"; md+: grid + paginasi bernomor (prefetch halaman berikutnya).
  const infinite = useConsignors(filters, { enabled: !isMd });
  const paged = useConsignorsPage(filters, page, PAGE_SIZE, { enabled: isMd });
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = infinite;
  const isLoading = isMd ? paged.isLoading : infinite.isLoading;
  const isError = isMd ? paged.isError : infinite.isError;
  const refetch = isMd ? paged.refetch : infinite.refetch;
  const consignors = isMd ? (paged.data?.data ?? []) : (data?.pages.flatMap((p) => p.data) ?? []);
  const totalPenitip =
    (isMd ? paged.data?.pagination.total : data?.pages[0]?.pagination.total) ?? consignors.length;
  const loaded = isMd ? !!paged.data : !!data;
  const summary = useDashboardSummary();

  // Produk titipan aktif → jumlah per penitip.
  const { data: titipanData } = useProducts({ tipe: 'TITIPAN', status: 'AKTIF', limit: 100 });
  const titipanProducts = useMemo(
    () => titipanData?.pages.flatMap((p) => p.data) ?? [],
    [titipanData?.pages],
  );
  const titipanCountByConsignor = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of titipanProducts)
      if (p.consignorId) counts[p.consignorId] = (counts[p.consignorId] ?? 0) + 1;
    return counts;
  }, [titipanProducts]);

  const subtitle = loaded
    ? `${totalPenitip} penitip · ${titipanProducts.length} produk titipan aktif`
    : undefined;
  const mencari = !!debounced || filter !== 'SEMUA';

  return (
    <div className="flex flex-col gap-3">
      <ScreenHeader
        onBack={() => navigate('/')}
        eyebrow="KONSINYASI"
        title="Penitip"
        subtitle={subtitle}
        action={
          <>
            <Button
              variant="primary"
              className="size-11 shrink-0 p-0 md:hidden"
              aria-label="Tambah Penitip"
              onClick={() => setFormOpen(true)}
            >
              <UserRoundPlus className="size-[18px]" aria-hidden="true" />
            </Button>
            <Button
              className="hidden h-11 shrink-0 ps-4 pe-5 md:inline-flex"
              onClick={() => setFormOpen(true)}
            >
              <UserRoundPlus className="size-4" aria-hidden="true" />
              Tambah Penitip
            </Button>
          </>
        }
      />

      {/* md+: ringkasan sebaris (kewajiban dari dashboard, jumlah dari server). */}
      {isMd && (
        <div className="grid grid-cols-3 gap-3">
          <div className="flex min-w-0 flex-col gap-0.5 rounded-[16px] bg-primary px-4 py-3">
            <span className="text-xs font-medium text-accent-soft">Total kewajiban penitip</span>
            <span className="truncate text-[22px] font-bold leading-tight tabular-nums text-bg">
              {summary.data ? formatRupiah(summary.data.totalKewajibanPenitip) : '–'}
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-0.5 rounded-[16px] border border-line-soft bg-surface px-4 py-3">
            <span className="text-xs font-medium text-muted">
              {mencari ? 'Penitip ditemukan' : 'Jumlah penitip'}
            </span>
            <span className="text-[22px] font-bold leading-tight tabular-nums text-primary">
              {loaded ? totalPenitip : '–'}
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-0.5 rounded-[16px] border border-line-soft bg-surface px-4 py-3">
            <span className="text-xs font-medium text-muted">Produk titipan aktif</span>
            <span className="text-[22px] font-bold leading-tight tabular-nums text-primary">
              {titipanData ? titipanProducts.length : '–'}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="md:min-w-0 md:flex-1">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Cari nama penitip"
            label="Cari penitip"
          />
        </div>
        {/* Filter Penitip (pen): chip h38; md+ 44 (target sentuh tablet) */}
        <div role="group" aria-label="Filter penitip" className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((o) => (
            <ChipFilter
              key={o.value}
              active={filter === o.value}
              onClick={() => setFilter(o.value)}
              className="h-[38px] md:h-11"
            >
              {o.label}
            </ChipFilter>
          ))}
        </div>
      </div>

      {isLoading && (
        <div
          className="flex flex-col gap-2.5 md:grid md:grid-cols-2 xl:grid-cols-3"
          aria-busy="true"
        >
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="h-[86px] animate-pulse rounded-[14px] border border-line-soft bg-surface"
            />
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
        <div className="flex flex-col items-center gap-3 rounded-[16px] bg-surface px-5 py-12 text-center">
          <div className="flex size-[72px] items-center justify-center rounded-full bg-surface-muted">
            <Users className="size-[30px] text-primary-soft" aria-hidden="true" />
          </div>
          <p className="text-lg font-bold text-primary">
            {debounced
              ? 'Penitip tidak ditemukan'
              : mencari
                ? 'Tidak ada penitip di filter ini'
                : 'Belum ada penitip'}
          </p>
          <p className="max-w-[280px] text-[13px] leading-normal text-muted">
            {debounced
              ? `Tidak ada penitip yang cocok dengan “${debounced}”. Coba kata kunci lain.`
              : mencari
                ? 'Coba pilih filter lain.'
                : 'Tambahkan penitip untuk mulai mencatat barang titipan.'}
          </p>
          {!mencari && (
            <Button className="px-6" onClick={() => setFormOpen(true)}>
              <UserRoundPlus className="size-4" aria-hidden="true" />
              Tambah Penitip
            </Button>
          )}
        </div>
      )}

      {consignors.length > 0 && (
        <div
          className={cn(
            'flex flex-col gap-2.5 md:grid md:grid-cols-2 md:gap-3 xl:grid-cols-3',
            isMd && 'transition-opacity duration-150 ease-out',
            paged.isPlaceholderData && 'opacity-60',
          )}
        >
          {consignors.map((c) => (
            <ConsignorCard
              key={c.id}
              id={c.id}
              nama={c.nama}
              noHp={c.noHp}
              status={c.status}
              activeProductCount={titipanCountByConsignor[c.id] ?? 0}
              onClick={() => navigate(`/penitip/${c.id}`)}
              wide={isMd}
            />
          ))}
        </div>
      )}

      {isMd && !isLoading && !isError && consignors.length > 0 && (
        <Pagination
          page={page}
          totalPages={paged.data?.pagination.totalPages ?? 1}
          total={totalPenitip}
          pageSize={PAGE_SIZE}
          onPage={setPage}
          itemLabel="penitip"
          busy={paged.isPlaceholderData}
        />
      )}

      {!isMd && hasNextPage && (
        <Button
          variant="secondary"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="self-center"
        >
          {isFetchingNextPage ? 'Memuat…' : 'Muat lebih banyak'}
        </Button>
      )}

      <ConsignorFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
