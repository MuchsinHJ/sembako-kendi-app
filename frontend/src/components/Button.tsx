import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * primary: pill primary (pen Tombol Simpan) — disabled memakai muted-soft + teks muted (pen Tombol Lanjutkan nonaktif).
   * secondary: pill surface + garis line (pen Tombol Batal dialog / Ekspor).
   * soft: pill surface-muted teks primary-soft tanpa garis (pen Tombol Batal sheet).
   * destructive: pill garis danger (pen Nonaktifkan Produk).
   * danger: pill isi danger (pen Ya, Batalkan / Nonaktifkan Produk di dialog).
   * icon: bundar 44 surface + garis line (pen Tombol Kembali).
   */
  variant?: 'primary' | 'secondary' | 'soft' | 'destructive' | 'danger' | 'icon';
}

/** Tombol pill — press scale 0.96 lewat utility press-scale (better-ui). */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'press-scale inline-flex items-center justify-center gap-[7px] rounded-full font-semibold',
        'select-none whitespace-nowrap disabled:cursor-not-allowed',
        // Hover hanya di pointer hover (Tailwind 4 membungkus hover: dalam @media (hover:hover)).
        'transition-[background-color,border-color,color,transform] duration-150 ease-out',
        variant === 'primary' &&
          'h-12 bg-primary px-6 text-sm text-bg hover:bg-primary-soft disabled:bg-muted-soft disabled:text-muted',
        variant === 'secondary' &&
          'h-12 border border-line bg-surface px-6 text-sm text-primary hover:border-accent/60 hover:bg-surface-muted disabled:opacity-50',
        variant === 'soft' &&
          'h-12 bg-surface-muted px-6 text-sm text-primary-soft hover:bg-muted-soft disabled:opacity-50',
        variant === 'destructive' &&
          'h-12 border border-danger bg-surface px-6 text-sm text-danger hover:bg-danger/10 disabled:opacity-50',
        variant === 'danger' &&
          'h-12 bg-danger px-6 text-sm text-bg hover:bg-danger/90 disabled:opacity-60',
        variant === 'icon' &&
          'h-11 w-11 shrink-0 border border-line bg-surface text-primary hover:border-accent/60 hover:bg-surface-muted disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
});
