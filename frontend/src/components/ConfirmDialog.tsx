import { useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, Info, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useDialogA11y } from './useDialogA11y';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** warning: ikon segitiga di warning-soft · success: centang di success-soft (pen Konfirmasi Pembayaran). */
  tone?: 'warning' | 'success';
  /** Ringkas (pen Dialog Penitip Tidak Bisa Dinonaktifkan): ikon 44, judul 15.5 rata kiri. */
  compact?: boolean;
  /** Chip identitas (pen Chip Nama Produk / Chip Identitas). */
  chip?: ReactNode;
  description?: ReactNode;
  /** Catatan abu (pen Catatan Riwayat: surface-muted r12 p[10,12] + ikon info). */
  note?: ReactNode;
  children?: ReactNode;
  /** Tombol aksi; ditumpuk vertikal gap 8 (pen Aksi Dialog). */
  actions: ReactNode;
}

/**
 * Dialog konfirmasi tengah (pen Dialog Konfirmasi …): surface r20 p20 gap14, lebar 350,
 * ikon bulat 56, judul 18/700 rata tengah, keterangan 12.5 muted, aksi pill 48 bertumpuk.
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  tone = 'warning',
  compact = false,
  chip,
  description,
  note,
  children,
  actions,
}: ConfirmDialogProps) {
  const dialogRef = useDialogA11y<HTMLDivElement>(open, onClose);
  const titleId = useId();
  const descId = useId();
  if (!open) return null;

  const Icon = tone === 'success' ? Check : TriangleAlert;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
      <div className="sheet-backdrop absolute inset-0 bg-primary/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'dialog-panel relative z-10 flex max-h-[calc(100dvh-40px)] w-full max-w-[350px] flex-col overflow-y-auto overscroll-contain',
          'rounded-[20px] bg-surface p-5 focus:outline-none',
          compact ? 'gap-3' : 'items-center gap-3.5'
        )}
      >
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full',
            compact ? 'size-11' : 'size-14',
            tone === 'success' ? 'bg-success-soft text-primary-soft' : 'bg-warning-soft text-warning',
            compact && 'self-center'
          )}
        >
          <Icon className={compact ? 'size-[22px]' : 'size-[26px]'} aria-hidden="true" />
        </div>

        <div className={cn('flex w-full flex-col gap-2', !compact && 'items-center text-center')}>
          <h2 id={titleId} className={cn('font-bold text-primary', compact ? 'text-[15.5px]' : 'text-lg')}>
            {title}
          </h2>
          {chip}
          {description && (
            <div id={descId} className="text-[12.5px] leading-normal text-muted">
              {description}
            </div>
          )}
        </div>

        {children}

        {note && (
          <div className="flex w-full gap-2 rounded-[12px] bg-surface-muted px-3 py-2.5">
            <Info className="mt-px size-[15px] shrink-0 text-muted" aria-hidden="true" />
            <div className="text-[11.5px] leading-normal text-muted">{note}</div>
          </div>
        )}

        <div className="flex w-full flex-col gap-2">{actions}</div>
      </div>
    </div>,
    document.body
  );
}

/** Chip identitas dialog (pen Chip Nama Produk: surface-muted pill p[5,12] 13/600). */
export function DialogChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-surface-muted px-3 py-[5px] text-[13px] font-semibold text-primary">
      {children}
    </span>
  );
}
