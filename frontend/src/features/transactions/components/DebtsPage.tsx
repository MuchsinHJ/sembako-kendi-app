import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Ban, Check, ChevronRight, Download, Info, Wallet } from 'lucide-react';
import {
  useDebts,
  useDebtsPage,
  usePaymentHistory,
  useRecordPayment,
  useTransaction,
  useVoidTransaction,
} from '../api';
import { useDashboardSummary } from '@/features/dashboard/api';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AmountField, ContextCard, EstimateRow, InlineError } from '@/components/SheetParts';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formatRupiah } from '@/lib/money';
import { cn } from '@/lib/cn';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { MQ } from '@/lib/breakpoints';
import { Pagination } from '@/components/Pagination';
import { formatTanggalPendek, formatWaktuRelatif, hitungSisaVoid, kodeTransaksi } from '../utils';
import type { Payment, Transaction } from '../types';

function formatTanggalJam(iso: string): string {
  const d = new Date(iso);
  return `${formatTanggalPendek(iso)}, ${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
}

interface HasilBayar {
  sebelum: number;
  dibayar: number;
  sesudah: number;
  nama: string | null;
}

/* ─── Sheet Catat Pembayaran (pen W52sOG / cPufT) + dialog konfirmasi (pen o1Snl) ── */

function PaymentSheet({
  transaction,
  onClose,
  onTercatat,
}: {
  transaction: Transaction;
  onClose: () => void;
  onTercatat: (hasil: HasilBayar) => void;
}) {
  const [jumlah, setJumlah] = useState('');
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const record = useRecordPayment(transaction.id);

  const sisa = Number(transaction.sisaSaldoUtang ?? '0');
  const nominal = Number(jumlah || '0');
  const melebihi = nominal > sisa;
  const sesudah = Math.max(0, sisa - nominal);
  const bisaLanjut = nominal > 0 && !melebihi;
  // md+ (ide .pen yT8Pl): chip nominal cepat — Lunasi + pecahan bulat di bawah sisa.
  const isMd = useMediaQuery(MQ.md);
  const chipNominal = [10_000, 20_000, 50_000, 100_000].filter((v) => v < sisa).slice(-3);

  function simpan() {
    setFormError(null);
    record.mutate(nominal, {
      onSuccess: () =>
        onTercatat({ sebelum: sisa, dibayar: nominal, sesudah, nama: transaction.namaPembeli }),
      onError: (err) => {
        setKonfirmasi(false);
        setFormError(err instanceof Error ? err.message : 'Gagal mencatat pembayaran.');
      },
    });
  }

  return (
    <>
      <Modal
        open={!konfirmasi}
        onClose={onClose}
        title="Catat Pembayaran"
        subtitle={`${kodeTransaksi(transaction)}${transaction.namaPembeli ? ` · ${transaction.namaPembeli}` : ''}`}
        titleClassName="text-[17px] font-bold"
        bodyClassName="flex flex-col gap-4"
        footer={
          <>
            <Button variant="soft" className="w-[110px] shrink-0" onClick={onClose}>
              Batal
            </Button>
            <Button className="flex-1" disabled={!bisaLanjut} onClick={() => setKonfirmasi(true)}>
              Lanjutkan
            </Button>
          </>
        }
      >
        <ContextCard label="Sisa utang saat ini" value={formatRupiah(sisa)} />
        <AmountField
          label="Nominal cicilan"
          value={jumlah}
          onChange={setJumlah}
          invalid={melebihi}
          autoFocus
          helper={
            melebihi
              ? undefined
              : `Masukkan jumlah lebih dari Rp0 dan tidak melebihi ${formatRupiah(sisa)}.`
          }
        />
        {isMd && sisa > 0 && (
          <div role="group" aria-label="Nominal cepat" className="-mt-1 flex flex-wrap gap-2">
            {[...chipNominal, sisa].map((v) => {
              const aktif = nominal === v;
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={aktif}
                  onClick={() => setJumlah(String(v))}
                  className={cn(
                    'press-scale h-11 rounded-full px-4 text-[12.5px] font-semibold tabular-nums transition-colors duration-150 ease-out',
                    aktif
                      ? 'bg-primary text-bg'
                      : 'border border-line bg-surface text-primary-soft hover:bg-surface-muted',
                  )}
                >
                  {v === sisa ? `Lunasi ${formatRupiah(sisa)}` : formatRupiah(v)}
                </button>
              );
            })}
          </div>
        )}
        {melebihi && (
          <InlineError>
            Nominal cicilan melebihi sisa utang. Sisa utang transaksi ini {formatRupiah(sisa)}.
          </InlineError>
        )}
        <EstimateRow
          label="Sisa utang setelah dibayar"
          value={melebihi ? 'Tidak bisa dihitung' : formatRupiah(sesudah)}
          danger={melebihi}
        />
        {formError && <InlineError>{formError}</InlineError>}
      </Modal>

      <ConfirmDialog
        open={konfirmasi}
        onClose={() => setKonfirmasi(false)}
        tone="success"
        title="Catat pembayaran ini?"
        description="Periksa jumlahnya sebelum menyimpan. Pembayaran akan tercatat pada riwayat cicilan transaksi ini."
        chip={
          <span className="w-full rounded-[10px] bg-surface-muted px-2.5 py-1.5 text-[11.5px] font-semibold text-primary-soft">
            {kodeTransaksi(transaction)} · {formatRupiah(nominal)}
          </span>
        }
        actions={
          <>
            <Button
              variant="secondary"
              className="w-full text-primary-soft"
              onClick={() => setKonfirmasi(false)}
            >
              Batal
            </Button>
            <Button className="w-full" disabled={record.isPending} onClick={simpan}>
              {record.isPending ? 'Menyimpan…' : 'Simpan Cicilan'}
            </Button>
          </>
        }
      >
        <div className="flex w-full flex-col gap-2">
          {[
            ['Sisa utang sebelum dibayar', sisa],
            ['Jumlah dibayar', nominal],
            ['Sisa utang setelah dibayar', sesudah],
          ].map(([l, v]) => (
            <div key={l as string} className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted">{l}</span>
              <span className="text-[13px] font-bold tabular-nums text-primary">
                {formatRupiah(v as number)}
              </span>
            </div>
          ))}
        </div>
        <p className="w-full rounded-[10px] bg-surface-muted px-2.5 py-2 text-[11.5px] text-muted">
          Pembayaran cicilan tidak membuat transaksi penjualan baru dan tidak mengubah stok.
        </p>
      </ConfirmDialog>
    </>
  );
}

/* ─── Detail Transaksi Utang (pen K6YpE / F8ufl0) ─────────────────────────── */

function Row({
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
    <div className="flex items-center justify-between gap-3">
      <span className={cn('text-[12.5px] text-muted', labelClass)}>{label}</span>
      <span className={cn('text-sm font-semibold tabular-nums text-primary', valueClass)}>
        {value}
      </span>
    </div>
  );
}

/** BR-13 + aturan BE: void hanya ≤24 jam DAN belum ada cicilan. */
function aturanVoidUtang(t: Transaction, payments: Payment[] | undefined) {
  const adaCicilan = (payments?.length ?? 0) > 0;
  const dalam24Jam = hitungSisaVoid(t.createdAt);
  const bisaVoid = payments !== undefined && dalam24Jam && !adaCicilan;
  const alasanTidakBisa = adaCicilan
    ? dalam24Jam
      ? 'Transaksi ini tidak bisa dibatalkan karena sudah ada pembayaran cicilan.'
      : 'Transaksi ini tidak bisa dibatalkan karena sudah ada pembayaran cicilan, dan batas 24 jam juga sudah terlewat.'
    : 'Transaksi ini tidak bisa dibatalkan karena batas 24 jam sudah terlewat.';
  return { bisaVoid, alasanTidakBisa };
}

function DebtDetail({
  t,
  payments,
  onBayar,
  onVoid,
  split = false,
  showActions = true,
}: {
  t: Transaction;
  payments: Payment[] | undefined;
  onBayar: () => void;
  onVoid: () => void;
  /** Ruang lebar: rincian + item | riwayat cicilan + catatan. */
  split?: boolean;
  /** Panel lg+ menaruh tombol aksi di footer panel. */
  showActions?: boolean;
}) {
  const totalCicilan = (payments ?? []).reduce((s, p) => s + Number(p.jumlahBayar), 0);
  const { bisaVoid, alasanTidakBisa } = aturanVoidUtang(t, payments);

  return (
    <div className={split ? 'grid grid-cols-2 items-start gap-3' : 'flex flex-col gap-3'}>
      <div className="flex min-w-0 flex-col gap-3">
        {/* Kartu Rincian Transaksi */}
        <div className="flex flex-col gap-2 rounded-[16px] bg-surface p-4">
          <h3 className="text-[13px] font-semibold text-primary">Rincian transaksi</h3>
          <Row label="Nama pembeli" value={t.namaPembeli ?? 'Tanpa nama'} />
          <Row label="Tanggal" value={formatTanggalJam(t.tanggal)} />
          <Row
            label="Total transaksi"
            value={formatRupiah(t.total)}
            valueClass="text-[15px] font-bold"
          />
          <Row label="Uang diterima" value={formatRupiah(t.uangDiterima ?? 0)} />
          <Row label="Cicilan sebelumnya" value={formatRupiah(totalCicilan)} />
          <div className="h-px bg-line-soft" />
          <Row
            label="Sisa utang"
            value={formatRupiah(t.sisaSaldoUtang ?? 0)}
            labelClass="font-semibold text-warning"
            valueClass="text-base font-bold text-warning"
          />
        </div>

        {/* Kartu Item Transaksi */}
        <div className="flex flex-col gap-2 rounded-[16px] bg-surface p-4">
          <h3 className="text-[13px] font-semibold text-primary">Item transaksi</h3>
          {t.items.map((i, idx) => (
            <div key={i.id || i.productId} className="flex flex-col gap-2">
              {idx > 0 && <div className="h-px bg-line-soft" />}
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex min-w-0 flex-col gap-px">
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
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        {/* Riwayat cicilan (pen): surface-muted r12 p12 gap8 */}
        <section
          aria-label="Riwayat cicilan"
          className="flex flex-col gap-2 rounded-[12px] bg-surface-muted p-3"
        >
          <h3 className="text-xs font-semibold text-primary">Riwayat cicilan</h3>
          {payments === undefined ? (
            <p className="text-xs text-muted">Memuat…</p>
          ) : payments.length === 0 ? (
            <p className="text-xs text-muted">Belum ada cicilan untuk transaksi ini.</p>
          ) : (
            payments.map((p, idx) => (
              <div key={p.id} className="flex flex-col gap-1">
                {idx > 0 && <div className="my-1 h-px bg-line-soft" />}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">{formatTanggalPendek(p.tanggalBayar)}</span>
                  <span className="text-[13px] font-bold tabular-nums text-primary">
                    {formatRupiah(p.jumlahBayar)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] text-muted">Sisa utang setelah dibayar</span>
                  <span className="text-xs font-semibold tabular-nums text-primary-soft">
                    {formatRupiah(p.saldoSetelahBayar)}
                  </span>
                </div>
              </div>
            ))
          )}
        </section>

        {payments !== undefined && (
          <div className="flex items-start gap-[7px] rounded-[10px] bg-surface-muted px-2.5 py-2">
            <Info className="mt-px size-3.5 shrink-0 text-muted" aria-hidden="true" />
            <p className="text-[11.5px] leading-normal text-muted">
              {bisaVoid
                ? 'Uang muka belum dihitung sebagai cicilan. Transaksi ini belum punya cicilan dan masih di bawah 24 jam, jadi masih bisa dibatalkan.'
                : alasanTidakBisa}
            </p>
          </div>
        )}

        {showActions && (
          <>
            <Button className="h-11 w-full" onClick={onBayar}>
              Catat Pembayaran
            </Button>
            {bisaVoid && (
              <Button variant="destructive" className="w-full" onClick={onVoid}>
                <Ban className="size-4" aria-hidden="true" />
                Batalkan Transaksi
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Pembayaran Berhasil (pen O9Gj9 masih utang / dn9gD lunas) ───────────── */

function PembayaranBerhasil({
  hasil,
  onLagi,
  onKembali,
  onDaftar,
  inPanel = false,
}: {
  hasil: HasilBayar;
  onLagi: () => void;
  onKembali: () => void;
  onDaftar: () => void;
  /** Panel detail lg+: tanpa tinggi layar penuh, lebar isi dibatasi agar tetap terbaca. */
  inPanel?: boolean;
}) {
  const lunas = hasil.sesudah <= 0;
  const nama = hasil.nama ?? 'pembeli';
  const Heading = inPanel ? 'h2' : 'h1';
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-[18px] text-center',
        inPanel ? 'mx-auto w-full max-w-[440px] py-6' : 'min-h-[calc(100dvh-148px)] pb-6',
      )}
    >
      <div className="flex size-[72px] items-center justify-center rounded-full bg-success-soft">
        <Check className="size-[34px] text-primary-soft" aria-hidden="true" />
      </div>
      <div role="status" className="flex flex-col items-center gap-1.5">
        <Heading className="text-[25px] font-bold text-primary">Pembayaran tercatat</Heading>
        <p className="text-[13px] text-muted">
          {lunas
            ? `Sisa utang ${nama} sudah lunas.`
            : `Sisa utang ${nama} berkurang ${formatRupiah(hasil.dibayar)}.`}
        </p>
      </div>
      <div
        className={cn(
          'flex w-full flex-col items-center gap-0.5 rounded-[16px] px-4 py-3.5',
          lunas ? 'bg-success-soft' : 'bg-warning-soft',
        )}
      >
        <span className="text-xs font-medium text-primary-soft">Sisa utang</span>
        <span className="text-[28px] font-bold leading-tight tabular-nums text-primary">
          {formatRupiah(hasil.sesudah)}
        </span>
      </div>
      <div className="flex w-full flex-col gap-2.5 rounded-[16px] bg-surface p-4 text-left">
        <Row label="Jumlah dibayar" value={formatRupiah(hasil.dibayar)} valueClass="text-[13px]" />
        <Row
          label="Sisa utang sebelum dibayar"
          value={formatRupiah(hasil.sebelum)}
          valueClass="text-[13px]"
        />
        <Row
          label="Sisa utang setelah dibayar"
          value={formatRupiah(hasil.sesudah)}
          valueClass="text-[13px]"
        />
        {hasil.nama && <Row label="Nama pembeli" value={hasil.nama} valueClass="text-[13px]" />}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12.5px] text-muted">Status pembayaran</span>
          <Badge variant={lunas ? 'lunas' : 'utang'} label={lunas ? 'Lunas' : 'Utang'} />
        </div>
      </div>
      <p className="text-[11.5px] text-muted">
        {lunas
          ? 'Status pembayaran otomatis menjadi Lunas saat saldo mencapai Rp0.'
          : 'Status pembayaran tetap Utang karena saldo belum mencapai Rp0.'}
      </p>
      <div className="flex w-full flex-col gap-2.5">
        {lunas ? (
          <>
            <Button className="w-full" onClick={onKembali}>
              Kembali ke Detail Utang
            </Button>
            <Button variant="secondary" className="w-full text-primary-soft" onClick={onDaftar}>
              Lihat Daftar Utang
            </Button>
          </>
        ) : (
          <>
            <Button className="w-full" onClick={onLagi}>
              Catat Pembayaran Lain
            </Button>
            <Button variant="secondary" className="w-full text-primary-soft" onClick={onKembali}>
              Kembali ke Detail Utang
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Halaman ─────────────────────────────────────────────────────────────── */

const PAGE_SIZE = 12;

function DebtCard({ t, aktif, onOpen }: { t: Transaction; aktif: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={aktif || undefined}
      aria-label={`Utang ${t.namaPembeli ?? 'Tanpa nama'}, sisa ${formatRupiah(t.sisaSaldoUtang)}`}
      className={cn(
        'press-scale flex w-full flex-col gap-2 rounded-[14px] border bg-surface p-3 text-left transition-colors duration-150 ease-out hover:bg-surface-muted',
        aktif ? 'border-accent' : 'border-line-soft',
      )}
    >
      <div className="flex w-full items-center justify-between gap-2.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[13px] font-bold text-primary">
            {t.namaPembeli ?? 'Tanpa nama'}
          </span>
          <span className="truncate text-[11.5px] text-muted">
            {kodeTransaksi(t)} · {formatWaktuRelatif(t.tanggal)}
          </span>
        </div>
        <Badge variant="utang" label="Utang" />
      </div>
      <div className="flex w-full items-center justify-between gap-2.5">
        <span className="text-xs text-muted">Sisa utang</span>
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="text-[15px] font-bold tabular-nums text-danger">
            {formatRupiah(t.sisaSaldoUtang)}
          </span>
          <ChevronRight className="size-4 text-muted" aria-hidden="true" />
        </span>
      </div>
    </button>
  );
}

/** Kartu ringkasan sebaris md+ (ide .pen b1WNHX + kartu ringkasan Katalog). */
function SummaryTile({
  label,
  value,
  hint,
  tone = 'surface',
}: {
  label: string;
  value: ReactNode;
  hint: string;
  tone?: 'surface' | 'warning';
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-[3px] rounded-[16px] p-4',
        tone === 'warning' ? 'bg-warning-soft' : 'border border-line-soft bg-surface',
      )}
    >
      <span className={cn('text-xs font-medium', tone === 'warning' ? 'text-warning' : 'text-muted')}>
        {label}
      </span>
      <span className="truncate text-[24px] font-bold leading-tight tabular-nums text-primary">{value}</span>
      <span className="truncate text-xs text-muted">{hint}</span>
    </div>
  );
}

/**
 * Layar Utang (pen gRhkJ). Mobile: daftar → Detail Transaksi Utang layar penuh (`?trx=`)
 * → sheet Catat Pembayaran → dialog konfirmasi → layar Pembayaran tercatat.
 * md: kartu ringkasan sebaris + grid 2 kolom berpaginasi; detail layar penuh dua kolom.
 * lg+: master-detail; tanpa `?trx=` utang pertama di halaman aktif dipilih otomatis.
 */
export function DebtsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMd = useMediaQuery(MQ.md);
  const isLg = useMediaQuery(MQ.lg);
  const isXl = useMediaQuery(MQ.xl);
  const [page, setPage] = useState(1);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [hasil, setHasil] = useState<HasilBayar | null>(null);

  const infinite = useDebts({ enabled: !isMd });
  const paged = useDebtsPage(page, PAGE_SIZE, { enabled: isMd });
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = infinite;
  const debts = isMd ? (paged.data?.data ?? []) : (data?.pages.flatMap((p) => p.data) ?? []);
  const isLoading = isMd ? paged.isLoading : infinite.isLoading;
  const isError = isMd ? paged.isError : infinite.isError;
  const refetch = isMd ? paged.refetch : infinite.refetch;
  const loaded = isMd ? !!paged.data : !!data;
  const jumlahUtang =
    (isMd ? paged.data?.pagination.total : data?.pages[0]?.pagination.total) ?? debts.length;
  const totalPages = paged.data?.pagination.totalPages ?? 1;
  const summary = useDashboardSummary();
  // Total utang aktif seluruh transaksi (dashboard), tidak hanya halaman yang termuat.
  const totalSaldo = summary.data
    ? Number(summary.data.totalSaldoUtang)
    : debts.reduce((s, t) => s + Number(t.sisaSaldoUtang ?? '0'), 0);

  // Halaman kosong setelah pelunasan (mis. item terakhir di halaman 3) → mundur satu halaman.
  useEffect(() => {
    if (isMd && paged.data && paged.data.data.length === 0 && page > 1) setPage((p) => p - 1);
  }, [isMd, paged.data, page]);

  const urlId = searchParams.get('trx');
  const selectedId = urlId ?? (isLg ? (debts[0]?.id ?? null) : null);
  const detailQuery = useTransaction(selectedId ?? '');
  const selected = detailQuery.data ?? debts.find((t) => t.id === selectedId) ?? null;
  const paymentsQuery = usePaymentHistory(selectedId ?? '');
  const voidMut = useVoidTransaction(selectedId ?? '');
  const [voidError, setVoidError] = useState<string | null>(null);

  function bukaDetail(id: string) {
    setHasil(null);
    setSearchParams({ trx: id }, { state: { debtDetail: true }, replace: isLg });
  }
  function tutupDetail() {
    setHasil(null);
    if ((location.state as { debtDetail?: boolean } | null)?.debtDetail) navigate(-1);
    else setSearchParams({}, { replace: true });
  }
  function bukaBayar() {
    setPaymentOpen(true);
  }
  function bukaVoid() {
    setVoidError(null);
    setVoidOpen(true);
  }

  const sheets = selected && (
    <>
      {paymentOpen && (
        <PaymentSheet
          transaction={selected}
          onClose={() => setPaymentOpen(false)}
          onTercatat={(h) => {
            setPaymentOpen(false);
            setHasil(h);
            // Kunci pilihan otomatis (lg+) agar panel tetap pada transaksi ini setelah daftar dimuat ulang.
            if (!urlId) setSearchParams({ trx: selected.id }, { replace: true });
            void refetch();
          }}
        />
      )}
      <ConfirmDialog
        open={voidOpen}
        onClose={() => setVoidOpen(false)}
        title="Batalkan transaksi ini?"
        chip={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-[5px] text-[12.5px]">
            <span className="font-bold text-primary">{kodeTransaksi(selected)}</span>
            <span className="font-semibold text-muted">{formatRupiah(selected.total)}</span>
          </span>
        }
        description={`Stok ${selected.items.length} produk pada transaksi ini dikembalikan otomatis dan utangnya dihapus dari daftar.`}
        note="Transaksi tetap tersimpan di riwayat dengan status Dibatalkan dan tidak dihitung dalam omzet maupun profit."
        actions={
          <>
            <Button variant="secondary" className="w-full" onClick={() => setVoidOpen(false)}>
              Batal
            </Button>
            <Button
              variant="danger"
              className="w-full"
              disabled={voidMut.isPending}
              onClick={() =>
                voidMut.mutate(undefined, {
                  onSuccess: () => {
                    setVoidOpen(false);
                    tutupDetail();
                  },
                  onError: (err) =>
                    setVoidError(
                      err instanceof Error ? err.message : 'Gagal membatalkan transaksi.',
                    ),
                })
              }
            >
              <Ban className="size-4" aria-hidden="true" />
              {voidMut.isPending ? 'Membatalkan…' : 'Ya, Batalkan'}
            </Button>
          </>
        }
      >
        {voidError && <InlineError className="w-full">{voidError}</InlineError>}
      </ConfirmDialog>
    </>
  );

  const bukanUtangAktif =
    !!selected && (selected.statusPembayaran === 'LUNAS' || selected.statusTransaksi === 'DIBATALKAN');
  const kartuBukanUtang = selected && (
    <Card variant="list" className="flex flex-col items-start gap-2 p-4">
      <p className="text-sm font-semibold text-primary">
        {selected.statusTransaksi === 'DIBATALKAN'
          ? 'Transaksi ini sudah dibatalkan.'
          : 'Utang transaksi ini sudah lunas.'}
      </p>
      <Button variant="secondary" className="h-10 px-4 text-xs" onClick={tutupDetail}>
        Lihat Daftar Utang
      </Button>
    </Card>
  );

  /* Mobile & tablet potret: layar Berhasil / Detail */
  if (!isLg && selectedId) {
    if (hasil) {
      return (
        <PembayaranBerhasil
          hasil={hasil}
          onLagi={() => {
            setHasil(null);
            setPaymentOpen(true);
          }}
          onKembali={() => setHasil(null)}
          onDaftar={tutupDetail}
        />
      );
    }
    return (
      <div className="flex flex-col gap-3">
        <ScreenHeader
          onBack={tutupDetail}
          title="Detail Transaksi Utang"
          subtitle={selected ? kodeTransaksi(selected) : undefined}
          titleClassName="text-[22px]"
        />
        {selected ? (
          bukanUtangAktif ? (
            kartuBukanUtang
          ) : (
            <DebtDetail
              t={selected}
              payments={paymentsQuery.data}
              onBayar={bukaBayar}
              onVoid={bukaVoid}
              split={isMd}
            />
          )
        ) : (
          <div className="flex flex-col gap-3" aria-busy="true">
            {[200, 120, 80].map((h, i) => (
              <div
                key={i}
                style={{ height: h }}
                className="animate-pulse rounded-[16px] bg-surface"
              />
            ))}
          </div>
        )}
        {sheets}
      </div>
    );
  }

  const tombolEkspor = (
    /* Tombol Ekspor Utang (pen): pill h46 surface + garis line */
    <button
      type="button"
      onClick={() => navigate('/laporan/utang')}
      className={cn(
        'press-scale flex items-center justify-center gap-2 rounded-full border border-line bg-surface font-semibold text-primary transition-colors duration-150 ease-out hover:bg-surface-muted',
        isMd ? 'h-11 shrink-0 px-4 text-[13px]' : 'mt-0.5 h-[46px] w-full text-[13.5px]',
      )}
    >
      <Download className="size-4" aria-hidden="true" />
      {isMd ? 'Laporan Utang' : 'Ekspor Laporan Utang'}
    </button>
  );

  const daftar = (
    <>
      {isLoading && (
        <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 lg:flex" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="h-[78px] animate-pulse rounded-[14px] border border-line-soft bg-surface"
            />
          ))}
        </div>
      )}

      {isError && (
        <Card variant="warning" className="items-start">
          <p className="text-sm font-semibold text-warning">Gagal memuat utang.</p>
          <Button variant="secondary" className="mt-1 h-10 px-4 text-xs" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </Card>
      )}

      {/* Kartu Kosong (pen djpJR): surface r16 p[24,20] gap12, ikon 72 */}
      {!isLoading && !isError && debts.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[16px] bg-surface px-5 py-14 text-center">
          <div className="flex size-[72px] items-center justify-center rounded-full bg-surface-muted">
            <Wallet className="size-[30px] text-accent" aria-hidden="true" />
          </div>
          <p className="text-lg font-bold text-primary">Belum ada utang aktif</p>
          <p className="max-w-[280px] text-[13px] leading-normal text-muted">
            Semua transaksi utang sudah lunas atau belum ada transaksi utang.
          </p>
        </div>
      )}

      {!isLoading && !isError && debts.length > 0 && (
        <>
          <div
            className={cn(
              'flex flex-col gap-2.5 md:grid md:grid-cols-2 lg:flex',
              isMd && 'transition-opacity duration-150 ease-out',
              paged.isPlaceholderData && 'opacity-60',
            )}
          >
            {debts.map((t) => (
              <DebtCard
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
              total={jumlahUtang}
              pageSize={PAGE_SIZE}
              onPage={setPage}
              itemLabel="utang"
              busy={paged.isPlaceholderData}
              compact={isLg && !isXl}
            />
          )}
          {!isMd && tombolEkspor}
        </>
      )}
    </>
  );

  const { bisaVoid } = selected ? aturanVoidUtang(selected, paymentsQuery.data) : { bisaVoid: false };

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <ScreenHeader
        eyebrow="UTANG"
        title="Utang Pelanggan"
        info={
          loaded
            ? jumlahUtang > 0
              ? `${jumlahUtang} transaksi belum lunas`
              : 'Belum ada utang aktif'
            : undefined
        }
        action={isMd ? tombolEkspor : undefined}
      />

      {isMd ? (
        <div className="grid grid-cols-3 gap-3">
          <SummaryTile
            tone="warning"
            label="Total utang aktif"
            value={formatRupiah(totalSaldo)}
            hint="Sisa utang dari seluruh transaksi"
          />
          <SummaryTile
            label="Transaksi belum lunas"
            value={loaded ? jumlahUtang : '–'}
            hint="Menunggu pembayaran cicilan"
          />
          <SummaryTile
            label="Rata-rata sisa utang"
            value={loaded && jumlahUtang > 0 ? formatRupiah(Math.round(totalSaldo / jumlahUtang)) : '–'}
            hint="Per transaksi utang aktif"
          />
        </div>
      ) : (
        /* Kartu Ringkasan Utang (pen): surface r16 p16 gap3, nilai 26/700 */
        <div className="flex flex-col gap-[3px] rounded-[16px] bg-surface p-4">
          <span className="text-xs text-muted">Total utang aktif</span>
          <span className="text-[26px] font-bold leading-tight tabular-nums text-primary">
            {formatRupiah(totalSaldo)}
          </span>
          <span className="text-[11.5px] text-muted">Jumlah sisa utang dari seluruh transaksi</span>
        </div>
      )}

      {isLg && !isLoading && !isError && (debts.length > 0 || hasil) ? (
        <div className="flex items-start gap-4 xl:gap-5">
          <div className="flex w-[360px] shrink-0 flex-col gap-2.5 xl:w-[400px]">{daftar}</div>
          <section
            aria-label="Detail utang"
            className="sticky top-6 flex max-h-[calc(100dvh-48px)] min-w-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-line-soft bg-surface"
          >
            {selected && (
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
                <div className="flex min-w-0 flex-col gap-px">
                  <h2 className="truncate text-lg font-bold leading-tight text-primary">
                    {hasil ? 'Pembayaran Tercatat' : 'Detail Transaksi Utang'}
                  </h2>
                  <p className="truncate text-xs text-muted">
                    {kodeTransaksi(selected)}
                    {selected.namaPembeli ? ` · ${selected.namaPembeli}` : ''}
                  </p>
                </div>
                {!hasil && !bukanUtangAktif && (
                  <span className="flex shrink-0 flex-col items-end">
                    <span className="text-[11.5px] text-muted">Sisa utang</span>
                    <span className="text-lg font-bold leading-tight tabular-nums text-danger">
                      {formatRupiah(selected.sisaSaldoUtang ?? 0)}
                    </span>
                  </span>
                )}
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-bg p-4">
              {hasil && selected ? (
                <PembayaranBerhasil
                  inPanel
                  hasil={hasil}
                  onLagi={() => {
                    setHasil(null);
                    setPaymentOpen(true);
                  }}
                  onKembali={() => setHasil(null)}
                  onDaftar={tutupDetail}
                />
              ) : selected ? (
                bukanUtangAktif ? (
                  kartuBukanUtang
                ) : (
                  <DebtDetail
                    t={selected}
                    payments={paymentsQuery.data}
                    onBayar={bukaBayar}
                    onVoid={bukaVoid}
                    split={isXl}
                    showActions={false}
                  />
                )
              ) : (
                <div className="flex flex-col gap-3" aria-busy="true">
                  {[200, 120, 80].map((h, i) => (
                    <div key={i} style={{ height: h }} className="animate-pulse rounded-[16px] bg-surface" />
                  ))}
                </div>
              )}
            </div>
            {selected && !hasil && !bukanUtangAktif && (
              <div className="flex shrink-0 gap-2.5 border-t border-line-soft px-5 py-3.5">
                {bisaVoid && (
                  <Button variant="destructive" className="shrink-0" onClick={bukaVoid}>
                    <Ban className="size-4" aria-hidden="true" />
                    Batalkan Transaksi
                  </Button>
                )}
                <Button className="flex-1" onClick={bukaBayar}>
                  <Wallet className="size-4" aria-hidden="true" />
                  Catat Pembayaran
                </Button>
              </div>
            )}
          </section>
        </div>
      ) : (
        daftar
      )}
      {sheets}
    </div>
  );
}
