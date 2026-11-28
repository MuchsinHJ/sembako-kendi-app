import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { useConsignmentReport } from '../api';
import { PeriodFilter } from './shared';
import { useClientPage, useDefaultMonthRange } from '../utils';
import { Badge } from '@/components/Badge';
import { Pagination } from '@/components/Pagination';
import { MQ } from '@/lib/breakpoints';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { DataTable, ReportWideHeader, StatCard, Td, WideCard } from './wide';
import type { ReportRange } from '../types';
import type { ConsignmentReport } from '@/features/consignors/types';
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

const PER_HALAMAN = 10;
const KOSONG: ConsignmentReport['consignors'] = [];

function warnaSaldo(saldo: number) {
  return saldo < 0 ? 'text-danger' : saldo === 0 ? 'text-muted' : 'text-primary';
}

/** Laporan Konsinyasi md+ (canvas kSUlr / EzMWg): ringkasan sebaris + tabel per penitip berpaginasi. */
function KonsinyasiWide({
  range,
  setRange,
  defaultRange,
  data,
  isLoading,
  isError,
  onRetry,
}: {
  range: ReportRange;
  setRange: (r: ReportRange) => void;
  defaultRange: ReportRange;
  data: ConsignmentReport | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const tabel = useClientPage(data?.consignors ?? KOSONG, PER_HALAMAN);
  return (
    <div className="flex flex-col gap-4">
      <ReportWideHeader
        title="Laporan Konsinyasi"
        subtitle="Rekap penjualan titipan dan kewajiban per penitip"
        range={range}
        onRange={setRange}
        defaultRange={defaultRange}
      />
      {isLoading && (
        <div className="grid grid-cols-3 gap-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'h-[100px] animate-pulse rounded-[18px]',
                i === 0 ? 'bg-primary/10' : 'bg-surface',
              )}
            />
          ))}
        </div>
      )}
      {isError && (
        <Card variant="warning" className="items-start">
          <p className="text-sm font-semibold text-warning">Gagal memuat laporan konsinyasi.</p>
          <Button variant="secondary" className="mt-1 h-10 px-4 text-xs" onClick={onRetry}>
            Coba lagi
          </Button>
        </Card>
      )}
      {data && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              tone="dark"
              label="Tambahan kewajiban periode"
              value={formatRupiah(data.totalModalPeriode)}
              hint="Modal titipan yang terjual"
            />
            <StatCard
              label="Sudah disetor periode"
              value={formatRupiah(data.totalDisetorPeriode)}
              hint="Setoran ke penitip"
            />
            <StatCard
              label="Saldo akhir (all-time)"
              value={formatRupiah(data.totalSaldoAkhir)}
              hint="Dari seluruh riwayat"
            />
          </div>
          <WideCard title="Per penitip" aside={`${data.consignors.length} penitip`}>
            {data.consignors.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-muted">Belum ada penitip.</p>
            ) : (
              <>
                <DataTable
                  minWidth={640}
                  head={[
                    { label: 'Penitip' },
                    { label: 'Penjualan', align: 'right' },
                    { label: 'Kewajiban periode', align: 'right' },
                    { label: 'Disetor periode', align: 'right' },
                    { label: 'Saldo akhir', align: 'right' },
                  ]}
                >
                  {tabel.rows.map((c) => {
                    const saldo = Number(c.saldoAkhir);
                    return (
                      <tr
                        key={c.consignorId}
                        className="transition-colors duration-150 ease-out hover:bg-surface-muted/60"
                      >
                        <Td>
                          <span className="flex items-center gap-2">
                            <Link
                              to={`/penitip/${c.consignorId}`}
                              className="truncate font-semibold hover:underline"
                            >
                              {c.nama}
                            </Link>
                            {c.status === 'NONAKTIF' && (
                              <Badge variant="netral" label="Nonaktif" dot={false} />
                            )}
                          </span>
                        </Td>
                        <Td right>{formatRupiah(c.terjualPeriode)}</Td>
                        <Td right>{formatRupiah(c.modalPeriode)}</Td>
                        <Td right>{formatRupiah(c.disetorPeriode)}</Td>
                        <Td right className={cn('font-bold', warnaSaldo(saldo))}>
                          {formatRupiah(c.saldoAkhir)}
                        </Td>
                      </tr>
                    );
                  })}
                </DataTable>
                <Pagination
                  page={tabel.page}
                  totalPages={tabel.totalPages}
                  total={data.consignors.length}
                  pageSize={PER_HALAMAN}
                  onPage={tabel.setPage}
                  itemLabel="penitip"
                />
              </>
            )}
          </WideCard>
          <div className="flex items-center gap-2 rounded-[12px] bg-surface-muted px-3 py-2.5">
            <Info className="size-4 shrink-0 text-muted" aria-hidden="true" />
            <p className="text-[12.5px] text-muted">
              Saldo akhir dihitung dari seluruh riwayat, bukan hanya periode ini. Laporan konsinyasi
              tidak bisa diekspor; semua penitip ikut tampil, termasuk yang nonaktif.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/** Laporan Konsinyasi (pen t2Nfa) — per penitip, TANPA ekspor (SDD §5.8). */
export function LaporanKonsinyasiPage() {
  const navigate = useNavigate();
  const isMd = useMediaQuery(MQ.md);
  const defaultRange = useDefaultMonthRange();
  const [range, setRange] = useState(defaultRange);
  const { data, isLoading, isError, refetch } = useConsignmentReport(range);
  if (isMd) {
    return (
      <KonsinyasiWide
        range={range}
        setRange={setRange}
        defaultRange={defaultRange}
        data={data}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
      />
    );
  }

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
