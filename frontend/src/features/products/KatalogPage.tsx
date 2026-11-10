import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Plus, TriangleAlert } from 'lucide-react';
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

function ProductThumb({ product }: { product: Product }) {
  return product.fotoUrl ? (
    <img
      src={product.fotoUrl}
      alt=""
      className={cn('aspect-square w-full object-cover', product.status === 'NONAKTIF' && 'opacity-55')}
    />
  ) : (
    <div className={cn('flex aspect-square w-full items-center justify-center bg-muted-soft text-accent', product.status === 'NONAKTIF' && 'opacity-55')}>
      <Package className="size-10" aria-hidden="true" />
    </div>
  );
}

/** Kartu bergambar (06 §5.1): foto placeholder + badge + nama + kategori + harga + stok. */
function ProductCard({ product }: { product: Product }) {
  const menipis = product.stok <= product.stokMinimum;
  return (
    <Link
      to={`/produk/${product.id}`}
      className="press-scale group flex flex-col overflow-hidden rounded-card border border-line-soft bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
    >
      <div className="relative">
        <ProductThumb product={product} />
        <div className="absolute left-2 top-2">
          <Badge variant="netral" label={product.status === 'AKTIF' ? 'Aktif' : 'Nonaktif'} />
        </div>
        {product.tipe === 'TITIPAN' && (
          <div className="absolute right-2 top-2">
            <Badge variant="netral" label="Titipan" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-3.5">
        <p className="line-clamp-2 text-sm font-semibold text-primary">{product.nama}</p>
        <p className="truncate text-xs text-muted">{product.kategori}</p>
        <p className="mt-1 text-lg font-bold tabular-nums text-primary">{formatRupiah(product.hargaJual)}</p>
        <p className={cn('mt-0.5 flex items-center gap-1 text-xs', menipis ? 'text-warning' : 'text-muted')}>
          {menipis && <TriangleAlert className="size-3.5" aria-hidden="true" />}
          Sisa {product.stok}
        </p>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-card border border-line-soft bg-surface">
      <div className="aspect-square w-full bg-muted-soft" />
      <div className="space-y-2 p-3.5">
        <div className="h-3.5 w-2/3 rounded bg-muted-soft" />
        <div className="h-3 w-1/2 rounded bg-muted-soft" />
        <div className="h-4 w-1/3 rounded bg-muted-soft" />
      </div>
    </div>
  );
}

/** Layar Katalog (04 §3, 06 §5.1) — grid 1/2/3/4 + filter + load more. */
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
  const menipis = products.filter((p) => p.stok <= p.stokMinimum).length;
  const titipan = products.filter((p) => p.tipe === 'TITIPAN').length;

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader
        eyebrow="KATALOG"
        title="Produk"
        info={total !== undefined ? `${total} produk${menipis ? ` · ${menipis} stok menipis` : ''}${titipan ? ` · ${titipan} titipan` : ''}` : undefined}
        action={
          <Button onClick={() => setFormOpen(true)} className="h-11 px-4">
            <Plus className="size-4" aria-hidden="true" />
            Tambah Produk
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <SearchField value={search} onChange={setSearch} placeholder="Cari produk…" />
        <div className="flex flex-wrap gap-2">
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 xl:gap-[18px]">
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
