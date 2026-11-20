import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Wallet } from 'lucide-react';
import { useDebtReport, exportReportApi } from '../api';
import { ExportSheet, PeriodFilter } from './shared';
import { useDefaultMonthRange } from '../utils';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formatRupiah } from '@/lib/money';
import {
  formatTanggalPendek,
  formatWaktuRelatif,
  kodeTransaksi,
} from '@/features/transactions/utils';

/**
 * Laporan Utang (tambahan; pola visual mengikuti layar Utang gRhkJ + sheet Ekspor t4kIz):
 * periode · total saldo · daftar utang + cicilan · ekspor xlsx/pdf.
 */
export function LaporanUtangPage() {
  const navigate = useNavigate();
  const defaultRange = useDefaultMonthRange();
  const [range, setRange] = useState(defaultRange);
  const [exportOpen, setExportOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useDebtReport(range);

  return (
    <div className="flex flex-col gap-3">
      <ScreenHeader
        onBack={() => (window.history.length > 1 ? navigate(-1) : navigate('/utang'))}
        title="Laporan Utang"
        subtitle="Utang pelanggan per periode"
      />

      <PeriodFilter range={range} onChange={setRange} defaultRange={defaultRange} />

      {isLoading && (
        <div className="flex flex-col gap-2.5" aria-busy="true">
          <div className="h-[96px] animate-pulse rounded-[16px] bg-surface" />
          {[0, 1].map((i) => (
            <div key={i} className="h-[78px] animate-pulse rounded-[14px] bg-surface" />
          ))}
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
          {/* Kartu ringkasan (pola pen Kartu Ringkasan Utang) */}
          <div className="flex flex-col gap-[3px] rounded-[16px] bg-surface p-4">
            <span className="text-xs text-muted">Total saldo utang periode</span>
            <span className="text-[26px] font-bold leading-tight tabular-nums text-primary">
              {formatRupiah(data.totalSaldoUtang)}
            </span>
            <span className="text-[11.5px] text-muted">
              <span className="font-semibold text-primary-soft">{data.debtCount}</span> transaksi
              utang pada periode ini
            </span>
          </div>

          {data.debts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-[16px] bg-surface px-5 py-10 text-center">
              <div className="flex size-[72px] items-center justify-center rounded-full bg-surface-muted">
                <Wallet className="size-[30px] text-accent" aria-hidden="true" />
              </div>
              <p className="text-lg font-bold text-primary">Tidak ada utang</p>
              <p className="max-w-[280px] text-[13px] text-muted">
                Tidak ada transaksi utang pada periode ini.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {data.debts.map((d) => (
                <div
                  key={d.id}
                  className="flex flex-col gap-2 rounded-[14px] border border-line-soft bg-surface p-3"
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-[13px] font-bold text-primary">
                        {d.namaPembeli}
                      </span>
                      <span className="truncate text-[11.5px] text-muted">
                        {kodeTransaksi(d)} · {formatWaktuRelatif(d.tanggal)}
                      </span>
                    </div>
                    <Badge
                      variant={Number(d.sisaSaldoUtang) > 0 ? 'utang' : 'lunas'}
                      label={Number(d.sisaSaldoUtang) > 0 ? 'Utang' : 'Lunas'}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2.5">
                    <span className="text-xs text-muted">Sisa utang</span>
                    <span className="text-[15px] font-bold tabular-nums text-danger">
                      {formatRupiah(d.sisaSaldoUtang)}
                    </span>
                  </div>
                  {d.payments.length > 0 && (
                    <div className="flex flex-col gap-1 rounded-[10px] bg-surface-muted px-2.5 py-2">
                      {d.payments.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between gap-2 text-[11.5px]"
                        >
                          <span className="text-muted">
                            Cicilan {formatTanggalPendek(p.tanggalBayar)}
                          </span>
                          <span className="font-semibold tabular-nums text-primary">
                            {formatRupiah(p.jumlahBayar)} · sisa {formatRupiah(p.saldoSetelahBayar)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <Button
            variant="secondary"
            className="h-[46px] w-full text-[13.5px]"
            onClick={() => setExportOpen(true)}
          >
            <Download className="size-4" aria-hidden="true" />
            Ekspor Laporan Utang
          </Button>
        </>
      )}

      <ExportSheet
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Ekspor Laporan Utang"
        range={range}
        filePrefix="laporan-utang"
        onExport={(format) => exportReportApi('debts', { ...range, format })}
      />
    </div>
  );
}
