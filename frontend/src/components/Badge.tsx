import { cn } from '@/lib/cn';

export type BadgeVariant = 'lunas' | 'utang' | 'netral';

interface BadgeProps {
  variant: BadgeVariant;
  label: string;
}

const styles: Record<BadgeVariant, { bg: string; dot: string; text: string }> = {
  lunas: { bg: 'bg-success-soft', dot: 'bg-primary-soft', text: 'text-primary-soft' },
  utang: { bg: 'bg-warning-soft', dot: 'bg-warning', text: 'text-warning' },
  netral: { bg: 'bg-muted-soft', dot: 'bg-muted', text: 'text-muted' },
};

/** Badge status — selalu dot + label (warna bukan satu-satunya makna, 02 §3). */
export function Badge({ variant, label }: BadgeProps) {
  const s = styles[variant];
  return (
    <span
      data-testid={`badge-${variant}`}
      className={cn('inline-flex items-center gap-[5px] rounded-full px-[11px] py-[5px]', s.bg)}
    >
      <span aria-hidden="true" data-testid="badge-dot" className={cn('size-[5px] shrink-0 rounded-full', s.dot)} />
      <span className={cn('text-[11px] font-semibold leading-none', s.text)}>{label}</span>
    </span>
  );
}
