import { useState } from 'react';
import { Ban, CalendarDays, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { useTransactions, useVoidTransaction } from '../api';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedFilter } from '@/components/SegmentedFilter';
import { DateRangePicker } from '@/features/reports/components/shared';
import { formatRupiah } from '@/lib/money';
import { useMediaQuery } from '@/lib/useMediaQuery';
import {
  formatTanggal,
  formatTanggalLengkap,
  formatTanggalPendek,
  hitungSisaVoid,
  isoToInputValue,
  judulTransaksi,
} from '../utils';
import type { Transaction, PaymentStatus } from '../types';

const STATUS_OPTIONS = [
  { value: 'SEMUA', label: 'Semua' },
  { value: 'LUNAS', label: 'Lunas' },
  { value: 'UTANG', label: 'Utang' },
] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number]['value'];

function VoidConfirmModal({ transactionId, onClose }: { transactionId: string; onClose: () => void }) {
  const voidMut = useVoidTransaction(transactionId);
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal open title="Batalkan Transaksi" onClose={onClose}>
      <p className="text-sm text-primary">
        Transaksi akan dibatalkan dan stok produk dikembalikan. Tindakan ini tidak dapat dibatalkan
        kembali.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <div className="mt-5 flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Batal
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          disabled={voidMut.isPending}
          onClick={() =>
            voidMut.mutate(undefined, {
              onSuccess: onClose,
              onError: (err) => setError(err instanceof Error ? err.message : 'Gagal membatalkan transaksi.'),
            })
          }
        >
          {voidMut.isPending ? 'Membatalkan…' : 'Batalkan Transaksi'}
        </Button>
      </div>
    </Modal>
  );
}

