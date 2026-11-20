import { useId, useState, type FormEvent } from 'react';
import { Check, Circle, CircleCheck, Minus, Plus } from 'lucide-react';
import { useAdjustStock } from '../api';
import { stockAdjustSchema, type StockAdjustValues } from '../schemas';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { ApiError } from '@/lib/http';
import { cn } from '@/lib/cn';
import type { Product } from '../types';

type FieldErrors = Partial<Record<keyof StockAdjustValues, string | undefined>>;
type Arah = 'tambah' | 'kurangi';

/** Alasan per arah (pen Grid Alasan: tambah vs kurangi). */
const ALASAN: Record<Arah, readonly string[]> = {
  tambah: ['Barang datang', 'Retur pembeli', 'Stok opname', 'Lainnya'],
  kurangi: ['Barang rusak', 'Barang hilang', 'Stok opname', 'Lainnya'],
};

interface StockAdjustModalProps {
  open: boolean;
  onClose: () => void;
  product: Product;
}

/**
 * Sheet Sesuaikan Stok (pen d5pDWi / v2B0v / P4v15):
 * kartu stok saat ini + pratinjau, toggle Tambah/Kurangi (pill 52), stepper 56,
 * grid alasan 2 kolom, "Tulis alasan" bila Lainnya. CTA "Tambahkan N Unit" / "Kurangi N Unit".
 * Stok tidak pernah diedit lewat form produk — hanya di sini (SDD §3.5).
 */
