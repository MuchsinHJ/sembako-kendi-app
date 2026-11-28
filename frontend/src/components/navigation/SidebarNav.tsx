import { NavLink, useLocation } from 'react-router-dom';
import {
  House,
  Package,
  CirclePlus,
  Wallet,
  History,
  ChartColumn,
  User,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { PATHS } from '@/routes/paths';
import { Button } from '@/components/Button';
import { useAuth } from '@/features/auth/useAuth';
import { useLogout } from '@/features/auth/api';
import { cn } from '@/lib/cn';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Tepat 7 item, urutan tetap (06 §3) — Laporan & Penitip hanya di sidebar. */
const ITEMS: NavItem[] = [
  { to: PATHS.home, label: 'Beranda', icon: House },
  { to: PATHS.products, label: 'Produk', icon: Package },
  { to: PATHS.pos, label: 'Transaksi', icon: CirclePlus },
  { to: PATHS.debts, label: 'Utang', icon: Wallet },
  { to: PATHS.history, label: 'Riwayat', icon: History },
  { to: PATHS.reportSales, label: 'Laporan', icon: ChartColumn },
  { to: PATHS.consignors, label: 'Penitip', icon: User },
];

function isItemActive(pathname: string, to: string): boolean {
  if (to === PATHS.home) return pathname === to;
  if (to === PATHS.reportSales) return pathname.startsWith('/laporan/');
  if (to === PATHS.consignors) return pathname === to || pathname.startsWith(`${to}/`);
  return pathname === to || pathname.startsWith(`${to}/`);
}

interface SidebarNavProps {
  variant: 'tablet' | 'desktop';
}

/** Sidebar tablet (96px vertikal) / desktop (248px horizontal). 7 item. */
export function SidebarNav({ variant }: SidebarNavProps) {
  const { pathname } = useLocation();
  const tablet = variant === 'tablet';
  const { setAuthenticated } = useAuth();
  const logout = useLogout(() => setAuthenticated(null));

  return (
    <aside
      aria-label="Navigasi utama"
      role="complementary"
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-surface',
        tablet ? 'w-24 md:flex xl:hidden' : 'w-[248px] xl:flex',
      )}
    >
      <div className={cn('flex flex-col gap-1.5', tablet ? 'items-center px-3 py-6' : 'px-4 py-7')}>
        <span className="text-[11px] font-bold tracking-[1.2px] text-primary">
          KENDI&apos;S MARKET
        </span>
        {!tablet && <span className="text-xs text-muted">Kelola toko lebih mudah</span>}
      </div>

      <nav
        className={cn(
          'flex flex-1 flex-col gap-1.5 overflow-y-auto',
          tablet ? 'items-center px-3' : 'px-4',
        )}
      >
        {ITEMS.map((item) => {
          const active = isItemActive(pathname, item.to);
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'press-scale flex items-center rounded-input text-[13px] transition-colors duration-150 ease-out',
                tablet
                  ? 'h-16 w-full flex-col justify-center gap-1 px-1.5 py-3'
                  : 'h-11 w-full justify-start gap-[11px] px-4 text-sm',
                active ? 'bg-primary' : 'bg-surface hover:bg-surface-muted',
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn('size-[18px] shrink-0', active ? 'text-bg' : 'text-accent')}
                strokeWidth={active ? 2.5 : 2}
              />
              <span
                className={cn(
                  'leading-none',
                  active ? 'font-semibold text-bg' : 'font-medium text-primary-soft',
                )}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>

      <div
        className={cn(
          'mt-auto flex flex-col gap-3 border-t border-line-soft py-4',
          tablet ? 'items-center px-3' : 'px-4',
        )}
      >
        <div className={cn('flex items-center gap-3', tablet && 'flex-col gap-2')}>
          <span
            aria-hidden="true"
            className="flex size-[34px] items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-primary"
          >
            KD
          </span>
          {!tablet && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-primary">Kendi</span>
              <span className="block truncate text-xs text-muted">Pemilik usaha</span>
            </span>
          )}
          <Button
            type="button"
            variant="icon"
            aria-label="Keluar"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
            className={cn(tablet && 'h-11 w-11 bg-surface-muted')}
          >
            <LogOut className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
