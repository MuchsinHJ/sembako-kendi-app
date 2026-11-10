import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Package, Plus } from 'lucide-react';
import { useProducts } from './api';
import { ProductFormModal } from './components/ProductFormModal';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { ChipFilter } from '@/components/ChipFilter';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchField } from '@/components/SearchField';
import { SegmentedFilter } from '@/components/SegmentedFilter';
import { formatRupiah } from '@/lib/money';
import { cn } from '@/lib/cn';
import type { Product, StatusFilter, TipeFilter } from './types';

const STATUS_OPTIONS = [
  { value: 'SEMUA', label: 'Semua' },
  { value: 'AKTIF', label: 'Aktif' },
  { value: 'NONAKTIF', label: 'Nonaktif' },
] as const;

const TIPE_OPTIONS = [
  { value: 'SEMUA', label: 'Semua' },
  { value: 'MILIK_SENDIRI', label: 'Milik Sendiri' },
  { value: 'TITIPAN', label: 'Titipan' },
] as const;

function ProductThumb({ product, className }: { product: Product; className?: string }) {
  return product.fotoUrl ? (
    <img src={product.fotoUrl} alt="" className={cn('object-cover', className)} />
  ) : (
    <div className={cn('flex items-center justify-center bg-muted-soft text-accent', className)}>
      <Package className="size-6" aria-hidden="true" />
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to={`/produk/${product.id}`}
      className="press-scale flex items-center gap-3 rounded-card-sm border border-line-soft bg-surface p-3 focus:outline-none focus:ring-2 focus:ring-accent/40"
    >
      <ProductThumb product={product} className="size-14 shrink-0 rounded-input" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-primary">{product.nama}</p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {product.kategori} · {product.tipe === 'TITIPAN' ? 'Titipan' : 'Milik Sendiri'}
        </p>
        <p className="mt-1 text-sm font-bold text-primary">{formatRupiah(product.hargaJual)}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Badge variant="netral" label={product.status === 'AKTIF' ? 'Aktif' : 'Nonaktif'} />
        <span className="text-xs text-muted">Stok {product.stok}</span>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-card-sm border border-line-soft bg-surface p-3">
      <div className="size-14 shrink-0 rounded-input bg-muted-soft" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-2/3 rounded bg-muted-soft" />
        <div className="h-3 w-1/2 rounded bg-muted-soft" />
        <div className="h-3.5 w-1/3 rounded bg-muted-soft" />
      </div>
    </div>
  );
}

/** Layar Katalog (04 §3, 03: Katalog Produk) — grid + filter + load more. */
export function KatalogPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<StatusFilter>('SEMUA');
  const [tipe, setTipe] = useState<TipeFilter>('SEMUA');
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useProducts({ search: debounced, status, tipe });

  const products = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.pagination.total;

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader
        eyebrow="KATALOG"
        title="Produk"
        info={total !== undefined ? `${total} produk` : undefined}
        action={
          <Button onClick={() => setFormOpen(true)} className="h-11 px-4">
            <Plus className="size-4" aria-hidden="true" />
            Tambah Produk
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <SearchField value={search} onChange={setSearch} placeholder="Cari produk…" />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TIPE_OPTIONS.map((opt) => (
            <ChipFilter
              key={opt.value}
              active={tipe === opt.value}
              onClick={() => setTipe(opt.value)}
              aria-label={`Tipe ${opt.label}`}
            >
              {opt.label}
            </ChipFilter>
          ))}
        </div>
        <SegmentedFilter label="Status" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {isError && (
        <Card variant="warning" className="items-start">
          <p className="text-sm font-semibold text-warning">Gagal memuat produk.</p>
          <p className="text-xs text-warning">Periksa koneksi lalu coba lagi.</p>
          <Button variant="secondary" className="mt-1 h-10 px-4 text-xs" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </Card>
      )}

      {!isLoading && !isError && total === 0 && (
        <Card variant="list" className="flex flex-col items-center gap-2 py-10 text-center">
          {debounced ? (
            <>
              <p className="text-sm font-semibold text-primary">
                Tidak ada produk untuk &ldquo;{debounced}&rdquo;
              </p>
              <Button variant="secondary" className="h-10 px-4 text-xs" onClick={() => setSearch('')}>
                Hapus pencarian
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-primary">Belum ada produk</p>
              <p className="text-xs text-muted">Mulai dengan menambahkan produk pertama toko Anda.</p>
              <Button className="h-10 px-4 text-xs" onClick={() => setFormOpen(true)}>
                <Plus className="size-4" aria-hidden="true" />
                Tambah Produk
              </Button>
            </>
          )}
        </Card>
      )}

      {!isLoading && !isError && products.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
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

      <ProductFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
