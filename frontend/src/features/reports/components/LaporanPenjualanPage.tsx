import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, Handshake } from 'lucide-react';
import { useProductTrend, useSalesReport, exportReportApi } from '../api';
import { ExportSheet, PeriodFilter } from './shared';
import { useClientPage, useDefaultMonthRange } from '../utils';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formatRupiah } from '@/lib/money';
import { dariIso, keIso } from '@/lib/date';
import { cn } from '@/lib/cn';
import { formatWaktuRelatif } from '@/features/transactions/utils';
import { Badge } from '@/components/Badge';
import { Pagination } from '@/components/Pagination';
import { MQ } from '@/lib/breakpoints';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { DataTable, ReportWideHeader, StatCard, Td, WideCard } from './wide';
import type { ReportRange, SalesReport } from '../types';

const BULAN_PENDEK = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];
const MAKS_HARI_TREN = 7;
const TINGGI_BATANG = 48;

/** Omzet per hari dari daftar transaksi laporan — maks. 7 hari terakhir periode. */
function trenHarian(report: SalesReport, endDate: string, maks = MAKS_HARI_TREN) {
  const perHari = new Map<string, number>();
  for (const t of report.transactions) {
    const key = keIso(new Date(t.tanggal));
    perHari.set(key, (perHari.get(key) ?? 0) + Number(t.total));
  }
  // Jendela berakhir di hari penjualan terakhir dalam periode (bukan tanggal akhir),
  // supaya periode yang ujungnya sepi tetap menampilkan tren.
  const hariTerakhir = [...perHari.keys()]
    .filter((k) => k <= endDate)
    .sort()
    .pop();
  if (!hariTerakhir) return [];
  const akhir = dariIso(hariTerakhir);
  const hari = Array.from({ length: maks }, (_, i) => {
    const d = new Date(akhir.getFullYear(), akhir.getMonth(), akhir.getDate() - (maks - 1 - i));
    const key = keIso(d);
    return {
      key,
      label: `${d.getDate()} ${BULAN_PENDEK[d.getMonth()]}`,
      nilai: perHari.get(key) ?? 0,
    };
  });
  // Buang hari kosong di awal agar grafik fokus pada hari yang ada penjualan.
  const pertama = hari.findIndex((h) => h.nilai > 0);
  return pertama === -1 ? [] : hari.slice(Math.min(pertama, maks - 4));
}

const TREN_WIDE_HARI = 14;
const TREN_WIDE_TINGGI = 150;
const TRX_PER_HALAMAN = 8;
const KOSONG: SalesReport['transactions'] = [];

/** Label sumbu ringkas md+: nomor tanggal, nama bulan hanya di batang pertama / tanggal 1. */
function labelRingkas(key: string, i: number) {
  const d = dariIso(key);
  return i === 0 || d.getDate() === 1 ? ` ` : String(d.getDate());
}

function persen(bagian: number, total: number) {
  return total > 0 ? Math.round((bagian / total) * 100) : 0;
}

/**
 * Laporan Penjualan md+ (canvas a37Knc / BU7uA, ditingkatkan): kartu metrik sebaris,
 * tren 14 hari berlabel ≥11.5px, rincian tipe dengan proporsi, terlaris | tabel transaksi berpaginasi.
 */
