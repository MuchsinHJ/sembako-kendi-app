import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Download } from 'lucide-react';
import { Button } from '@/components/Button';
import { cn } from '@/lib/cn';
import { PeriodFilter } from './shared';
import type { ReportRange } from '../types';

/**
 * Blok bersama laporan md+ (tidak ada desain Laporan Utang di .pen; Penjualan/Konsinyasi
 * diturunkan dari BU7uA/EzMWg dengan teks ≥12px dan tabel ber-paginasi).
 */

const TABS = [
  { to: '/laporan/penjualan', label: 'Penjualan' },
  { to: '/laporan/konsinyasi', label: 'Konsinyasi' },
  { to: '/laporan/utang', label: 'Utang' },
];

/** Tab antar laporan (md+): pindah laporan tanpa kembali ke Beranda. */
export function ReportTabs() {
  return (
    <nav aria-label="Jenis laporan" className="flex h-[52px] gap-1 rounded-segment bg-surface-muted p-1">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) =>
            cn(
              'press-scale flex min-w-[112px] items-center justify-center rounded-segment-active border px-4 text-[13px] transition-colors duration-150 ease-out',
              isActive
                ? 'border-line-soft bg-surface font-semibold text-primary'
                : 'border-transparent font-medium text-muted hover:bg-surface/70',
            )
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function ReportWideHeader({
  title,
  subtitle,
  range,
  onRange,
  defaultRange,
  onExport,
  exportDisabled,
}: {
  title: string;
  subtitle: string;
  range: ReportRange;
  onRange: (r: ReportRange) => void;
  defaultRange: ReportRange;
  onExport?: () => void;
  exportDisabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-col gap-[3px]">
          <span className="text-xs font-semibold tracking-[1.2px] text-primary-soft">LAPORAN</span>
          <h1 className="text-2xl font-bold leading-tight text-primary">{title}</h1>
          <p className="text-[12.5px] text-muted">{subtitle}</p>
        </div>
        {onExport && (
          <Button variant="secondary" className="h-11 shrink-0 px-4 text-[13px]" onClick={onExport} disabled={exportDisabled}>
            <Download className="size-4" aria-hidden="true" />
            Ekspor
          </Button>
        )}
      </header>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ReportTabs />
        <div className="lg:w-[320px]">
          <PeriodFilter range={range} onChange={onRange} defaultRange={defaultRange} />
        </div>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'surface',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'dark' | 'surface' | 'warning';
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1 rounded-[18px] p-4',
        tone === 'dark' && 'bg-primary',
        tone === 'warning' && 'bg-warning-soft',
        tone === 'surface' && 'border border-line-soft bg-surface',
      )}
    >
      <span
        className={cn(
          'text-[12.5px] font-medium',
          tone === 'dark' ? 'text-accent-soft' : tone === 'warning' ? 'text-warning' : 'text-muted',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'truncate text-[24px] font-bold leading-tight tabular-nums',
          tone === 'dark' ? 'text-bg' : 'text-primary',
        )}
      >
        {value}
      </span>
      {hint && (
        <span className={cn('truncate text-xs', tone === 'dark' ? 'text-accent-soft' : 'text-muted')}>{hint}</span>
      )}
    </div>
  );
}

export function WideCard({
  title,
  aside,
  children,
  className,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={cn('flex min-w-0 flex-col gap-3 rounded-[20px] border border-line-soft bg-surface p-4', className)}
    >
      <div className="flex min-h-6 items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold text-primary">{title}</h2>
        {aside && <span className="text-xs text-muted">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

/** Kerangka tabel: kepala 12/600 muted, baris ≥52px (target sentuh), angka rata kanan. */
export function DataTable({
  head,
  children,
  minWidth = 0,
}: {
  head: Array<{ label: string; align?: 'right' }>;
  children: ReactNode;
  /** Lebar minimum tabel (px) sebelum bergulir horizontal. */
  minWidth?: number;
}) {
  return (
    <div className="-mx-4 overflow-x-auto overscroll-x-contain">
      <table className="w-full border-collapse text-left" style={{ minWidth }}>
        <thead>
          <tr className="border-y border-line-soft bg-surface-muted/60">
            {head.map((h) => (
              <th
                key={h.label}
                scope="col"
                className={cn(
                  'h-10 px-4 text-xs font-semibold text-muted first:ps-4',
                  h.align === 'right' && 'text-right',
                )}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-line-soft [&>tr:last-child]:border-b-0">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, right, className }: { children: ReactNode; right?: boolean; className?: string }) {
  return (
    <td className={cn('h-[52px] px-4 text-[13px] text-primary', right && 'text-right tabular-nums', className)}>
      {children}
    </td>
  );
}