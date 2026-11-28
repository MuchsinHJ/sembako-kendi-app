import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  LayoutGrid,
  List,
  Package,
  Plus,
  SearchX,
  TriangleAlert,
} from 'lucide-react';
import { useProductCategories, useProducts, useProductsPage } from './api';
import { ProductFormModal } from './components/ProductFormModal';
import { useDashboardSummary } from '@/features/dashboard/api';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { ChipFilter } from '@/components/ChipFilter';
import { Pagination } from '@/components/Pagination';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchField } from '@/components/SearchField';
import { SegmentedFilter } from '@/components/SegmentedFilter';
import { formatRupiah } from '@/lib/money';
import { MQ } from '@/lib/breakpoints';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { cn } from '@/lib/cn';
import { daftarKategori, gabungKategori, labelKategoriTipe } from './kategori';
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

type Tampilan = 'grid' | 'list';
const VIEW_KEY = 'kendi.katalog.tampilan';

/** Pilihan grid/list md+ (ide .pen U4Fuey) disimpan per perangkat. */
function useTampilanKatalog(): [Tampilan, (v: Tampilan) => void] {
  const [view, setView] = useState<Tampilan>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });
  function simpan(v: Tampilan) {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* penyimpanan diblokir: pilihan tetap berlaku di sesi ini */
    }
  }
  return [view, simpan];
}

/**
 * Baris produk (pen Produk - Beras Ramos 5 kg): surface r14 p10 gap10 stroke line-soft.
 * Thumb 52 r10 · info gap 3 (nama 14/600, kategori 12/500 muted, harga 13/700) ·
 * kolom status w78 gap5 (badge + stok 12/600: warning bila menipis) · chevron 16.
 * Nonaktif: nama/harga/ikon/stok/chevron memakai muted.
 */
