import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label: string;
  /** Elemen di kanan baris label (mis. tautan "+ Tambah penitip baru"). */
  action?: ReactNode | undefined;
  /** Tanda wajib "*" danger 12.5/700 (pen Label Row …). */
  requiredMark?: boolean | undefined;
  /** Teks kecil abu setelah label (pen "tidak dapat diubah"). */
  labelNote?: string | undefined;
  /** Prefix di dalam input (pen "Rp" 13/600 muted). */
  prefix?: ReactNode | undefined;
  error?: string | undefined;
  hint?: ReactNode | undefined;
  inputClassName?: string | undefined;
}

/**
 * Field form (pen Field Nama Produk): label 12.5/500 primary-soft (gap 5),
 * input h46 p[0,12] surface r10 stroke line, teks 14; hint 11.5 muted; error 12 danger.
 */
export function TextField({
  label,
  action,
  requiredMark,
  labelNote,
  prefix,
  error,
  hint,
  id,
  className,
  inputClassName,
  ...props
}: TextFieldProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const descId = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className={cn('flex flex-col gap-[5px]', className)}>
      <div className="flex min-h-[18px] items-center justify-between gap-2">
        <label
          htmlFor={inputId}
          className="flex items-baseline gap-[3px] text-[12.5px] font-medium text-primary-soft"
        >
          {label}
          {requiredMark && (
            <span aria-hidden="true" className="font-bold text-danger">
              *
            </span>
          )}
          {labelNote && (
            <span className="ms-1 text-[11px] font-normal text-muted">{labelNote}</span>
          )}
        </label>
        {action}
      </div>
      <div
        className={cn(
          'flex h-[46px] items-center gap-1 rounded-[10px] border bg-surface px-3',
          'transition-[border-color,box-shadow] duration-150 ease-out focus-within:ring-2 focus-within:ring-accent/40',
          error ? 'border-danger' : 'border-line',
          props.disabled && 'bg-surface-muted',
        )}
      >
        {prefix && <span className="shrink-0 text-[13px] font-semibold text-muted">{prefix}</span>}
        <input
          id={inputId}
          className={cn(
            'h-full w-full min-w-0 bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none disabled:cursor-not-allowed',
            inputClassName,
          )}
          aria-invalid={!!error || undefined}
          aria-describedby={descId}
          aria-required={requiredMark || undefined}
          {...props}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-[11.5px] leading-normal text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
