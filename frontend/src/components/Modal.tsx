import { useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useDialogA11y } from './useDialogA11y';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Sub judul 12 muted di bawah judul (pen "Isi data produk baru", "TRX-… · Bu Sri"). */
  subtitle?: ReactNode;
  children: ReactNode;
  /** Footer sticky (pen Footer Sticky: p[12,20,18,20] + garis atas line-soft). */
  footer?: ReactNode;
  /** Kelas tambahan untuk area isi (mis. gap form). */
  bodyClassName?: string;
  /** Pen sheet ringkas (Catat Pembayaran/Setoran) memakai judul 17/700. */
  titleClassName?: string;
  /** Garis atas footer (pen Sheet Tambah Produk). */
  footerDivider?: boolean;
}

/**
 * Bottom sheet (pen Sheet Tambah Produk / Catat Pembayaran / Sesuaikan Stok):
 * - lapisan redup primary 40% (#0F2A1D66)
 * - sheet surface r[24,24,0,0] stroke line-soft, maks. tinggi layar − 32px
 * - Header Sticky: area gestur 44 + handle 40×4 line, judul 18/600, sub 12 muted, tutup 44 surface-muted
 * - Body Scroll p[16,20], footer sticky
 * md+: dialog tengah r24 lebar maks 600 (canvas tablet/desktop).
 * A11y: role dialog + aria-modal + judul tertaut, focus trap, Esc, overscroll contain.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  bodyClassName,
  titleClassName,
  footerDivider = false,
}: ModalProps) {
  const dialogRef = useDialogA11y<HTMLDivElement>(open, onClose);
  const titleId = useId();

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <div
        className="sheet-backdrop absolute inset-0 bg-primary/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'sheet-panel relative z-10 flex max-h-[calc(100dvh-32px)] w-full flex-col overflow-hidden',
          'rounded-t-[24px] border border-b-0 border-line-soft bg-surface focus:outline-none',
          'md:max-h-[calc(100dvh-48px)] md:max-w-[600px] md:rounded-[24px] md:border-b',
        )}
      >
        <div className="shrink-0 bg-surface px-5 pb-3.5 md:pt-5">
          <div className="flex h-11 items-center justify-center md:hidden" aria-hidden="true">
            <span className="h-1 w-10 rounded-full bg-line" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2
                id={titleId}
                className={cn('text-lg font-semibold leading-snug text-primary', titleClassName)}
              >
                {title}
              </h2>
              {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
            </div>
            <button
              type="button"
              aria-label="Tutup dialog"
              onClick={onClose}
              className="press-scale flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-muted text-primary transition-colors duration-150 ease-out hover:bg-muted-soft"
            >
              <X className="size-[18px]" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          className={cn(
            'min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-4',
            footer && 'pb-4',
            bodyClassName,
          )}
        >
          {children}
        </div>

        {footer && (
          <div
            className={cn(
              'flex shrink-0 gap-2.5 bg-surface px-5 pb-[max(18px,env(safe-area-inset-bottom))] pt-3',
              footerDivider && 'border-t border-line-soft',
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