function PenjualanWide({
  range,
  setRange,
  defaultRange,
  onExport,
}: {
  range: ReportRange;
  setRange: (r: ReportRange) => void;
  defaultRange: ReportRange;
  onExport: () => void;
}) {
  const sales = useSalesReport(range);
  const trend = useProductTrend(range);
  const tren = useMemo(
    () => (sales.data ? trenHarian(sales.data, range.endDate, TREN_WIDE_HARI) : []),
    [sales.data, range.endDate],
  );
  const maks = Math.max(1, ...tren.map((t) => t.nilai));
  const d = sales.data;
  const omzet = Number(d?.omzet ?? 0);
  const profit = Number(d?.profit ?? 0);
  const trx = useClientPage(d?.transactions ?? KOSONG, TRX_PER_HALAMAN);

  return (
    <div className="flex flex-col gap-4">
      <ReportWideHeader
        title="Laporan Penjualan"
        subtitle="Omzet, profit, tren harian, dan produk terlaris per periode"
        range={range}
        onRange={setRange}
        defaultRange={defaultRange}
        onExport={onExport}
        exportDisabled={!d}
      />

      {sales.isLoading && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
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
      {sales.isError && (
        <Card variant="warning" className="items-start">
          <p className="text-sm font-semibold text-warning">Gagal memuat laporan penjualan.</p>
          <Button
            variant="secondary"
            className="mt-1 h-10 px-4 text-xs"
            onClick={() => sales.refetch()}
          >
            Coba lagi
          </Button>
        </Card>
      )}

      {d && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              tone="dark"
              label="Total omzet"
              value={formatRupiah(d.omzet)}
              hint={`${d.transactionCount} transaksi aktif`}
            />
            <StatCard
              label="Estimasi profit"
              value={formatRupiah(d.profit)}
              hint="Setelah harga modal"
            />
            <StatCard
              label="Rata-rata / transaksi"
              value={formatRupiah(d.transactionCount > 0 ? omzet / d.transactionCount : 0)}
              hint={`Dari ${d.transactionCount} transaksi`}
            />
            <StatCard
              label="Margin profit"
              value={`${persen(profit, omzet)}%`}
              hint="Profit dibanding omzet"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <WideCard title="Tren penjualan" aside="per hari · Rp ribu" className="lg:col-span-3">
              {tren.length === 0 ? (
                <p className="py-10 text-center text-[13px] text-muted">
                  Belum ada penjualan pada periode ini.
                </p>
              ) : (
                <div
                  className="flex items-end justify-between gap-2"
                  role="img"
                  aria-label="Grafik omzet harian"
                >
                  {tren.map((t, i) => (
                    <div
                      key={t.key}
                      className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
                    >
                      <span className="min-h-4 text-[11.5px] font-medium tabular-nums text-muted">
                        {t.nilai > 0 ? Math.round(t.nilai / 1000).toLocaleString('id-ID') : ''}
                      </span>
                      <span
                        className={cn(
                          'w-full max-w-10 rounded-[8px]',
                          i === tren.length - 1 ? 'bg-primary' : 'bg-accent-soft',
                        )}
                        style={{
                          height: Math.max(4, Math.round((t.nilai / maks) * TREN_WIDE_TINGGI)),
                        }}
                      />
                      <span className="whitespace-nowrap text-[11.5px] tabular-nums text-muted">
                        {labelRingkas(t.key, i)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </WideCard>

            <WideCard title="Rincian per tipe produk" className="lg:col-span-2">
              {(
                [
                  ['Milik Sendiri', 'Produk toko', d.perTipe.MILIK_SENDIRI, 'bg-primary'],
                  ['Titipan', 'Konsinyasi penitip', d.perTipe.TITIPAN, 'bg-accent'],
                ] as const
              ).map(([label, ket, v, warna]) => {
                const bagian = persen(Number(v.omzet), omzet);
                return (
                  <div
                    key={label}
                    className="flex flex-col gap-2 rounded-[14px] bg-surface-muted p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-col gap-px">
                        <span className="text-[13.5px] font-semibold text-primary">{label}</span>
                        <span className="text-xs text-muted">{ket}</span>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-px">
                        <span className="text-[15px] font-bold tabular-nums text-primary">
                          {formatRupiah(v.omzet)}
                        </span>
                        <span className="text-xs tabular-nums text-muted">
                          profit {formatRupiah(v.profit)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface"
                        aria-hidden="true"
                      >
                        <span
                          className={cn('block h-full rounded-full', warna)}
                          style={{ width: `${bagian}%` }}
                        />
                      </span>
                      <span className="w-10 text-right text-xs font-semibold tabular-nums text-primary-soft">
                        {bagian}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </WideCard>
          </div>
        </>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {trend.data && (
          <WideCard
            title="Produk terlaris"
            aside={
              trend.data.topProducts.length > 0
                ? `${trend.data.topProducts.length} produk`
                : undefined
            }
            className="lg:col-span-2"
          >
            {trend.data.topProducts.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-muted">
                Belum ada penjualan pada periode ini.
              </p>
            ) : (
              <ol className="flex flex-col">
                {trend.data.topProducts.map((p, i) => (
                  <li
                    key={p.productId}
                    className={cn(
                      'flex min-h-[52px] items-center gap-3 py-2',
                      i > 0 && 'border-t border-line-soft',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums',
                        i === 0 ? 'bg-primary text-bg' : 'bg-surface-muted text-primary-soft',
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-px">
                      <span className="truncate text-[13.5px] font-semibold text-primary">
                        {p.namaProduk}
                      </span>
                      <span className="text-xs tabular-nums text-muted">
                        {p.totalQuantitySold} terjual · {p.kategori}
                      </span>
                    </span>
                    <span className="shrink-0 text-[13.5px] font-bold tabular-nums text-primary">
                      {formatRupiah(p.totalRevenue)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </WideCard>
        )}

        {d && (
          <WideCard
            title="Daftar transaksi"
            aside={`${d.transactions.length} transaksi`}
            className={trend.data ? 'lg:col-span-3' : 'lg:col-span-5'}
          >
            {d.transactions.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-muted">
                Tidak ada transaksi pada periode ini.
              </p>
            ) : (
              <>
                <DataTable
                  head={[
                    { label: 'Waktu' },
                    { label: 'Pembeli' },
                    { label: 'Status' },
                    { label: 'Total', align: 'right' },
                  ]}
                >
                  {trx.rows.map((t) => (
                    <tr
                      key={t.id}
                      className="transition-colors duration-150 ease-out hover:bg-surface-muted/60"
                    >
                      <Td className="whitespace-nowrap text-muted">
                        {formatWaktuRelatif(t.tanggal)}
                      </Td>
                      <Td>
                        <Link to={`/riwayat?trx=${t.id}`} className="font-semibold hover:underline">
                          {t.namaPembeli ?? 'Tanpa nama'}
                        </Link>
                      </Td>
                      <Td>
                        <Badge
                          variant={t.statusPembayaran === 'UTANG' ? 'utang' : 'lunas'}
                          label={t.statusPembayaran === 'UTANG' ? 'Utang' : 'Lunas'}
                        />
                      </Td>
                      <Td right className="font-bold">
                        {formatRupiah(t.total)}
                      </Td>
                    </tr>
                  ))}
                </DataTable>
                <Pagination
                  page={trx.page}
                  totalPages={trx.totalPages}
                  total={d.transactions.length}
                  pageSize={TRX_PER_HALAMAN}
                  onPage={trx.setPage}
                  itemLabel="transaksi"
                  compact
                />
              </>
            )}
          </WideCard>
        )}
      </div>
    </div>
  );
}

/** Laporan Penjualan (pen YSaMR): periode · omzet · profit + rata-rata · tren · per tipe · terlaris · aksi. */
export function LaporanPenjualanPage() {
  const wide = useMediaQuery(MQ.md);
  const navigate = useNavigate();
  const defaultRange = useDefaultMonthRange();
  const [range, setRange] = useState(defaultRange);
  const [exportOpen, setExportOpen] = useState(false);

  const sales = useSalesReport(range);
  const trend = useProductTrend(range);
  const tren = useMemo(
    () => (sales.data ? trenHarian(sales.data, range.endDate) : []),
    [sales.data, range.endDate],
  );

  if (wide) {
    return (
      <>
        <PenjualanWide
          range={range}
          setRange={setRange}
          defaultRange={defaultRange}
          onExport={() => setExportOpen(true)}
        />
        <ExportSheet
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          title="Ekspor Laporan Penjualan"
          range={range}
          filePrefix="laporan-penjualan"
          onExport={(format) => exportReportApi('sales', { ...range, format })}
        />
      </>
    );
  }
  const maksTren = Math.max(1, ...tren.map((t) => t.nilai));
  const rataRata =
    sales.data && sales.data.transactionCount > 0
      ? Number(sales.data.omzet) / sales.data.transactionCount
      : 0;

  return (
    <div className="flex flex-col gap-2.5">
      <ScreenHeader
        onBack={() => navigate('/')}
        title="Laporan"
        subtitle="Penjualan & tren produk"
      />

      <PeriodFilter range={range} onChange={setRange} defaultRange={defaultRange} />

      {sales.isLoading && (
        <div className="flex flex-col gap-2.5" aria-busy="true">
          <div className="h-[86px] animate-pulse rounded-[20px] bg-primary/10" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-[82px] animate-pulse rounded-[16px] bg-surface" />
            <div className="h-[82px] animate-pulse rounded-[16px] bg-surface" />
          </div>
          <div className="h-[130px] animate-pulse rounded-[16px] bg-surface" />
        </div>
      )}

      {sales.isError && (
        <Card variant="warning" className="items-start">
          <p className="text-sm font-semibold text-warning">Gagal memuat laporan penjualan.</p>
          <Button
            variant="secondary"
            className="mt-1 h-10 px-4 text-xs"
            onClick={() => sales.refetch()}
          >
            Coba lagi
          </Button>
        </Card>
      )}

      {sales.data && (
        <>
          {/* Kartu Omzet (pen): primary r20 p[14,18] gap6 */}
          <div className="flex flex-col gap-1.5 rounded-[20px] bg-primary px-[18px] py-3.5">
            <span className="text-xs font-medium text-accent-soft">Total Omzet</span>
            <div className="flex items-end justify-between gap-3">
              <span className="text-[28px] font-bold leading-none tabular-nums text-bg">
                {formatRupiah(sales.data.omzet)}
              </span>
              <span className="shrink-0 text-xs text-accent-soft">
                {sales.data.transactionCount} transaksi aktif
              </span>
            </div>
          </div>

          {/* Baris Metrik (pen): gap12, kartu p12 gap3 r16 stroke line-soft */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex min-w-0 flex-col gap-[3px] rounded-[16px] border border-line-soft bg-surface p-3">
              <span className="text-xs font-medium text-muted">Estimasi Profit</span>
              <span className="truncate text-[19px] font-bold tabular-nums text-primary">
                {formatRupiah(sales.data.profit)}
              </span>
              <span className="text-[11px] text-muted">Setelah harga modal</span>
            </div>
            <div className="flex min-w-0 flex-col gap-[3px] rounded-[16px] border border-line-soft bg-surface p-3">
              <span className="text-xs font-medium text-muted">Rata-rata / Transaksi</span>
              <span className="truncate text-[19px] font-bold tabular-nums text-primary">
                {formatRupiah(rataRata)}
              </span>
              <span className="text-[11px] text-muted">
                Dari {sales.data.transactionCount} transaksi
              </span>
            </div>
          </div>

          {/* Kartu Tren Penjualan (pen): p10 gap6 r16 — batang accent-soft r6, hari terakhir primary */}
          <div className="flex flex-col gap-1.5 rounded-[16px] border border-line-soft bg-surface p-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-primary">Tren Penjualan</h2>
              <span className="text-[10.5px] text-muted">per hari · Rp ribu</span>
            </div>
            {tren.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted">
                Belum ada penjualan pada periode ini.
              </p>
            ) : (
              <div
                className="flex h-[88px] items-end justify-between gap-1.5"
                role="img"
                aria-label="Grafik omzet harian"
              >
                {tren.map((t, i) => {
                  const terakhir = i === tren.length - 1;
                  return (
                    <div
                      key={t.key}
                      className="flex min-w-0 flex-1 flex-col items-center justify-end gap-[5px]"
                    >
                      <span className="text-[9.5px] tabular-nums text-muted">
                        {Math.round(t.nilai / 1000).toLocaleString('id-ID')}
                      </span>
                      <span
                        className={cn(
                          'w-full rounded-[6px]',
                          terakhir ? 'bg-primary' : 'bg-accent-soft',
                        )}
                        style={{
                          height: Math.max(4, Math.round((t.nilai / maksTren) * TINGGI_BATANG)),
                        }}
                      />
                      <span className="text-[9.5px] text-muted">{t.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Kartu Rincian per Tipe (pen): p10 gap7 r16 */}
          <div className="flex flex-col gap-[7px] rounded-[16px] border border-line-soft bg-surface p-2.5">
            <h2 className="text-[13px] font-semibold text-primary">Rincian per Tipe Produk</h2>
            {(
              [
                ['Milik Sendiri', 'Produk toko', sales.data.perTipe.MILIK_SENDIRI],
                ['Titipan', 'Konsinyasi penitip', sales.data.perTipe.TITIPAN],
              ] as const
            ).map(([label, ket, v]) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <div className="flex flex-col gap-px">
                  <span className="text-[11.5px] font-semibold text-primary-soft">{label}</span>
                  <span className="text-[10.5px] text-muted">{ket}</span>
                </div>
                <div className="flex flex-col items-end gap-px">
                  <span className="text-[11.5px] font-semibold tabular-nums text-primary">
                    Omzet {formatRupiah(v.omzet)}
                  </span>
                  <span className="text-[10.5px] tabular-nums text-muted">
                    profit {formatRupiah(v.profit)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Kartu Produk Terlaris (pen): p9 gap4 r16 — nomor 22 (1 = primary) */}
      {trend.data && (
        <div className="flex flex-col gap-1 rounded-[16px] border border-line-soft bg-surface p-[9px]">
          <h2 className="pb-0.5 text-[13px] font-semibold text-primary">
            {trend.data.topProducts.length > 0
              ? `${trend.data.topProducts.length} Produk Terlaris`
              : 'Produk Terlaris'}
          </h2>
          {trend.data.topProducts.length === 0 ? (
            <p className="py-3 text-xs text-muted">Belum ada penjualan pada periode ini.</p>
          ) : (
            trend.data.topProducts.map((p, i) => (
              <div key={p.productId} className="flex items-center gap-2.5 py-0.5">
                <span
                  className={cn(
                    'flex size-[22px] shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold',
                    i === 0 ? 'bg-primary text-bg' : 'bg-surface-muted text-primary-soft',
                  )}
                >
                  {i + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="truncate text-[12.5px] font-semibold text-primary">
                    {p.namaProduk}
                  </span>
                  <span className="text-[10.5px] text-muted">{p.totalQuantitySold} terjual</span>
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-primary-soft">
                  {formatRupiah(p.totalRevenue)}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tambahan: daftar transaksi periode untuk penelusuran cepat. */}
      {sales.data && sales.data.transactions.length > 0 && (
        <div className="flex flex-col gap-1 rounded-[16px] border border-line-soft bg-surface p-[9px]">
          <h2 className="pb-0.5 text-[13px] font-semibold text-primary">Daftar transaksi</h2>
          {sales.data.transactions.map((t, i) => (
            <div
              key={t.id}
              className={cn(
                'flex items-center justify-between gap-3 py-1.5',
                i > 0 && 'border-t border-line-soft',
              )}
            >
              <div className="flex min-w-0 flex-col gap-px">
                <span className="truncate text-[12.5px] font-semibold text-primary">
                  {t.namaPembeli ?? 'Tanpa nama'}
                </span>
                <span className="text-[10.5px] text-muted">{formatWaktuRelatif(t.tanggal)}</span>
              </div>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-primary">
                {formatRupiah(t.total)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Baris Aksi Laporan (pen): 2 pill h44 surface + garis line */}
      <div className="grid grid-cols-2 gap-2.5">
        <Button
          variant="secondary"
          className="h-11 gap-1.5 px-3 text-[12.5px]"
          onClick={() => setExportOpen(true)}
          disabled={!sales.data}
        >
          <Download className="size-[15px]" aria-hidden="true" />
          Ekspor Laporan
        </Button>
        <Button
          variant="secondary"
          className="h-11 gap-1.5 px-3 text-[12.5px]"
          onClick={() => navigate('/laporan/konsinyasi')}
        >
          <Handshake className="size-[15px]" aria-hidden="true" />
          Laporan Konsinyasi
        </Button>
      </div>

      <ExportSheet
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Ekspor Laporan Penjualan"
        range={range}
        filePrefix="laporan-penjualan"
        onExport={(format) => exportReportApi('sales', { ...range, format })}
      />
    </div>
  );
}
