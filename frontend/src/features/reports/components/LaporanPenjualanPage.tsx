import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChartColumn } from 'lucide-react';
import { useProductTrend, useSalesReport, exportReportApi } from '../api';
import { DateRangePicker, ExportButtons, SummaryStat } from './shared';
import { useDefaultMonthRange } from '../utils';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formatRupiah } from '@/lib/money';
import { formatTanggal } from '@/features/transactions/utils';

/** Laporan Penjualan: ringkasan + per tipe + tren 5 produk terlaris + transaksi. */
export function LaporanPenjualanPage() {
  const navigate = useNavigate();
  const [range, setRange] = useState(useDefaultMonthRange());
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null);

  const sales = useSalesReport(range);
  const trend = useProductTrend(range);

  async function onExport(format: 'xlsx' | 'pdf') {
    setExporting(format);
    try {
      await exportReportApi('sales', { ...range, format });
    } catch {
      // Gagal unduh (mis. jaringan): biarkan state kembali normal.
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader
        eyebrow="LAPORAN"
        title="Penjualan"
        action={
          <Button variant="secondary" className="h-11 px-4 text-xs" onClick={() => navigate('/laporan/konsinyasi')}>
            Konsinyasi <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        }
      />

      <DateRangePicker range={range} onChange={setRange} />

      {sales.isLoading && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="h-24 animate-pulse rounded-card border border-line-soft bg-surface" />
            <div className="h-24 animate-pulse rounded-card border border-line-soft bg-surface" />
            <div className="h-24 animate-pulse rounded-card border border-line-soft bg-surface" />
          </div>
          <div className="h-40 animate-pulse rounded-card border border-line-soft bg-surface" />
        </div>
      )}

      {sales.isError && (
        <Card variant="warning" className="items-start">
          <p className="text-sm font-semibold text-warning">Gagal memuat laporan penjualan.</p>
          <Button variant="secondary" className="mt-1 h-10 px-4 text-xs" onClick={() => sales.refetch()}>
            Coba lagi
          </Button>
        </Card>
      )}

      {sales.data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SummaryStat label="Omzet" value={formatRupiah(sales.data.omzet)} />
            <SummaryStat label="Estimasi Profit" value={formatRupiah(sales.data.profit)} />
            <SummaryStat label="Transaksi" value={String(sales.data.transactionCount)} />
          </div>

          <Card variant="list" className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold text-primary">Rincian per tipe produk</p>
            <div className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-muted">Milik sendiri · omzet</span>
              <span className="font-semibold text-primary">{formatRupiah(sales.data.perTipe.MILIK_SENDIRI.omzet)}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-muted">Milik sendiri · profit</span>
              <span className="font-semibold text-primary">{formatRupiah(sales.data.perTipe.MILIK_SENDIRI.profit)}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-muted">Titipan · omzet</span>
              <span className="font-semibold text-primary">{formatRupiah(sales.data.perTipe.TITIPAN.omzet)}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-muted">Titipan · profit</span>
              <span className="font-semibold text-primary">{formatRupiah(sales.data.perTipe.TITIPAN.profit)}</span>
            </div>
          </Card>

          <ExportButtons downloading={exporting !== null} onExport={onExport} />
        </>
      )}

      {trend.data && (
        <Card variant="list" className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <ChartColumn className="size-4 text-accent" aria-hidden="true" />
            <p className="text-sm font-semibold text-primary">Produk terlaris</p>
          </div>
          {trend.data.topProducts.length === 0 ? (
            <p className="text-xs text-muted">Belum ada penjualan pada periode ini.</p>
          ) : (
            trend.data.topProducts.map((p, i) => (
              <div key={p.productId} className="flex items-center justify-between gap-3 border-b border-line-soft py-2 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-primary">
                    <span className="mr-1.5 text-muted">{i + 1}.</span>
                    {p.namaProduk}
                  </p>
                  <p className="text-xs text-muted">{p.kategori} · {p.totalQuantitySold} terjual</p>
                </div>
                <span className="text-sm font-bold text-primary">{formatRupiah(p.totalRevenue)}</span>
              </div>
            ))
          )}
        </Card>
      )}

      {sales.data && sales.data.transactions.length > 0 && (
        <Card variant="list" className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-primary">Daftar transaksi</p>
          {sales.data.transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 border-b border-line-soft py-2 last:border-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-primary">{t.namaPembeli ?? 'Tanpa nama'}</p>
                <p className="text-xs text-muted">{formatTanggal(t.tanggal)} · {t.id}</p>
              </div>
              <span className="text-sm font-bold text-primary">{formatRupiah(t.total)}</span>
            </div>
          ))}
        </Card>
      )}

      <p className="text-xs text-muted">
        Sumber: <Link className="font-medium text-primary" to="/laporan/utang">Laporan Utang</Link>
      </p>
    </div>
  );
}
