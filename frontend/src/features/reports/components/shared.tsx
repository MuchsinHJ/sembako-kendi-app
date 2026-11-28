import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronDown, ChevronRight, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/Button';
import { DateRangeSheet } from '@/components/DateRangeSheet';
import { InlineError } from '@/components/SheetParts';
import { useDialogA11y } from '@/components/useDialogA11y';
import { formatTanggalSingkat } from '@/lib/date';
import { cn } from '@/lib/cn';
import type { ReportRange } from '../types';

/**
 * Filter Periode (pen Filter Periode): h52 p[0,14] gap10 surface r14 stroke line-soft,
 * ikon kalender · label 11.5/600 muted + nilai 13.5/600 · chevron. Membuka sheet Rentang Tanggal.
 */
export function PeriodFilter({
  range,
  onChange,
  defaultRange,
  label = 'Periode Laporan',
  compact = false,
}: {
  range: ReportRange;
  onChange: (r: ReportRange) => void;
  defaultRange: ReportRange;
  label?: string;
  /** Pen Laporan Konsinyasi: h48, label 10.5, nilai 13. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Ubah periode laporan"
        onClick={() => setOpen(true)}
        className={cn(
          'press-scale flex w-full items-center gap-2.5 rounded-[14px] border border-line-soft bg-surface px-3.5 text-left transition-colors duration-150 ease-out hover:bg-surface-muted',
          compact ? 'h-12' : 'h-[52px]',
        )}
      >
        <CalendarDays className="size-[18px] shrink-0 text-primary-soft" aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span
            className={cn('font-semibold text-muted', compact ? 'text-[10.5px] md:text-xs' : 'text-[11.5px]')}
          >
            {label}
          </span>
          <span
            className={cn(
              'truncate font-semibold text-primary',
              compact ? 'text-[13px]' : 'text-[13.5px]',
            )}
          >
            {formatTanggalSingkat(range.startDate)} – {formatTanggalSingkat(range.endDate)}
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden="true" />
      </button>
      <DateRangeSheet
        open={open}
        onClose={() => setOpen(false)}
        value={range}
        defaultValue={defaultRange}
        title="Periode Laporan"
        subtitle="Pilih tanggal mulai dan akhir"
        note="Mengubah periode hanya memfilter laporan. Data transaksi tidak diubah atau dihapus."
        onApply={(r) => {
          onChange(r);
          setOpen(false);
        }}
      />
    </>
  );
}

/**
 * Sheet Ekspor (pen E81Ls / t4kIz): surface r[24,24,0,0] p[10,20,24,20] gap14,
 * opsi bg r14 p14 (ikon 40 surface r12 · judul 13.5/600 · ket 11 · nama file 9) + Batal 46.
 */
export function ExportSheet({
  open,
  onClose,
  title,
  range,
  filePrefix,
  onExport,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  range: ReportRange;
  filePrefix: string;
  onExport: (format: 'xlsx' | 'pdf') => Promise<void>;
}) {
  const ref = useDialogA11y<HTMLDivElement>(open, onClose);
  const [busy, setBusy] = useState<'xlsx' | 'pdf' | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!open) return null;

  async function pilih(format: 'xlsx' | 'pdf') {
    setBusy(format);
    setError(null);
    try {
      await onExport(format);
      onClose();
    } catch {
      setError('Gagal mengunduh file. Periksa koneksi lalu coba lagi.');
    } finally {
      setBusy(null);
    }
  }

  const opsi = [
    {
      format: 'xlsx' as const,
      icon: FileSpreadsheet,
      judul: 'Excel (.xlsx)',
      ket: 'Data tabel siap diolah',
    },
    { format: 'pdf' as const, icon: FileText, judul: 'PDF', ket: 'Siap cetak dan diarsipkan' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <div
        className="sheet-backdrop absolute inset-0 bg-primary/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="sheet-panel relative z-10 flex max-h-[calc(100dvh-32px)] w-full flex-col gap-3.5 overflow-y-auto overscroll-contain rounded-t-[24px] bg-surface px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-2.5 focus:outline-none md:max-w-[480px] md:rounded-[24px] md:pt-5"
      >
        <div className="flex justify-center md:hidden" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-line" />
        </div>
        <div className="flex flex-col gap-[3px]">
          <h2 className="text-[19px] font-bold text-primary">{title}</h2>
          <p className="text-xs text-muted">
            {formatTanggalSingkat(range.startDate)} – {formatTanggalSingkat(range.endDate)}
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          {opsi.map((o) => {
            const Icon = o.icon;
            return (
              <button
                key={o.format}
                type="button"
                disabled={busy !== null}
                onClick={() => void pilih(o.format)}
                className="press-scale flex items-center gap-3 rounded-[14px] border border-line bg-bg p-3.5 text-left transition-colors duration-150 ease-out enabled:hover:bg-surface-muted disabled:opacity-60"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-surface">
                  <Icon className="size-5 text-primary" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[13.5px] font-semibold text-primary">
                    {busy === o.format ? 'Menyiapkan file…' : o.judul}
                  </span>
                  <span className="text-[11px] text-muted md:text-xs">{o.ket}</span>
                  <span className="truncate text-[9px] text-muted md:text-[11.5px]">
                    {filePrefix}_{range.startDate}_{range.endDate}.{o.format}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
              </button>
            );
          })}
        </div>
        {error && <InlineError>{error}</InlineError>}
        <Button
          variant="secondary"
          className="h-[46px] w-full text-[13.5px] text-primary-soft"
          onClick={onClose}
        >
          Batal
        </Button>
      </div>
    </div>,
    document.body,
  );
}
