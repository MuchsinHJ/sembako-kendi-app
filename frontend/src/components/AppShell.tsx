import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './navigation/BottomNav';
import { SidebarNav } from './navigation/SidebarNav';
import { cn } from '@/lib/cn';

/**
 * Layar mobile tanpa bottom nav (pen: Daftar/Detail Penitip, Riwayat Titipan,
 * Laporan Penjualan & Konsinyasi dibuka dari Beranda dan punya tombol kembali).
 */
function isNavlessPath(pathname: string, search = ''): boolean {
  if (pathname.startsWith('/penitip') || pathname.startsWith('/laporan')) return true;
  // POS: langkah Keranjang/Konfirmasi/Berhasil memakai footer checkout sendiri (pen p6iFM, NOO66, maq6j).
  if (pathname === '/transaksi' && new URLSearchParams(search).has('langkah')) return true;
  return false;
}

/**
 * Cangkang aplikasi (SDD FE §4.2): satu navigasi per breakpoint.
 * Mobile: BottomNav · Tablet 768–1279: sidebar 96px · Desktop ≥1280: sidebar 248px.
 * Mobile pen: Content padding horizontal 20, jarak bawah 20 di atas nav 88px.
 */
export function AppShell() {
  const { pathname, search } = useLocation();
  const navless = isNavlessPath(pathname, search);
  return (
    <div className="min-h-dvh bg-bg">
      {!navless && <BottomNav />}
      <SidebarNav variant="tablet" />
      <SidebarNav variant="desktop" />
      <main
        className={cn(
          'md:ml-24 md:pb-8 xl:ml-[248px]',
          navless ? 'pb-8' : 'pb-[calc(108px+env(safe-area-inset-bottom))]',
        )}
      >
        <div className="mx-auto w-full max-w-6xl px-5 pt-5 md:px-6 md:pt-6 xl:px-9">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
