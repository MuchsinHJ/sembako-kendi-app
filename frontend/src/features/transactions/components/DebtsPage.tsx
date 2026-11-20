import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Ban, Check, ChevronRight, Download, Info, Wallet } from 'lucide-react';
import {
  useDebts,
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

function DebtDetail({
  t,
  payments,
  onBayar,
  onVoid,
}: {
  t: Transaction;
  payments: Payment[] | undefined;
  onBayar: () => void;
  onVoid: () => void;
}) {
  const totalCicilan = (payments ?? []).reduce((s, p) => s + Number(p.jumlahBayar), 0);
  const adaCicilan = (payments?.length ?? 0) > 0;
  const dalam24Jam = hitungSisaVoid(t.createdAt);
  // BR-13 + aturan BE: void hanya ≤24 jam DAN belum ada cicilan.
  const bisaVoid = payments !== undefined && dalam24Jam && !adaCicilan;
  const alasanTidakBisa = adaCicilan
    ? dalam24Jam
      ? 'Transaksi ini tidak bisa dibatalkan karena sudah ada pembayaran cicilan.'
      : 'Transaksi ini tidak bisa dibatalkan karena sudah ada pembayaran cicilan, dan batas 24 jam juga sudah terlewat.'
    : 'Transaksi ini tidak bisa dibatalkan karena batas 24 jam sudah terlewat.';

  return (
    <div className="flex flex-col gap-3">
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

      <Button className="h-11 w-full" onClick={onBayar}>
        Catat Pembayaran
      </Button>
      {bisaVoid && (
        <Button variant="destructive" className="w-full" onClick={onVoid}>
          <Ban className="size-4" aria-hidden="true" />
          Batalkan Transaksi
        </Button>
      )}
    </div>
  );
}

/* ─── Pembayaran Berhasil (pen O9Gj9 masih utang / dn9gD lunas) ───────────── */

function PembayaranBerhasil({
  hasil,
  onLagi,
  onKembali,
  onDaftar,
}: {
  hasil: HasilBayar;
  onLagi: () => void;
  onKembali: () => void;
  onDaftar: () => void;
}) {
  const lunas = hasil.sesudah <= 0;
  const nama = hasil.nama ?? 'pembeli';
  return (
    <div className="flex min-h-[calc(100dvh-148px)] flex-col items-center justify-center gap-[18px] pb-6 text-center">
      <div className="flex size-[72px] items-center justify-center rounded-full bg-success-soft">
        <Check className="size-[34px] text-primary-soft" aria-hidden="true" />
      </div>
      <div role="status" className="flex flex-col items-center gap-1.5">
        <h1 className="text-[25px] font-bold text-primary">Pembayaran tercatat</h1>
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

/**
 * Layar Utang (pen gRhkJ). Mobile: daftar → Detail Transaksi Utang layar penuh (`?trx=`)
 * → sheet Catat Pembayaran → dialog konfirmasi → layar Pembayaran tercatat.
 * lg+: master-detail.
 */
export function DebtsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('trx');
  const isLg = useMediaQuery('(min-width: 1024px)');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [hasil, setHasil] = useState<HasilBayar | null>(null);

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useDebts();
  const summary = useDashboardSummary();
  const debts = data?.pages.flatMap((p) => p.data) ?? [];
  const jumlahUtang = data?.pages[0]?.pagination.total ?? debts.length;
  // Total utang aktif seluruh transaksi (dashboard), tidak hanya halaman yang termuat.
  const totalSaldo = summary.data
    ? Number(summary.data.totalSaldoUtang)
    : debts.reduce((s, t) => s + Number(t.sisaSaldoUtang ?? '0'), 0);

  const detailQuery = useTransaction(selectedId ?? '');
  const selected = detailQuery.data ?? debts.find((t) => t.id === selectedId) ?? null;
  const paymentsQuery = usePaymentHistory(selectedId ?? '');
  const voidMut = useVoidTransaction(selectedId ?? '');
  const [voidError, setVoidError] = useState<string | null>(null);

  function bukaDetail(id: string) {
    setHasil(null);
    setSearchParams({ trx: id }, { state: { debtDetail: true }, replace: isLg && !!selectedId });
  }
  function tutupDetail() {
    setHasil(null);
    if ((location.state as { debtDetail?: boolean } | null)?.debtDetail) navigate(-1);
    else setSearchParams({}, { replace: true });
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

  /* Mobile: layar Berhasil / Detail */
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
          selected.statusPembayaran === 'LUNAS' || selected.statusTransaksi === 'DIBATALKAN' ? (
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
          ) : (
            <DebtDetail
              t={selected}
              payments={paymentsQuery.data}
              onBayar={() => setPaymentOpen(true)}
              onVoid={() => {
                setVoidError(null);
                setVoidOpen(true);
              }}
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

  return (
    <div className="flex flex-col gap-3">
      <ScreenHeader
        eyebrow="UTANG"
        title="Utang Pelanggan"
        info={
          data
            ? jumlahUtang > 0
              ? `${jumlahUtang} transaksi belum lunas`
              : 'Belum ada utang aktif'
            : undefined
        }
      />

      {/* Kartu Ringkasan Utang (pen): surface r16 p16 gap3, nilai 26/700 */}
      <div className="flex flex-col gap-[3px] rounded-[16px] bg-surface p-4">
        <span className="text-xs text-muted">Total utang aktif</span>
        <span className="text-[26px] font-bold leading-tight tabular-nums text-primary">
          {formatRupiah(totalSaldo)}
        </span>
        <span className="text-[11.5px] text-muted">Jumlah sisa utang dari seluruh transaksi</span>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2.5" aria-busy="true">
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-2.5 lg:max-w-[42%]">
            {debts.map((t) => {
              const aktif = isLg && selectedId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => bukaDetail(t.id)}
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
            })}

            {hasNextPage && (
              <Button
                variant="secondary"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="self-center"
              >
                {isFetchingNextPage ? 'Memuat…' : 'Muat lebih banyak'}
              </Button>
            )}

            {/* Tombol Ekspor Utang (pen): pill h46 surface + garis line */}
            <button
              type="button"
              onClick={() => navigate('/laporan/utang')}
              className="press-scale mt-0.5 flex h-[46px] w-full items-center justify-center gap-2 rounded-full border border-line bg-surface text-[13.5px] font-semibold text-primary transition-colors duration-150 ease-out hover:bg-surface-muted"
            >
              <Download className="size-4" aria-hidden="true" />
              Ekspor Laporan Utang
            </button>
          </div>

          {isLg && (
            <div className="flex-1">
              <div className="sticky top-6 rounded-card border border-line-soft bg-surface-muted p-5">
                {hasil && selected ? (
                  <PembayaranBerhasil
                    hasil={hasil}
                    onLagi={() => {
                      setHasil(null);
                      setPaymentOpen(true);
                    }}
                    onKembali={() => setHasil(null)}
                    onDaftar={tutupDetail}
                  />
                ) : selected ? (
                  <DebtDetail
                    t={selected}
                    payments={paymentsQuery.data}
                    onBayar={() => setPaymentOpen(true)}
                    onVoid={() => {
                      setVoidError(null);
                      setVoidOpen(true);
                    }}
                  />
                ) : (
                  <p className="py-8 text-center text-sm text-muted">
                    Pilih transaksi utang untuk melihat detail.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {sheets}
    </div>
  );
}
