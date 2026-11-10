import { useState } from 'react';
import { useTransactions, useVoidTransaction } from '../api';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedFilter } from '@/components/SegmentedFilter';
import { formatRupiah } from '@/lib/money';
import { formatTanggal, hitungSisaVoid } from '../utils';
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

/** Detail kanan (master-detail md+). */
function DetailPanel({ t, onVoid }: { t: Transaction; onVoid: (t: Transaction) => void }) {
  const dibatalkan = t.statusTransaksi === 'DIBATALKAN';
  const bisaVoid = !dibatalkan && hitungSisaVoid(t.createdAt);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold text-primary">{formatRupiah(t.total)}</p>
          <p className="text-xs text-muted">
            {formatTanggal(t.tanggal)}
            {t.namaPembeli && ` · ${t.namaPembeli}`}
          </p>
        </div>
        {dibatalkan ? (
          <Badge variant="netral" label="Dibatalkan" />
        ) : (
          <Badge variant={t.statusPembayaran === 'LUNAS' ? 'lunas' : 'utang'} label={t.statusPembayaran === 'LUNAS' ? 'Lunas' : 'Utang'} />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {t.items.map((i) => (
          <div key={i.productId} className="flex items-center justify-between border-b border-line-soft pb-1.5 last:border-0">
            <span className="text-sm text-primary">
              {i.namaProdukSnapshot} ×{i.jumlah}
            </span>
            <span className="text-sm font-semibold text-primary">{formatRupiah(i.subtotal)}</span>
          </div>
        ))}
      </div>

      {!dibatalkan && t.statusPembayaran === 'LUNAS' && t.kembalian && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Kembalian</span>
          <span className="font-semibold text-primary">{formatRupiah(t.kembalian)}</span>
        </div>
      )}
      {!dibatalkan && t.statusPembayaran === 'UTANG' && t.sisaSaldoUtang && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Sisa utang</span>
          <span className="font-semibold text-warning">{formatRupiah(t.sisaSaldoUtang)}</span>
        </div>
      )}

      {bisaVoid && (
        <Button variant="destructive" className="h-11 px-4 text-xs" onClick={() => onVoid(t)}>
          Batalkan Transaksi
        </Button>
      )}
    </div>
  );
}

/** Layar Riwayat (03) — mobile: daftar; md+: master-detail (±42/58). */
export function RiwayatPage() {
  const [status, setStatus] = useState<StatusFilter>('SEMUA');
  const [voidFor, setVoidFor] = useState<Transaction | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Rentang default dihitung sekali per mount agar query key stabil.
  const [range] = useState(() => {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
  });

  const filters = {
    ...range,
    ...(status !== 'SEMUA' ? { statusPembayaran: status as PaymentStatus } : {}),
  };

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTransactions(filters);
  const transactions = data?.pages.flatMap((p) => p.data) ?? [];
  const selected = transactions.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader eyebrow="RIWAYAT" title="Riwayat Transaksi" info="30 hari terakhir" />

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
        <Card variant="list" className="flex flex-col items-center gap-1 py-10 text-center">
          <p className="text-sm font-semibold text-primary">Tidak ada transaksi</p>
          <p className="text-xs text-muted">Tidak ada transaksi pada rentang 30 hari terakhir.</p>
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
                  className={`flex flex-col gap-2 lg:cursor-pointer ${aktif ? 'border-accent' : ''}`}
                  onClick={() => setSelectedId(t.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-primary">
                        {t.items.map((i) => `${i.namaProdukSnapshot} ×${i.jumlah}`).join(', ')}
                      </p>
                      <p className="text-xs text-muted">
                        {formatTanggal(t.tanggal)}
                        {t.namaPembeli && ` · ${t.namaPembeli}`}
                      </p>
                    </div>
                    {dibatalkan ? (
                      <Badge variant="netral" label="Dibatalkan" />
                    ) : (
                      <Badge variant={t.statusPembayaran === 'LUNAS' ? 'lunas' : 'utang'} label={t.statusPembayaran === 'LUNAS' ? 'Lunas' : 'Utang'} />
                    )}
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-muted">Total</p>
                      <p className="text-lg font-bold text-primary">{formatRupiah(t.total)}</p>
                      {t.statusPembayaran === 'LUNAS' && t.kembalian && (
                        <p className="text-xs text-muted">Kembalian {formatRupiah(t.kembalian)}</p>
                      )}
                      {t.statusPembayaran === 'UTANG' && t.sisaSaldoUtang && (
                        <p className="text-xs text-warning">Sisa utang {formatRupiah(t.sisaSaldoUtang)}</p>
                      )}
                    </div>
                    {bisaVoid && (
                      <Button variant="destructive" className="h-11 px-4 text-xs lg:hidden" onClick={() => setVoidFor(t)}>
                        Batalkan
                      </Button>
                    )}
                  </div>
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
                <DetailPanel t={selected} onVoid={setVoidFor} />
              ) : (
                <p className="py-8 text-center text-sm text-muted">Pilih transaksi untuk melihat detail.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {voidFor && <VoidConfirmModal transactionId={voidFor.id} onClose={() => setVoidFor(null)} />}
    </div>
  );
}
