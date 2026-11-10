import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface ChipFilterProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

/** Chip filter pill (02 §5): aktif bg-primary/bg, nonaktif surface+border line. */
export function ChipFilter({ active = false, className, ...props }: ChipFilterProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'h-10 shrink-0 rounded-full px-4 text-xs whitespace-nowrap',
        active
          ? 'bg-primary font-semibold text-bg'
          : 'border border-line bg-surface font-medium text-primary-soft',
        className
      )}
      {...props}
    />
  );
}