export function StockAdjustModal({ open, onClose, product }: StockAdjustModalProps) {
  const formId = useId();
  const jumlahId = useId();
  const [arah, setArah] = useState<Arah>('tambah');
  const [jumlah, setJumlah] = useState('1');
  const [alasan, setAlasan] = useState<string>('');
  const [alasanLain, setAlasanLain] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const adjust = useAdjustStock(product.id);

  const n = Number(jumlah) || 0;
  const delta = arah === 'tambah' ? n : -n;
  const preview = product.stok + delta;
  const melebihi = arah === 'kurangi' && preview < 0;
  const alasanFinal = alasan === 'Lainnya' ? alasanLain.trim() : alasan;
  const bisaSimpan = n > 0 && !melebihi && !!alasanFinal && !adjust.isPending;

  function gantiArah(next: Arah) {
    setArah(next);
    if (alasan && !ALASAN[next].includes(alasan)) {
      setAlasan('');
      setAlasanLain('');
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = stockAdjustSchema.safeParse({ arah, jumlah, alasan, alasanLain });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setErrors({ jumlah: flat.jumlah?.[0], alasanLain: flat.alasanLain?.[0] });
      return;
    }
    setErrors({});
    adjust.mutate(
      { delta, alasan: alasanFinal },
      {
        onSuccess: () => onClose(),
        onError: (err: unknown) =>
          setFormError(
            err instanceof ApiError ? err.message : 'Gagal menyesuaikan stok. Coba lagi.',
          ),
      },
    );
  }

  const tambah = arah === 'tambah';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sesuaikan Stok"
      subtitle={`${product.nama} · ${product.kategori}`}
      titleClassName="text-[19px] font-bold"
      footerDivider
      footer={
        <Button type="submit" form={formId} disabled={!bisaSimpan} className="h-[50px] w-full">
          {adjust.isPending ? (
            'Menyimpan…'
          ) : (
            <>
              <Check className="size-4" aria-hidden="true" />
              {tambah ? `Tambahkan ${n} Unit` : `Kurangi ${n} Unit`}
            </>
          )}
        </Button>
      }
    >
      <form id={formId} onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5">
        {/* Kartu Stok Saat Ini (pen): surface-muted r14 p14 — kiri stok 22/700, kanan pratinjau 15/700 */}
        <div className="flex items-center justify-between gap-3 rounded-[14px] bg-surface-muted p-3.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11.5px] text-muted">Stok saat ini</span>
            <span className="text-[22px] font-bold tabular-nums text-primary">
              {product.stok} unit
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5" aria-live="polite">
            <span className="text-[11.5px] text-muted">Setelah disimpan</span>
            <span
              className={cn(
                'text-[15px] font-bold tabular-nums',
                melebihi ? 'text-danger' : 'text-primary-soft',
              )}
            >
              {melebihi ? 'Tidak valid' : `${preview} unit`}
            </span>
          </div>
        </div>

        {/* Toggle Jenis (pen): pill 52 p4, segmen 44 pill — aktif primary, nonaktif muted */}
        <div className="flex flex-col gap-1.5">
          <span id={`${formId}-jenis`} className="text-[12.5px] font-semibold text-primary">
            Jenis Penyesuaian
          </span>
          <div
            role="radiogroup"
            aria-labelledby={`${formId}-jenis`}
            className="flex h-[52px] gap-1 rounded-full bg-surface-muted p-1"
          >
            {(['tambah', 'kurangi'] as const).map((a) => {
              const aktif = arah === a;
              const Icon = a === 'tambah' ? Plus : Minus;
              return (
                <button
                  key={a}
                  type="button"
                  role="radio"
                  aria-checked={aktif}
                  onClick={() => gantiArah(a)}
                  className={cn(
                    'press-scale flex flex-1 items-center justify-center gap-1.5 rounded-full text-[13.5px] font-semibold transition-colors duration-150 ease-out',
                    aktif ? 'bg-primary text-bg' : 'text-muted hover:bg-surface/70',
                  )}
                >
                  <Icon className="size-[15px]" aria-hidden="true" />
                  {a === 'tambah' ? 'Tambah Stok' : 'Kurangi Stok'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stepper Penyesuaian (pen): tombol 56 bulat, kotak jumlah 56 r14 22/700 */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={jumlahId} className="text-[12.5px] font-semibold text-primary">
            Jumlah Penyesuaian
          </label>
          <div className="flex h-14 items-center gap-2.5">
            <button
              type="button"
              aria-label="Kurangi jumlah"
              disabled={n <= 1}
              onClick={() => setJumlah(String(Math.max(1, n - 1)))}
              className={cn(
                'press-scale flex size-14 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ease-out disabled:opacity-40',
                tambah ? 'bg-surface-muted text-primary' : 'bg-primary text-bg',
              )}
            >
              <Minus className="size-5" aria-hidden="true" />
            </button>
            <input
              id={jumlahId}
              inputMode="numeric"
              aria-label="Jumlah penyesuaian"
              aria-invalid={melebihi || !!errors.jumlah || undefined}
              value={jumlah}
              onChange={(e) =>
                setJumlah(e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, ''))
              }
              className={cn(
                'h-14 w-full min-w-0 rounded-[14px] border bg-surface text-center text-[22px] font-bold tabular-nums text-primary',
                'focus:outline-none focus:ring-2 focus:ring-accent/40',
                melebihi || errors.jumlah ? 'border-danger' : 'border-line',
              )}
            />
            <button
              type="button"
              aria-label="Tambah jumlah"
              onClick={() => setJumlah(String(n + 1))}
              className={cn(
                'press-scale flex size-14 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ease-out',
                tambah ? 'bg-primary text-bg' : 'bg-surface-muted text-primary',
              )}
            >
              <Plus className="size-5" aria-hidden="true" />
            </button>
          </div>
          {errors.jumlah ? (
            <p className="text-[11.5px] font-medium text-danger">{errors.jumlah}</p>
          ) : melebihi ? (
            <p role="alert" className="text-[11.5px] font-medium text-danger">
              Jumlah pengurangan melebihi stok saat ini. Stok tersisa {product.stok}.
            </p>
          ) : tambah ? (
            <p className="text-[11.5px] text-muted">
              Stok akan menjadi {preview} unit setelah penyesuaian.
            </p>
          ) : (
            <p className="text-[11.5px] text-warning">
              Maksimal {product.stok} unit. Stok tidak boleh negatif.
            </p>
          )}
        </div>

        {/* Grid Alasan (pen): 2 kolom gap 8, item h48 r12 — terpilih success-soft + garis primary-soft */}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[12.5px] font-semibold text-primary">
            Alasan Penyesuaian
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {ALASAN[arah].map((label) => {
              const aktif = alasan === label;
              const Icon = aktif ? CircleCheck : Circle;
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={aktif}
                  onClick={() => {
                    setAlasan(label);
                    if (label !== 'Lainnya') setAlasanLain('');
                  }}
                  className={cn(
                    'press-scale flex h-12 items-center gap-[7px] rounded-[12px] border px-3 text-left text-[12.5px] transition-colors duration-150 ease-out',
                    aktif
                      ? 'border-primary-soft bg-success-soft font-semibold text-primary'
                      : 'border-line bg-surface text-muted hover:bg-surface-muted',
                  )}
                >
                  <Icon
                    className={cn(
                      'size-[15px] shrink-0',
                      aktif ? 'text-primary-soft' : 'text-accent-soft',
                    )}
                    aria-hidden="true"
                  />
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {alasan === 'Lainnya' && (
          <TextField
            label="Tulis alasan"
            requiredMark
            placeholder="cth. kemasan sudah expired"
            value={alasanLain}
            onChange={(e) => setAlasanLain(e.target.value)}
            error={errors.alasanLain}
            hint="Alasan ini disimpan sebagai keterangan penyesuaian di riwayat stok."
          />
        )}

        {formError && (
          <p
            role="alert"
            className="rounded-[10px] bg-warning-soft px-2.5 py-2 text-[11.5px] font-medium text-danger"
          >
            {formError}
          </p>
        )}
      </form>
    </Modal>
  );
}
