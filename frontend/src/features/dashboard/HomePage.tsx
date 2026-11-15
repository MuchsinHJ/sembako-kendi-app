import { Link, useNavigate } from 'react-router-dom';
import { ChartColumn, ChevronRight, LogOut, Plus, TriangleAlert } from 'lucide-react';
import { useDashboardSummary } from './api';
import { useLogout } from '@/features/auth/api';
import { useAuth } from '@/features/auth/useAuth';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { formatRupiah } from '@/lib/money';

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function formatTanggalPanjang(d: Date): string {
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

function sapaan(jam: number): string {
  if (jam < 11) return 'Selamat pagi';
  if (jam < 15) return 'Selamat siang';
  if (jam < 18) return 'Selamat sore';
  return 'Selamat malam';
}

/** Layar Beranda (pen GDQyV) — omzet gelap + profit/utang + penitip + stok menipis + kartu laporan. */
export function HomePage() {
  const navigate = useNavigate();
  const { setAuthenticated } = useAuth();
  const logout = useLogout(() => setAuthenticated(null));
  const { data, isLoading, isError, refetch } = useDashboardSummary();
  const isMd = useMediaQuery('(min-width: 768px)');
  const now = new Date();

  return (
    <div className="flex flex-col gap-3.5 p-5 pb-7 pt-1">
      {/* Header (pen X8cuXR): eyebrow + judul + logout 40×40 + tanggal + tag contoh */}
      <header className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-primary-soft">KENDI&apos;S MARKET</span>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-primary">{isMd ? `${sapaan(now.getHours())}, Kendi` : 'Beranda'}</h1>
          <div className="flex items-center gap-2">
            {isMd && (
              <button
                type="button"
                onClick={() => navigate('/transaksi')}
                className="press-scale inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-bg transition-colors duration-150 ease-out hover:bg-primary-soft"
              >
                <Plus className="size-4" aria-hidden="true" />
                Transaksi Baru
              </button>
            )}
            <button
              type="button"
              aria-label="Keluar"
              onClick={() => logout.mutate()}
              className="press-scale flex size-10 shrink-0 items-center justify-center rounded-full bg-surface transition-colors duration-150 ease-out hover:bg-surface-muted"
            >
              <LogOut className="size-[18px] text-primary" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">{formatTanggalPanjang(now)}</span>
          <span className="rounded-full bg-surface-muted px-2 py-[3px] text-xs font-semibold text-muted">[Data Contoh]</span>
        </div>
      </header>

      {isLoading && (
        <div className="flex flex-col gap-3.5">
          <div className="h-[104px] animate-pulse rounded-[20px] bg-primary/10" />
          <div className="h-[96px] animate-pulse rounded-card border border-line-soft bg-surface" />
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-start gap-2 rounded-[16px] bg-warning-soft p-4">
          <p className="text-sm font-semibold text-warning">Gagal memuat ringkasan toko.</p>
          <button type="button" onClick={() => refetch()} className="text-xs font-semibold text-primary underline">
            Coba lagi
          </button>
        </div>
      )}

      {data && (
        <>
          {/* Kartu Omzet (pen s81Rv): gelap r=20, p=[14,18], g=4 */}
          <div className="flex flex-col gap-1 rounded-[20px] bg-primary p-3.5 px-[18px]">
            <span className="text-xs font-medium text-accent-soft">Omzet Hari Ini</span>
            <span className="text-[28px] font-bold leading-tight text-bg">{formatRupiah(data.hariIni.omzet)}</span>
            <span className="text-xs text-accent-soft">dari {data.hariIni.transactionCount} transaksi</span>
          </div>

          {/* Baris Metrik (pen PC1EU): 2 kolom, profit + utang */}
          <div className="flex gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-[3px] rounded-card border border-line-soft bg-surface p-3.5">
              <span className="text-[12.5px] font-medium text-muted">Estimasi Profit</span>
              <span className="text-[20px] font-bold leading-tight text-primary">{formatRupiah(data.hariIni.profit)}</span>
              <span className="text-xs text-muted">Setelah harga modal</span>
            </div>
            <Link
              to="/laporan/utang"
              className="press-scale flex min-w-0 flex-1 flex-col gap-[3px] rounded-card bg-warning-soft p-3.5"
            >
              <span className="text-[12.5px] font-medium text-primary-soft">Total Utang Aktif</span>
              <span className="text-[20px] font-bold leading-tight text-primary">{formatRupiah(data.totalSaldoUtang)}</span>
              <span className="text-xs text-primary-soft">{data.produkLowStock.length > 0 ? 'Belum lunas' : 'Belum lunas'}</span>
            </Link>
          </div>

          {/* Kartu Penitip & Kewajiban (pen IsF0F): h, r=16, p=[12,14], space-between */}
          <Link
            to="/penitip"
            className="press-scale flex items-center justify-between gap-2.5 rounded-card border border-line-soft bg-surface px-3.5 py-3"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[12.5px] font-medium text-primary-soft">Penitip &amp; Kewajiban</span>
              <span className="text-[20px] font-bold leading-tight text-primary">{formatRupiah(data.totalKewajibanPenitip)}</span>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="text-[11.5px] text-muted">Lihat saldo dan barang titipan</span>
              <ChevronRight className="size-4 text-muted" aria-hidden="true" />
            </div>
          </Link>

          {/* Peringatan Stok Menipis (pen o6GwIx): warning-soft r=16, p=[14,16], g=7 */}
          <div className="flex flex-col gap-[7px] rounded-[16px] bg-warning-soft p-3.5 px-4">
            <div className="flex items-center gap-[7px]">
              <TriangleAlert className="size-[15px] shrink-0 text-warning" aria-hidden="true" />
              <span className="text-[12.5px] font-semibold text-primary-soft">Stok Menipis</span>
              <span className="flex-1" />
              <span className="text-xs text-primary-soft">{data.produkLowStock.length} produk</span>
            </div>
            {data.produkLowStock.length === 0 ? (
              <p className="text-[14px] text-primary">Semua stok aman.</p>
            ) : (
              data.produkLowStock.slice(0, 3).map((p) => (
                <Link key={p.id} to={`/produk/${p.id}`} className="press-scale flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[14px] text-primary">{p.nama}</span>
                  <span className="shrink-0 text-xs font-semibold text-primary-soft">Sisa {p.stok}</span>
                </Link>
              ))
            )}
          </div>
        </>
      )}

      {/* Kartu Laporan (pen K3dDn): r=18, p=16, g=12, ikon 44×44 */}
      <Link to="/laporan/penjualan" className="press-scale card-hover flex items-center gap-3 rounded-[18px] border border-line-soft bg-surface p-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-surface-muted">
          <ChartColumn className="size-[22px] text-primary" aria-hidden="true" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="text-[17px] font-bold text-primary">Laporan</span>
          <span className="text-xs text-muted">Lihat omzet, profit, tren penjualan, produk terlaris, dan laporan konsinyasi per periode.</span>
        </div>
        <ChevronRight className="size-[18px] shrink-0 text-muted" aria-hidden="true" />
      </Link>

      <p className="text-xs text-muted">Angka dan nama di layar ini hanya contoh.</p>
    </div>
  );
}