/** Tampilan Detail Transaksi lengkap mengikuti pen Q8YY2 / Z6FKk / imcH5 / k4IRS. */
function TransactionDetailView({
  t,
  onVoid,
}: {
  t: Transaction;
  onVoid: (t: Transaction) => void;
}) {
  const dibatalkan = t.statusTransaksi === 'DIBATALKAN';
  const bisaVoid = !dibatalkan && hitungSisaVoid(t.createdAt);

  return (
    <div className="flex flex-col gap-3">
      {/* Kartu Identitas (pen: k5j3U) */}
      <div className="flex items-start justify-between gap-3 rounded-[14px] border border-line-soft bg-surface p-3.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-bold text-primary">{t.id}</p>
          <p className="text-[11.5px] text-muted">{formatTanggalLengkap(t.tanggal)}</p>
        </div>
        {dibatalkan ? (
          <Badge variant="netral" label="Dibatalkan" />
        ) : (
          <Badge
            variant={t.statusPembayaran === 'LUNAS' ? 'lunas' : 'utang'}
            label={t.statusPembayaran === 'LUNAS' ? 'Lunas' : 'Utang'}
          />
        )}
      </div>

      {/* Kartu Item Transaksi (pen: LdswT) */}
      <div className="flex flex-col gap-2.5 rounded-[14px] border border-line-soft bg-surface p-3.5">
        <h3 className="text-[13px] font-bold text-primary">Item transaksi</h3>
        <div className="flex flex-col gap-2">
          {t.items.map((i) => (
            <div
              key={i.id || i.productId}
              className="flex items-center justify-between border-b border-line-soft pb-2 last:border-0 last:pb-0"
            >
              <div className="min-w-0 flex-1 pr-2">
                <p className="truncate text-[13.5px] font-medium text-primary">
                  {i.namaProdukSnapshot}
                </p>
                <p className="text-[11.5px] text-muted">
                  {i.jumlah} × {formatRupiah(i.hargaJualSnapshot)}
                </p>
              </div>
              <span className="shrink-0 text-[13.5px] font-semibold tabular-nums text-primary">
                {formatRupiah(i.subtotal)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Kartu Pembayaran (pen: N5lJ6V) */}
      <div className="flex flex-col gap-2.5 rounded-[14px] border border-line-soft bg-surface p-3.5">
        <h3 className="text-[13px] font-bold text-primary">Pembayaran</h3>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Total transaksi</span>
          <span className="font-bold tabular-nums text-primary">{formatRupiah(t.total)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Uang diterima</span>
          <span className="font-semibold tabular-nums text-primary">
            {formatRupiah(t.uangDiterima || t.total)}
          </span>
        </div>
        <div className="h-px bg-line-soft" />
        {!dibatalkan && t.statusPembayaran === 'LUNAS' && (
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-primary-soft">Kembalian</span>
            <span className="font-bold tabular-nums text-primary-soft">
              {formatRupiah(t.kembalian || 0)}
            </span>
          </div>
        )}
        {!dibatalkan && t.statusPembayaran === 'UTANG' && (
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-warning">Sisa utang</span>
            <span className="font-bold tabular-nums text-warning">
              {formatRupiah(t.sisaSaldoUtang || 0)}
            </span>
          </div>
        )}
        {dibatalkan && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Status transaksi</span>
              <span className="font-semibold text-muted">Dibatalkan</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Status pembayaran</span>
              <span className="font-semibold text-primary">
                {t.statusPembayaran === 'LUNAS' ? 'Lunas' : 'Utang'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Kartu Data Pembeli (pen: O7pfaZ) */}
      {(t.namaPembeli || t.noHpPembeli) && (
        <div className="flex flex-col gap-2 rounded-[14px] border border-line-soft bg-surface p-3.5">
          <h3 className="text-[13px] font-bold text-primary">Data pembeli</h3>
          {t.namaPembeli && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Nama</span>
              <span className="font-semibold text-primary">{t.namaPembeli}</span>
            </div>
          )}
          {t.noHpPembeli && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">No. HP</span>
              <span className="font-semibold tabular-nums text-primary">{t.noHpPembeli}</span>
            </div>
          )}
        </div>
      )}

      {/* Aksi Pembatalan & Catatan (pen: jfwT7, imcH5, k4IRS) */}
      {bisaVoid && (
        <div className="flex flex-col gap-2 pt-1">
          <Button
            variant="destructive"
            className="h-11 w-full gap-2 px-4 text-xs font-semibold"
            onClick={() => onVoid(t)}
          >
            <Ban className="size-4" aria-hidden="true" />
            <span>Batalkan Transaksi</span>
          </Button>
          <p className="text-center text-[11.5px] text-muted">
            Pembatalan bisa dilakukan maksimal 24 jam setelah transaksi disimpan.
          </p>
        </div>
      )}

      {!dibatalkan && !bisaVoid && (
        <div className="flex items-start gap-2.5 rounded-[12px] border border-line-soft bg-surface p-3 text-xs text-muted">
          <Info className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
          <p>
            Pembatalan hanya bisa dilakukan maksimal 24 jam setelah transaksi disimpan. Transaksi ini
            sudah melewati batas pembatalan 24 jam.
          </p>
        </div>
      )}

      {dibatalkan && (
        <div className="flex items-start gap-2.5 rounded-[12px] border border-line-soft bg-surface p-3 text-xs text-muted">
          <Info className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
          <p>
            Transaksi dibatalkan
            {t.dibatalkanPada ? ` pada ${formatTanggal(t.dibatalkanPada)}` : ''}. Stok sudah
            dikembalikan dan transaksi ini tidak dihitung dalam omzet maupun profit.
          </p>
        </div>
      )}
    </div>
  );
}

/** Layar Riwayat (03) — mobile: daftar + layar detail interaktif; md+: master-detail (±42/58). */
export function RiwayatPage() {
  const [status, setStatus] = useState<StatusFilter>('SEMUA');
  const [voidFor, setVoidFor] = useState<Transaction | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isLg = useMediaQuery('(min-width: 1024px)');

  // Rentang default dihitung sekali per mount agar query key stabil.
  const [range, setRange] = useState(() => {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
  });
  const [rangeOpen, setRangeOpen] = useState(false);

  const filters = {
    ...range,
    ...(status !== 'SEMUA' ? { statusPembayaran: status as PaymentStatus } : {}),
  };

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTransactions(filters);
  const transactions = data?.pages.flatMap((p) => p.data) ?? [];
  const selected = transactions.find((t) => t.id === selectedId) ?? null;

  // Pada mobile: bila ada transaksi yang dipilih, tampilkan layar Detail Transaksi interaktif (pen Q8YY2 / Z6FKk)
  if (!isLg && selected) {
    return (
      <div className="flex flex-col gap-4">
        <ScreenHeader
          title="Detail Transaksi"
          subtitle={selected.id}
          onBack={() => setSelectedId(null)}
        />
        <TransactionDetailView t={selected} onVoid={setVoidFor} />
        {voidFor && <VoidConfirmModal transactionId={voidFor.id} onClose={() => setVoidFor(null)} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Pen: judul "Transaksi", info "<N> transaksi ditemukan" */}
      <ScreenHeader
        eyebrow="RIWAYAT"
        title="Transaksi"
        info={transactions.length > 0 ? `${transactions.length} transaksi ditemukan` : undefined}
      />

      {/* Kartu Rentang Tanggal (pen: h=52, radius 14, surface, ikon kalender + blok label/nilai + chevron) */}
      <button
        type="button"
        aria-label="Ubah rentang tanggal"
        onClick={() => setRangeOpen(true)}
        className="press-scale flex h-[52px] w-full items-center gap-2.5 rounded-segment border border-line-soft bg-surface px-3.5 text-left transition-colors duration-150 ease-out hover:border-accent/60 hover:bg-surface-muted"
      >
        <CalendarDays className="size-[18px] shrink-0 text-primary-soft" aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
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
        onChange={setStatus}
      />

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-card-sm border border-line-soft bg-surface" />
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

      {!isLoading && !isError && transactions.length === 0 && (
        <Card variant="list" className="flex flex-col items-center gap-2 py-10 text-center">
          <p className="text-sm font-semibold text-primary">Tidak ada transaksi</p>
          <p className="text-xs text-muted">
            Tidak ada transaksi pada rentang {formatTanggalPendek(range.startDate)} –{' '}
            {formatTanggalPendek(range.endDate)}. Coba ubah rentang tanggal atau pilih status pembayaran lain.
          </p>
          <Button variant="secondary" className="h-10 px-4 text-xs" onClick={() => setRangeOpen(true)}>
            Ubah Rentang Tanggal
          </Button>
        </Card>
      )}

      {!isLoading && !isError && transactions.length > 0 && (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* Master */}
          <div className="flex min-w-0 flex-1 flex-col gap-3 lg:max-w-[42%]">
            {transactions.map((t) => {
              const dibatalkan = t.statusTransaksi === 'DIBATALKAN';
              const bisaVoid = !dibatalkan && hitungSisaVoid(t.createdAt);
              const aktif = selectedId === t.id;
              return (
                <Card
                  key={t.id}
                  variant="list"
                  role="button"
                  tabIndex={0}
                  aria-pressed={aktif}
                  aria-label={`Transaksi ${t.id}, ${formatRupiah(t.total)}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedId(t.id);
                    }
                  }}
                  className={`press-scale card-hover flex cursor-pointer flex-col gap-2 rounded-[14px] ${aktif ? 'border-accent' : ''}`}
                  onClick={() => setSelectedId(t.id)}
                >
                  {/* Baris atas: Judul deskriptif nama pembeli / produk, waktu + ID di bawahnya, badge kanan */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-[13.5px] font-bold ${dibatalkan ? 'text-muted line-through' : 'text-primary'}`}>
                        {judulTransaksi(t)}
                      </p>
                      <p className="flex items-center gap-1.5 truncate text-[11.5px] text-muted">
                        <span className="font-semibold text-primary-soft">{t.id}</span>
                        <span>·</span>
                        <span>{formatTanggal(t.tanggal)}</span>
                      </p>
                    </div>
                    {dibatalkan ? (
                      <Badge variant="netral" label="Dibatalkan" />
                    ) : (
                      <Badge
                        variant={t.statusPembayaran === 'LUNAS' ? 'lunas' : 'utang'}
                        label={t.statusPembayaran === 'LUNAS' ? 'Lunas' : 'Utang'}
                      />
                    )}
                  </div>

                  {/* Baris bawah: ringkasan item kiri, total + chevron kanan */}
                  <div className="flex items-end justify-between gap-2.5">
                    <p className="min-w-0 flex-1 truncate text-xs text-muted">
                      {t.items.length} produk · {t.items.reduce((s, i) => s + i.jumlah, 0)} item
                      {dibatalkan ? ' · Stok dikembalikan' : ''}
                    </p>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span className={`text-[15px] font-bold ${dibatalkan ? 'text-muted' : 'text-primary'}`}>
                        {formatRupiah(t.total)}
                      </span>
                      <ChevronRight className="size-4 text-muted" aria-hidden="true" />
                    </span>
                  </div>

                  {bisaVoid && (
                    <Button
                      variant="destructive"
                      className="h-11 self-start px-4 text-xs lg:hidden"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVoidFor(t);
                      }}
                    >
                      Batalkan
                    </Button>
                  )}
                </Card>
              );
            })}

            {hasNextPage && (
              <Button variant="secondary" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="self-center">
                {isFetchingNextPage ? 'Memuat…' : 'Muat lebih banyak'}
              </Button>
            )}
          </div>

          {/* Detail (md+) */}
          <div className="hidden flex-1 lg:block">
            <div className="sticky top-6 rounded-card border border-line-soft bg-surface p-5">
              {selected ? (
                <TransactionDetailView t={selected} onVoid={setVoidFor} />
              ) : (
                <p className="py-8 text-center text-sm text-muted">Pilih transaksi untuk melihat detail.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {voidFor && <VoidConfirmModal transactionId={voidFor.id} onClose={() => setVoidFor(null)} />}

      {rangeOpen && (
        <Modal open title="Rentang Tanggal" onClose={() => setRangeOpen(false)}>
          <DateRangePicker
            range={{ startDate: isoToInputValue(range.startDate), endDate: isoToInputValue(range.endDate) }}
            onChange={(r) => {
              setRange({ startDate: new Date(`${r.startDate}T00:00:00`).toISOString(), endDate: new Date(`${r.endDate}T23:59:59`).toISOString() });
              setRangeOpen(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}