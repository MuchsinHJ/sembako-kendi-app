import { useEffect, useId, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { InlineError } from './SheetParts';
import { cn } from '@/lib/cn';
import { dariIso, formatTanggalSingkat, keIso } from '@/lib/date';

export interface DateRangeValue {
  /** `YYYY-MM-DD` lokal */
  startDate: string;
  endDate: string;
}

const NAMA_HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
function presetRange(kind: 'hari-ini' | 'kemarin' | '7-hari' | 'bulan-ini'): DateRangeValue {
  const now = new Date();
  const today = keIso(now);
  if (kind === 'hari-ini') return { startDate: today, endDate: today };
  if (kind === 'kemarin') {
    const y = keIso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    return { startDate: y, endDate: y };
  }
  if (kind === '7-hari') {
    return { startDate: keIso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)), endDate: today };
  }
  return { startDate: keIso(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: today };
}

const PRESETS = [
  { kind: 'hari-ini', label: 'Hari Ini' },
  { kind: 'kemarin', label: 'Kemarin' },
  { kind: '7-hari', label: '7 Hari' },
  { kind: 'bulan-ini', label: 'Bulan Ini' },
] as const;

interface DateRangeSheetProps {
  open: boolean;
  onClose: () => void;
  value: DateRangeValue;
  /** Nilai "Atur Ulang". */
  defaultValue: DateRangeValue;
  onApply: (r: DateRangeValue) => void;
  title?: string;
  subtitle?: string;
  note?: string;
}

/**
 * Sheet Rentang Tanggal (pen H2tcg / O7P2m): preset 4 chip, kotak MULAI/SELESAI 64px,
 * kartu kalender bg r16 (sel 44: ujung primary pill, isi rentang accent-soft r12),
 * galat bila selesai < mulai, footer Atur Ulang (110) + Terapkan.
 * Kotak tanggal memakai input date native transparan agar bisa diketik & diakses keyboard.
 */
