import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Handshake } from 'lucide-react';
import { useProductTrend, useSalesReport, exportReportApi } from '../api';
import { ExportSheet, PeriodFilter } from './shared';
import { useDefaultMonthRange } from '../utils';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formatRupiah } from '@/lib/money';
import { dariIso, keIso } from '@/lib/date';
import { cn } from '@/lib/cn';
import { formatWaktuRelatif } from '@/features/transactions/utils';
import type { SalesReport } from '../types';

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
function trenHarian(report: SalesReport, endDate: string) {
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
  const hari = Array.from({ length: MAKS_HARI_TREN }, (_, i) => {
    const d = new Date(
      akhir.getFullYear(),
      akhir.getMonth(),
      akhir.getDate() - (MAKS_HARI_TREN - 1 - i),
    );
    const key = keIso(d);
    return {
      key,
      label: `${d.getDate()} ${BULAN_PENDEK[d.getMonth()]}`,
      nilai: perHari.get(key) ?? 0,
    };
  });
  // Buang hari kosong di awal agar grafik fokus pada hari yang ada penjualan.
  const pertama = hari.findIndex((h) => h.nilai > 0);
  return pertama === -1 ? [] : hari.slice(Math.min(pertama, MAKS_HARI_TREN - 4));
}

/** Laporan Penjualan (pen YSaMR): periode · omzet · profit + rata-rata · tren · per tipe · terlaris · aksi. */
export function LaporanPenjualanPage() {
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
