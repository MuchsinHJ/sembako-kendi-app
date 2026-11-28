import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Ban,
  CalendarDays,
  CalendarX,
  ChevronDown,
  ChevronRight,
  Info,
  ReceiptText,
} from 'lucide-react';
import { useTransaction, useTransactions, useTransactionsPage, useVoidTransaction } from '../api';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DateRangeSheet } from '@/components/DateRangeSheet';
import { InlineError } from '@/components/SheetParts';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedFilter } from '@/components/SegmentedFilter';
import { formatRupiah } from '@/lib/money';
import { cn } from '@/lib/cn';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { MQ } from '@/lib/breakpoints';
import { Pagination } from '@/components/Pagination';
import {
  formatTanggalLengkap,
  formatTanggalPendek,
  formatWaktuRelatif,
  hitungSisaVoid,
  isoToInputValue,
  kodeTransaksi,
  ringkasanProdukTransaksi,
} from '../utils';
import type { Transaction, PaymentStatus } from '../types';

const STATUS_OPTIONS = [
  { value: 'SEMUA', label: 'Semua' },
  { value: 'LUNAS', label: 'Lunas' },
  { value: 'UTANG', label: 'Utang' },
] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number]['value'];

/** 30 hari terakhir dengan batas hari penuh, agar transaksi baru hari ini tetap masuk. */
function rentangDefault() {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 0, 0, 0, 0);
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
}

function ringkasJumlah(t: Transaction): string {
  return `${t.items.length} produk · ${t.items.reduce((s, i) => s + i.jumlah, 0)} item`;
}

function StatusBadge({ t }: { t: Transaction }) {
  if (t.statusTransaksi === 'DIBATALKAN') return <Badge variant="netral" label="Dibatalkan" />;
  return t.statusPembayaran === 'LUNAS' ? (
    <Badge variant="lunas" label="Lunas" />
  ) : (
    <Badge variant="utang" label="Utang" />
  );
}

/* ─── Dialog Konfirmasi Pembatalan (pen BkFbJ) ─────────────────────────────── */

function VoidDialog({ t, onClose }: { t: Transaction; onClose: () => void }) {
  const voidMut = useVoidTransaction(t.id);
  const [error, setError] = useState<string | null>(null);
  return (
    <ConfirmDialog
      open
      onClose={onClose}
      title="Batalkan transaksi ini?"
      chip={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-[5px] text-[12.5px]">
          <span className="font-bold text-primary">{kodeTransaksi(t)}</span>
          <span className="font-semibold text-muted">{formatRupiah(t.total)}</span>
        </span>
      }
      description={`Stok ${t.items.length} produk pada transaksi ini dikembalikan otomatis setelah pembatalan disimpan.`}
      note="Transaksi tetap tersimpan di riwayat dengan status Dibatalkan dan tidak dihitung dalam omzet maupun profit."
      actions={
        <>
          <Button variant="secondary" className="w-full" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="danger"
            className="w-full"
            disabled={voidMut.isPending}
            onClick={() =>
              voidMut.mutate(undefined, {
                onSuccess: onClose,
                onError: (err) =>
                  setError(err instanceof Error ? err.message : 'Gagal membatalkan transaksi.'),
              })
            }
          >
            <Ban className="size-4" aria-hidden="true" />
            {voidMut.isPending ? 'Membatalkan…' : 'Ya, Batalkan'}
          </Button>
        </>
      }
    >
      {error && <InlineError className="w-full">{error}</InlineError>}
    </ConfirmDialog>
  );
}

/* ─── Detail Transaksi (pen Q8YY2 / Z6FKk / imcH5 / k4IRS) ─────────────────── */

function DetailCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-[16px] border border-line-soft bg-surface p-4',
        className,
      )}
    >
      {title && <h3 className="text-[13px] font-semibold text-primary">{title}</h3>}
      {children}
    </div>
  );
}

function DetailRow({
  label,
  value,
  labelClass,
  valueClass,
}: {
  label: string;
  value: ReactNode;
  labelClass?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={cn('text-[12.5px] text-muted', labelClass)}>{label}</span>
      <span className={cn('text-sm font-semibold tabular-nums text-primary', valueClass)}>
        {value}
      </span>
    </div>
  );
}

function CatatanAbu({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-[12px] bg-surface-muted px-3 py-2.5">
      <Info className="mt-px size-[15px] shrink-0 text-muted" aria-hidden="true" />
      <p className="text-[11.5px] leading-normal text-muted">{children}</p>
    </div>
  );
}

