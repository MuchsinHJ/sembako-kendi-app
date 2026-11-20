import { cn } from '@/lib/cn';

export type BadgeVariant = 'lunas' | 'utang' | 'netral';

interface BadgeProps {
  variant: BadgeVariant;
  label: string;
  /** Pen: badge status penitip tanpa dot. Default true (R-31: dot pelengkap). */
  dot?: boolean;
}

const styles: Record<BadgeVariant, { bg: string; dot: string; text: string }> = {
  lunas: { bg: 'bg-success-soft', dot: 'bg-primary-soft', text: 'text-primary-soft' },
  utang: { bg: 'bg-warning-soft', dot: 'bg-warning', text: 'text-warning' },
  netral: { bg: 'bg-muted-soft', dot: 'bg-muted', text: 'text-muted' },
};

/** Badge status — dot + label (warna bukan satu-satunya makna, 02 §3); `dot={false}` utk badge penitip. */
export function Badge({ variant, label, dot = true }: BadgeProps) {
  // Pen badge status penitip (tanpa dot) memakai padding [3,10]; badge transaksi [5,11].
  const s = styles[variant];
  return (
    <span
      data-testid={`badge-${variant}`}
      className={cn('inline-flex shrink-0 items-center gap-[5px] rounded-full', dot ? 'px-[11px] py-[5px]' : 'px-2.5 py-[3px]', s.bg)}
    >
      {dot && <span aria-hidden="true" data-testid="badge-dot" className={cn('size-[5px] shrink-0 rounded-full', s.dot)} />}
      <span className={cn('text-[11px] font-semibold leading-none', s.text)}>{label}</span>
    </span>
  );
}
