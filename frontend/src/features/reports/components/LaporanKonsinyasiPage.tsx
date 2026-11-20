import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { useConsignmentReport } from '../api';
import { PeriodFilter } from './shared';
import { useDefaultMonthRange } from '../utils';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formatRupiah } from '@/lib/money';
import { cn } from '@/lib/cn';

function Metrik({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-px">
      <span className="text-[10px] text-muted">{label}</span>
      <span className="truncate text-xs font-semibold tabular-nums text-primary-soft">{value}</span>
    </div>
  );
}

/** Laporan Konsinyasi (pen t2Nfa) — per penitip, TANPA ekspor (SDD §5.8). */
export function LaporanKonsinyasiPage() {
  const navigate = useNavigate();
  const defaultRange = useDefaultMonthRange();
  const [range, setRange] = useState(defaultRange);
  const { data, isLoading, isError, refetch } = useConsignmentReport(range);

  return (
    <div className="flex flex-col gap-2.5">
      <ScreenHeader
        onBack={() => navigate('/laporan/penjualan')}
        title="Laporan Konsinyasi"
        titleClassName="text-[21px]"
        subtitle="Rekap penjualan titipan per penitip"
      />

      <PeriodFilter
        range={range}
        onChange={setRange}
        defaultRange={defaultRange}
        label="Periode"
        compact
      />
      <p className="text-[11px] text-muted">
        Saldo akhir dihitung dari seluruh riwayat (all-time), bukan hanya periode ini.
      </p>

      {isLoading && (
        <div className="flex flex-col gap-2" aria-busy="true">
          <div className="h-[84px] animate-pulse rounded-[16px] bg-primary/10" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[92px] animate-pulse rounded-[14px] bg-surface" />
          ))}
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
          {/* Ringkasan Periode (pen): primary r16 p[12,14] gap2 */}
          <div className="flex flex-col gap-0.5 rounded-[16px] bg-primary px-3.5 py-3">
            <span className="text-[11.5px] text-accent-soft">Tambahan kewajiban periode ini</span>
            <span className="text-2xl font-bold leading-tight tabular-nums text-bg">
              {formatRupiah(data.totalModalPeriode)}
            </span>
            <span className="text-[11px] text-accent-soft">
              Sudah disetor {formatRupiah(data.totalDisetorPeriode)} · saldo akhir all-time{' '}
              {formatRupiah(data.totalSaldoAkhir)}
            </span>
          </div>

          {/* Daftar per penitip (pen Baris Laporan): surface r14 p12 gap8 */}
          <div className="flex flex-col gap-2">
            {data.consignors.length === 0 && (
              <p className="rounded-[14px] bg-surface p-4 text-center text-xs text-muted">
                Belum ada penitip.
              </p>
            )}
            {data.consignors.map((c) => {
              const saldo = Number(c.saldoAkhir);
              return (
                <div
                  key={c.consignorId}
                  className="flex flex-col gap-2 rounded-[14px] border border-line-soft bg-surface p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-col gap-px">
                      <span className="truncate text-[13.5px] font-semibold text-primary">
                        {c.nama}
                      </span>
                      <span className="text-[11px] text-muted">
                        {c.status === 'NONAKTIF' ? 'Penitip nonaktif' : 'Penitip aktif'}
                      </span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-px">
                      <span className="text-[10px] text-muted">Saldo akhir</span>
                      <span
                        className={cn(
                          'text-sm font-bold tabular-nums',
                          saldo < 0 ? 'text-danger' : saldo === 0 ? 'text-muted' : 'text-primary',
                        )}
                      >
                        {formatRupiah(c.saldoAkhir)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Metrik label="Penjualan" value={formatRupiah(c.terjualPeriode)} />
                    <Metrik label="Kewajiban periode" value={formatRupiah(c.modalPeriode)} />
                    <Metrik label="Disetor periode" value={formatRupiah(c.disetorPeriode)} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Catatan Tanpa Ekspor (pen): surface-muted r12 p8 */}
          <div className="flex items-center gap-2 rounded-[12px] bg-surface-muted p-2">
            <Info className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
            <p className="text-[11px] text-muted">
              Laporan konsinyasi tidak bisa diekspor. Semua penitip ikut tampil, termasuk yang
              nonaktif.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
