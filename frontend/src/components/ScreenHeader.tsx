import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { cn } from '@/lib/cn';

interface ScreenHeaderProps {
  /** Pola A (tab): eyebrow opsional + judul + info. */
  eyebrow?: string | undefined;
  title: string;
  info?: ReactNode | undefined;
  /** Pola B (detail): ganti tombol kembali + subjudul. */
  onBack?: (() => void) | undefined;
  subtitle?: ReactNode | undefined;
  action?: ReactNode | undefined;
  /** Ukuran judul override (pen Detail Penitip memakai 22px). */
  titleClassName?: string | undefined;
}

/**
 * Header layar (02 §7).
 * A (tab, pen Header gap 3): eyebrow 12/600 ls 1.2 · judul 24/700 · info 12 muted.
 * B (detail, pen Header gap 10): tombol kembali 44 surface+line · judul 24/700 · sub 12 muted (gap 1).
 */
export function ScreenHeader({
  eyebrow,
  title,
  info,
  onBack,
  subtitle,
  action,
  titleClassName,
}: ScreenHeaderProps) {
  if (onBack) {
    return (
      <header className="flex items-center gap-2.5">
        <Button variant="icon" onClick={onBack} aria-label="Kembali" className="shrink-0">
          <ArrowLeft className="size-[18px]" aria-hidden="true" />
        </Button>
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          {eyebrow && (
            <span className="text-xs font-semibold tracking-[1.2px] text-primary-soft">
              {eyebrow}
            </span>
          )}
          <div className={cn('flex min-w-0 flex-col', !eyebrow && 'gap-px')}>
            <h1
              className={cn(
                'truncate text-2xl font-bold leading-tight text-primary',
                titleClassName,
              )}
            >
              {title}
            </h1>
            {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
    );
  }
  return (
    <header className="flex flex-col gap-[3px]">
      {eyebrow && (
        <span className="text-xs font-semibold tracking-[1.2px] text-primary-soft">{eyebrow}</span>
      )}
      <div className="flex items-center justify-between gap-3">
        <h1 className={cn('text-2xl font-bold leading-tight text-primary', titleClassName)}>
          {title}
        </h1>
        {action}
      </div>
      {info && <p className="text-xs text-muted">{info}</p>}
    </header>
  );
}
