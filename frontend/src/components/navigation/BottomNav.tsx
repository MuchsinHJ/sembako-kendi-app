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
const LEFT_ITEMS: NavItem[] = [
  { to: PATHS.home, label: 'Beranda', icon: House },
  { to: PATHS.products, label: 'Produk', icon: Package },
];
const RIGHT_ITEMS: NavItem[] = [
  { to: PATHS.debts, label: 'Utang', icon: Wallet },
  { to: PATHS.history, label: 'Riwayat', icon: History },
];

function isItemActive(pathname: string, to: string): boolean {
  if (to === PATHS.home) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

/** Item biasa (pen Item Beranda): 64×48, p4, gap 4, r14; aktif = fill bg + ikon/label primary 600. */
function RegularItem({ item }: { item: NavItem }) {
  const { pathname } = useLocation();
  const active = isItemActive(pathname, item.to);
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'press-scale flex h-12 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-segment p-1 transition-colors duration-150 ease-out',
        active ? 'bg-bg' : 'bg-transparent hover:bg-surface-muted',
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn('size-[22px]', active ? 'text-primary' : 'text-accent')}
        strokeWidth={active ? 2.25 : 1.75}
      />
      <span
        className={cn(
          'text-[10.5px] leading-none',
          active ? 'font-semibold text-primary' : 'font-normal text-primary-soft',
        )}
      >
        {item.label}
      </span>
    </NavLink>
  );
}

/**
 * Bilah bawah mobile (<768px), pen zsT3e: tinggi 88, fill surface, garis atas line.
 * Item 64×48 di y=15, jarak 8 (x = 19, 91, 163, 235, 307 pada lebar 390).
 * FAB Transaksi 64×75 di y=-12: lingkaran 54 naik 12px di atas tepi nav,
 * pil label 21px berakhir di y=63 sejajar label item lain.
 */
export function BottomNav() {
  const { pathname } = useLocation();
  const transactionActive = pathname === PATHS.pos;

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[max(25px,env(safe-area-inset-bottom))] md:hidden"
    >
      <div className="mx-auto flex h-[63px] w-full max-w-[430px] items-start justify-center gap-2 pt-[15px]">
        {LEFT_ITEMS.map((item) => (
          <RegularItem key={item.to} item={item} />
        ))}

        <NavLink
          to={PATHS.pos}
          aria-label="Transaksi"
          aria-current={transactionActive ? 'page' : undefined}
          className="press-scale -mt-[27px] flex h-[75px] w-16 shrink-0 flex-col items-center"
        >
          {/* Lingkaran Transaksi: selalu primary (pen instance override hanya pil + label). */}
          <span className="flex size-[54px] items-center justify-center rounded-full bg-primary transition-colors duration-150 ease-out hover:bg-primary-soft">
            <Plus aria-hidden="true" className="size-6 text-surface" strokeWidth={2} />
          </span>
          <span
            className={cn(
              'flex h-[21px] w-14 items-center justify-center rounded-full text-[10.5px] leading-none transition-colors duration-150 ease-out',
              transactionActive
                ? 'bg-bg font-semibold text-primary'
                : 'font-normal text-primary-soft',
            )}
          >
            Transaksi
          </span>
        </NavLink>

        {RIGHT_ITEMS.map((item) => (
          <RegularItem key={item.to} item={item} />
        ))}
      </div>
    </nav>
  );
}
