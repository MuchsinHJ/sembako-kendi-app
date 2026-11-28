import { useId, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  History,
  House,
  Info,
  Minus,
  Phone,
  Plus,
  ShoppingBasket,
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
import { kodeTransaksi, ringkasItem, saranUangTunai, totalKeranjang } from '../utils';
import type { CartItem, Transaction } from '../types';

/**
 * Tata letak langkah checkout:
 * - `screen` (mobile): layar penuh + header kembali + footer checkout menempel di bawah.
 * - `panel` (md+): kolom keranjang kanan di POS — header ringkas, indikator langkah,
 *   isi bergulir sendiri, footer total di dasar panel. Isi langkah sama persis.
 */
export type CheckoutLayout = 'screen' | 'panel';

/**
 * Footer Checkout (pen Nu5zw): surface + garis atas line-soft, p[10,20,14,20] gap 8,
 * baris total (label 12 muted, total 24/700, catatan item 12 muted) + tombol 48.
 * Menempel di bawah layar (langkah Keranjang & Konfirmasi tidak memakai bottom nav).
 */
function FooterCheckout({
  total,
  catatan,
  children,
}: {
  total: number;
  catatan: string;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line-soft bg-surface px-5 pb-[max(14px,env(safe-area-inset-bottom))] pt-2.5 md:hidden">
      <div className="mx-auto flex w-full max-w-[430px] flex-col gap-2">
        <TotalRow total={total} catatan={catatan} />
        {children}
      </div>
    </div>
  );
}

function TotalRow({ total, catatan }: { total: number; catatan: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col gap-px">
        <span className="text-xs text-muted">Total bayar</span>
        <span className="text-2xl font-bold leading-tight tabular-nums text-primary">
          {formatRupiah(total)}
        </span>
      </div>
      <span className="text-xs text-muted">{catatan}</span>
    </div>
  );
}

const LANGKAH_PANEL = ['Keranjang', 'Konfirmasi', 'Selesai'] as const;

/** Indikator 3 langkah di panel md+ (label selalu tampil; warna bukan satu-satunya penanda). */
function StepTrack({ step }: { step: 1 | 2 | 3 }) {
  return (
    <ol aria-label="Langkah transaksi" className="flex items-center gap-1.5">
      {LANGKAH_PANEL.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <li
            key={label}
            aria-current={active ? 'step' : undefined}
            className={cn('flex items-center gap-1.5', n < LANGKAH_PANEL.length && 'flex-1')}
          >
            <span
              className={cn(
                'flex size-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums',
                active && 'bg-primary text-bg',
                done && 'bg-success-soft text-primary-soft',
                !active && !done && 'bg-surface-muted text-muted',
              )}
            >
              {done ? <Check className="size-3" strokeWidth={3} aria-hidden="true" /> : n}
            </span>
            <span
              className={cn(
                'whitespace-nowrap text-xs',
                active ? 'font-semibold text-primary' : 'font-medium text-muted',
              )}
            >
              {label}
            </span>
            {n < LANGKAH_PANEL.length && (
              <span aria-hidden="true" className="h-px min-w-1.5 flex-1 bg-line" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

interface CheckoutFrameProps {
  layout: CheckoutLayout;
  title: string;
  subtitle: string;
  onBack?: (() => void) | undefined;
  step: 1 | 2 | 3;
  headerAction?: ReactNode;
  /** Baris total di footer (Keranjang/Konfirmasi). */
  totals?: { total: number; catatan: string };
  footer: ReactNode;
  /** Jarak antar blok isi (mobile Keranjang 10, Konfirmasi 12). */
  gapClass: string;
  children: ReactNode;
}

function CheckoutFrame({
  layout,
  title,
  subtitle,
  onBack,
  step,
  headerAction,
  totals,
  footer,
  gapClass,
  children,
}: CheckoutFrameProps) {
  const titleId = useId();
  if (layout === 'screen') {
    return (
      <div className={cn('flex flex-col pb-[150px]', gapClass)}>
        <ScreenHeader onBack={onBack} title={title} subtitle={subtitle} />
        {children}
        {totals && (
          <FooterCheckout total={totals.total} catatan={totals.catatan}>
            {footer}
          </FooterCheckout>
        )}
      </div>
    );
  }
  return (
    <section aria-labelledby={titleId} className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-col gap-3 border-b border-line-soft px-4 pb-3.5 pt-4">
        <div className="flex min-h-11 items-center gap-2.5">
          {onBack && (
            <Button variant="icon" onClick={onBack} aria-label="Kembali">
              <ArrowLeft className="size-[18px]" aria-hidden="true" />
            </Button>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-px">
            <h2 id={titleId} className="truncate text-lg font-bold leading-tight text-primary">
              {title}
            </h2>
            <p className="truncate text-xs text-muted">{subtitle}</p>
          </div>
          {headerAction}
        </div>
        <StepTrack step={step} />
      </div>
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-3.5',
          gapClass,
        )}
      >
        {children}
      </div>
      <div className="flex shrink-0 flex-col gap-2.5 border-t border-line-soft px-4 pb-4 pt-3">
        {totals && <TotalRow total={totals.total} catatan={totals.catatan} />}
        {footer}
      </div>
    </section>
  );
}

/* ─── Langkah 2: Keranjang (pen p6iFM / H2PLo) ─────────────────────────────── */

interface KeranjangStepProps {
  cart: CartItem[];
  uang: string;
  onUang: (digits: string) => void;
  onQty: (product: CartItem['product'], qty: number) => void;
  onBack?: () => void;
  onLanjut: () => void;
  layout?: CheckoutLayout;
  /** Panel md+: kosongkan seluruh keranjang. */
  onClear?: () => void;
}

export function KeranjangStep({
  cart,
  uang,
  onUang,
  onQty,
  onBack,
  onLanjut,
  layout = 'screen',
  onClear,
}: KeranjangStepProps) {
  const uangId = useId();
  const total = totalKeranjang(cart);
  const uangNumber = Number(uang || '0');
  const terisi = uang !== '';
  const lunas = uangNumber >= total;
  const panel = layout === 'panel';
  const kosong = cart.length === 0;

  return (
    <CheckoutFrame
      layout={layout}
      title={panel ? 'Keranjang' : 'Transaksi Baru'}
      subtitle={
        panel
          ? kosong
            ? 'Belum ada produk dipilih'
            : ringkasItem(cart)
          : 'Periksa item dan masukkan uang diterima'
      }
      onBack={onBack}
      step={1}
      headerAction={
        panel && onClear && !kosong ? (
          <button
            type="button"
            onClick={onClear}
            className="press-scale flex h-11 shrink-0 items-center gap-[5px] rounded-full px-3 text-[12.5px] font-medium text-danger transition-colors duration-150 ease-out hover:bg-danger/10"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Kosongkan
          </button>
        ) : undefined
      }
      totals={{ total, catatan: ringkasItem(cart) }}
      gapClass="gap-2.5"
      footer={
        <Button className="w-full" disabled={!terisi || kosong} onClick={onLanjut}>
          <ArrowRight className="size-4" aria-hidden="true" />
          Periksa Transaksi
        </Button>
      }
    >
      {panel && kosong ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-4 py-10 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-surface-muted">
            <ShoppingBasket className="size-[26px] text-primary-soft" aria-hidden="true" />
          </div>
          <p className="text-[15px] font-semibold text-primary">Keranjang masih kosong</p>
          <p className="max-w-[240px] text-[12.5px] leading-normal text-muted">
            Ketuk tombol + pada produk di sebelah kiri untuk menambahkannya ke transaksi.
          </p>
        </div>
      ) : (
        <>
          <div className={cn('flex flex-col gap-2.5', !panel && 'pt-1')}>
            {!panel && (
              <div className="flex h-[18px] items-center justify-between">
                <span className="text-[12.5px] font-medium text-muted">Item transaksi</span>
                <span className="text-xs text-muted">{ringkasItem(cart)}</span>
              </div>
            )}

            {/* Item (pen): surface r16 p12 gap8 stroke line-soft */}
            {cart.map((i) => (
              <CartItemCard key={i.product.id} item={i} onQty={onQty} />
            ))}
          </div>

          {/* Grup Uang Diterima (pen gap 7): input h48 r12 20/700 · hasil h48 r12 */}
          <div className="mt-2 flex flex-col gap-[7px]">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={uangId} className="text-[12.5px] font-medium text-primary-soft">
                Uang diterima
              </label>
              {/* Tambahan di luar canvas: isi cepat sebesar total belanja. Panel md+ memakai baris chip. */}
              {!panel && (
                <button
                  type="button"
                  onClick={() => onUang(String(total))}
                  className="press-scale -my-1.5 h-8 rounded-full bg-surface px-3 text-xs font-semibold text-primary-soft transition-colors duration-150 ease-out hover:bg-surface-muted"
                >
                  Uang pas
                </button>
              )}
            </div>
            <div className="flex h-12 items-center gap-0.5 rounded-[12px] border border-line bg-surface px-4 focus-within:ring-2 focus-within:ring-accent/40">
              <span className={cn('text-xl font-bold', terisi ? 'text-primary' : 'text-muted')}>
                Rp
              </span>
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
            {panel && (
              <div role="group" aria-label="Nominal cepat" className="grid grid-cols-2 gap-1.5">
                {[total, ...saranUangTunai(total)].map((v, idx) => {
                  const aktif = terisi && uangNumber === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={aktif}
                      onClick={() => onUang(String(v))}
                      className={cn(
                        'press-scale h-11 rounded-full px-3.5 text-[12.5px] font-semibold tabular-nums transition-colors duration-150 ease-out',
                        aktif
                          ? 'bg-primary text-bg'
                          : 'border border-line bg-surface text-primary-soft hover:bg-surface-muted',
                      )}
                    >
                      {idx === 0 ? 'Uang pas' : formatRupiah(v)}
                    </button>
                  );
                })}
              </div>
            )}
            {terisi && (
              <div
                aria-live="polite"
                className={cn(
                  'flex h-12 items-center gap-2 rounded-[12px] px-3.5',
                  lunas ? 'bg-success-soft' : 'bg-warning-soft',
                )}
              >
                {lunas ? (
                  <CircleCheck className="size-4 shrink-0 text-primary-soft" aria-hidden="true" />
                ) : (
                  <TriangleAlert className="size-4 shrink-0 text-warning" aria-hidden="true" />
                )}
                <span className="text-[12.5px] font-medium text-primary">
                  {lunas ? 'Kembalian' : 'Sisa utang'}
                </span>
                <span className="text-base font-bold tabular-nums text-primary">
                  {formatRupiah(Math.abs(uangNumber - total))}
                </span>
              </div>
            )}
            {terisi && !lunas && (
              <p className="text-[11.5px] text-muted">
                Nama pembeli wajib diisi di langkah konfirmasi.
              </p>
            )}
          </div>
        </>
      )}
    </CheckoutFrame>
  );
}

function CartItemCard({ item: i, onQty }: { item: CartItem; onQty: KeranjangStepProps['onQty'] }) {
  const subtotal = Number(i.product.hargaJual) * i.qty;
  const bisaKurang = i.qty > 1;
  const bisaTambah = i.qty < i.product.stok;
  return (
    <div className="flex flex-col gap-2 rounded-[16px] border border-line-soft bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-px">
          <p className="truncate text-sm font-semibold text-primary">{i.product.nama}</p>
          <p className="text-xs tabular-nums text-muted">
            {formatRupiah(i.product.hargaJual)} × {i.qty}
          </p>
        </div>
        <span className="shrink-0 text-[15px] font-bold tabular-nums text-primary">
          {formatRupiah(subtotal)}
        </span>
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
          <span
            className="w-10 text-center text-[15px] font-bold tabular-nums text-primary"
            aria-live="polite"
          >
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
      {!bisaTambah && (
        <p className="text-[11.5px] text-warning">
          Jumlah sudah sama dengan stok tersedia ({i.product.stok}).
        </p>
      )}
    </div>
  );
}

/* ─── Langkah 3: Konfirmasi (pen NOO66 utang / Iz4Nr lunas) ────────────────── */

function RingkasRow({
  label,
  value,
  strong,
  danger,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={cn('text-[12.5px]', danger ? 'text-danger' : 'text-muted')}>{label}</span>
      <span
        className={cn(
          'tabular-nums',
          strong
            ? 'text-2xl font-bold text-primary'
            : danger
              ? 'text-[13px] font-bold text-danger'
              : 'text-[13px] font-medium text-primary',
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
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  required?: boolean;
  icon: ReactNode;
  error?: string | null;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-[5px]">
      <label
        htmlFor={id}
        className="flex items-baseline gap-[3px] text-[12.5px] font-medium text-primary-soft"
      >
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
          error ? 'border-danger' : 'border-line',
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
  layout?: CheckoutLayout;
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
  layout = 'screen',
}: KonfirmasiStepProps) {
  const total = totalKeranjang(cart);
  const uangNumber = Number(uang || '0');
  const utang = uangNumber < total;
  const selisih = Math.abs(uangNumber - total);

  return (
    <CheckoutFrame
      layout={layout}
      title="Konfirmasi Transaksi"
      subtitle="Periksa kembali sebelum disimpan"
      onBack={onBack}
      step={2}
      totals={{ total, catatan: ringkasItem(cart) }}
      gapClass="gap-3"
      footer={
        <Button
          className={cn(
            'w-full',
            utang && !namaPembeli.trim() && 'bg-muted-soft text-muted hover:bg-muted-soft',
          )}
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
      }
    >
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
          <span className="text-[11.5px] text-muted">
            {utang ? 'Wajib untuk utang' : 'Opsional'}
          </span>
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
      <div
        className={cn(
          'flex items-start gap-2 rounded-[12px] px-3 py-2.5',
          utang ? 'bg-warning-soft' : 'bg-success-soft',
        )}
      >
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
    </CheckoutFrame>
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

function BerhasilBody({ transaksi, panel }: { transaksi: Transaction; panel: boolean }) {
  const utang = transaksi.statusPembayaran === 'UTANG';
  const Heading = panel ? 'h3' : 'h1';
  return (
    <>
      <div className="flex size-[72px] items-center justify-center rounded-full bg-success-soft">
        <Check className="size-[34px] text-primary" aria-hidden="true" />
      </div>
      <div role="status" className="flex w-full flex-col items-center gap-1.5">
        <Heading className="text-xl font-bold text-primary">Transaksi tersimpan</Heading>
        <p className="text-[12.5px] text-muted">
          {utang
            ? 'Stok produk sudah dikurangi sesuai transaksi. Sisa utang tercatat atas nama pembeli.'
            : 'Stok produk sudah dikurangi sesuai transaksi.'}
        </p>
      </div>

      {/* Kartu Sorotan (pen): r16 p[14,16] gap2 — success-soft (kembalian) / warning-soft (sisa utang) */}
      <div
        className={cn(
          'flex w-full flex-col items-center gap-0.5 rounded-[16px] px-4 py-3.5',
          utang ? 'bg-warning-soft' : 'bg-success-soft',
        )}
      >
        <span className="text-xs font-medium text-primary-soft">
          {utang ? 'Sisa utang' : 'Kembalian'}
        </span>
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
    </>
  );
}

export function BerhasilStep({
  transaksi,
  onTransaksiBaru,
  onBeranda,
  onLihatDetail,
  layout = 'screen',
}: {
  transaksi: Transaction;
  onTransaksiBaru: () => void;
  onBeranda: () => void;
  /** Panel md+: buka transaksi ini di Riwayat (menggantikan "Kembali ke Beranda" — sidebar sudah ada). */
  onLihatDetail?: () => void;
  layout?: CheckoutLayout;
}) {
  if (layout === 'panel') {
    return (
      <CheckoutFrame
        layout="panel"
        title="Transaksi Selesai"
        subtitle={kodeTransaksi(transaksi)}
        step={3}
        gapClass="gap-[18px]"
        footer={
          <>
            <Button className="w-full" onClick={onTransaksiBaru}>
              <Plus className="size-4" aria-hidden="true" />
              Transaksi Baru
            </Button>
            {onLihatDetail && (
              <Button variant="secondary" className="w-full" onClick={onLihatDetail}>
                <History className="size-4" aria-hidden="true" />
                Lihat di Riwayat
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-[18px] text-center">
          <BerhasilBody transaksi={transaksi} panel />
        </div>
      </CheckoutFrame>
    );
  }
  return (
    <div className="flex min-h-[calc(100dvh-60px)] flex-col items-center justify-center gap-[18px] pb-6 text-center">
      <BerhasilBody transaksi={transaksi} panel={false} />
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
