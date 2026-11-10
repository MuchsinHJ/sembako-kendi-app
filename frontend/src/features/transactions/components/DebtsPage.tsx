import { useState } from 'react';
import { useDebts, usePaymentHistory, useRecordPayment } from '../api';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextField } from '@/components/TextField';
import { formatRupiah } from '@/lib/money';
import { formatTanggal } from '../utils';
import type { Transaction } from '../types';

/** Modal catat cicilan (BR-14): validasi > 0 dan ≤ sisa. */
function PaymentModal({ transaction, onClose }: { transaction: Transaction; onClose: () => void }) {
  const [jumlah, setJumlah] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const record = useRecordPayment(transaction.id);
  const sisa = Number(transaction.sisaSaldoUtang ?? '0');
  const nominal = Number(jumlah || '0');
  const melebihi = nominal > sisa;

  function onSubmit() {
    setFormError(null);
    if (nominal <= 0) {
      setFormError('Nominal cicilan harus lebih dari Rp0.');
      return;
    }
    record.mutate(nominal, {
      onSuccess: onClose,
      onError: (err) =>
        setFormError(
          err instanceof Error && err.message.includes('melebihi')
            ? `Nominal cicilan melebihi sisa utang. Sisa utang transaksi ini ${formatRupiah(transaction.sisaSaldoUtang)}.`
            : err instanceof Error
              ? err.message
              : 'Gagal mencatat cicilan.'
        ),
    });
  }

  return (
    <Modal open title="Catat Pembayaran" onClose={onClose}>
      <div className="mb-4 flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Sisa utang</span>
          <span className="font-bold text-primary">{formatRupiah(transaction.sisaSaldoUtang)}</span>
        </div>
        {transaction.namaPembeli && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Pembeli</span>
            <span className="font-semibold text-primary">{transaction.namaPembeli}</span>
          </div>
        )}
      </div>
      <TextField
        label="Nominal cicilan"
        inputMode="numeric"
        placeholder="0"
        value={jumlah}
        onChange={(e) => setJumlah(e.target.value.replace(/[^\d.]/g, ''))}
        error={melebihi ? `Nominal cicilan melebihi sisa utang. Sisa utang transaksi ini ${formatRupiah(transaction.sisaSaldoUtang)}.` : undefined}
      />
      {formError && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {formError}
        </p>
      )}
      <div className="mt-5 flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Batal
        </Button>
        <Button className="flex-1" onClick={onSubmit} disabled={record.isPending || melebihi || nominal <= 0}>
          {record.isPending ? 'Menyimpan…' : 'Simpan Cicilan'}
        </Button>
      </div>
    </Modal>
  );
}

/** Modal riwayat cicilan per transaksi. */
function PaymentHistoryModal({ transaction, onClose }: { transaction: Transaction; onClose: () => void }) {
  const { data, isLoading, isError } = usePaymentHistory(transaction.id);

  return (
    <Modal open title="Riwayat Cicilan" onClose={onClose}>
      {isLoading && <p className="text-sm text-muted">Memuat…</p>}
      {isError && <p className="text-sm text-danger">Gagal memuat riwayat cicilan.</p>}
      {data && data.length === 0 && (
        <p className="text-sm text-muted">Belum ada cicilan untuk transaksi ini.</p>
      )}
      {data && data.length > 0 && (
        <div className="flex flex-col">
          {data.map((p) => (
            <div key={p.id} className="flex items-center justify-between border-b border-line-soft py-2.5 last:border-0">
              <div>
                <p className="text-sm font-semibold text-primary">{formatRupiah(p.jumlahBayar)}</p>
                <p className="text-xs text-muted">{formatTanggal(p.tanggalBayar)}</p>
              </div>
              <span className="text-xs text-muted">Sisa {formatRupiah(p.saldoSetelahBayar)}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

/** Layar Utang (SDD §15.1 DIKUNCI: per transaksi, bukan per pembeli). */
export function DebtsPage() {
  const [paymentFor, setPaymentFor] = useState<Transaction | null>(null);
  const [historyFor, setHistoryFor] = useState<Transaction | null>(null);

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useDebts();
  const debts = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader eyebrow="UTANG" title="Utang" info={debts.length > 0 ? `${debts.length} transaksi utang aktif` : undefined} />

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-card-sm border border-line-soft bg-surface" />
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

      {!isLoading && !isError && debts.length === 0 && (
        <Card variant="list" className="flex flex-col items-center gap-1 py-10 text-center">
          <p className="text-sm font-semibold text-primary">Tidak ada utang aktif</p>
          <p className="text-xs text-muted">Semua transaksi sudah lunas.</p>
        </Card>
      )}

      {!isLoading && !isError && debts.length > 0 && (
        <div className="flex flex-col gap-3">
          {debts.map((t) => (
            <Card key={t.id} variant="list" className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-primary">{t.namaPembeli ?? 'Tanpa nama'}</p>
                  <p className="text-xs text-muted">{formatTanggal(t.tanggal)}</p>
                </div>
                <Badge variant="utang" label="Utang" />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted">Sisa utang</p>
                  <p className="text-lg font-bold text-warning">{formatRupiah(t.sisaSaldoUtang)}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="icon" aria-label="Riwayat cicilan" onClick={() => setHistoryFor(t)}>
                    ≡
                  </Button>
                  <Button className="h-11 px-4 text-xs" onClick={() => setPaymentFor(t)}>
                    Catat Pembayaran
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {hasNextPage && (
        <Button variant="secondary" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="self-center">
          {isFetchingNextPage ? 'Memuat…' : 'Muat lebih banyak'}
        </Button>
      )}

      {paymentFor && <PaymentModal transaction={paymentFor} onClose={() => setPaymentFor(null)} />}
      {historyFor && <PaymentHistoryModal transaction={historyFor} onClose={() => setHistoryFor(null)} />}
    </div>
  );
}
