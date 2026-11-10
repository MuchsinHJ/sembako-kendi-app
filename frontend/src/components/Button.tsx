import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'icon';
}

/**
 * Tombol — 4 varian (02 §4). Semua pill; primer selalu berlabel teks.
 * Ikon bundar 44×44 (target sentuh minimum) wajib aria-label.
 * Press scale 0.96 lewat utility press-scale (better-ui).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', className, type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'press-scale inline-flex items-center justify-center gap-[7px] rounded-full font-semibold',
        'whitespace-nowrap select-none disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'h-12 bg-primary px-6 text-sm text-bg',
        variant === 'secondary' && 'h-12 border border-line bg-surface px-6 text-sm text-primary',
        variant === 'destructive' && 'h-12 border border-danger bg-surface px-6 text-sm text-danger',
        variant === 'icon' && 'h-11 w-11 border border-line bg-surface text-primary',
        className
      )}
      {...props}
    />
  );
});
