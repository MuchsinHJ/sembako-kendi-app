import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';

interface ScreenHeaderProps {
  /** Pola A (tab): eyebrow opsional + judul + info. */
  eyebrow?: string;
  title: string;
  info?: string | undefined;
  /** Pola B (detail): ganti tombol kembali + subjudul. */
  onBack?: () => void;
  subtitle?: string;
  action?: ReactNode;
}

/** Header layar (02 §7): A untuk tab, B untuk detail (wajib tombol kembali). */
export function ScreenHeader({ eyebrow, title, info, onBack, subtitle, action }: ScreenHeaderProps) {
  if (onBack) {
    return (
      <header className="flex items-center gap-2.5">
        <Button variant="icon" onClick={onBack} aria-label="Kembali" className="shrink-0">
          <ArrowLeft className="size-[18px]" aria-hidden="true" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[22px] font-bold leading-tight text-primary">{title}</h1>
          {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
        </div>
        {action}
      </header>
    );
  }

  return (
    <header className="flex flex-col gap-1">
      {eyebrow && (
        <span className="text-xs font-semibold tracking-[1.2px] text-accent">{eyebrow}</span>
      )}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">{title}</h1>
        {action}
      </div>
      {info && <p className="text-xs text-muted">{info}</p>}
    </header>
  );
}