export function DateRangeSheet({
  open,
  onClose,
  value,
  defaultValue,
  onApply,
  title = 'Rentang Tanggal',
  subtitle = 'Pilih tanggal mulai dan akhir',
  note = 'Mengubah rentang hanya memfilter daftar riwayat. Data transaksi tidak diubah atau dihapus.',
}: DateRangeSheetProps) {
  const startId = useId();
  const endId = useId();
  const [start, setStart] = useState(value.startDate);
  const [end, setEnd] = useState(value.endDate);
  const [tahap, setTahap] = useState<'mulai' | 'selesai'>('mulai');
  const [bulan, setBulan] = useState(() => {
    const d = dariIso(value.endDate || keIso(new Date()));
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  useEffect(() => {
    if (!open) return;
    setStart(value.startDate);
    setEnd(value.endDate);
    setTahap('mulai');
    const d = dariIso(value.endDate || keIso(new Date()));
    setBulan(new Date(d.getFullYear(), d.getMonth(), 1));
  }, [open, value.startDate, value.endDate]);

  const today = keIso(new Date());
  const invalid = !!start && !!end && end < start;
  const lengkap = !!start && !!end;

  function pilihTanggal(iso: string) {
    if (tahap === 'mulai' || iso < start) {
      setStart(iso);
      setEnd(iso);
      setTahap('selesai');
    } else {
      setEnd(iso);
      setTahap('mulai');
    }
  }

  function terapkanPreset(kind: (typeof PRESETS)[number]['kind']) {
    const r = presetRange(kind);
    setStart(r.startDate);
    setEnd(r.endDate);
    setTahap('mulai');
    const d = dariIso(r.endDate);
    setBulan(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  // Grid Senin-pertama, 5–6 baris.
  const awalGrid = new Date(bulan);
  const geser = (bulan.getDay() + 6) % 7;
  awalGrid.setDate(1 - geser);
  const jumlahHari = new Date(bulan.getFullYear(), bulan.getMonth() + 1, 0).getDate();
  const totalSel = Math.ceil((geser + jumlahHari) / 7) * 7;
  const sel = Array.from({ length: totalSel }, (_, i) => {
    const d = new Date(awalGrid.getFullYear(), awalGrid.getMonth(), awalGrid.getDate() + i);
    return { iso: keIso(d), tanggal: d.getDate(), luar: d.getMonth() !== bulan.getMonth() };
  });
  const bulanDepanMelewati = keIso(new Date(bulan.getFullYear(), bulan.getMonth() + 1, 1)) > today;

  const presetAktif = PRESETS.find((p) => {
    const r = presetRange(p.kind);
    return r.startDate === start && r.endDate === end;
  })?.kind;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      titleClassName="text-[17px] font-bold"
      bodyClassName="flex flex-col gap-[18px]"
      footer={
        <>
          <Button
            variant="soft"
            className="w-[110px] shrink-0 text-primary"
            onClick={() => {
              setStart(defaultValue.startDate);
              setEnd(defaultValue.endDate);
              setTahap('mulai');
            }}
          >
            Atur Ulang
          </Button>
          <Button className="flex-1" disabled={invalid || !lengkap} onClick={() => onApply({ startDate: start, endDate: end })}>
            <Check className="size-4" aria-hidden="true" />
            Terapkan
          </Button>
        </>
      }
    >
      {/* Baris Preset (pen): 4 chip h44 surface-muted, label 11.5/600 */}
      <div className="grid grid-cols-4 gap-2" role="group" aria-label="Pilihan cepat">
        {PRESETS.map((p) => (
          <button
            key={p.kind}
            type="button"
            aria-pressed={presetAktif === p.kind}
            onClick={() => terapkanPreset(p.kind)}
            className={cn(
              'press-scale h-11 rounded-full px-1 text-[11.5px] font-semibold transition-colors duration-150 ease-out',
              presetAktif === p.kind ? 'bg-primary text-bg' : 'bg-surface-muted text-primary-soft hover:bg-muted-soft'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Baris Tanggal (pen): kotak 64 surface-muted r12 — label 10.5/600 muted, nilai 14/700 */}
      <div className="flex items-center gap-2">
        {(
          [
            { id: startId, label: 'MULAI', aria: 'Tanggal mulai', val: start, set: setStart, aktif: tahap === 'mulai', salah: false },
            { id: endId, label: 'SELESAI', aria: 'Tanggal akhir', val: end, set: setEnd, aktif: tahap === 'selesai', salah: invalid },
          ] as const
        ).map((f, idx) => (
          <div key={f.label} className="contents">
            {idx === 1 && <ArrowRight className="size-4 shrink-0 text-accent" aria-hidden="true" />}
            <label
              htmlFor={f.id}
              className={cn(
                'relative flex h-16 min-w-0 flex-1 cursor-pointer flex-col justify-center gap-0.5 rounded-[12px] border bg-surface-muted px-3 py-2.5',
                'focus-within:ring-2 focus-within:ring-accent/40',
                f.salah ? 'border-danger' : f.aktif ? 'border-accent' : 'border-transparent'
              )}
            >
              <span className="text-[10.5px] font-semibold text-muted">{f.label}</span>
              <span className={cn('truncate text-sm font-bold', f.salah ? 'text-danger' : 'text-primary')}>
                {formatTanggalSingkat(f.val)}
              </span>
              <input
                id={f.id}
                type="date"
                aria-label={f.aria}
                value={f.val}
                max={today}
                onChange={(e) => {
                  f.set(e.target.value);
                  if (e.target.value) {
                    const d = dariIso(e.target.value);
                    setBulan(new Date(d.getFullYear(), d.getMonth(), 1));
                  }
                }}
                className="absolute inset-0 size-full cursor-pointer opacity-0"
              />
            </label>
          </div>
        ))}
      </div>

      {invalid && <InlineError>Tanggal selesai harus setelah tanggal mulai. Perbaiki rentang sebelum menerapkan.</InlineError>}

      {/* Kartu Kalender (pen): bg r16 p12 gap8 */}
      <div className="flex flex-col gap-2 rounded-[16px] bg-bg p-3">
        <div className="flex h-11 items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Bulan sebelumnya"
              onClick={() => setBulan(new Date(bulan.getFullYear(), bulan.getMonth() - 1, 1))}
              className="press-scale flex size-11 items-center justify-center rounded-full bg-surface text-primary transition-colors duration-150 ease-out hover:bg-surface-muted"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Bulan berikutnya"
              disabled={bulanDepanMelewati}
              onClick={() => setBulan(new Date(bulan.getFullYear(), bulan.getMonth() + 1, 1))}
              className="press-scale flex size-11 items-center justify-center rounded-full bg-surface text-primary transition-colors duration-150 ease-out enabled:hover:bg-surface-muted disabled:opacity-40"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
          <span className="text-sm font-bold text-primary" aria-live="polite">
            {NAMA_BULAN[bulan.getMonth()]} {bulan.getFullYear()}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-[3px]" aria-hidden="true">
          {NAMA_HARI.map((h) => (
            <span key={h} className="flex h-7 items-center justify-center text-[11px] text-muted">
              {h}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-x-[3px] gap-y-1" role="group" aria-label="Kalender">
          {sel.map((c) => {
            const ujung = c.iso === start || c.iso === end;
            const dalam = !invalid && c.iso > start && c.iso < end;
            const salah = invalid && c.iso === end;
            const masaDepan = c.iso > today;
            return (
              <button
                key={c.iso}
                type="button"
                disabled={masaDepan}
                aria-label={formatTanggalSingkat(c.iso)}
                aria-pressed={ujung}
                onClick={() => pilihTanggal(c.iso)}
                className={cn(
                  'flex h-11 items-center justify-center text-[13.5px] tabular-nums transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-35',
                  salah
                    ? 'rounded-[12px] border border-danger bg-warning-soft font-bold text-danger'
                    : ujung
                      ? 'rounded-full bg-primary font-bold text-bg'
                      : dalam
                        ? 'rounded-[12px] bg-accent-soft font-semibold text-primary'
                        : c.luar
                          ? 'rounded-[12px] font-normal text-muted'
                          : 'rounded-[12px] font-semibold text-primary enabled:hover:bg-surface'
                )}
              >
                {c.tanggal}
              </button>
            );
          })}
        </div>
      </div>

      {/* Catatan Rentang (pen): ikon info 14 + teks 11.5 muted */}
      <div className="flex items-start gap-2">
        <Info className="mt-px size-3.5 shrink-0 text-muted" aria-hidden="true" />
        <p className="text-[11.5px] leading-normal text-muted">{note}</p>
      </div>
    </Modal>
  );
}
