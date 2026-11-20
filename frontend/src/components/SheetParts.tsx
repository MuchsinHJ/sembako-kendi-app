import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Kartu Konteks (pen): surface-muted r14 p12 gap2 — label 11.5 muted, nilai 20/700. */
export function ContextCard({
  label,
  value,
  aside,
  className,
}: {
  label: string;
  value: ReactNode;
  /** Blok kanan opsional (pen Sesuaikan Stok: "Setelah disimpan 24 unit"). */
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-[14px] bg-surface-muted p-3',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[11.5px] text-muted">{label}</span>
        <span className="text-xl font-bold tabular-nums text-primary">{value}</span>
      </div>
      {aside}
    </div>
  );
}

interface AmountFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value' | 'prefix'
> {
  label: string;
  value: string;
  onChange: (digits: string) => void;
  /** Teks bantuan 11.5 muted (pen Helper Nominal). */
  helper?: ReactNode;
  invalid?: boolean;
  /** Tampilkan prefix "Rp" (nominal uang) — false untuk jumlah barang. */
  currency?: boolean;
}

/**
 * Blok Nominal (pen): label 10.5/600 muted · field h46 surface-muted r10 p[0,12]
 * dengan "Rp" 14/600 muted di kiri dan angka 16/600 rata kanan · helper 11.5.
 * Nilai ditampilkan berformat ribuan id-ID, disimpan sebagai digit.
 */
export function AmountField({
  label,
  value,
  onChange,
  helper,
  invalid,
  currency = true,
  id,
  className,
  ...props
}: AmountFieldProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const helperId = helper ? `${inputId}-helper` : undefined;
  const tampil = value === '' ? '' : Number(value).toLocaleString('id-ID');
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-[10.5px] font-semibold text-muted">
        {label}
      </label>
      <div
        className={cn(
          'flex h-[46px] items-center justify-between gap-2 rounded-[10px] border bg-surface-muted px-3',
          'transition-[border-color,box-shadow] duration-150 ease-out focus-within:ring-2 focus-within:ring-accent/40',
          invalid ? 'border-danger' : 'border-transparent',
        )}
      >
        {currency && <span className="shrink-0 text-sm font-semibold text-muted">Rp</span>}
        <input
          id={inputId}
          inputMode="numeric"
          autoComplete="off"
          value={tampil}
          placeholder="0"
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, ''))}
          aria-invalid={invalid || undefined}
          aria-describedby={helperId}
          className={cn(
            'h-full w-full min-w-0 bg-transparent font-semibold tabular-nums text-primary placeholder:text-muted focus:outline-none',
            // Pen: nominal uang 16/600 rata kanan; jumlah barang 20/600 rata kiri.
            currency ? 'text-right text-base' : 'text-left text-xl',
          )}
          {...props}
        />
      </div>
      {helper && (
        <p id={helperId} className="text-[11.5px] leading-normal text-muted">
          {helper}
        </p>
      )}
    </div>
  );
}

/** Field teks sheet ringkas (pen Field Catatan Penerimaan): label 10.5/600 muted, input h46 surface-muted r10 13px. */
export function SoftTextField({
  label,
  id,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-[10.5px] font-semibold text-muted">
        {label}
      </label>
      <input
        id={inputId}
        className="h-[46px] w-full rounded-[10px] bg-surface-muted px-3 text-[13px] text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
        {...props}
      />
    </div>
  );
}

/** Baris Perkiraan (pen): h44 p[0,12] surface-muted r10 — label 12 muted, nilai 13/700. */
export function EstimateRow({
  label,
  value,
  danger,
}: {
  label: string;
  value: ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className="flex min-h-11 items-center justify-between gap-3 rounded-[10px] bg-surface-muted px-3"
      aria-live="polite"
    >
      <span className="text-xs text-muted">{label}</span>
      <span
        className={cn(
          'text-[13px] font-bold tabular-nums',
          danger ? 'text-danger' : 'text-primary',
        )}
      >
        {value}
      </span>
    </div>
  );
}

/** Kotak Galat (pen): warning-soft r10 p[8,10] gap7 — ikon 15 + teks 11.5/500 danger. */
export function InlineError({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-[7px] rounded-[10px] bg-warning-soft px-2.5 py-2',
        className,
      )}
    >
      <CircleAlert className="size-[15px] shrink-0 text-danger" aria-hidden="true" />
      <p className="text-[11.5px] font-medium leading-normal text-danger">{children}</p>
    </div>
  );
}
