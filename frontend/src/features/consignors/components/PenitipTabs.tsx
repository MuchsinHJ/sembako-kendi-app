import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Package } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Pagination } from '@/components/Pagination';
import { SegmentedFilter } from '@/components/SegmentedFilter';
import { useProductsPage } from '@/features/products/api';
import { formatRupiah } from '@/lib/money';
import { cn } from '@/lib/cn';
import { useConsignorPaymentsPage } from '../api';
import { MovementHistory } from './MovementHistory';

const TABS = [
  { value: 'produk', label: 'Produk titipan' },
  { value: 'setoran', label: 'Riwayat setoran' },
  { value: 'pergerakan', label: 'Pergerakan' },
] as const;
type Tab = (typeof TABS)[number]['value'];

const PRODUK_PER_HALAMAN = 8;
const SETORAN_PER_HALAMAN = 8;

function formatTanggal(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}

function ProdukTab({ consignorId }: { consignorId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch, isPlaceholderData } = useProductsPage(
    { tipe: 'TITIPAN', consignorId, limit: PRODUK_PER_HALAMAN },
    page,
  );
  const list = data?.data ?? [];
  return (
    <div className="flex flex-col gap-3">
      {isLoading && (
        <div className="grid gap-2.5" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[72px] animate-pulse rounded-[14px] bg-surface-muted" />
          ))}
        </div>
      )}
      {isError && (
        <div className="flex items-center justify-between gap-3 rounded-[12px] bg-warning-soft px-3 py-2.5">
          <p className="text-[12.5px] font-medium text-warning">Gagal memuat produk titipan.</p>
          <Button variant="secondary" className="h-10 px-4 text-xs" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </div>
      )}
      {!isLoading && !isError && list.length === 0 && (
        <p className="rounded-[12px] bg-surface-muted px-3 py-8 text-center text-[13px] text-muted">
          Belum ada produk titipan untuk penitip ini.
        </p>
      )}
      {list.length > 0 && (
        <div className={cn('grid gap-2.5 transition-opacity duration-150 ease-out', isPlaceholderData && 'opacity-60')}>
          {list.map((p) => {
            const nonaktif = p.status === 'NONAKTIF';
            const menipis = p.stok <= p.stokMinimum;
            return (
              <Link
                key={p.id}
                to={`/produk/${p.id}`}
                className="press-scale flex min-h-[72px] items-center gap-3 rounded-[14px] border border-line-soft bg-surface p-3 transition-colors duration-150 ease-out hover:bg-surface-muted"
              >
                <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-surface-muted">
                  {p.fotoUrl ? (
                    <img src={p.fotoUrl} alt="" className="size-full object-cover outline outline-1 -outline-offset-1 outline-black/10" />
                  ) : (
                    <Package className="size-5 text-primary-soft" aria-hidden="true" />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className={cn('truncate text-sm font-semibold', nonaktif ? 'text-muted' : 'text-primary')}>{p.nama}</span>
                  <span className="truncate text-xs text-muted">
                    {p.kategori} · {formatRupiah(p.hargaJual)}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  {nonaktif ? (
                    <Badge variant="netral" label="Nonaktif" dot={false} />
                  ) : (
                    <span className={cn('text-[13px] font-bold tabular-nums', menipis ? 'text-warning' : 'text-primary')}>
                      Stok {p.stok}
                    </span>
                  )}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      )}
      <Pagination
        page={page}
        totalPages={data?.pagination.totalPages ?? 1}
        total={data?.pagination.total ?? 0}
        pageSize={PRODUK_PER_HALAMAN}
        onPage={setPage}
        itemLabel="produk"
        busy={isPlaceholderData}
      />
    </div>
  );
}

function SetoranTab({ consignorId }: { consignorId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch, isPlaceholderData } = useConsignorPaymentsPage(
    consignorId,
    page,
    SETORAN_PER_HALAMAN,
  );
  const list = data?.data ?? [];
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12.5px] text-muted">Riwayat setoran hanya bisa ditambah — tidak dapat diedit atau dihapus.</p>
      {isLoading && (
        <div className="flex flex-col gap-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-[12px] bg-surface-muted" />
          ))}
        </div>
      )}
      {isError && (
        <div className="flex items-center justify-between gap-3 rounded-[12px] bg-warning-soft px-3 py-2.5">
          <p className="text-[12.5px] font-medium text-warning">Gagal memuat riwayat setoran.</p>
          <Button variant="secondary" className="h-10 px-4 text-xs" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </div>
      )}
      {!isLoading && !isError && list.length === 0 && (
        <p className="rounded-[12px] bg-surface-muted px-3 py-8 text-center text-[13px] text-muted">Belum ada riwayat setoran.</p>
      )}
      {list.length > 0 && (
        <ul className={cn('flex flex-col transition-opacity duration-150 ease-out', isPlaceholderData && 'opacity-60')}>
          {list.map((p, i) => (
            <li key={p.id} className={cn('flex min-h-14 items-center justify-between gap-3 py-2', i > 0 && 'border-t border-line-soft')}>
              <span className="flex min-w-0 flex-col gap-px">
                <span className="truncate text-[13.5px] font-semibold text-primary">{formatTanggal(p.tanggalBayar)}</span>
                <span className="truncate text-xs text-muted">{p.catatan || 'Tanpa catatan'}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-px">
                <span className="text-[14px] font-bold tabular-nums text-primary">{formatRupiah(p.jumlahBayar)}</span>
                <span className="text-xs tabular-nums text-muted">Sisa {formatRupiah(p.saldoSetelahBayar)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={page}
        totalPages={data?.pagination.totalPages ?? 1}
        total={data?.pagination.total ?? 0}
        pageSize={SETORAN_PER_HALAMAN}
        onPage={setPage}
        itemLabel="setoran"
        busy={isPlaceholderData}
        compact
      />
    </div>
  );
}

/**
 * Kolom kanan Detail Penitip md+ (canvas FoL8I / jktNQ, ditingkatkan): satu panel bertab
 * menggantikan dua kartu bertumpuk — produk titipan, riwayat setoran, pergerakan titipan
 * (pen hNO05). Tiap tab berpaginasi server sendiri, hanya tab aktif yang di-query.
 */
export function PenitipTabs({ consignorId }: { consignorId: string }) {
  const [tab, setTab] = useState<Tab>('produk');
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <SegmentedFilter label="Bagian detail penitip" options={TABS} value={tab} onChange={setTab} />
      {tab === 'pergerakan' ? (
        <MovementHistory scope={{ consignorId }} showProduct />
      ) : (
        <section
          aria-label={tab === 'produk' ? 'Produk titipan' : 'Riwayat setoran'}
          className="flex flex-col gap-3 rounded-[20px] border border-line-soft bg-surface p-4"
        >
          <h2 className="text-[15px] font-bold text-primary">{tab === 'produk' ? 'Produk titipan' : 'Riwayat setoran'}</h2>
          {tab === 'produk' ? <ProdukTab consignorId={consignorId} /> : <SetoranTab consignorId={consignorId} />}
        </section>
      )}
    </div>
  );
}
