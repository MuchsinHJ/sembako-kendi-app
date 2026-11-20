import { useEffect, useMemo, useState } from 'react';
import { Package, Plus, ShoppingBasket } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useProductCategories, useProducts } from '@/features/products/api';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChipFilter } from '@/components/ChipFilter';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchField } from '@/components/SearchField';
import { formatRupiah } from '@/lib/money';
import { formatTanggalPanjang } from '@/lib/date';
import { ApiError } from '@/lib/http';
import { cn } from '@/lib/cn';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { daftarKategori, gabungKategori } from '@/features/products/kategori';
import { useCreateTransaction } from '../api';
import { CartForm } from './CartForm';
import { BerhasilStep, KeranjangStep, KonfirmasiStep } from './PosCheckout';
import { ringkasItem, totalKeranjang } from '../utils';
import type { CartItem, Transaction } from '../types';
import type { Product } from '@/features/products/types';

type Langkah = 'pilih' | 'keranjang' | 'konfirmasi' | 'berhasil';
const LANGKAH: readonly Langkah[] = ['pilih', 'keranjang', 'konfirmasi', 'berhasil'];

/**
 * Baris produk POS mobile (pen Produk - Beras Ramos 5 kg): h56 p6 gap10 surface r14,
 * thumb 44 r10 · nama 14/600 + harga 13/700 · stok 12 · tombol + 44 surface-muted.
 * Tombol + berubah primary bila produk sudah di keranjang (umpan balik tambahan).
 */
