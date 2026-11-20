import { Link, useNavigate } from 'react-router-dom';
import { ChartColumn, ChevronRight, LogOut, Plus, TriangleAlert } from 'lucide-react';
import { useDashboardSummary } from './api';
import { useLogout } from '@/features/auth/api';
import { useAuth } from '@/features/auth/useAuth';
import { useDebts } from '@/features/transactions/api';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { formatRupiah } from '@/lib/money';
import { formatTanggalPanjang } from '@/lib/date';

const MAKS_STOK_TAMPIL = 3;

function sapaan(jam: number): string {
  if (jam < 11) return 'Selamat pagi';
  if (jam < 15) return 'Selamat siang';
  if (jam < 18) return 'Selamat sore';
  return 'Selamat malam';
}

/**
 * Layar Beranda (pen GDQyV): Content pad 20, gap 14.
 * Omzet gelap r20 · Profit (surface) + Utang (warning-soft) · Penitip & Kewajiban ·
 * Stok Menipis · Kartu Laporan r18. Kartu tanpa garis tepi, sesuai canvas.
 * Tag "[Data Contoh]" di canvas adalah anotasi prototipe, tidak dibawa ke data asli.
 */
export function HomePage() {
  const navigate = useNavigate();
  const { setAuthenticated } = useAuth();
  const logout = useLogout(() => setAuthenticated(null));
  const { data, isLoading, isError, refetch } = useDashboardSummary();
  const debts = useDebts();
  const jumlahUtang = debts.data?.pages[0]?.pagination.total;
  const isMd = useMediaQuery('(min-width: 768px)');
  const now = new Date();

  return (
    <div className="flex flex-col gap-3.5">
      {/* Header (pen gap 4): eyebrow · judul + logout 40 · tanggal */}
      <header className="flex flex-col gap-1">
        <span className="text-xs font-semibold tracking-[1.2px] text-primary-soft">
          KENDI&apos;S MARKET
        </span>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold leading-tight text-primary">
            {isMd ? `${sapaan(now.getHours())}, Kendi` : 'Beranda'}
          </h1>
          <div className="flex items-center gap-2">
            {isMd && (
              <button
                type="button"
                onClick={() => navigate('/transaksi')}
                className="press-scale inline-flex h-11 items-center gap-2 rounded-full bg-primary ps-4 pe-5 text-sm font-semibold text-bg transition-colors duration-150 ease-out hover:bg-primary-soft"
              >
                <Plus className="size-4" aria-hidden="true" />
                Transaksi Baru
              </button>
            )}
            <button
              type="button"
              aria-label="Keluar"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="press-scale flex size-10 shrink-0 items-center justify-center rounded-full bg-surface transition-colors duration-150 ease-out hover:bg-surface-muted disabled:opacity-60"
            >
              <LogOut className="size-[18px] text-primary" aria-hidden="true" />
            </button>
          </div>
        </div>
        <span className="text-xs text-muted">{formatTanggalPanjang(now)}</span>
      </header>

      {isLoading && (
        <div className="flex flex-col gap-3.5" aria-busy="true">
          <div className="h-[86px] animate-pulse rounded-[20px] bg-primary/10" />
          <div className="flex gap-3">
            <div className="h-[86px] flex-1 animate-pulse rounded-[16px] bg-surface" />
            <div className="h-[86px] flex-1 animate-pulse rounded-[16px] bg-warning-soft" />
          </div>
          <div className="h-[66px] animate-pulse rounded-[16px] bg-surface" />
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-start gap-2 rounded-[16px] bg-warning-soft p-4">
          <p className="text-sm font-semibold text-warning">Gagal memuat ringkasan toko.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-xs font-semibold text-primary underline"
          >
            Coba lagi
          </button>
        </div>
      )}

      {data && (
        <>
          {/* Kartu Omzet (pen): primary r20 p[14,18] gap 4 */}
          <div className="flex flex-col gap-1 rounded-[20px] bg-primary px-[18px] py-3.5">
            <span className="text-xs font-medium text-accent-soft">Omzet Hari Ini</span>
            <div className="flex items-end justify-between gap-2">
              <span className="text-[28px] font-bold leading-none tabular-nums text-bg">
                {formatRupiah(data.hariIni.omzet)}
              </span>
              <span className="shrink-0 text-xs text-accent-soft">
                dari {data.hariIni.transactionCount} transaksi
              </span>
            </div>
          </div>

          {/* Baris Metrik (pen): gap 12, kartu p14 gap 3 r16 */}
          <div className="flex gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-[3px] rounded-[16px] bg-surface p-3.5">
              <span className="text-[12.5px] font-medium text-muted">Estimasi Profit</span>
              <span className="truncate text-[20px] font-bold leading-tight tabular-nums text-primary">
                {formatRupiah(data.hariIni.profit)}
              </span>
              <span className="text-xs text-muted">Setelah harga modal</span>
            </div>
            <Link
              to="/laporan/utang"
              className="press-scale flex min-w-0 flex-1 flex-col gap-[3px] rounded-[16px] bg-warning-soft p-3.5"
            >
              <span className="text-[12.5px] font-medium text-primary-soft">Total Utang Aktif</span>
              <span className="truncate text-[20px] font-bold leading-tight tabular-nums text-primary">
                {formatRupiah(data.totalSaldoUtang)}
              </span>
              <span className="text-xs text-primary-soft">
                {jumlahUtang === undefined
                  ? 'Lihat rincian utang'
                  : jumlahUtang === 0
                    ? 'Tidak ada utang aktif'
                    : `${jumlahUtang} transaksi belum lunas`}
              </span>
            </Link>
          </div>

          {/* Kartu Penitip & Kewajiban (pen): p[12,14] gap 10 r16, kanan rata akhir gap 2 */}
          <Link
            to="/penitip"
            className="press-scale flex items-center justify-between gap-2.5 rounded-[16px] bg-surface px-3.5 py-3 transition-colors duration-150 ease-out hover:bg-surface-muted"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[12.5px] font-medium text-primary-soft">
                Penitip &amp; Kewajiban
              </span>
              <span className="truncate text-[20px] font-bold leading-tight tabular-nums text-primary">
                {formatRupiah(data.totalKewajibanPenitip)}
              </span>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="text-[11.5px] text-muted">Lihat saldo dan barang titipan</span>
              <ChevronRight className="size-4 text-muted" aria-hidden="true" />
            </div>
          </Link>

          {/* Peringatan Stok Menipis (pen): warning-soft r16 p[14,16] gap 7 */}
          <div className="flex flex-col gap-[7px] rounded-[16px] bg-warning-soft px-4 py-3.5">
            <div className="flex items-center gap-[7px]">
              <TriangleAlert className="size-[15px] shrink-0 text-warning" aria-hidden="true" />
              <span className="flex-1 text-[12.5px] font-semibold text-primary-soft">
                Stok Menipis
              </span>
              <span className="text-xs text-primary-soft">{data.produkLowStock.length} produk</span>
            </div>
            {data.produkLowStock.length === 0 ? (
              <p className="text-sm text-primary">Semua stok aman.</p>
            ) : (
              <>
                {data.produkLowStock.slice(0, MAKS_STOK_TAMPIL).map((p) => (
                  <Link
                    key={p.id}
                    to={`/produk/${p.id}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-primary">{p.nama}</span>
                    <span className="shrink-0 text-xs font-semibold text-primary-soft">
                      Sisa {p.stok}
                    </span>
                  </Link>
                ))}
                {data.produkLowStock.length > MAKS_STOK_TAMPIL && (
                  <Link
                    to="/produk"
                    className="text-xs font-semibold text-primary-soft underline-offset-2 hover:underline"
                  >
                    +{data.produkLowStock.length - MAKS_STOK_TAMPIL} produk lainnya
                  </Link>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Kartu Laporan (pen): surface r18 p16 gap 12, ikon 44 r14 */}
      <Link
        to="/laporan/penjualan"
        className="press-scale flex items-center gap-3 rounded-[18px] bg-surface p-4 transition-colors duration-150 ease-out hover:bg-surface-muted"
      >
        <div className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-surface-muted">
          <ChartColumn className="size-[22px] text-primary" aria-hidden="true" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="text-[17px] font-bold text-primary">Laporan</span>
          <span className="text-xs text-muted">
            Lihat omzet, profit, tren penjualan, produk terlaris, dan laporan konsinyasi per
            periode.
          </span>
        </div>
        <ChevronRight className="size-[18px] shrink-0 text-muted" aria-hidden="true" />
      </Link>
    </div>
  );
}
