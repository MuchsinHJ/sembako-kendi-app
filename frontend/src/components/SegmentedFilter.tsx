import { cn } from '@/lib/cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SegmentedFilterProps<T extends string> {
  /** Nama aksesibel grup; tampil di atas kontrol hanya bila `showLabel`. */
  label?: string;
  /** Pen filter (Katalog/Riwayat) tanpa label terlihat; form (Tipe/Status Produk) menampilkannya. */
  showLabel?: boolean;
  /** Tanda wajib "*" pada label terlihat. */
  requiredMark?: boolean;
  /**
   * filter (pen Filter Status): h52 p4 r14, segmen aktif surface + stroke line-soft r11.
   * form (pen Toggle Tipe Produk): h44 p4 r12, segmen h36 r9, aktif primary + teks bg.
   */
  variant?: 'filter' | 'form';
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedFilter<T extends string>({
  label,
  showLabel = false,
  requiredMark = false,
  variant = 'filter',
  options,
  value,
  onChange,
  className,
}: SegmentedFilterProps<T>) {
  const form = variant === 'form';
  return (
    <div className={cn(form && 'flex flex-col gap-[5px]', className)}>
      {label && showLabel && (
        <span
          className={cn(
            'flex items-baseline gap-[3px] text-[12.5px] font-medium text-primary-soft',
            !form && 'mb-1.5',
          )}
        >
          {label}
          {requiredMark && (
            <span aria-hidden="true" className="font-bold text-danger">
              *
            </span>
          )}
        </span>
      )}
      <div
        role="radiogroup"
        aria-label={label}
        className={cn(
          'flex gap-1 bg-surface-muted p-1',
          form ? 'h-11 rounded-[12px]' : 'h-[52px] rounded-segment',
        )}
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={opt.disabled}
              onClick={() => onChange(opt.value)}
              className={cn(
                'press-scale min-w-0 flex-1 border text-xs transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50',
                form ? 'rounded-[9px]' : 'rounded-segment-active',
                active
                  ? form
                    ? 'border-transparent bg-primary font-semibold text-bg'
                    : 'border-line-soft bg-surface font-semibold text-primary'
                  : 'border-transparent font-medium text-muted enabled:hover:bg-surface/70',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
