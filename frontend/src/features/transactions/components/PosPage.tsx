import { useState } from 'react';
import { ShoppingBasket } from 'lucide-react';
import { useProducts } from '@/features/products/api';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchField } from '@/components/SearchField';
import { formatRupiah } from '@/lib/money';
import { CartModal } from './CartModal';
import type { CartItem } from '../types';
import type { Product } from '@/features/products/types';

function QtyWidget({
  product,
  cart,
  onChange,
}: {
  product: Product;
  cart: Map<string, CartItem>;
  onChange: (product: Product, qty: number) => void;
}) {
  const inCart = cart.get(product.id);
  if (!inCart) {
    return (
      <Button className="h-9 px-3 text-xs" aria-label={`Tambah ${product.nama}`} onClick={() => onChange(product, 1)}>
        Tambah
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Button variant="icon" className="h-9 w-9" aria-label={`Kurangi ${product.nama}`} onClick={() => onChange(product, inCart.qty - 1)}>
        −
      </Button>
      <span className="min-w-6 text-center text-sm font-bold text-primary">{inCart.qty}</span>
      <Button variant="icon" className="h-9 w-9" aria-label={`Tambah ${product.nama}`} onClick={() => onChange(product, inCart.qty + 1)}>
        +
      </Button>
    </div>
  );
}

/** Layar POS (03: Transaksi) — daftar produk aktif + bar keranjang sticky. */
export function PosPage() {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [cartOpen, setCartOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useProducts({ status: 'AKTIF', limit: 100 });
  const products = data?.pages.flatMap((p) => p.data) ?? [];

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

  const filtered = search
    ? products.filter((p) => p.nama.toLowerCase().includes(search.toLowerCase()))
    : products;

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader
        eyebrow="TRANSAKSI"
        title="Transaksi Baru"
        info={products.length > 0 ? `${products.length} produk aktif` : undefined}
      />

      <SearchField value={search} onChange={setSearch} placeholder="Cari produk…" />

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-[56px] animate-pulse rounded-card-sm border border-line-soft bg-surface" />
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

      {!isLoading && !isError && filtered.length === 0 && (
        <Card variant="list" className="flex flex-col items-center gap-2 py-10 text-center">
          <p className="text-sm font-semibold text-primary">{search ? 'Tidak ada produk untuk pencarian ini.' : 'Belum ada produk aktif.'}</p>
          <p className="text-xs text-muted">{search ? 'Coba kata kunci lain.' : 'Aktifkan produk di Katalog untuk bertransaksi.'}</p>
        </Card>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {filtered.map((p) => (
            <div key={p.id} className="flex h-[56px] items-center gap-3 rounded-card-sm border border-line-soft bg-surface px-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-primary">{p.nama}</p>
                <p className="text-xs text-muted">
                  {formatRupiah(p.hargaJual)} · Stok {p.stok}
                </p>
              </div>
              <QtyWidget product={p} cart={cart} onChange={setQty} />
            </div>
          ))}
        </div>
      )}

      {cartCount > 0 && (
        <div className="sticky bottom-24 z-30 flex items-center justify-between gap-3 rounded-card bg-primary p-3.5 md:bottom-6">
          <div className="min-w-0">
            <p className="text-xs text-bg/70">{cartCount} item</p>
            <p className="text-base font-bold text-bg">{formatRupiah(String(cartTotal))}</p>
          </div>
          <Button
            className="h-11 bg-bg px-4 text-primary"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBasket className="size-4" aria-hidden="true" />
            Buka Keranjang
          </Button>
        </div>
      )}

      <CartModal open={cartOpen} onClose={() => setCartOpen(false)} cart={cartItems} onQty={setQty} />
    </div>
  );
}