function ProductRow({
  product,
  qty,
  onChange,
}: {
  product: Product;
  qty: number;
  onChange: (p: Product, q: number) => void;
}) {
  const habis = qty >= product.stok;
  return (
    <div className="flex h-14 items-center gap-2.5 rounded-[14px] bg-surface p-1.5">
      <Link
        to={`/produk/${product.id}`}
        className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-surface-muted"
        aria-label={`Lihat ${product.nama}`}
      >
        {product.fotoUrl ? (
          <img
            src={product.fotoUrl}
            alt=""
            className="size-full object-cover outline outline-1 -outline-offset-1 outline-black/10"
          />
        ) : (
          <Package className="size-[18px] text-primary-soft" aria-hidden="true" />
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <p className="truncate text-sm font-semibold text-primary">{product.nama}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[13px] font-bold tabular-nums text-primary">
            {formatRupiah(product.hargaJual)}
          </span>
          <span
            className={cn(
              'text-xs',
              product.stok <= product.stokMinimum ? 'text-warning' : 'text-muted',
            )}
          >
            {product.stok === 0 ? 'Stok habis' : `Stok ${product.stok}`}
          </span>
          {qty > 0 && (
            <span className="text-xs font-semibold text-primary-soft">· {qty} di keranjang</span>
          )}
        </div>
      </div>
      <button
        type="button"
        aria-label={`Tambah ${product.nama}`}
        disabled={habis}
        onClick={() => onChange(product, qty + 1)}
        className={cn(
          'press-scale flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-40',
          qty > 0
            ? 'bg-primary text-bg'
            : 'bg-surface-muted text-primary enabled:hover:bg-muted-soft',
        )}
      >
        <Plus className="size-[18px]" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Kartu produk POS md+ (canvas uGvXh): gambar besar + nama + harga + stok + tombol + bulat. */
function ProductCard({
  product,
  qty,
  onChange,
}: {
  product: Product;
  qty: number;
  onChange: (p: Product, q: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-[16px] border border-line-soft bg-surface p-3">
      <Link
        to={`/produk/${product.id}`}
        className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-card-sm bg-surface-muted"
        aria-label={`Lihat ${product.nama}`}
      >
        {product.fotoUrl ? (
          <img src={product.fotoUrl} alt="" className="size-full object-cover" />
        ) : (
          <Package className="size-10 text-accent" aria-hidden="true" />
        )}
      </Link>
      <p className="line-clamp-2 text-[14.5px] font-semibold leading-snug text-primary">
        {product.nama}
      </p>
      <p className="text-[15px] font-bold tabular-nums text-primary">
        {formatRupiah(product.hargaJual)}
      </p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted">Stok {product.stok}</span>
        <button
          type="button"
          aria-label={`Tambah ${product.nama}`}
          disabled={qty >= product.stok}
          onClick={() => onChange(product, qty + 1)}
          className={cn(
            'press-scale flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-40',
            qty > 0
              ? 'bg-primary text-bg'
              : 'bg-surface-muted text-primary enabled:hover:bg-accent-soft',
          )}
        >
          <Plus className="size-[18px]" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/**
 * Layar POS. Mobile = alur 4 langkah (pen TO213 → p6iFM → NOO66/Iz4Nr → maq6j/lhvUF),
 * langkah disimpan di `?langkah=` agar tombol kembali peramban berfungsi.
 * md+: dua panel (produk | keranjang selalu tampil, canvas uGvXh / O7bvH).
 */
export function PosPage() {
  const isMd = useMediaQuery('(min-width: 768px)');
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const langkahParam = searchParams.get('langkah') as Langkah | null;
  const langkah: Langkah =
    !isMd && langkahParam && LANGKAH.includes(langkahParam) ? langkahParam : 'pilih';

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [uang, setUang] = useState('');
  const [namaPembeli, setNamaPembeli] = useState('');
  const [noHp, setNoHp] = useState('');
  const [namaError, setNamaError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [hasil, setHasil] = useState<Transaction | null>(null);
  const [page, setPage] = useState(1);
  const [lihatSemuaProduk, setLihatSemuaProduk] = useState(false);
  const [memuatSemua, setMemuatSemua] = useState(false);
  const [katAktif, setKatAktif] = useState('SEMUA');
  const pageSize = 12;
  const create = useCreateTransaction();

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
    setLihatSemuaProduk(false);
  }, [debounced, katAktif]);

  const cartItems = [...cart.values()];
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);
  const cartTotal = totalKeranjang(cartItems);

  // Penjaga langkah: keranjang/konfirmasi butuh isi, berhasil butuh hasil transaksi.
  useEffect(() => {
    const butuhIsi =
      (langkah === 'keranjang' || langkah === 'konfirmasi') && cart.size === 0 && !hasil;
    const tanpaHasil = langkah === 'berhasil' && !hasil;
    if (butuhIsi || tanpaHasil) setSearchParams({}, { replace: true });
  }, [langkah, cart.size, hasil, setSearchParams]);

  function keLangkah(next: Langkah) {
    setSearchParams({ langkah: next }, { state: { posStep: true } });
  }

  function kembali() {
    if ((location.state as { posStep?: boolean } | null)?.posStep) navigate(-1);
    else
      setSearchParams(langkah === 'konfirmasi' ? { langkah: 'keranjang' } : {}, { replace: true });
  }

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useProducts({
      status: 'AKTIF',
      limit: pageSize,
      ...(debounced ? { search: debounced } : {}),
      ...(katAktif !== 'SEMUA' ? { kategori: katAktif } : {}),
    });
  const allLoadedProducts = data?.pages.flatMap((p) => p.data) ?? [];
  const totalProducts = data?.pages[0]?.pagination.total ?? 0;

  async function goNextPage() {
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
      setLihatSemuaProduk(true);
    } finally {
      setMemuatSemua(false);
    }
  }

  function setQty(product: Product, qty: number) {
    setCart((prev) => {
      const next = new Map(prev);
      // Validasi stok di klien (backend tetap sumber kebenaran).
      const capped = Math.min(qty, product.stok);
      if (capped <= 0) next.delete(product.id);
      else next.set(product.id, { product, qty: capped });
      return next;
    });
  }

  function simpanTransaksi() {
    setFormError(null);
    const uangNumber = Number(uang || '0');
    const utang = uangNumber < cartTotal;
    if (utang && !namaPembeli.trim()) {
      setNamaError('Nama pembeli wajib diisi untuk transaksi utang.');
      return;
    }
    setNamaError(null);
    create.mutate(
      {
        items: cartItems.map((i) => ({ productId: i.product.id, jumlah: i.qty })),
        uangDiterima: uangNumber,
        ...(namaPembeli.trim() ? { namaPembeli: namaPembeli.trim() } : {}),
        noHpPembeli: noHp.trim() || null,
      },
      {
        onSuccess: (t) => {
          setHasil(t);
          setCart(new Map());
          setSearchParams({ langkah: 'berhasil' }, { replace: true });
        },
        onError: (err: unknown) =>
          setFormError(
            err instanceof ApiError ? err.message : 'Gagal menyimpan transaksi. Coba lagi.',
          ),
      },
    );
  }

  function transaksiBaru() {
    setHasil(null);
    setUang('');
    setNamaPembeli('');
    setNoHp('');
    setNamaError(null);
    setFormError(null);
    setSearchParams({}, { replace: true });
  }

  const products = lihatSemuaProduk
    ? allLoadedProducts
    : (data?.pages[page - 1]?.data ?? data?.pages[0]?.data ?? []);

  // Daftar kategori dasar (produk aktif, tidak terpengaruh saat salah satu kategori dipilih).
  const { data: baseCategories = [] } = useProductCategories({ status: 'AKTIF' });
  const kategoriList = useMemo(() => {
    const fromLoaded = daftarKategori(
      (data?.pages.flatMap((p) => p.data) ?? []).map((p) => p.kategori),
    );
    return gabungKategori(baseCategories, fromLoaded);
  }, [baseCategories, data?.pages]);

  /* ── Langkah mobile setelah pilih produk ── */
  if (langkah === 'keranjang' && cart.size > 0) {
    return (
      <KeranjangStep
        cart={cartItems}
        uang={uang}
        onUang={setUang}
        onQty={setQty}
        onBack={kembali}
        onLanjut={() => keLangkah('konfirmasi')}
      />
    );
  }
  if (langkah === 'konfirmasi' && cart.size > 0) {
    return (
      <KonfirmasiStep
        cart={cartItems}
        uang={uang}
        namaPembeli={namaPembeli}
        noHp={noHp}
        onNama={(v) => {
          setNamaPembeli(v);
          if (namaError && v.trim()) setNamaError(null);
        }}
        onNoHp={setNoHp}
        namaError={namaError}
        formError={formError}
        busy={create.isPending}
        onBack={kembali}
        onSimpan={simpanTransaksi}
      />
    );
  }
  if (langkah === 'berhasil' && hasil) {
    return (
      <BerhasilStep
        transaksi={hasil}
        onTransaksiBaru={transaksiBaru}
        onBeranda={() => navigate('/')}
      />
    );
  }

  return (
    <div className={cn('flex flex-col', cartCount > 0 && 'pb-[74px] md:pb-0')}>
      <div className="flex flex-1 flex-col gap-2.5 md:flex-row md:items-start md:gap-6 md:p-4">
        {/* Panel kiri: produk (pen Grup Pilih Produk gap 10) */}
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <ScreenHeader
            eyebrow="TRANSAKSI"
            title="Transaksi Baru"
            info={formatTanggalPanjang(new Date())}
          />
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Cari nama atau kategori produk"
          />

          {/* Filter kategori (pen Filter Kategori): chip 44 gap 8, satu baris geser */}
          <div
            role="group"
            aria-label="Filter kategori"
            className="chip-scroller -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
          >
            <ChipFilter active={katAktif === 'SEMUA'} onClick={() => setKatAktif('SEMUA')}>
              Semua
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

          {isLoading && (
            <div className="flex flex-col gap-2" aria-busy="true">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-[14px] bg-surface" />
              ))}
            </div>
          )}

          {isError && (
            <Card variant="warning" className="items-start">
              <p className="text-sm font-semibold text-warning">Gagal memuat produk.</p>
              <Button
                variant="secondary"
                className="mt-1 h-10 px-4 text-xs"
                onClick={() => refetch()}
              >
                Coba lagi
              </Button>
            </Card>
          )}

          {!isLoading && !isError && products.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
              <div className="flex size-[72px] items-center justify-center rounded-full bg-surface-muted">
                <Package className="size-[30px] text-primary-soft" aria-hidden="true" />
              </div>
              <p className="text-lg font-semibold text-primary">
                {debounced || katAktif !== 'SEMUA'
                  ? 'Produk tidak ditemukan'
                  : 'Belum ada produk aktif'}
              </p>
              <p className="max-w-[280px] text-[13px] leading-normal text-muted">
                {debounced || katAktif !== 'SEMUA'
                  ? 'Coba kata kunci atau kategori lain.'
                  : 'Aktifkan atau tambahkan produk di Katalog supaya bisa dipilih saat mencatat transaksi.'}
              </p>
            </div>
          )}

          {!isLoading && !isError && products.length > 0 && (
            <>
              {/* Baris Label Daftar (pen): h18 — "Produk aktif" 12.5/500 · jumlah 12 */}
              <div className="flex h-[18px] items-center justify-between">
                <span className="text-[12.5px] font-medium text-muted">Produk aktif</span>
                <span className="text-xs text-muted">{totalProducts} produk</span>
              </div>
              {isMd ? (
                <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-3">
                  {products.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      qty={cart.get(p.id)?.qty ?? 0}
                      onChange={setQty}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {products.map((p) => (
                    <ProductRow
                      key={p.id}
                      product={p}
                      qty={cart.get(p.id)?.qty ?? 0}
                      onChange={setQty}
                    />
                  ))}
                </div>
              )}
              {!lihatSemuaProduk && (hasNextPage || page < (data?.pages.length ?? 0)) && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <Button
                    variant="secondary"
                    className="h-11 px-4 text-xs"
                    onClick={() => void goNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? 'Memuat…' : 'Muat produk lainnya'}
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-11 px-4 text-xs"
                    onClick={() => void loadAllProducts()}
                    disabled={memuatSemua || isFetchingNextPage}
                  >
                    {memuatSemua ? 'Memuat semua…' : `Lihat semua (${totalProducts})`}
                  </Button>
                </div>
              )}
              {page > 1 && !lihatSemuaProduk && (
                <Button
                  variant="secondary"
                  className="mx-auto h-11 px-4 text-xs"
                  onClick={() => setPage((p) => p - 1)}
                >
                  Halaman sebelumnya
                </Button>
              )}
              {lihatSemuaProduk && (
                <div className="flex flex-col items-center gap-2 pt-1">
                  {memuatSemua && (
                    <p role="status" className="text-xs text-muted">
                      Memuat sisa produk…
                    </p>
                  )}
                  <Button
                    variant="secondary"
                    className="h-11 px-4 text-xs"
                    onClick={() => setLihatSemuaProduk(false)}
                  >
                    Kembali ke muat bertahap
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Panel kanan: keranjang selalu tampil (md+) */}
        <aside className="hidden w-[350px] shrink-0 flex-col gap-3 rounded-card border border-line-soft bg-surface p-4 md:flex xl:w-[400px]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-primary">Keranjang</h2>
            <span className="text-sm font-semibold text-primary-soft">
              {ringkasItem(cartItems)}
            </span>
          </div>
          <div className="h-px bg-line-soft" />
          <CartForm
            cart={cartItems}
            onQty={setQty}
            onSelesai={() => {}}
            onReset={() => setCart(new Map())}
            compact
          />
        </aside>
      </div>

      {/* Bar Keranjang (pen G49pEA): surface + garis atas line-soft, p[12,20,14,20], di atas bottom nav */}
      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(63px+max(25px,env(safe-area-inset-bottom)))] z-30 border-t border-line-soft bg-surface px-5 pb-3.5 pt-3 md:hidden">
          <div className="mx-auto flex w-full max-w-[430px] items-center justify-between gap-2.5">
            <div className="flex min-w-0 flex-col gap-px">
              <span className="text-xs text-muted">{ringkasItem(cartItems)}</span>
              <span className="text-xl font-bold leading-tight tabular-nums text-primary">
                {formatRupiah(cartTotal)}
              </span>
            </div>
            <Button
              aria-label="Buka keranjang"
              className="shrink-0 ps-5 pe-5"
              onClick={() => keLangkah('keranjang')}
            >
              <ShoppingBasket className="size-4" aria-hidden="true" />
              Keranjang
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
