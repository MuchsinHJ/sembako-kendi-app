import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { pageWindow } from '@/lib/usePagedQuery';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  /** Satuan untuk ringkasan, mis. "produk", "transaksi". */
  itemLabel: string;
  /** Sedang memuat halaman baru (data lama masih tampil). */
  busy?: boolean;
  /** Versi ringkas untuk kolom sempit (panel master): tanpa nomor halaman tengah. */
  compact?: boolean;
  className?: string;
}

const btn =
  'press-scale flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-[13px] font-semibold tabular-nums transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-40';

/**
 * Paginasi bernomor untuk layout md+ (target sentuh 44px, tanpa bergantung hover).
 * Ringkasan "Menampilkan a–b dari N" di kiri, kontrol di kanan.
 */
export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
  itemLabel,
  busy = false,
  compact = false,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <nav
      aria-label={`Paginasi ${itemLabel}`}
      aria-busy={busy || undefined}
      className={cn('flex flex-wrap items-center justify-between gap-x-4 gap-y-2', className)}
    >
      <p className="text-[12.5px] tabular-nums text-muted" aria-live="polite">
        {compact ? (
          <>
            Hal. <span className="font-semibold text-primary">{page}</span> dari {totalPages}
          </>
        ) : (
          <>
            Menampilkan <span className="font-semibold text-primary">{from}–{to}</span> dari {total}{' '}
            {itemLabel}
          </>
        )}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Halaman sebelumnya"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className={cn(btn, 'border border-line bg-surface text-primary enabled:hover:bg-surface-muted')}
        >
          <ChevronLeft className="size-4" aria-hidden="true" strokeWidth={2.25} />
        </button>
        {!compact &&
          pageWindow(page, totalPages).map((p, i) =>
            p === 'gap' ? (
              <span key={`gap-${i}`} aria-hidden="true" className="w-6 text-center text-[13px] text-muted">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                aria-label={`Halaman ${p}`}
                aria-current={p === page ? 'page' : undefined}
                onClick={() => onPage(p)}
                className={cn(
                  btn,
                  p === page ? 'bg-primary text-bg' : 'text-primary-soft enabled:hover:bg-surface-muted',
                )}
              >
                {p}
              </button>
            ),
          )}
        <button
          type="button"
          aria-label="Halaman berikutnya"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className={cn(btn, 'border border-line bg-surface text-primary enabled:hover:bg-surface-muted')}
        >
          <ChevronRight className="size-4" aria-hidden="true" strokeWidth={2.25} />
        </button>
      </div>
    </nav>
  );
}
