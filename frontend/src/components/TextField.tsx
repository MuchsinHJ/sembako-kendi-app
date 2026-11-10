import { useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
}

/** Field form (02 §5): label terlihat, input ≥46px, error 12px/danger. */
export function TextField({ label, error, hint, id, className, ...props }: TextFieldProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const descId = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-[12.5px] font-medium text-primary-soft">
        {label}
      </label>
      <input
        id={inputId}
        className={cn(
          'h-12 rounded-input border bg-surface px-3 text-sm text-primary',
          'placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40',
          error ? 'border-danger' : 'border-line'
        )}
        aria-invalid={!!error || undefined}
        aria-describedby={descId}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
