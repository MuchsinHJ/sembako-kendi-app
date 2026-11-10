import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, TriangleAlert } from 'lucide-react';
import { useDashboardSummary } from './api';
import { useTransactions } from '@/features/transactions/api';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formatRupiah } from '@/lib/money';
import { formatTanggal } from '@/features/transactions/utils';

/** Kartu metrik (06 §5.2): teks vertikal-center, bukan space-between. */
function MetricCard({ label, value, note, dark, warning }: { label: string; value: string; note?: string; dark?: boolean; warning?: boolean }) {
  return (
    <Card
      variant={dark ? 'dark' : 'metric'}
      className={`justify-center ${warning ? 'bg-warning-soft border-warning-soft' : ''}`}
    >
      <span className={dark ? 'text-xs text-bg/70' : 'text-xs text-muted'}>{label}</span>
      <span className={`text-[28px] font-bold leading-none ${dark ? 'text-bg' : warning ? 'text-warning' : 'text-primary'}`}>
        {value}
      </span>
      {note && <span className={dark ? 'text-[11px] text-bg/70' : 'text-[11px] text-muted'}>{note}</span>}
    </Card>
  );
}

/** Layar Beranda (03; 06 §5.2) — metrik + stok menipis + transaksi terakhir. */
export function HomePage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useDashboardSummary();
  const { data: txData } = useTransactions({ limit: 5 });
  const recent = txData?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader eyebrow="BERANDA" title="Beranda" info={data ? `${data.hariIni.transactionCount} transaksi hari ini` : undefined} />

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:gap-[18px]">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-[102px] animate-pulse rounded-card border border-line-soft bg-surface lg:h-[132px]" />
          ))}
        </div>
      )}

      {isError && (
        <Card variant="warning" className="items-start">
          <p className="text-sm font-semibold text-warning">Gagal memuat ringkasan toko.</p>
          <Button variant="secondary" className="mt-1 h-10 px-4 text-xs" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </Card>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:gap-[18px]">
            <MetricCard dark label="Omzet Hari Ini" value={formatRupiah(data.hariIni.omzet)} note={`Bulan berjalan: ${formatRupiah(data.bulanBerjalan.omzet)}`} />
            <MetricCard label="Estimasi Profit" value={formatRupiah(data.hariIni.profit)} note={`${data.hariIni.transactionCount} transaksi hari ini`} />
            <MetricCard warning label="Total Utang Aktif" value={formatRupiah(data.totalSaldoUtang)} note="Belum lunas" />
            <MetricCard label="Kewajiban Penitip" value={formatRupiah(data.totalKewajibanPenitip)} note="Saldo positif seluruh penitip" />
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:gap-[18px]">
            {/* Kiri: peringatan stok menipis */}
            <Card variant="list" className="flex min-w-0 flex-1 flex-col gap-2.5 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-primary">Peringatan Stok Menipis</h2>
                <Badge variant="netral" label={`${data.produkLowStock.length} produk`} />
              </div>
              {data.produkLowStock.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">Semua stok aman.</p>
              ) : (
                data.produkLowStock.slice(0, 5).map((p) => (
                  <Link
                    key={p.id}
                    to={`/produk/${p.id}`}
                    className="press-scale flex items-center justify-between gap-3 rounded-card-sm border border-line-soft bg-surface p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-primary">{p.nama}</p>
                      <p className="text-xs text-muted">{p.kategori} · Stok {p.stok}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-warning">
                      <TriangleAlert className="size-3.5" aria-hidden="true" /> Menipis
                    </span>
                  </Link>
                ))
              )}
              <Button variant="secondary" className="mt-1 self-start h-10 px-4 text-xs" onClick={() => navigate('/produk')}>
                Lihat Katalog
              </Button>
            </Card>

            {/* Kanan: transaksi terakhir */}
            <Card variant="list" className="flex min-w-0 flex-1 flex-col gap-2 p-4">
              <h2 className="text-base font-bold text-primary">Transaksi Terakhir</h2>
              {recent.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">Belum ada transaksi.</p>
              ) : (
                recent.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 border-b border-line-soft pb-2 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-primary">{formatRupiah(t.total)}</p>
                      <p className="text-xs text-muted">
                        {formatTanggal(t.tanggal)}
                        {t.namaPembeli && ` · ${t.namaPembeli}`}
                      </p>
                    </div>
                    {t.statusTransaksi === 'DIBATALKAN' ? (
                      <Badge variant="netral" label="Dibatalkan" />
                    ) : (
                      <Badge variant={t.statusPembayaran === 'LUNAS' ? 'lunas' : 'utang'} label={t.statusPembayaran === 'LUNAS' ? 'Lunas' : 'Utang'} />
                    )}
                  </div>
                ))
              )}
              <Button variant="secondary" className="mt-1 self-start h-10 px-4 text-xs" onClick={() => navigate('/riwayat')}>
                <ChevronRight className="size-4" aria-hidden="true" /> Lihat Riwayat
              </Button>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
