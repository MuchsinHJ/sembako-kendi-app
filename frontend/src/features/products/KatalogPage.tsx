import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Package, Plus, TriangleAlert } from 'lucide-react';
import { useProductCategories, useProducts } from './api';
import { ProductFormModal } from './components/ProductFormModal';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { ChipFilter } from '@/components/ChipFilter';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchField } from '@/components/SearchField';
import { SegmentedFilter } from '@/components/SegmentedFilter';
import { formatRupiah } from '@/lib/money';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { cn } from '@/lib/cn';
import { daftarKategori, gabungKategori, type OpsiKategori } from './kategori';
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

/** Baris produk (pen: list 52px thumb, radius 14, badge + stok + chevron) */
function ProductRow({ product }: { product: Product }) {
  const menipis = product.stok <= product.stokMinimum;
  const nonaktif = product.status === 'NONAKTIF';
  return (
    <Link
      to={`/produk/${product.id}`}
      className="press-scale card-hover flex items-center gap-2.5 rounded-[14px] border border-line-soft bg-surface p-2.5 focus:outline-none focus:ring-2 focus:ring-accent/40"
    >
      <div
        className={cn(
          'flex size-[52px] shrink-0 items-center justify-center rounded-[10px] bg-surface-muted',
          nonaktif && 'opacity-55'
        )}
      >
        {product.fotoUrl ? (
          <img src={product.fotoUrl} alt="" className="size-full rounded-[10px] object-cover" />
        ) : (
          <Package className="size-5 text-primary-soft" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-semibold text-primary', nonaktif && 'text-muted')}>{product.nama}</p>
        <p className="truncate text-xs font-medium text-muted">
          {product.kategori} · {product.tipe === 'TITIPAN' ? 'Titipan' : 'Milik Sendiri'}
        </p>
        <p className={cn('text-[13px] font-bold tabular-nums', nonaktif ? 'text-muted' : 'text-primary')}>
          {formatRupiah(product.hargaJual)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge variant={nonaktif ? 'netral' : 'lunas'} label={nonaktif ? 'Nonaktif' : 'Aktif'} />
        <span className={cn('text-xs font-semibold', menipis ? 'text-warning' : 'text-muted')}>
          Stok {product.stok}
        </span>
      </div>
      <ChevronRight className="size-4 shrink-0 text-primary-soft" aria-hidden="true" />
    </Link>
  );
}

function SkeletonRow() {
  return (
    <div className="flex animate-pulse items-center gap-2.5 rounded-[14px] border border-line-soft bg-surface p-2.5">
      <div className="size-[52px] rounded-[10px] bg-muted-soft" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-2/3 rounded bg-muted-soft" />
        <div className="h-3 w-1/2 rounded bg-muted-soft" />
        <div className="h-3.5 w-1/3 rounded bg-muted-soft" />
      </div>
    </div>
  );
}

/** Kartu produk md+ (06 §5.1; canvas Tablet/Desktop Katalog): gambar + badge + info bawah. */
function ProductCard({ product }: { product: Product }) {
  const menipis = product.stok <= product.stokMinimum;
  const nonaktif = product.status === 'NONAKTIF';
  return (
    <Link
      to={`/produk/${product.id}`}
      className="press-scale card-hover flex flex-col overflow-hidden rounded-[16px] border border-line-soft bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
    >
      <div
        className={cn(
          'relative flex aspect-[4/3] items-center justify-center bg-surface-muted',
          nonaktif && 'opacity-55'
        )}
      >
        <div className="absolute left-3 top-3">
          <Badge variant={nonaktif ? 'netral' : 'lunas'} label={nonaktif ? 'Nonaktif' : 'Aktif'} />
        </div>
        {product.tipe === 'TITIPAN' && (
          <div className="absolute right-3 top-3">
            <Badge variant="netral" label="Titipan" dot={false} />
          </div>
        )}
        {product.fotoUrl ? (
          <img src={product.fotoUrl} alt="" className="size-full object-cover" />
        ) : (
          <Package className="size-12 text-accent" aria-hidden="true" />
        )}
      </div>
      <div className="flex flex-col gap-1 p-3.5">
        <p className={cn('line-clamp-2 text-[14.5px] font-semibold leading-snug text-primary', nonaktif && 'text-muted')}>
          {product.nama}
        </p>
        <p className="text-xs text-muted">{product.kategori}</p>
        <p className={cn('text-[18px] font-bold tabular-nums', nonaktif ? 'text-muted' : 'text-primary')}>
          {formatRupiah(product.hargaJual)}
        </p>
        <span className={cn('flex items-center gap-1 text-xs font-semibold', menipis ? 'text-warning' : 'text-muted')}>
          {menipis && <TriangleAlert className="size-3.5" aria-hidden="true" />}
          Sisa {product.stok}
        </span>
      </div>
    </Link>
  );
}

/** Layar Katalog (pen: list vertikal + filter + CTA pill bawah + load more). */
export function KatalogPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<StatusFilter>('SEMUA');
  const [tipe, setTipe] = useState<TipeFilter>('SEMUA');
  const [katAktif, setKatAktif] = useState('SEMUA');
  const [formOpen, setFormOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [lihatSemua, setLihatSemua] = useState(false);
  const [memuatSemua, setMemuatSemua] = useState(false);
  const pageSize = 12;
  // Tablet/desktop (canvas qsy7c/U4Fuey) = grid kartu bergambar; mobile = list.
  const isMd = useMediaQuery('(min-width: 768px)');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset pagination saat filter berubah.
  useEffect(() => {
    setPage(1);
    setLihatSemua(false);
  }, [debounced, status, tipe, katAktif]);

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useProducts({
      search: debounced,
      status,
      tipe,
      limit: pageSize,
      ...(katAktif !== 'SEMUA' ? { kategori: katAktif } : {}),
    });

  async function goToNextPage() {
    const loadedPages = data?.pages.length ?? 0;
    if (page < loadedPages) {
      setPage((current) => current + 1);
      return;
    }
    if (hasNextPage) {
      const result = await fetchNextPage();
      if (!result.isError) setPage((current) => current + 1);
    }
  }

  async function loadAllProducts() {
    setMemuatSemua(true);
    try {
      let more = hasNextPage;
      while (more) {
        const result = await fetchNextPage();
        if (result.isError) break;
        more = result.hasNextPage;
      }
      setLihatSemua(true);
    } finally {
      setMemuatSemua(false);
    }
  }

  const products = lihatSemua
    ? data?.pages.flatMap((p) => p.data) ?? []
    : data?.pages[page - 1]?.data ?? data?.pages[0]?.data ?? [];
  const loadedProducts = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.pagination.total ?? 0;
  const menipis = products.filter((p) => p.stok <= p.stokMinimum).length;
  const titipan = products.filter((p) => p.tipe === 'TITIPAN').length;

  // Daftar kategori dasar (tidak terpengaruh oleh filter kategori aktif agar pilihan tidak hilang).
  const { data: baseCategories = [] } = useProductCategories({ status, tipe });
  const [kategoriList, setKategoriList] = useState<OpsiKategori[]>([]);

  useEffect(() => {
    const fromLoaded = daftarKategori(loadedProducts.map((p) => p.kategori));
    setKategoriList(gabungKategori(baseCategories, fromLoaded));
  }, [baseCategories, loadedProducts]);

  return (
    <div className="flex flex-col gap-3">
      {/* Pen (canvas qsy7c/U4Fuey): CTA "Tambah Produk" di aksi header kanan pada md+; mobile tetap pill bawah. */}
      <ScreenHeader
        eyebrow="KATALOG"
        title="Produk"
        info={data ? `${total} produk ditampilkan${menipis ? ` · ${menipis} stok menipis` : ''}${titipan ? ` · ${titipan} titipan` : ''}` : undefined}
        action={
          <Button
            className="h-11 shrink-0 gap-2 px-3.5 text-xs md:px-5 md:text-sm"
            aria-label="Tambah Produk"
            onClick={() => setFormOpen(true)}
          >
            <Plus className="size-4" aria-hidden="true" />
            <span>Tambah Produk</span>
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <SearchField value={search} onChange={setSearch} placeholder="Cari nama atau kategori produk" />
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

        {/* Filter kategori — tetap menampilkan seluruh kategori saat salah satu dipilih */}
        {kategoriList.length > 0 && (
          <div role="group" aria-label="Filter kategori" className="flex flex-wrap gap-2">
            <ChipFilter active={katAktif === 'SEMUA'} onClick={() => setKatAktif('SEMUA')}>
              Semua Kategori
            </ChipFilter>
            {kategoriList.map((k) => (
              <ChipFilter
                key={k.key}
                active={katAktif === k.key}
                onClick={() => setKatAktif(k.key)}
                aria-label={`Kategori ${k.label}`}
              >
                {k.label}
              </ChipFilter>
            ))}
          </div>
        )}
        <SegmentedFilter label="Status" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonRow key={i} />
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
        <>
          {isMd ? (
            /* Tablet 3 kolom, Desktop 4 kolom (06 §5.1): kartu bergambar (canvas qsy7c/U4Fuey). */
            <div className="grid grid-cols-3 gap-3.5 xl:grid-cols-4 xl:gap-[18px]">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            /* Mobile (canvas cG6zP): list vertikal + chevron. */
            <div className="flex flex-col gap-2.5">
              {products.map((p) => (
                <ProductRow key={p.id} product={p} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Pagination client-side di atas halaman server 12 produk; Lihat semua opt-in memuat sisanya. */}
      {!isLoading && !isError && products.length > 0 && !lihatSemua && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <p className="text-xs text-muted">Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} dari {total} produk</p>
          <div className="flex w-full flex-wrap items-center justify-center gap-2">
            {page > 1 && (
              <Button variant="secondary" className="h-11 px-4 text-xs" onClick={() => setPage((p) => p - 1)}>
                Sebelumnya
              </Button>
            )}
            {hasNextPage && (
              <Button variant="secondary" className="h-11 px-4 text-xs" onClick={() => void goToNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? 'Memuat…' : `Berikutnya${page * pageSize < total ? ` (${Math.max(0, total - page * pageSize)} produk)` : ''}`}
              </Button>
            )}
            {total > loadedProducts.length && (
              <Button variant="secondary" className="h-11 px-4 text-xs" onClick={() => void loadAllProducts()} disabled={memuatSemua || isFetchingNextPage}>
                {memuatSemua ? 'Memuat semua…' : `Lihat semua (${total})`}
              </Button>
            )}
          </div>
        </div>
      )}
      {lihatSemua && products.length > 0 && (
        <div className="flex flex-col items-center gap-2 pt-2">
          {memuatSemua && <p role="status" className="text-xs text-muted">Memuat sisa produk…</p>}
          <Button variant="secondary" className="h-11 px-4 text-xs" onClick={() => { setLihatSemua(false); setPage(1); }}>
            Tampilkan per halaman
          </Button>
        </div>
      )}

      <ProductFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