function ProductRow({ product }: { product: Product }) {
  const menipis = product.stok <= product.stokMinimum;
  const nonaktif = product.status === 'NONAKTIF';
  return (
    <Link
      to={`/produk/${product.id}`}
      className="press-scale card-hover flex items-center gap-2.5 rounded-[14px] border border-line-soft bg-surface p-2.5"
    >
      <div className="flex size-[52px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-surface-muted">
        {product.fotoUrl ? (
          <img
            src={product.fotoUrl}
            alt=""
            className={cn(
              'size-full object-cover outline outline-1 -outline-offset-1 outline-black/10',
              nonaktif && 'opacity-60',
            )}
          />
        ) : (
          <Package
            className={cn('size-5', nonaktif ? 'text-muted' : 'text-primary-soft')}
            aria-hidden="true"
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <p
          className={cn('truncate text-sm font-semibold', nonaktif ? 'text-muted' : 'text-primary')}
        >
          {product.nama}
        </p>
        <p className="truncate text-xs font-medium text-muted">{labelKategoriTipe(product)}</p>
        <p
          className={cn(
            'text-[13px] font-bold tabular-nums',
            nonaktif ? 'text-muted' : 'text-primary',
          )}
        >
          {formatRupiah(product.hargaJual)}
        </p>
      </div>
      <div className="flex w-[78px] shrink-0 flex-col items-end gap-[5px]">
        <Badge variant={nonaktif ? 'netral' : 'lunas'} label={nonaktif ? 'Nonaktif' : 'Aktif'} />
        <span
          className={cn(
            'text-xs font-semibold tabular-nums',
            nonaktif ? 'text-muted' : menipis ? 'text-warning' : 'text-primary-soft',
          )}
        >
          Stok {product.stok}
        </span>
      </div>
      <ChevronRight
        className={cn('size-4 shrink-0', nonaktif ? 'text-muted' : 'text-primary-soft')}
        aria-hidden="true"
      />
    </Link>
  );
}

/**
 * Baris tabel md+ (tampilan daftar): kolom produk · tipe · harga jual · stok · status.
 * Tinggi 64 (target sentuh), angka rata kanan tabular.
 */
function ProductTableRow({ product }: { product: Product }) {
  const menipis = product.stok <= product.stokMinimum;
  const nonaktif = product.status === 'NONAKTIF';
  return (
    <Link
      to={`/produk/${product.id}`}
      className="grid min-h-16 grid-cols-[minmax(0,1fr)_120px_120px_88px_96px_20px] items-center gap-3 px-4 py-2 transition-colors duration-150 ease-out hover:bg-surface-muted"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-surface-muted">
          {product.fotoUrl ? (
            <img
              src={product.fotoUrl}
              alt=""
              className={cn(
                'size-full object-cover outline outline-1 -outline-offset-1 outline-black/10',
                nonaktif && 'opacity-60',
              )}
            />
          ) : (
            <Package
              className={cn('size-[18px]', nonaktif ? 'text-muted' : 'text-primary-soft')}
              aria-hidden="true"
            />
          )}
        </span>
        <span className="flex min-w-0 flex-col gap-px">
          <span
            className={cn(
              'truncate text-sm font-semibold',
              nonaktif ? 'text-muted' : 'text-primary',
            )}
          >
            {product.nama}
          </span>
          <span className="truncate text-xs text-muted">{product.kategori}</span>
        </span>
      </span>
      <span className="truncate text-[12.5px] text-muted">
        {product.tipe === 'TITIPAN'
          ? product.consignor?.nama
            ? `Titipan · ${product.consignor.nama}`
            : 'Titipan'
          : 'Milik sendiri'}
      </span>
      <span
        className={cn(
          'text-right text-sm font-bold tabular-nums',
          nonaktif ? 'text-muted' : 'text-primary',
        )}
      >
        {formatRupiah(product.hargaJual)}
      </span>
      <span
        className={cn(
          'flex items-center justify-end gap-1 text-[13px] font-semibold tabular-nums',
          nonaktif ? 'text-muted' : menipis ? 'text-warning' : 'text-primary-soft',
        )}
      >
        {menipis && !nonaktif && <TriangleAlert className="size-3.5" aria-hidden="true" />}
        {product.stok}
      </span>
      <span className="flex justify-end">
        <Badge variant={nonaktif ? 'netral' : 'lunas'} label={nonaktif ? 'Nonaktif' : 'Aktif'} />
      </span>
      <ChevronRight className="size-4 text-muted" aria-hidden="true" />
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
          nonaktif && 'opacity-55',
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
        <p
          className={cn(
            'line-clamp-2 text-[14.5px] font-semibold leading-snug text-primary',
            nonaktif && 'text-muted',
          )}
        >
          {product.nama}
        </p>
        <p className="text-xs text-muted">{product.kategori}</p>
        <p
          className={cn(
            'text-[18px] font-bold tabular-nums',
            nonaktif ? 'text-muted' : 'text-primary',
          )}
        >
          {formatRupiah(product.hargaJual)}
        </p>
        <span
          className={cn(
            'flex items-center gap-1 text-xs font-semibold',
            menipis ? 'text-warning' : 'text-muted',
          )}
        >
          {menipis && <TriangleAlert className="size-3.5" aria-hidden="true" />}
          Sisa {product.stok}
        </span>
      </div>
    </Link>
  );
}

/** Kartu ringkasan sebaris md+ (ide .pen U4Fuey): tombol yang langsung memfilter status. */
function SummaryButton({
  label,
  value,
  active,
  tone = 'surface',
  onClick,
}: {
  label: string;
  value: number | string;
  active?: boolean;
  tone?: 'surface' | 'warning';
  onClick?: () => void;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      {...(onClick ? { type: 'button' as const, onClick, 'aria-pressed': !!active } : {})}
      className={cn(
        'flex min-w-0 flex-col gap-0.5 rounded-[16px] border px-4 py-3 text-left',
        onClick && 'press-scale transition-colors duration-150 ease-out',
        tone === 'warning' ? 'border-transparent bg-warning-soft' : 'bg-surface',
        tone === 'surface' &&
          (active ? 'border-primary-soft' : 'border-line-soft hover:bg-surface-muted'),
      )}
    >
      <span
        className={cn('text-xs font-medium', tone === 'warning' ? 'text-warning' : 'text-muted')}
      >
        {label}
      </span>
      <span className="text-[22px] font-bold leading-tight tabular-nums text-primary">{value}</span>
    </Comp>
  );
}

/** Layar Katalog (pen: list vertikal + filter + CTA pill bawah + load more). md+: grid/list + paginasi bernomor. */
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
  // Tablet/desktop (canvas qsy7c/U4Fuey) = grid kartu bergambar / tabel; mobile = list.
  const isMd = useMediaQuery(MQ.md);
  const [tampilan, setTampilan] = useTampilanKatalog();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset pagination saat filter berubah.
  useEffect(() => {
    setPage(1);
    setLihatSemua(false);
  }, [debounced, status, tipe, katAktif]);

  const filters = {
    search: debounced,
    status,
    tipe,
    limit: pageSize,
    ...(katAktif !== 'SEMUA' ? { kategori: katAktif } : {}),
  };
  // Mobile: infinite "Berikutnya / Lihat semua". md+: satu halaman server per nomor + prefetch.
  const infinite = useProducts(filters, { enabled: !isMd });
  const paged = useProductsPage(filters, page, { enabled: isMd });
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = infinite;
  const isLoading = isMd ? paged.isLoading : infinite.isLoading;
  const isError = isMd ? paged.isError : infinite.isError;
  const refetch = isMd ? paged.refetch : infinite.refetch;

  // Ringkasan md+: total aktif/nonaktif (limit 1 — hanya butuh angka total) + stok menipis.
  const jumlahAktif = useProductsPage({ status: 'AKTIF', limit: 1 }, 1, { enabled: isMd });
  const jumlahNonaktif = useProductsPage({ status: 'NONAKTIF', limit: 1 }, 1, { enabled: isMd });
  const summary = useDashboardSummary();

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

  const products = isMd
    ? (paged.data?.data ?? [])
    : lihatSemua
      ? (data?.pages.flatMap((p) => p.data) ?? [])
      : (data?.pages[page - 1]?.data ?? data?.pages[0]?.data ?? []);
  const loadedProducts = data?.pages.flatMap((p) => p.data) ?? [];
  const total = (isMd ? paged.data?.pagination.total : data?.pages[0]?.pagination.total) ?? 0;
  const loaded = isMd ? !!paged.data : !!data;
  const filterAktif = status !== 'SEMUA' || tipe !== 'SEMUA' || katAktif !== 'SEMUA';
  const katalogKosong = !isLoading && !isError && total === 0 && !debounced && !filterAktif;
  const tidakDitemukan = !isLoading && !isError && total === 0 && !katalogKosong;
  // Paginasi mobile hanya tampil bila server melaporkan lebih dari satu halaman.
  const perluPaginasi = !isMd && (data?.pages[0]?.pagination.totalPages ?? 1) > 1;

  function kosongkanPencarian() {
    setSearch('');
    setDebounced('');
    setTipe('SEMUA');
    setStatus('SEMUA');
    setKatAktif('SEMUA');
  }

  // Daftar kategori dasar (tidak terpengaruh oleh filter kategori aktif agar pilihan tidak hilang).
  const { data: baseCategories = [] } = useProductCategories({ status, tipe });
  const kategoriList = useMemo(() => {
    const termuat = isMd ? (paged.data?.data ?? []) : (data?.pages.flatMap((p) => p.data) ?? []);
    return gabungKategori(baseCategories, daftarKategori(termuat.map((p) => p.kategori)));
  }, [baseCategories, isMd, paged.data, data]);

  const chipTipe = (
    <div role="group" aria-label="Filter tipe produk" className="flex flex-wrap gap-2">
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
  );

  const chipKategori = kategoriList.length > 0 && (
    <div
      role="group"
      aria-label="Filter kategori"
      className="chip-scroller -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
    >
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
  );

  return (
    <div className="flex min-h-[calc(100dvh-128px-env(safe-area-inset-bottom))] flex-col gap-3 md:min-h-0 md:gap-4">
      {/* Header (pen gap 3). CTA header hanya md+ (canvas qsy7c/U4Fuey); mobile memakai pill bawah. */}
      <ScreenHeader
        eyebrow="KATALOG"
        title="Produk"
        info={loaded && !katalogKosong ? `${total} produk ditampilkan` : undefined}
        action={
          <Button
            className="hidden h-11 shrink-0 gap-2 ps-4 pe-5 text-sm md:inline-flex"
            aria-label="Tambah Produk"
            onClick={() => setFormOpen(true)}
          >
            <Plus className="size-4" aria-hidden="true" />
            <span>Tambah Produk</span>
          </Button>
        }
      />

      {isMd && !katalogKosong && (
        <div className="grid grid-cols-3 gap-3">
          <SummaryButton
            label="Produk aktif"
            value={jumlahAktif.data?.pagination.total ?? '–'}
            active={status === 'AKTIF'}
            onClick={() => setStatus(status === 'AKTIF' ? 'SEMUA' : 'AKTIF')}
          />
          <SummaryButton
            label="Nonaktif"
            value={jumlahNonaktif.data?.pagination.total ?? '–'}
            active={status === 'NONAKTIF'}
            onClick={() => setStatus(status === 'NONAKTIF' ? 'SEMUA' : 'NONAKTIF')}
          />
          <SummaryButton
            tone="warning"
            label="Stok menipis"
            value={summary.data?.produkLowStock.length ?? '–'}
          />
        </div>
      )}

      {!katalogKosong &&
        (isMd ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <SearchField
                  value={search}
                  onChange={setSearch}
                  placeholder="Cari nama atau kategori produk"
                />
              </div>
              <div
                role="radiogroup"
                aria-label="Tampilan"
                className="flex h-[52px] shrink-0 gap-1 rounded-segment bg-surface-muted p-1"
              >
                {(
                  [
                    ['grid', 'Tampilan grid', LayoutGrid],
                    ['list', 'Tampilan daftar', List],
                  ] as const
                ).map(([v, label, Icon]) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={tampilan === v}
                    aria-label={label}
                    onClick={() => setTampilan(v)}
                    className={cn(
                      'press-scale flex w-11 items-center justify-center rounded-segment-active border transition-colors duration-150 ease-out',
                      tampilan === v
                        ? 'border-line-soft bg-surface text-primary'
                        : 'border-transparent text-muted hover:bg-surface/70',
                    )}
                  >
                    <Icon className="size-[18px]" strokeWidth={2.25} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              {chipTipe}
              <SegmentedFilter
                label="Status"
                options={STATUS_OPTIONS}
                value={status}
                onChange={setStatus}
                className="w-full lg:w-[340px]"
              />
            </div>
            {chipKategori}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Cari nama atau kategori produk"
            />

            {/* Filter tipe (pen Filter Kategori: chip 44, gap 8) */}
            {chipTipe}

            {/* Filter kategori (tambahan di luar canvas): baris geser horizontal seperti chip kategori POS,
                daftar tetap utuh saat salah satu kategori dipilih. */}
            {chipKategori}

            <SegmentedFilter
              label="Status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={setStatus}
            />
          </div>
        ))}

      {isLoading && (
        <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 lg:grid-cols-3">
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

      {/* Empty State Katalog (pen v5AKiZ): ikon 72 bulat, judul 18/600, keterangan 13 w280, CTA 48 */}
      {katalogKosong && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3.5 p-5 text-center md:rounded-[20px] md:bg-surface md:py-16">
          <div className="flex size-[72px] items-center justify-center rounded-full bg-surface-muted">
            <Package className="size-[30px] text-primary-soft" aria-hidden="true" />
          </div>
          <p className="text-lg font-semibold text-primary">Belum ada produk</p>
          <p className="max-w-[280px] text-[13px] leading-normal text-muted">
            Katalog masih kosong. Tambahkan produk pertama supaya bisa dipilih saat mencatat
            transaksi.
          </p>
          <Button className="h-12 gap-[7px] px-6 text-sm" onClick={() => setFormOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Tambah Produk
          </Button>
        </div>
      )}

      {/* Empty State Pencarian (pen LlckD): ikon 72, judul 18/600, keterangan 13 w270, tombol garis 48 */}
      {tidakDitemukan && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-5 text-center md:rounded-[20px] md:bg-surface md:py-14">
          <div className="flex size-[72px] items-center justify-center rounded-full bg-surface-muted">
            <SearchX className="size-[30px] text-primary-soft" aria-hidden="true" />
          </div>
          <p className="text-lg font-semibold text-primary">Produk tidak ditemukan</p>
          <p className="max-w-[270px] text-[13px] leading-normal text-muted">
            {debounced
              ? `Tidak ada produk yang cocok dengan “${debounced}”. Coba kata kunci lain atau kosongkan pencarian.`
              : 'Tidak ada produk yang cocok dengan filter ini. Coba pilih filter lain.'}
          </p>
          <Button
            variant="secondary"
            className="h-12 px-[22px] text-[12.5px]"
            onClick={kosongkanPencarian}
          >
            {debounced ? 'Kosongkan Pencarian' : 'Reset Filter'}
          </Button>
        </div>
      )}

      {!isLoading &&
        !isError &&
        products.length > 0 &&
        (isMd ? (
          <div
            className={cn(
              'transition-opacity duration-150 ease-out',
              paged.isPlaceholderData && 'opacity-60',
            )}
          >
            {tampilan === 'grid' ? (
              /* Tablet 3 kolom, Desktop 4 kolom (06 §5.1): kartu bergambar (canvas qsy7c/U4Fuey). */
              <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-3 xl:grid-cols-4 xl:gap-[18px]">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-[16px] border border-line-soft bg-surface">
                <div
                  aria-hidden="true"
                  className="grid h-10 grid-cols-[minmax(0,1fr)_120px_120px_88px_96px_20px] items-center gap-3 border-b border-line-soft bg-surface-muted/60 px-4 text-xs font-semibold text-muted"
                >
                  <span>Produk</span>
                  <span>Tipe</span>
                  <span className="text-right">Harga jual</span>
                  <span className="text-right">Stok</span>
                  <span className="text-right">Status</span>
                  <span />
                </div>
                <ul className="divide-y divide-line-soft">
                  {products.map((p) => (
                    <li key={p.id}>
                      <ProductTableRow product={p} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          /* Mobile (pen Daftar Produk): list vertikal gap 10 */
          <div className="flex flex-col gap-2.5">
            {products.map((p) => (
              <ProductRow key={p.id} product={p} />
            ))}
          </div>
        ))}

      {isMd && !isLoading && !isError && products.length > 0 && (
        <Pagination
          page={page}
          totalPages={paged.data?.pagination.totalPages ?? 1}
          total={total}
          pageSize={pageSize}
          onPage={setPage}
          itemLabel="produk"
          busy={paged.isPlaceholderData}
        />
      )}

      {/* Paginasi mobile (tambahan): hanya muncul bila produk melebihi satu halaman server (12). */}
      {!isLoading && !isError && products.length > 0 && perluPaginasi && !lihatSemua && (
        <div className="flex flex-col items-center gap-2 pt-1">
          <p className="text-xs text-muted">
            Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} dari {total}{' '}
            produk
          </p>
          <div className="flex w-full flex-wrap items-center justify-center gap-2">
            {page > 1 && (
              <Button
                variant="secondary"
                className="h-11 px-4 text-xs"
                onClick={() => setPage((p) => p - 1)}
              >
                Sebelumnya
              </Button>
            )}
            {hasNextPage || page < (data?.pages.length ?? 0) ? (
              <Button
                variant="secondary"
                className="h-11 px-4 text-xs"
                onClick={() => void goToNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage
                  ? 'Memuat…'
                  : `Berikutnya${page * pageSize < total ? ` (${Math.max(0, total - page * pageSize)} produk)` : ''}`}
              </Button>
            ) : null}
            {total > loadedProducts.length && (
              <Button
                variant="secondary"
                className="h-11 px-4 text-xs"
                onClick={() => void loadAllProducts()}
                disabled={memuatSemua || isFetchingNextPage}
              >
                {memuatSemua ? 'Memuat semua…' : `Lihat semua (${total})`}
              </Button>
            )}
          </div>
        </div>
      )}
      {!isMd &&
        lihatSemua &&
        products.length > 0 &&
        (data?.pages[0]?.pagination.totalPages ?? 1) > 1 && (
          <div className="flex flex-col items-center gap-2 pt-1">
            {memuatSemua && (
              <p role="status" className="text-xs text-muted">
                Memuat sisa produk…
              </p>
            )}
            <Button
              variant="secondary"
              className="h-11 px-4 text-xs"
              onClick={() => {
                setLihatSemua(false);
                setPage(1);
              }}
            >
              Tampilkan per halaman
            </Button>
          </div>
        )}

      {/* Tombol Tambah Produk (pen): pill 48 primary, menempel di bawah konten (Content justify space-between) */}
      {!isLoading && !katalogKosong && (
        <div className="mt-auto pt-1 md:hidden">
          <Button className="h-12 w-full gap-[7px] text-sm" onClick={() => setFormOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            <span>Tambah Produk</span>
          </Button>
        </div>
      )}

      <ProductFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
