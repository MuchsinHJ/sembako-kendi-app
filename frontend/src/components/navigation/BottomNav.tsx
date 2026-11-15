import { useLocation, NavLink } from 'react-router-dom';
import { House, Package, Plus, Wallet, History, type LucideIcon } from 'lucide-react';
import { PATHS } from '@/routes/paths';
import { cn } from '@/lib/cn';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Tepat 5 item — Transaksi = FAB tengah (02 §1). */
const SIDE_ITEMS: NavItem[] = [
  { to: PATHS.home, label: 'Beranda', icon: House },
  { to: PATHS.products, label: 'Produk', icon: Package },
  { to: PATHS.debts, label: 'Utang', icon: Wallet },
  { to: PATHS.history, label: 'Riwayat', icon: History },
];

function isItemActive(pathname: string, to: string): boolean {
  if (to === PATHS.home) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

function RegularItem({ item }: { item: NavItem }) {
  const { pathname } = useLocation();
  const active = isItemActive(pathname, item.to);
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'press-scale flex h-12 w-16 flex-col items-center justify-center gap-1 rounded-segment p-1 transition-colors duration-150 ease-out',
        active ? 'bg-bg' : 'bg-transparent hover:bg-surface-muted'
      )}
    >
      <Icon aria-hidden="true" className={cn('size-[22px]', active ? 'text-primary' : 'text-accent')} strokeWidth={active ? 2.5 : 1.75} />
      <span
        className={cn(
          'text-[10.5px] leading-none',
          active ? 'font-semibold text-primary' : 'font-normal text-primary-soft'
        )}
      >
        {item.label}
      </span>
    </NavLink>
  );
}

/** Bilah bawah mobile (<768px) — 64×88, 4 item samping + FAB Transaksi (02 §1). */
export function BottomNav() {
  const { pathname } = useLocation();
  const transactionActive = pathname === PATHS.pos;

  return (
    <nav aria-label="Navigasi utama" className="fixed inset-x-0 bottom-0 z-40 bg-surface border-t border-line md:hidden">
      {/* Container 390px — tinggi 88: 75px terlihat + 27px FAB naik melewati tepi atas.
          Item biasa y=15..63 (canvas). */}
      <div className="relative mx-auto h-[75px] w-full max-w-[390px]">
        {SIDE_ITEMS.map((item, i) => (
          <div
            key={item.to}
            className={cn('absolute top-[15px]', i === 0 && 'left-[19px]', i === 1 && 'left-[91px]', i === 2 && 'left-[235px]', i === 3 && 'left-[307px]')}
          >
            <RegularItem item={item} />
          </div>
        ))}

        {/* FAB Transaksi — naik 27px melewati tepi atas nav (setengah lingkaran) */}
        <NavLink
          to={PATHS.pos}
          aria-label="Transaksi"
          aria-current={transactionActive ? 'page' : undefined}
          className="press-scale absolute left-[163px] top-[-27px] flex h-[75px] w-16 flex-col items-center"
        >
          {/* Lingkaran: tetap gelap, hanya beda antara primary vs primary-soft saat aktif (02 §1). */}
          <span
            className={cn(
              'flex size-[54px] items-center justify-center rounded-full transition-colors duration-150 ease-out',
              transactionActive ? 'bg-primary-soft' : 'bg-primary hover:bg-primary-soft'
            )}
          >
            <Plus aria-hidden="true" className="size-6 text-surface" strokeWidth={2} />
          </span>
          {/* Pil: bg + primary saat aktif (02 §1 tabel state), transparan + primary-soft saat tidak.
              Pen M06naQ fill transparan — itu state nonaktif. */}
          <span
            className={cn(
              'flex h-[21px] w-14 items-center justify-center rounded-full text-[10.5px] leading-none transition-colors duration-150 ease-out',
              transactionActive ? 'bg-bg font-semibold text-primary' : 'font-normal text-primary-soft'
            )}
          >
            Transaksi
          </span>
        </NavLink>
      </div>
    </nav>
  );
}
