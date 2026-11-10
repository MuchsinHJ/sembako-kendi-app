import { useState, type FormEvent } from 'react';
import { useCreateTransaction } from '../api';
import { formatRupiah } from '@/lib/money';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { Badge } from '@/components/Badge';
import { ApiError } from '@/lib/http';
import { derivasiStatusPembayaran } from '../utils';
import type { CartItem } from '../types';

interface CartFormProps {
  cart: CartItem[];
  onQty: (product: CartItem['product'], qty: number) => void;
  onSelesai: (hasil: { kembalian: string | null; sisa: string | null }) => void;
  /** Dipanggil setelah sukses + user menutup hasil (reset form). */
  onReset?: () => void;
  /** Versi ringkas untuk panel POS (tanpa wrapper card). */
  compact?: boolean;
}

function totalKeranjang(cart: CartItem[]): number {
  return cart.reduce((s, i) => s + Number(i.product.hargaJual) * i.qty, 0);
}

/**
 * Isi form keranjang (status Lunas/Utang diturunkan).
 * Dipakai oleh CartModal (mobile) dan panel kanan POS (tablet/desktop).
 */
export function CartForm({ cart, onQty, onSelesai, onReset, compact = false }: CartFormProps) {
  const [uang, setUang] = useState('');
  const [namaPembeli, setNamaPembeli] = useState('');
  const [noHp, setNoHp] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [selesai, setSelesai] = useState<{ kembalian: string | null; sisa: string | null } | null>(null);

  const create = useCreateTransaction();
  const total = totalKeranjang(cart);
  const uangNumber = Number(uang || '0');
  const status = derivasiStatusPembayaran(total, uangNumber);
  const utang = status === 'UTANG';

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setErrors({});

    if (cart.length === 0) return;
    if (!Number.isFinite(uangNumber) || uangNumber < 0) {
      setErrors({ uang: 'Uang diterima tidak boleh negatif.' });
      return;
    }
    if (utang && !namaPembeli.trim()) {
      setErrors({ namaPembeli: 'Isi nama pembeli untuk mencatat transaksi utang.' });
      return;
    }

    create.mutate(
      {
        items: cart.map((i) => ({ productId: i.product.id, jumlah: i.qty })),
        uangDiterima: uangNumber,
        ...(utang ? { namaPembeli: namaPembeli.trim() } : {}),
        noHpPembeli: noHp.trim() || null,
      },
      {
        onSuccess: (t) => {
          const hasil = { kembalian: t.kembalian, sisa: t.sisaSaldoUtang };
          setSelesai(hasil);
          onSelesai(hasil);
        },
        onError: (err: unknown) => {
          setFormError(err instanceof ApiError ? err.message : 'Gagal membuat transaksi. Coba lagi.');
        },
      }
    );
  }

  function tutupSelesai() {
    setSelesai(null);
    setUang('');
    setNamaPembeli('');
    setNoHp('');
    onReset?.();
  }

  if (selesai) {
    return (
      <div className="flex flex-col gap-3">
        <Badge variant={selesai.sisa ? 'utang' : 'lunas'} label={selesai.sisa ? 'Utang' : 'Lunas'} />
        <p className="text-sm text-primary">
          Transaksi berhasil.{' '}
          {selesai.sisa
            ? `Sisa utang ${formatRupiah(selesai.sisa)}.`
            : `Kembalian ${formatRupiah(selesai.kembalian)}.`}
        </p>
        <Button className={compact ? 'mt-2' : 'mt-2'} onClick={tutupSelesai}>
          Selesai
        </Button>
      </div>
    );
  }

  if (cart.length === 0) {
    return <p className="py-6 text-center text-xs text-muted">Keranjang masih kosong.</p>;
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className={compact ? 'flex flex-col gap-2' : 'flex max-h-[40dvh] flex-col gap-2 overflow-y-auto overscroll-contain pr-1'}>
        {cart.map((i) => (
          <div key={i.product.id} className="flex items-center justify-between gap-2 border-b border-line-soft pb-2 last:border-0">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-primary">{i.product.nama}</p>
              <p className="text-xs text-muted">
                {i.qty} × {formatRupiah(i.product.hargaJual)}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="icon" className="h-8 w-8" aria-label={`Kurangi ${i.product.nama}`} onClick={() => onQty(i.product, i.qty - 1)}>
                −
              </Button>
              <span className="min-w-5 text-center text-sm font-bold text-primary">{i.qty}</span>
              <Button variant="icon" className="h-8 w-8" aria-label={`Tambah ${i.product.nama}`} onClick={() => onQty(i.product, i.qty + 1)}>
                +
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-input border border-line-soft bg-surface-muted p-3">
        <span className="text-sm text-muted">Total</span>
        <span className="text-lg font-bold text-primary">{formatRupiah(String(total))}</span>
      </div>

      <TextField
        label="Uang diterima"
        inputMode="numeric"
        placeholder="0"
        value={uang}
        onChange={(e) => setUang(e.target.value.replace(/[^\d.]/g, ''))}
        error={errors.uang}
      />

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted">Status pembayaran</span>
        <Badge variant={utang ? 'utang' : 'lunas'} label={utang ? 'Utang' : 'Lunas'} />
      </div>

      {utang && (
        <>
          <TextField
            label="Nama pembeli"
            value={namaPembeli}
            onChange={(e) => setNamaPembeli(e.target.value)}
            error={errors.namaPembeli}
          />
          <TextField label="No. HP (opsional)" inputMode="tel" value={noHp} onChange={(e) => setNoHp(e.target.value)} />
        </>
      )}

      {formError && (
        <p role="alert" className="text-sm font-medium text-danger">
          {formError}
        </p>
      )}

      <Button type="submit" disabled={create.isPending || cart.length === 0}>
        {create.isPending ? 'Menyimpan…' : 'Buat Transaksi'}
      </Button>
    </form>
  );
}
