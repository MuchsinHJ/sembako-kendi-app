import { useId, type ReactNode } from 'react';
import {
  ArrowRight,
  Check,
  CircleCheck,
  House,
  Info,
  Minus,
  Phone,
  Plus,
  Trash2,
  TriangleAlert,
  UserRound,
} from 'lucide-react';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { InlineError } from '@/components/SheetParts';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formatRupiah } from '@/lib/money';
import { cn } from '@/lib/cn';
import { ringkasItem, totalKeranjang } from '../utils';
import type { CartItem, Transaction } from '../types';

/**
 * Footer Checkout (pen Nu5zw): surface + garis atas line-soft, p[10,20,14,20] gap 8,
 * baris total (label 12 muted, total 24/700, catatan item 12 muted) + tombol 48.
 * Menempel di bawah layar (langkah Keranjang & Konfirmasi tidak memakai bottom nav).
 */
function FooterCheckout({ total, catatan, children }: { total: number; catatan: string; children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line-soft bg-surface px-5 pb-[max(14px,env(safe-area-inset-bottom))] pt-2.5 md:hidden">
      <div className="mx-auto flex w-full max-w-[430px] flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-px">
            <span className="text-xs text-muted">Total bayar</span>
            <span className="text-2xl font-bold leading-tight tabular-nums text-primary">{formatRupiah(total)}</span>
          </div>
          <span className="text-xs text-muted">{catatan}</span>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── Langkah 2: Keranjang (pen p6iFM / H2PLo) ─────────────────────────────── */

interface KeranjangStepProps {
  cart: CartItem[];
  uang: string;
  onUang: (digits: string) => void;
  onQty: (product: CartItem['product'], qty: number) => void;
  onBack: () => void;
  onLanjut: () => void;
}

export function KeranjangStep({ cart, uang, onUang, onQty, onBack, onLanjut }: KeranjangStepProps) {
  const uangId = useId();
  const total = totalKeranjang(cart);
  const uangNumber = Number(uang || '0');
  const terisi = uang !== '';
  const lunas = uangNumber >= total;

  return (
    <div className="flex flex-col gap-2.5 pb-[150px]">
      <ScreenHeader onBack={onBack} title="Transaksi Baru" subtitle="Periksa item dan masukkan uang diterima" />

      <div className="flex flex-col gap-2.5 pt-1">
        <div className="flex h-[18px] items-center justify-between">
          <span className="text-[12.5px] font-medium text-muted">Item transaksi</span>
          <span className="text-xs text-muted">{ringkasItem(cart)}</span>
        </div>

        {/* Item (pen): surface r16 p12 gap8 stroke line-soft */}
        {cart.map((i) => {
          const subtotal = Number(i.product.hargaJual) * i.qty;
          const bisaKurang = i.qty > 1;
          const bisaTambah = i.qty < i.product.stok;
          return (
            <div key={i.product.id} className="flex flex-col gap-2 rounded-[16px] border border-line-soft bg-surface p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-px">
                  <p className="truncate text-sm font-semibold text-primary">{i.product.nama}</p>
                  <p className="text-xs tabular-nums text-muted">
                    {formatRupiah(i.product.hargaJual)} × {i.qty}
                  </p>
                </div>
                <span className="shrink-0 text-[15px] font-bold tabular-nums text-primary">{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                {/* Stepper (pen): pill h44 p[0,2] surface-muted; tombol 44, jumlah 40 15/700; ikon nonaktif accent */}
                <div className="flex h-11 items-center rounded-full bg-surface-muted px-0.5">
                  <button
                    type="button"
                    aria-label={`Kurangi ${i.product.nama}`}
                    disabled={!bisaKurang}
                    onClick={() => onQty(i.product, i.qty - 1)}
                    className="press-scale flex size-11 items-center justify-center rounded-full text-primary transition-colors duration-150 ease-out enabled:hover:bg-surface disabled:cursor-not-allowed disabled:text-accent"
                  >
                    <Minus className="size-4" aria-hidden="true" />
                  </button>
                  <span className="w-10 text-center text-[15px] font-bold tabular-nums text-primary" aria-live="polite">
                    {i.qty}
                  </span>
                  <button
                    type="button"
                    aria-label={`Tambah ${i.product.nama}`}
                    disabled={!bisaTambah}
                    onClick={() => onQty(i.product, i.qty + 1)}
                    className="press-scale flex size-11 items-center justify-center rounded-full text-primary transition-colors duration-150 ease-out enabled:hover:bg-surface disabled:cursor-not-allowed disabled:text-accent"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <button
                  type="button"
                  aria-label={`Hapus ${i.product.nama}`}
                  onClick={() => onQty(i.product, 0)}
                  className="press-scale flex h-11 items-center gap-[5px] rounded-full px-2.5 text-[12.5px] font-medium text-danger transition-colors duration-150 ease-out hover:bg-danger/10"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Hapus
                </button>
              </div>
              {!bisaTambah && <p className="text-[11.5px] text-warning">Jumlah sudah sama dengan stok tersedia ({i.product.stok}).</p>}
            </div>
          );
        })}
      </div>

      {/* Grup Uang Diterima (pen gap 7): input h48 r12 20/700 · hasil h48 r12 */}
      <div className="mt-2 flex flex-col gap-[7px]">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={uangId} className="text-[12.5px] font-medium text-primary-soft">
            Uang diterima
          </label>
          {/* Tambahan di luar canvas: isi cepat sebesar total belanja. */}
          <button
            type="button"
            onClick={() => onUang(String(total))}
            className="press-scale -my-1.5 h-8 rounded-full bg-surface px-3 text-xs font-semibold text-primary-soft transition-colors duration-150 ease-out hover:bg-surface-muted"
          >
            Uang pas
          </button>
        </div>
        <div className="flex h-12 items-center gap-0.5 rounded-[12px] border border-line bg-surface px-4 focus-within:ring-2 focus-within:ring-accent/40">
          <span className={cn('text-xl font-bold', terisi ? 'text-primary' : 'text-muted')}>Rp</span>
          <input
            id={uangId}
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            value={terisi ? uangNumber.toLocaleString('id-ID') : ''}
            onChange={(e) => onUang(e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, ''))}
            className="h-full w-full min-w-0 bg-transparent text-xl font-bold tabular-nums text-primary placeholder:text-muted focus:outline-none"
          />
        </div>
        {terisi && (
          <div
            aria-live="polite"
            className={cn('flex h-12 items-center gap-2 rounded-[12px] px-3.5', lunas ? 'bg-success-soft' : 'bg-warning-soft')}
          >
            {lunas ? (
              <CircleCheck className="size-4 shrink-0 text-primary-soft" aria-hidden="true" />
            ) : (
              <TriangleAlert className="size-4 shrink-0 text-warning" aria-hidden="true" />
            )}
            <span className="text-[12.5px] font-medium text-primary">{lunas ? 'Kembalian' : 'Sisa utang'}</span>
            <span className="text-base font-bold tabular-nums text-primary">{formatRupiah(Math.abs(uangNumber - total))}</span>
          </div>
        )}
        {terisi && !lunas && (
          <p className="text-[11.5px] text-muted">Nama pembeli wajib diisi di langkah konfirmasi.</p>
        )}
      </div>

      <FooterCheckout total={total} catatan={ringkasItem(cart)}>
        <Button className="w-full" disabled={!terisi || cart.length === 0} onClick={onLanjut}>
          <ArrowRight className="size-4" aria-hidden="true" />
          Periksa Transaksi
        </Button>
      </FooterCheckout>
    </div>
  );
}

/* ─── Langkah 3: Konfirmasi (pen NOO66 utang / Iz4Nr lunas) ────────────────── */

function RingkasRow({ label, value, strong, danger }: { label: string; value: ReactNode; strong?: boolean; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={cn('text-[12.5px]', danger ? 'text-danger' : 'text-muted')}>{label}</span>
      <span
        className={cn(
          'tabular-nums',
          strong ? 'text-2xl font-bold text-primary' : danger ? 'text-[13px] font-bold text-danger' : 'text-[13px] font-medium text-primary'
        )}
      >
        {value}
      </span>
    </div>
  );
}

function IconField({
  label,
  required,
  icon,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean; icon: ReactNode; error?: string | null }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-[5px]">
      <label htmlFor={id} className="flex items-baseline gap-[3px] text-[12.5px] font-medium text-primary-soft">
        {label}
        {required && (
          <span aria-hidden="true" className="font-bold text-danger">
            *
          </span>
        )}
      </label>
      <div
        className={cn(
          'flex h-12 items-center gap-2 rounded-[10px] border bg-surface px-3 text-muted focus-within:ring-2 focus-within:ring-accent/40',
          error ? 'border-danger' : 'border-line'
        )}
      >
        {icon}
        <input
          id={id}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          className="h-full w-full min-w-0 bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
          {...props}
        />
      </div>
      {error && (
        <p id={`${id}-err`} className="text-[11.5px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

interface KonfirmasiStepProps {
  cart: CartItem[];
  uang: string;
  namaPembeli: string;
  noHp: string;
  onNama: (v: string) => void;
  onNoHp: (v: string) => void;
  namaError: string | null;
  formError: string | null;
  busy: boolean;
  onBack: () => void;
  onSimpan: () => void;
}

export function KonfirmasiStep({
  cart,
  uang,
  namaPembeli,
  noHp,
  onNama,
  onNoHp,
  namaError,
  formError,
  busy,
  onBack,
  onSimpan,
}: KonfirmasiStepProps) {
  const total = totalKeranjang(cart);
  const uangNumber = Number(uang || '0');
  const utang = uangNumber < total;
  const selisih = Math.abs(uangNumber - total);

  return (
    <div className="flex flex-col gap-3 pb-[150px]">
      <ScreenHeader onBack={onBack} title="Konfirmasi Transaksi" subtitle="Periksa kembali sebelum disimpan" />

      {/* Kartu Ringkasan (pen): p16 gap12 r16 */}
      <div className="flex flex-col gap-3 rounded-[16px] border border-line-soft bg-surface p-4">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-primary">Ringkasan transaksi</span>
          <Badge variant={utang ? 'utang' : 'lunas'} label={utang ? 'Utang' : 'Lunas'} />
        </div>
        {cart.map((i) => (
          <RingkasRow
            key={i.product.id}
            label={`${i.product.nama} × ${i.qty}`}
            value={formatRupiah(Number(i.product.hargaJual) * i.qty)}
          />
        ))}
        <RingkasRow label="Jumlah item" value={ringkasItem(cart)} />
        <div className="h-px bg-line-soft" />
        <RingkasRow label="Total bayar" value={formatRupiah(total)} strong />
        <div className="h-px bg-line-soft" />
        <RingkasRow label="Uang diterima" value={formatRupiah(uangNumber)} />
        {utang ? (
          <RingkasRow label="Sisa utang" value={formatRupiah(selisih)} danger />
        ) : (
          <RingkasRow label="Kembalian" value={formatRupiah(selisih)} />
        )}
      </div>

      {/* Kartu Data Pembeli (pen): p16 gap10 r16 */}
      <div className="flex flex-col gap-2.5 rounded-[16px] border border-line-soft bg-surface p-4">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-primary">Data pembeli</span>
          <span className="text-[11.5px] text-muted">{utang ? 'Wajib untuk utang' : 'Opsional'}</span>
        </div>
        <IconField
          label={utang ? 'Nama Pembeli' : 'Nama Pembeli (boleh dikosongkan)'}
          required={utang}
          icon={<UserRound className="size-4 shrink-0" aria-hidden="true" />}
          placeholder="cth. Bu Sri"
          autoComplete="off"
          value={namaPembeli}
          onChange={(e) => onNama(e.target.value)}
          error={namaError}
          data-nama-pembeli=""
        />
        <IconField
          label="Nomor HP (boleh dikosongkan)"
          icon={<Phone className="size-4 shrink-0" aria-hidden="true" />}
          placeholder="cth. 0812 3456 7890"
          inputMode="tel"
          autoComplete="off"
          value={noHp}
          onChange={(e) => onNoHp(e.target.value)}
        />
      </div>

      {/* Catatan Konfirmasi (pen): r12 p[10,12] gap8 — warning-soft (utang) / success-soft (lunas) */}
      <div className={cn('flex items-start gap-2 rounded-[12px] px-3 py-2.5', utang ? 'bg-warning-soft' : 'bg-success-soft')}>
        {utang ? (
          <TriangleAlert className="mt-px size-4 shrink-0 text-warning" aria-hidden="true" />
        ) : (
          <Info className="mt-px size-4 shrink-0 text-primary-soft" aria-hidden="true" />
        )}
        <p className="text-xs leading-normal text-primary">
          {utang
            ? `Uang diterima ${formatRupiah(uangNumber)} dari total ${formatRupiah(total)}. Status Utang dan sisa ${formatRupiah(selisih)} dihitung otomatis. Stok berkurang setelah disimpan.`
            : `Uang diterima ${formatRupiah(uangNumber)}, kembalian ${formatRupiah(selisih)}. Status Lunas dihitung otomatis. Stok berkurang setelah disimpan.`}
        </p>
      </div>

      {formError && <InlineError>{formError}</InlineError>}

      <FooterCheckout total={total} catatan={ringkasItem(cart)}>
        <Button
          className={cn('w-full', utang && !namaPembeli.trim() && 'bg-muted-soft text-muted hover:bg-muted-soft')}
          disabled={busy}
          onClick={() => {
            if (utang && !namaPembeli.trim()) {
              document.querySelector<HTMLInputElement>('[data-nama-pembeli]')?.focus();
            }
            onSimpan();
          }}
        >
          {busy ? (
            'Menyimpan…'
          ) : (
            <>
              <Check className="size-4" aria-hidden="true" />
              Simpan Transaksi
            </>
          )}
        </Button>
      </FooterCheckout>
    </div>
  );
}

/* ─── Langkah 4: Berhasil (pen maq6j lunas / lhvUF utang) ──────────────────── */

function RincianRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12.5px] text-muted">{label}</span>
      <span className="text-[13px] font-semibold tabular-nums text-primary">{value}</span>
    </div>
  );
}

export function BerhasilStep({
  transaksi,
  onTransaksiBaru,
  onBeranda,
}: {
  transaksi: Transaction;
  onTransaksiBaru: () => void;
  onBeranda: () => void;
}) {
  const utang = transaksi.statusPembayaran === 'UTANG';
  return (
    <div className="flex min-h-[calc(100dvh-60px)] flex-col items-center justify-center gap-[18px] pb-6 text-center">
      <div className="flex size-[72px] items-center justify-center rounded-full bg-success-soft">
        <Check className="size-[34px] text-primary" aria-hidden="true" />
      </div>
      <div role="status" className="flex w-full flex-col items-center gap-1.5">
        <h1 className="text-xl font-bold text-primary">Transaksi tersimpan</h1>
        <p className="text-[12.5px] text-muted">
          {utang
            ? 'Stok produk sudah dikurangi sesuai transaksi. Sisa utang tercatat atas nama pembeli.'
            : 'Stok produk sudah dikurangi sesuai transaksi.'}
        </p>
      </div>

      {/* Kartu Sorotan (pen): r16 p[14,16] gap2 — success-soft (kembalian) / warning-soft (sisa utang) */}
      <div className={cn('flex w-full flex-col items-center gap-0.5 rounded-[16px] px-4 py-3.5', utang ? 'bg-warning-soft' : 'bg-success-soft')}>
        <span className="text-xs font-medium text-primary-soft">{utang ? 'Sisa utang' : 'Kembalian'}</span>
        <span className="text-[30px] font-bold leading-tight tabular-nums text-primary">
          {formatRupiah(utang ? transaksi.sisaSaldoUtang : (transaksi.kembalian ?? 0))}
        </span>
      </div>

      <div className="flex w-full flex-col gap-2.5 rounded-[16px] border border-line-soft bg-surface p-4 text-left">
        <RincianRow label="Total transaksi" value={formatRupiah(transaksi.total)} />
        <RincianRow label="Uang diterima" value={formatRupiah(transaksi.uangDiterima ?? 0)} />
        {transaksi.namaPembeli && <RincianRow label="Nama pembeli" value={transaksi.namaPembeli} />}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12.5px] text-muted">Status</span>
          <Badge variant={utang ? 'utang' : 'lunas'} label={utang ? 'Utang' : 'Lunas'} />
        </div>
      </div>

      <div className="flex w-full flex-col gap-2.5">
        <Button className="w-full" onClick={onTransaksiBaru}>
          <Plus className="size-4" aria-hidden="true" />
          Transaksi Baru
        </Button>
        <Button variant="secondary" className="w-full" onClick={onBeranda}>
          <House className="size-4" aria-hidden="true" />
          Kembali ke Beranda
        </Button>
      </div>
    </div>
  );
}
