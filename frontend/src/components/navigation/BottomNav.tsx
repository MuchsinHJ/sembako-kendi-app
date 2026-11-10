import { useLocation, NavLink } from 'react-router-dom';
import { House, Package, CirclePlus, Wallet, History, type LucideIcon } from 'lucide-react';
import { PATHS } from '@/routes/paths';
import { cn } from '@/lib/cn';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Tepat 5 item — Transaksi = FAB tengah (02 §1). */
const ITEMS: NavItem[] = [
  { to: PATHS.home, label: 'Beranda', icon: House },
  { to: PATHS.products, label: 'Produk', icon: Package },
  { to: PATHS.pos, label: 'Transaksi', icon: CirclePlus },
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
        'flex h-12 flex-col items-center justify-center gap-1 rounded-segment-active px-1',
        active ? 'bg-bg' : 'bg-transparent'
      )}
    >
      <Icon aria-hidden="true" className={cn('size-[22px]', active ? 'text-primary' : 'text-accent')} strokeWidth={active ? 2.5 : 2} />
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

/** Bilah bawah mobile (<768px) — padanya saja di layar kecil. */
export function BottomNav() {
  const { pathname } = useLocation();
  const transactionActive = pathname === PATHS.pos;

  return (
    <nav aria-label="Navigasi utama" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:hidden">
      <div className="relative mx-auto max-w-md border-t border-line bg-surface px-3 pb-2 pt-1">
        {/* FAB Transaksi — terangkat, selalu tampil sebagai aksi utama */}
        <NavLink
          to={PATHS.pos}
          aria-label="Transaksi"
          aria-current={transactionActive ? 'page' : undefined}
          className="absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[3px]"
        >
          <span
            className={cn(
              'flex size-[54px] items-center justify-center rounded-full bg-primary',
              transactionActive ? '' : ''
            )}
          >
            <CirclePlus aria-hidden="true" className="size-[26px] text-bg" strokeWidth={2} />
          </span>
          <span className="rounded-full bg-bg px-2 py-0.5 text-[10.5px] font-semibold leading-none text-primary">
            Transaksi
          </span>
        </NavLink>

        <div className="grid grid-cols-4">
          {ITEMS.filter((_, i) => i !== 2).map((item) => (
            <RegularItem key={item.to} item={item} />
          ))}
        </div>
      </div>
    </nav>
  );
}
