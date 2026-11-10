import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useConsignmentReport } from '../api';
import { DateRangePicker, SummaryStat } from './shared';
import { useDefaultMonthRange } from '../utils';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formatRupiah } from '@/lib/money';

/** Laporan Konsinyasi per penitip — TANPA tombol ekspor (SDD §5.8). */
export function LaporanKonsinyasiPage() {
  const navigate = useNavigate();
  const [range, setRange] = useState(useDefaultMonthRange());
  const { data, isLoading, isError, refetch } = useConsignmentReport(range);

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader
        onBack={() => navigate('/laporan/penjualan')}
        title="Konsinyasi"
        subtitle="Laporan per penitip"
      />

      <DateRangePicker range={range} onChange={setRange} />

      {isLoading && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="h-24 animate-pulse rounded-card border border-line-soft bg-surface" />
            <div className="h-24 animate-pulse rounded-card border border-line-soft bg-surface" />
          </div>
          <div className="h-52 animate-pulse rounded-card border border-line-soft bg-surface" />
        </div>
      )}

      {isError && (
        <Card variant="warning" className="items-start">
          <p className="text-sm font-semibold text-warning">Gagal memuat laporan konsinyasi.</p>
          <Button variant="secondary" className="mt-1 h-10 px-4 text-xs" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </Card>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SummaryStat label="Modal periode" value={formatRupiah(data.totalModalPeriode)} />
            <SummaryStat label="Disetor periode" value={formatRupiah(data.totalDisetorPeriode)} />
            <SummaryStat label="Saldo akhir (all-time)" value={formatRupiah(data.totalSaldoAkhir)} accent />
          </div>

          <Card variant="list" className="flex flex-col gap-1.5">
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
              <span>Penitip</span>
              <span className="text-right">Terjual</span>
              <span className="text-right">Saldo akhir</span>
            </div>
            {data.consignors.map((c) => (
              <div
                key={c.consignorId}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t border-line-soft py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-primary">{c.nama}</p>
                  <p className="text-xs text-muted">
                    Modal {formatRupiah(c.modalPeriode)} · Setor {formatRupiah(c.disetorPeriode)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-primary">{formatRupiah(c.terjualPeriode)}</span>
                <span className="text-sm font-bold text-primary">{formatRupiah(c.saldoAkhir)}</span>
              </div>
            ))}
          </Card>

          <p className="text-xs text-muted">
            Saldo akhir dihitung dari seluruh riwayat (all-time), bukan hanya periode ini. Semua penitip
            termasuk nonaktif ditampilkan.
          </p>
        </>
      )}

      <div className="flex">
        <Button variant="secondary" onClick={() => navigate('/laporan/penjualan')}>
          <ArrowLeft className="size-4" aria-hidden="true" /> Kembali ke Penjualan
        </Button>
      </div>
    </div>
  );
}
