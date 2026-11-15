import { useEffect, useState } from 'react';
import { Package, Plus, ShoppingBasket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProductCategories, useProducts } from '@/features/products/api';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChipFilter } from '@/components/ChipFilter';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchField } from '@/components/SearchField';
import { formatRupiah } from '@/lib/money';
import { cn } from '@/lib/cn';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { daftarKategori, gabungKategori, type OpsiKategori } from '@/features/products/kategori';
import { CartForm } from './CartForm';
import { CartModal } from './CartModal';
import type { CartItem } from '../types';
import type { Product } from '@/features/products/types';

/** Baris produk POS mobile (pen TO213): thumb 44×44 + nama + harga·stok + tombol + bulat 44×44. */
function ProductRow({ product, cart, onChange }: { product: Product; cart: Map<string, CartItem>; onChange: (p: Product, q: number) => void }) {
  const inCart = cart.get(product.id);
  return (
    <div className="flex items-center gap-2.5 rounded-[14px] bg-surface p-1.5">
      <Link
        to={`/produk/${product.id}`}
        className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-surface-muted"
        aria-label={`Lihat ${product.nama}`}
      >
        {product.fotoUrl ? (
          <img src={product.fotoUrl} alt="" className="size-full rounded-[10px] object-cover" />
        ) : (
          <Package className="size-[18px] text-primary-soft" aria-hidden="true" />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-primary">{product.nama}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[13px] font-bold text-primary">{formatRupiah(product.hargaJual)}</span>
          <span className="text-xs text-muted">Stok {product.stok}</span>
        </div>
      </div>
      <button
        type="button"
        aria-label={`Tambah ${product.nama}`}
        onClick={() => onChange(product, (inCart?.qty ?? 0) + 1)}
        className={cn(
          'press-scale flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ease-out',
          inCart ? 'bg-primary text-bg' : 'bg-surface-muted text-primary hover:bg-accent-soft'
        )}
      >
        <Plus className="size-[18px]" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Kartu produk POS md+ (canvas uGvXh): gambar besar + nama + harga + stok + tombol + bulat. */
function ProductCard({ product, cart, onChange }: { product: Product; cart: Map<string, CartItem>; onChange: (p: Product, q: number) => void }) {
  const inCart = cart.get(product.id);
  return (
    <div className="flex flex-col gap-2 rounded-[16px] border border-line-soft bg-surface p-3">
      <Link
        to={`/produk/${product.id}`}
        className="flex aspect-[4/3] items-center justify-center rounded-card-sm bg-surface-muted"
        aria-label={`Lihat ${product.nama}`}
      >
        {product.fotoUrl ? (
          <img src={product.fotoUrl} alt="" className="size-full rounded-card-sm object-cover" />
        ) : (
          <Package className="size-10 text-accent" aria-hidden="true" />
        )}
      </Link>
      <p className="line-clamp-2 text-[14.5px] font-semibold leading-snug text-primary">{product.nama}</p>
      <p className="text-[15px] font-bold tabular-nums text-primary">{formatRupiah(product.hargaJual)}</p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted">Stok {product.stok}</span>
        <button
          type="button"
          aria-label={`Tambah ${product.nama}`}
          onClick={() => onChange(product, (inCart?.qty ?? 0) + 1)}
          className={cn(
            'press-scale flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ease-out',
            inCart ? 'bg-primary text-bg' : 'bg-surface-muted text-primary hover:bg-accent-soft'
          )}
        >
          <Plus className="size-[18px]" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** Layar POS (pen TO213) — mobile: daftar + bar keranjang; md+: dua panel (produk | keranjang selalu tampil). */
export function PosPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [cartOpen, setCartOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [lihatSemuaProduk, setLihatSemuaProduk] = useState(false);
  const [memuatSemua, setMemuatSemua] = useState(false);
  const [katAktif, setKatAktif] = useState('SEMUA');
  // Panel kiri: list mobile (pen TO213); grid 2 kolom tablet / 3 kolom desktop (uGvXh / O7bvH).
  const isMd = useMediaQuery('(min-width: 768px)');
  const pageSize = 12;

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
    setLihatSemuaProduk(false);
  }, [debounced, katAktif]);

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
      if (qty <= 0) next.delete(product.id);
      else next.set(product.id, { product, qty });
      return next;
    });
  }

  const cartItems = [...cart.values()];
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cartItems.reduce((s, i) => s + Number(i.product.hargaJual) * i.qty, 0);

  const products = lihatSemuaProduk
    ? allLoadedProducts
    : data?.pages[page - 1]?.data ?? data?.pages[0]?.data ?? [];

  // Daftar kategori dasar (produk aktif, tidak terpengaruh saat salah satu kategori dipilih).
  const { data: baseCategories = [] } = useProductCategories({ status: 'AKTIF' });
  const [kategoriList, setKategoriList] = useState<OpsiKategori[]>([]);

  useEffect(() => {
    const fromLoaded = daftarKategori(allLoadedProducts.map((p) => p.kategori));
    setKategoriList(gabungKategori(baseCategories, fromLoaded));
  }, [baseCategories, allLoadedProducts]);

  return (
    <div className="flex min-h-[calc(100dvh-88px)] flex-col">
      <div className="flex flex-1 flex-col gap-3 p-1 pt-0 md:flex-row md:items-start md:gap-6 md:p-4">
        {/* Panel kiri: produk */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <ScreenHeader
            eyebrow="TRANSAKSI"
            title="Transaksi Baru"
            info={products.length > 0 ? `${products.length} produk` : undefined}
          />
          <SearchField value={search} onChange={setSearch} placeholder="Cari nama produk" />

          {/* Filter kategori (pen TO213 Idi4M) — seluruh kategori tetap ada saat salah satu dipilih */}
          <div role="group" aria-label="Filter kategori" className="flex flex-wrap gap-2">
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
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-[14px] bg-surface" />
              ))}
            </div>
          )}

          {isError && (
            <Card variant="warning" className="items-start">
              <p className="text-sm font-semibold text-warning">Gagal memuat produk.</p>
              <Button variant="secondary" className="mt-1 h-10 px-4 text-xs" onClick={() => refetch()}>
                Coba lagi
              </Button>
            </Card>
          )}

          {!isLoading && !isError && products.length === 0 && (
            <Card variant="list" className="flex flex-col items-center gap-2 py-10 text-center">
              <p className="text-sm font-semibold text-primary">
                {debounced || katAktif !== 'SEMUA' ? 'Tidak ada produk yang cocok.' : 'Belum ada produk aktif.'}
              </p>
              <p className="text-xs text-muted">
                {hasNextPage ? 'Muat halaman berikutnya untuk melihat lebih banyak produk.' : 'Aktifkan produk di Katalog untuk bertransaksi.'}
              </p>
              {hasNextPage && (
                <Button variant="secondary" className="h-11 px-4 text-xs" onClick={() => void goNextPage()} disabled={isFetchingNextPage}>
                  {isFetchingNextPage ? 'Memuat…' : 'Muat produk lainnya'}
                </Button>
              )}
            </Card>
          )}

          {!isLoading && !isError && products.length > 0 && (
            <>
              <p className="text-[12.5px] font-medium text-muted">
                {products.length} produk · {totalProducts} total{hasNextPage ? ' · lebih banyak tersedia' : ''}
              </p>
              {isMd ? (
                <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-3">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} cart={cart} onChange={setQty} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {products.map((p) => (
                    <ProductRow key={p.id} product={p} cart={cart} onChange={setQty} />
                  ))}
                </div>
              )}
              {!lihatSemuaProduk && hasNextPage && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <Button variant="secondary" className="h-11 px-4 text-xs" onClick={() => void goNextPage()} disabled={isFetchingNextPage}>
                    {isFetchingNextPage ? 'Memuat…' : `Muat 12 produk lainnya`}
                  </Button>
                  <Button variant="secondary" className="h-11 px-4 text-xs" onClick={() => void loadAllProducts()} disabled={memuatSemua || isFetchingNextPage}>
                    {memuatSemua ? 'Memuat semua…' : `Lihat semua (${totalProducts})`}
                  </Button>
                </div>
              )}
              {lihatSemuaProduk && (
                <div className="flex flex-col items-center gap-2 pt-2">
                  {memuatSemua && <p role="status" className="text-xs text-muted">Memuat sisa produk…</p>}
                  <Button variant="secondary" className="h-11 px-4 text-xs" onClick={() => setLihatSemuaProduk(false)}>
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
              {cartItems.length} produk · {cartCount} item
            </span>
          </div>
          <div className="h-px bg-line-soft" />
          <CartForm cart={cartItems} onQty={setQty} onSelesai={() => {}} onReset={() => setCart(new Map())} compact />
        </aside>
      </div>

      {/* Mobile: bar keranjang di bawah — surface + border-top, sticky */}
      {cartCount > 0 && (
        <div className="sticky bottom-[88px] z-30 flex items-center justify-between gap-3 border-t border-line-soft bg-surface px-5 pb-3.5 pt-3 md:hidden">
          <div className="min-w-0">
            <p className="text-xs text-muted">
              {cartItems.length} produk · {cartCount} item
            </p>
            <p className="text-[20px] font-bold text-primary">{formatRupiah(String(cartTotal))}</p>
          </div>
          <Button className="h-12 shrink-0" onClick={() => setCartOpen(true)} aria-label="Buka keranjang">
            <ShoppingBasket className="size-4" aria-hidden="true" />
            Keranjang
          </Button>
        </div>
      )}

      <CartModal open={cartOpen} onClose={() => setCartOpen(false)} cart={cartItems} onQty={setQty} />
    </div>
  );
}
