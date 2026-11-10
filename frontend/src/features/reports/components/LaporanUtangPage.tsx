import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useDebtReport, exportReportApi } from '../api';
import { DateRangePicker, ExportButtons, SummaryStat } from './shared';
import { useDefaultMonthRange } from '../utils';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formatRupiah } from '@/lib/money';
import { formatTanggal } from '@/features/transactions/utils';

/** Laporan Utang: ringkasan + daftar utang + riwayat cicilan + ekspor. */
export function LaporanUtangPage() {
  const navigate = useNavigate();
  const [range, setRange] = useState(useDefaultMonthRange());
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null);

  const { data, isLoading, isError, refetch } = useDebtReport(range);

  async function onExport(format: 'xlsx' | 'pdf') {
    setExporting(format);
    try {
      await exportReportApi('debts', { ...range, format });
    } catch {
      // Gagal unduh.
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader
        onBack={() => navigate('/laporan/penjualan')}
        title="Utang"
        subtitle="Laporan utang periode"
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
          <p className="text-sm font-semibold text-warning">Gagal memuat laporan utang.</p>
          <Button variant="secondary" className="mt-1 h-10 px-4 text-xs" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </Card>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SummaryStat label="Total saldo utang" value={formatRupiah(data.totalSaldoUtang)} accent />
            <SummaryStat label="Jumlah utang" value={String(data.debtCount)} />
          </div>

          <ExportButtons downloading={exporting !== null} onExport={onExport} />

          <Card variant="list" className="flex flex-col gap-2">
            {data.debts.length === 0 ? (
              <p className="text-xs text-muted">Tidak ada utang pada periode ini.</p>
            ) : (
              data.debts.map((d) => (
                <div key={d.id} className="flex flex-col gap-1.5 border-b border-line-soft py-2.5 last:border-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-primary">{d.namaPembeli}</p>
                      <p className="text-xs text-muted">
                        {formatTanggal(d.tanggal)} · {d.id}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-warning">{formatRupiah(d.sisaSaldoUtang)}</span>
                  </div>
                  {d.payments.length > 0 && (
                    <div className="flex flex-col gap-1 border-t border-line-soft pt-1.5">
                      {d.payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-xs">
                          <span className="text-muted">Cicilan {formatTanggal(p.tanggalBayar)}</span>
                          <span className="font-medium text-primary">
                            {formatRupiah(p.jumlahBayar)} · sisa {formatRupiah(p.saldoSetelahBayar)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </Card>
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
