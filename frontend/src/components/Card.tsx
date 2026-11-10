import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Varian kartu (02 §6). */
  variant?: 'list' | 'metric' | 'dark' | 'warning';
}

const variants: Record<NonNullable<CardProps['variant']>, string> = {
  list: 'rounded-card-sm border border-line-soft bg-surface p-3',
  metric: 'rounded-card border border-line-soft bg-surface p-3.5 flex flex-col gap-[3px]',
  dark: 'rounded-card bg-primary p-4 flex flex-col gap-1',
  warning: 'rounded-card bg-warning-soft p-4 flex flex-col gap-[7px]',
};

/** Kartu dasar — token saja, tanpa shadow (border untuk struktur). */
export function Card({ variant = 'list', className, ...props }: CardProps) {
  return <div className={cn(variants[variant], className)} {...props} />;
}
