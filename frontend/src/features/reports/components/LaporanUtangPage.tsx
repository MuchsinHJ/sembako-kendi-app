import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, Wallet } from 'lucide-react';
import { useDebtReport, exportReportApi } from '../api';
import { ExportSheet, PeriodFilter } from './shared';
import { useClientPage, useDefaultMonthRange } from '../utils';
import { Pagination } from '@/components/Pagination';
import { MQ } from '@/lib/breakpoints';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { cn } from '@/lib/cn';
import { DataTable, ReportWideHeader, StatCard, Td, WideCard } from './wide';
import type { DebtReport, ReportRange } from '../types';
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

const PER_HALAMAN = 10;
const KOSONG: DebtReport['debts'] = [];

/**
 * Laporan Utang md+ (tidak ada desain di .pen): ringkasan sebaris + tabel utang periode
 * berpaginasi; kolom cicilan menampilkan jumlah & total bayar, baris membuka detail di Riwayat.
 */
function UtangWide({
  range,
  setRange,
  defaultRange,
  data,
  isLoading,
  isError,
  onRetry,
  onExport,
}: {
  range: ReportRange;
  setRange: (r: ReportRange) => void;
  defaultRange: ReportRange;
  data: DebtReport | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onExport: () => void;
}) {
  const debts = data?.debts ?? KOSONG;
  const tabel = useClientPage(debts, PER_HALAMAN);
  const totalDibayar = debts.reduce(
    (s, d) => s + d.payments.reduce((x, p) => x + Number(p.jumlahBayar), 0),
    0,
  );
  const lunas = debts.filter((d) => Number(d.sisaSaldoUtang) <= 0).length;
  return (
    <div className="flex flex-col gap-4">
      <ReportWideHeader
        title="Laporan Utang"
        subtitle="Utang pelanggan, cicilan, dan sisa saldo per periode"
        range={range}
        onRange={setRange}
        defaultRange={defaultRange}
        onExport={onExport}
        exportDisabled={!data}
      />
      {isLoading && (
        <div className="grid grid-cols-3 gap-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[100px] animate-pulse rounded-[18px] bg-surface" />
          ))}
        </div>
      )}
      {isError && (
        <Card variant="warning" className="items-start">
          <p className="text-sm font-semibold text-warning">Gagal memuat laporan utang.</p>
          <Button variant="secondary" className="mt-1 h-10 px-4 text-xs" onClick={onRetry}>
            Coba lagi
          </Button>
        </Card>
      )}
      {data && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              tone="warning"
              label="Total saldo utang periode"
              value={formatRupiah(data.totalSaldoUtang)}
              hint={`${data.debtCount} transaksi utang`}
            />
            <StatCard
              label="Cicilan diterima"
              value={formatRupiah(totalDibayar)}
              hint="Dari transaksi utang periode ini"
            />
            <StatCard
              label="Sudah lunas"
              value={`${lunas} / ${debts.length}`}
              hint="Transaksi utang terlunasi"
            />
          </div>
          <WideCard title="Daftar utang" aside={`${debts.length} transaksi`}>
            {debts.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
                <div className="flex size-[72px] items-center justify-center rounded-full bg-surface-muted">
                  <Wallet className="size-[30px] text-accent" aria-hidden="true" />
                </div>
                <p className="text-lg font-bold text-primary">Tidak ada utang</p>
                <p className="max-w-[280px] text-[13px] text-muted">
                  Tidak ada transaksi utang pada periode ini.
                </p>
              </div>
            ) : (
              <>
                <DataTable
                  minWidth={640}
                  head={[
                    { label: 'Pembeli' },
                    { label: 'Tanggal' },
                    { label: 'Total', align: 'right' },
                    { label: 'Cicilan', align: 'right' },
                    { label: 'Sisa utang', align: 'right' },
                    { label: 'Status' },
                  ]}
                >
                  {tabel.rows.map((d) => {
                    const sisa = Number(d.sisaSaldoUtang);
                    const dibayar = d.payments.reduce((x, p) => x + Number(p.jumlahBayar), 0);
                    return (
                      <tr
                        key={d.id}
                        className="transition-colors duration-150 ease-out hover:bg-surface-muted/60"
                      >
                        <Td>
                          <span className="flex min-w-0 flex-col gap-px py-1.5">
                            <Link
                              to={sisa > 0 ? `/utang?trx=${d.id}` : `/riwayat?trx=${d.id}`}
                              className="truncate font-semibold hover:underline"
                            >
                              {d.namaPembeli}
                            </Link>
                            <span className="text-xs text-muted">{kodeTransaksi(d)}</span>
                          </span>
                        </Td>
                        <Td className="whitespace-nowrap text-muted">
                          {formatTanggalPendek(d.tanggal)}
                        </Td>
                        <Td right>{formatRupiah(d.total)}</Td>
                        <Td right>
                          <span className="flex flex-col items-end gap-px">
                            <span>{formatRupiah(dibayar)}</span>
                            <span className="text-xs text-muted">{d.payments.length}× bayar</span>
                          </span>
                        </Td>
                        <Td
                          right
                          className={cn('font-bold', sisa > 0 ? 'text-danger' : 'text-muted')}
                        >
                          {formatRupiah(d.sisaSaldoUtang)}
                        </Td>
                        <Td>
                          <Badge
                            variant={sisa > 0 ? 'utang' : 'lunas'}
                            label={sisa > 0 ? 'Utang' : 'Lunas'}
                          />
                        </Td>
                      </tr>
                    );
                  })}
                </DataTable>
                <Pagination
                  page={tabel.page}
                  totalPages={tabel.totalPages}
                  total={debts.length}
                  pageSize={PER_HALAMAN}
                  onPage={tabel.setPage}
                  itemLabel="utang"
                />
              </>
            )}
          </WideCard>
        </>
      )}
    </div>
  );
}

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
  const isMd = useMediaQuery(MQ.md);
  if (isMd) {
    return (
      <>
        <UtangWide
          range={range}
          setRange={setRange}
          defaultRange={defaultRange}
          data={data}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          onExport={() => setExportOpen(true)}
        />
        <ExportSheet
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          title="Ekspor Laporan Utang"
          range={range}
          filePrefix="laporan-utang"
          onExport={(format) => exportReportApi('debts', { ...range, format })}
        />
      </>
    );
  }

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
