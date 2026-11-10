import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { isValidRange } from '../utils';
import type { ReportRange } from '../types';

/** Pilih rentang tanggal laporan — default bulan berjalan. */
export function DateRangePicker({
  range,
  onChange,
}: {
  range: ReportRange;
  onChange: (r: ReportRange) => void;
}) {
  const [startDate, setStartDate] = useState(range.startDate);
  const [endDate, setEndDate] = useState(range.endDate);
  const valid = isValidRange(startDate, endDate);

  function apply() {
    if (valid) onChange({ startDate, endDate });
  }

  return (
    <div className="rounded-card border border-line-soft bg-surface p-3.5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
        <TextField
          label="Tanggal mulai"
          type="date"
          value={startDate}
          max={endDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="sm:w-44"
        />
        <TextField
          label="Tanggal akhir"
          type="date"
          value={endDate}
          min={startDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="sm:w-44"
        />
        <Button onClick={apply} disabled={!valid} className="h-11 px-5 text-xs">
          Terapkan
        </Button>
      </div>
    </div>
  );
}

/** Baris ringkasan laporan (omzet / profit / jumlah). */
export function SummaryStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card variant="metric">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</span>
      <span className={`text-xl font-bold ${accent ? 'text-warning' : 'text-primary'}`}>{value}</span>
    </Card>
  );
}

/** Tombol ekspor xlsx / pdf. */
export function ExportButtons({
  downloading,
  onExport,
}: {
  downloading: boolean;
  onExport: (format: 'xlsx' | 'pdf') => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" className="h-11 px-4 text-xs" onClick={() => onExport('xlsx')} disabled={downloading}>
        <Download className="size-4" aria-hidden="true" />
        Excel (.xlsx)
      </Button>
      <Button variant="secondary" className="h-11 px-4 text-xs" onClick={() => onExport('pdf')} disabled={downloading}>
        <Download className="size-4" aria-hidden="true" />
        PDF
      </Button>
    </div>
  );
}