function formatTanggalJam(iso: string): string {
  const d = new Date(iso);
  const tgl = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
  return `${tgl}, ${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
}

function TransactionDetail({
  t,
  onVoid,
  split = false,
  hideIdentity = false,
}: {
  t: Transaction;
  onVoid: (t: Transaction) => void;
  /** Panel lg+: identitas (kode, tanggal, status) sudah di header panel. */
  hideIdentity?: boolean;
  /** Ruang lebar: dua kolom (identitas + item | pembayaran + pembeli + aksi). */
  split?: boolean;
}) {
  const dibatalkan = t.statusTransaksi === 'DIBATALKAN';
  const bisaVoid = !dibatalkan && hitungSisaVoid(t.createdAt);
  const utang = t.statusPembayaran === 'UTANG';

  return (
    <div className={split ? 'grid grid-cols-2 items-start gap-3' : 'flex flex-col gap-3'}>
      <div className="flex min-w-0 flex-col gap-3">
        {!hideIdentity && (
        <>
        {/* Kartu Identitas */}
        <DetailCard>
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex min-w-0 flex-col gap-[3px]">
              <p className="truncate text-[13px] font-bold text-primary">{kodeTransaksi(t)}</p>
              <p className="text-xs text-muted">{formatTanggalLengkap(t.tanggal)}</p>
            </div>
            <StatusBadge t={t} />
          </div>
        </DetailCard>
        </>
        )}

        {/* Kartu Item Transaksi */}
        <DetailCard title="Item transaksi">
          {t.items.map((i, idx) => (
            <div key={i.id || i.productId} className="flex flex-col gap-2">
              {idx > 0 && <div className="h-px bg-line-soft" />}
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="truncate text-sm font-semibold text-primary">
                    {i.namaProdukSnapshot}
                  </p>
                  <p className="text-xs tabular-nums text-muted">
                    {i.jumlah} × {formatRupiah(i.hargaJualSnapshot)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold tabular-nums text-primary">
                  {formatRupiah(i.subtotal)}
                </span>
              </div>
            </div>
          ))}
        </DetailCard>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        {/* Kartu Pembayaran */}
        <DetailCard title="Pembayaran">
          <DetailRow
            label="Total transaksi"
            value={formatRupiah(t.total)}
            valueClass="text-[15px] font-bold"
          />
          <DetailRow label="Uang diterima" value={formatRupiah(t.uangDiterima ?? 0)} />
          <div className="h-px bg-line-soft" />
          {dibatalkan ? (
            <>
              <DetailRow
                label="Status transaksi"
                value="Dibatalkan"
                labelClass="font-semibold"
                valueClass="text-base font-bold text-muted"
              />
              <DetailRow label="Status pembayaran" value={utang ? 'Utang' : 'Lunas'} />
            </>
          ) : utang ? (
            <DetailRow
              label="Sisa utang"
              value={formatRupiah(t.sisaSaldoUtang ?? 0)}
              labelClass="font-semibold text-danger"
              valueClass="text-base font-bold text-danger"
            />
          ) : (
            <DetailRow
              label="Kembalian"
              value={formatRupiah(t.kembalian ?? 0)}
              labelClass="font-semibold text-primary-soft"
              valueClass="text-base font-bold text-primary-soft"
            />
          )}
        </DetailCard>

        {/* Kartu Data Pembeli */}
        {(t.namaPembeli || t.noHpPembeli) && (
          <DetailCard title="Data pembeli">
            {t.namaPembeli && <DetailRow label="Nama" value={t.namaPembeli} />}
            {t.noHpPembeli && <DetailRow label="No. HP" value={t.noHpPembeli} />}
          </DetailCard>
        )}

        {/* Aksi Pembatalan / catatan batas waktu / catatan pembatalan */}
        {bisaVoid && (
          <div className="flex flex-col gap-1.5">
            <Button variant="destructive" className="w-full" onClick={() => onVoid(t)}>
              <Ban className="size-4" aria-hidden="true" />
              Batalkan Transaksi
            </Button>
            <p className="text-[11.5px] text-muted">
              Pembatalan bisa dilakukan maksimal 24 jam setelah transaksi disimpan.
            </p>
          </div>
        )}
        {!dibatalkan && !bisaVoid && (
          <CatatanAbu>
            Pembatalan hanya bisa dilakukan maksimal 24 jam setelah transaksi disimpan. Transaksi
            ini sudah melewati batas pembatalan 24 jam.
          </CatatanAbu>
        )}
        {dibatalkan && (
          <CatatanAbu>
            Transaksi dibatalkan
            {t.dibatalkanPada ? ` pada ${formatTanggalJam(t.dibatalkanPada)}` : ''}. Stok sudah
            dikembalikan dan transaksi ini tidak dihitung dalam omzet maupun profit.
          </CatatanAbu>
        )}
      </div>
    </div>
  );
}

/* ─── Kartu daftar (pen Transaksi TRX-…) ──────────────────────────────────── */

function TransactionCard({
  t,
  aktif,
  onOpen,
}: {
  t: Transaction;
  aktif: boolean;
  onOpen: () => void;
}) {
  const dibatalkan = t.statusTransaksi === 'DIBATALKAN';
  // Tambahan: nama pembeli / produk teratas agar transaksi mudah dikenali selain dari kode.
  const konteks = t.namaPembeli?.trim() || ringkasanProdukTransaksi(t.items);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={aktif || undefined}
      aria-label={`Transaksi ${kodeTransaksi(t)}, ${formatRupiah(t.total)}`}
      className={cn(
        'press-scale flex w-full flex-col gap-2 rounded-[14px] border p-3 text-left transition-colors duration-150 ease-out',
        dibatalkan
          ? 'border-line-soft bg-surface-muted'
          : 'border-line-soft bg-surface hover:bg-surface-muted',
        aktif && 'border-accent',
      )}
    >
      <div className="flex w-full items-center justify-between gap-2.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span
            className={cn(
              'truncate text-[13px] font-bold',
              dibatalkan ? 'text-muted' : 'text-primary',
            )}
          >
            {kodeTransaksi(t)}
          </span>
          <span className="truncate text-[11.5px] text-muted">
            {formatWaktuRelatif(t.tanggal)} · {konteks}
          </span>
        </div>
        <StatusBadge t={t} />
      </div>
      <div className="flex w-full items-center justify-between gap-2.5">
        <span className="min-w-0 truncate text-xs text-muted">
          {ringkasJumlah(t)}
          {dibatalkan ? ', stok dikembalikan' : ''}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <span
            className={cn(
              'text-[15px] font-bold tabular-nums',
              dibatalkan ? 'text-muted' : 'text-primary',
            )}
          >
            {formatRupiah(t.total)}
          </span>
          <ChevronRight className="size-4 text-muted" aria-hidden="true" />
        </span>
      </div>
    </button>
  );
}

/** Isi panel detail kosong (lg+) saat daftar belum dimuat/ kosong. */
function DetailPlaceholder() {
  return (
    <div className="flex flex-col items-center gap-2.5 px-6 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-surface-muted">
        <ReceiptText className="size-[26px] text-primary-soft" aria-hidden="true" />
      </div>
      <p className="text-[15px] font-semibold text-primary">Pilih transaksi</p>
      <p className="max-w-[260px] text-[12.5px] leading-normal text-muted">
        Ketuk salah satu transaksi di daftar untuk melihat item, pembayaran, dan opsi pembatalan.
      </p>
    </div>
  );
}

const PAGE_SIZE = 12;

/**
 * Layar Riwayat (pen Yp3n6).
 * - Mobile: daftar → Detail Transaksi layar penuh (`?trx=<id>`, tombol kembali peramban ikut berfungsi).
 * - md (768–1023): daftar grid 2 kolom + paginasi bernomor; detail layar penuh dua kolom.
 * - lg+: master-detail — daftar (paginasi ringkas) | panel detail menempel. Tanpa `?trx=`
 *   transaksi pertama di halaman aktif dipilih otomatis (tidak ditulis ke URL, aman saat rotasi).
 */
export function RiwayatPage() {
  const [status, setStatus] = useState<StatusFilter>('SEMUA');
  const [voidFor, setVoidFor] = useState<Transaction | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isMd = useMediaQuery(MQ.md);
  const isLg = useMediaQuery(MQ.lg);
  const isXl = useMediaQuery(MQ.xl);
  const [page, setPage] = useState(1);

  // Rentang default dihitung sekali per mount agar query key stabil.
  const [defaultRange] = useState(rentangDefault);
  const [range, setRange] = useState(defaultRange);
  const [rangeOpen, setRangeOpen] = useState(false);

  const filters = {
    ...range,
    ...(status !== 'SEMUA' ? { statusPembayaran: status as PaymentStatus } : {}),
  };

  // Mobile: infinite "Muat lebih banyak"; md+: paginasi bernomor (prefetch halaman berikutnya).
  const infinite = useTransactions(filters, { enabled: !isMd });
  const paged = useTransactionsPage({ ...filters, limit: PAGE_SIZE }, page, { enabled: isMd });
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = infinite;
  const transactions = isMd ? (paged.data?.data ?? []) : (data?.pages.flatMap((p) => p.data) ?? []);
  const isLoading = isMd ? paged.isLoading : infinite.isLoading;
  const isError = isMd ? paged.isError : infinite.isError;
  const refetch = isMd ? paged.refetch : infinite.refetch;
  const total =
    (isMd ? paged.data?.pagination.total : data?.pages[0]?.pagination.total) ?? transactions.length;
  const totalPages = paged.data?.pagination.totalPages ?? 1;
  const loaded = isMd ? !!paged.data : !!data;

  const urlId = searchParams.get('trx');
  const selectedId = urlId ?? (isLg ? (transactions[0]?.id ?? null) : null);
  const detailQuery = useTransaction(selectedId ?? '');
  const selected = detailQuery.data ?? transactions.find((t) => t.id === selectedId) ?? null;

  function bukaDetail(id: string) {
    setSearchParams({ trx: id }, { state: { riwayatDetail: true }, replace: isLg });
  }
  function tutupDetail() {
    if ((location.state as { riwayatDetail?: boolean } | null)?.riwayatDetail) navigate(-1);
    else setSearchParams({}, { replace: true });
  }
  function gantiFilter(next: () => void) {
    next();
    setPage(1);
    // Pilihan lama mungkin tidak ada di hasil filter baru.
    if (isLg && urlId) setSearchParams({}, { replace: true });
  }

  const rangeSheet = (
    <DateRangeSheet
      open={rangeOpen}
      onClose={() => setRangeOpen(false)}
      value={{
        startDate: isoToInputValue(range.startDate),
        endDate: isoToInputValue(range.endDate),
      }}
      defaultValue={{
        startDate: isoToInputValue(defaultRange.startDate),
        endDate: isoToInputValue(defaultRange.endDate),
      }}
      onApply={(r) => {
        gantiFilter(() =>
          setRange({
            startDate: new Date(`${r.startDate}T00:00:00`).toISOString(),
            endDate: new Date(`${r.endDate}T23:59:59`).toISOString(),
          }),
        );
        setRangeOpen(false);
      }}
    />
  );

  /* Mobile & tablet potret: Detail Transaksi sebagai layar penuh (pen Q8YY2: header kembali + sub kode). */
  if (!isLg && selectedId) {
    return (
      <div className="flex flex-col gap-3">
        <ScreenHeader
          onBack={tutupDetail}
          title="Detail Transaksi"
          subtitle={selected ? kodeTransaksi(selected) : undefined}
        />
        {selected ? (
          <TransactionDetail t={selected} onVoid={setVoidFor} split={isMd} />
        ) : detailQuery.isError ? (
          <Card variant="warning" className="items-start">
            <p className="text-sm font-semibold text-warning">Transaksi tidak ditemukan.</p>
            <Button variant="secondary" className="mt-1 h-10 px-4 text-xs" onClick={tutupDetail}>
              Kembali ke riwayat
            </Button>
          </Card>
        ) : (
          <div className="flex flex-col gap-3" aria-busy="true">
            {[72, 120, 120].map((h, i) => (
              <div
                key={i}
                style={{ height: h }}
                className="animate-pulse rounded-[16px] bg-surface"
              />
            ))}
          </div>
        )}
        {voidFor && <VoidDialog t={voidFor} onClose={() => setVoidFor(null)} />}
      </div>
    );
  }

  const daftar = (
    <>
      {isLoading && (
        <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 lg:flex" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="h-[78px] animate-pulse rounded-[14px] border border-line-soft bg-surface"
            />
          ))}
        </div>
      )}

      {isError && (
        <Card variant="warning" className="items-start">
          <p className="text-sm font-semibold text-warning">Gagal memuat riwayat.</p>
          <Button variant="secondary" className="mt-1 h-10 px-4 text-xs" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </Card>
      )}

      {/* Empty State Rentang (pen): surface r16 p[24,20] gap12, ikon 72, judul 18/700, tombol 48 surface-muted */}
      {!isLoading && !isError && transactions.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-[16px] bg-surface px-5 py-12 text-center">
          <div className="flex size-[72px] items-center justify-center rounded-full bg-surface-muted">
            <CalendarX className="size-[30px] text-primary-soft" aria-hidden="true" />
          </div>
          <p className="text-lg font-bold text-primary">Tidak ada transaksi</p>
          <p className="max-w-[280px] text-[13px] leading-normal text-muted">
            Tidak ada transaksi pada rentang {formatTanggalPendek(range.startDate)} –{' '}
            {formatTanggalPendek(range.endDate)}. Coba ubah rentang tanggal atau pilih status
            pembayaran lain.
          </p>
          <Button
            variant="soft"
            className="h-12 text-[13.5px] text-primary"
            onClick={() => setRangeOpen(true)}
          >
            <CalendarDays className="size-4" aria-hidden="true" />
            Ubah Rentang Tanggal
          </Button>
        </div>
      )}

      {!isLoading && !isError && transactions.length > 0 && (
        <>
          <div
            className={cn(
              'flex flex-col gap-2.5 md:grid md:grid-cols-2 lg:flex',
              isMd && 'transition-opacity duration-150 ease-out',
              paged.isPlaceholderData && 'opacity-60',
            )}
          >
            {transactions.map((t) => (
              <TransactionCard
                key={t.id}
                t={t}
                aktif={isLg && selectedId === t.id}
                onOpen={() => bukaDetail(t.id)}
              />
            ))}
          </div>
          {!isMd && hasNextPage && (
            <Button
              variant="secondary"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="self-center"
            >
              {isFetchingNextPage ? 'Memuat…' : 'Muat lebih banyak'}
            </Button>
          )}
          {isMd && (
            <Pagination
              className="pt-1"
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={PAGE_SIZE}
              onPage={setPage}
              itemLabel="transaksi"
              busy={paged.isPlaceholderData}
              compact={isLg && !isXl}
            />
          )}
        </>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <ScreenHeader
        eyebrow="RIWAYAT"
        title="Transaksi"
        info={loaded ? `${total} transaksi ditemukan` : undefined}
      />

      {/* md+: rentang + status sebaris (toolbar), mobile bertumpuk seperti pen. */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        {/* Rentang Tanggal (pen): h52 p[0,14] gap10 surface r14 stroke line-soft */}
        <button
          type="button"
          aria-label="Ubah rentang tanggal"
          onClick={() => setRangeOpen(true)}
          className="press-scale flex h-[52px] w-full items-center gap-2.5 rounded-segment border border-line-soft bg-surface px-3.5 text-left transition-colors duration-150 ease-out hover:bg-surface-muted md:w-[320px] md:shrink-0"
        >
          <CalendarDays className="size-[18px] shrink-0 text-primary-soft" aria-hidden="true" />
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="text-[11.5px] font-semibold text-muted">Rentang Tanggal</span>
            <span className="truncate text-[13.5px] font-semibold text-primary">
              {formatTanggalPendek(range.startDate)} – {formatTanggalPendek(range.endDate)}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden="true" />
        </button>

        <SegmentedFilter
          label="Status pembayaran"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(v) => gantiFilter(() => setStatus(v))}
          className="md:min-w-0 md:flex-1 lg:max-w-[420px]"
        />
      </div>

      {isLg ? (
        <div className="flex items-start gap-4 xl:gap-5">
          <div className="flex w-[360px] shrink-0 flex-col gap-2.5 xl:w-[400px]">{daftar}</div>
          <section
            aria-label="Detail transaksi"
            className="sticky top-6 flex max-h-[calc(100dvh-48px)] min-w-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-line-soft bg-surface"
          >
            {selected ? (
              <>
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
                  <div className="flex min-w-0 flex-col gap-px">
                    <h2 className="truncate text-lg font-bold leading-tight text-primary">
                      Detail Transaksi
                    </h2>
                    <p className="truncate text-xs text-muted">
                      {kodeTransaksi(selected)} · {formatTanggalLengkap(selected.tanggal)}
                    </p>
                  </div>
                  <StatusBadge t={selected} />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-bg p-4">
                  <TransactionDetail t={selected} onVoid={setVoidFor} split={isXl} hideIdentity />
                </div>
              </>
            ) : selectedId && !detailQuery.isError ? (
              <div className="flex flex-col gap-3 p-5" aria-busy="true">
                {[72, 120, 120].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: h }}
                    className="animate-pulse rounded-[16px] bg-surface-muted"
                  />
                ))}
              </div>
            ) : (
              <DetailPlaceholder />
            )}
          </section>
        </div>
      ) : (
        daftar
      )}

      {voidFor && <VoidDialog t={voidFor} onClose={() => setVoidFor(null)} />}
      {rangeSheet}
    </div>
  );
}
