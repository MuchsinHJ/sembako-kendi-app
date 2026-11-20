import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRoundPlus, Users } from 'lucide-react';
import { useConsignors, useConsignorBalance } from '../api';
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
}: {
  id: string;
  nama: string;
  noHp: string | null;
  status: ConsignorStatus;
  activeProductCount: number;
  onClick: () => void;
}) {
  const { data: balance } = useConsignorBalance(id);
  const saldo = Number(balance?.saldo ?? '0');

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

  const filters = { ...filterToParams(filter), ...(debounced ? { search: debounced } : {}) };
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useConsignors(filters);
  const consignors = data?.pages.flatMap((p) => p.data) ?? [];
  const totalPenitip = data?.pages[0]?.pagination.total ?? consignors.length;

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

  const subtitle = data
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

      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Cari nama penitip"
        label="Cari penitip"
      />
      {/* Filter Penitip (pen): chip h38 */}
      <div role="group" aria-label="Filter penitip" className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((o) => (
          <ChipFilter
            key={o.value}
            active={filter === o.value}
            onClick={() => setFilter(o.value)}
            className="h-[38px]"
          >
            {o.label}
          </ChipFilter>
        ))}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2.5" aria-busy="true">
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
        <div className="flex flex-col gap-2.5">
          {consignors.map((c) => (
            <ConsignorCard
              key={c.id}
              id={c.id}
              nama={c.nama}
              noHp={c.noHp}
              status={c.status}
              activeProductCount={titipanCountByConsignor[c.id] ?? 0}
              onClick={() => navigate(`/penitip/${c.id}`)}
            />
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

      <ConsignorFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
