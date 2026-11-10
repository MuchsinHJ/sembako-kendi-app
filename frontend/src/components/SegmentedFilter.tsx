import { cn } from '@/lib/cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedFilterProps<T extends string> {
  label?: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Segmented control (02 §5): kontainer surface-muted, segmen aktif surface+border. */
export function SegmentedFilter<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedFilterProps<T>) {
  return (
    <div>
      {label && (
        <span className="mb-1.5 block text-[12.5px] font-medium text-primary-soft">{label}</span>
      )}
      <div role="radiogroup" aria-label={label} className="flex h-[52px] gap-1 rounded-segment bg-surface-muted p-1">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                'flex-1 rounded-segment-active text-xs',
                active
                  ? 'border border-line-soft bg-surface font-semibold text-primary'
                  : 'font-medium text-primary-soft'
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
