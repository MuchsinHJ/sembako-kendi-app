import { useState, type FormEvent } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useAdjustStock } from '../api';
import { stockAdjustSchema, type StockAdjustValues } from '../schemas';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { SegmentedFilter, type SegmentedOption } from '@/components/SegmentedFilter';
import { ApiError } from '@/lib/http';
import type { Product } from '../types';

type FieldErrors = Partial<Record<keyof StockAdjustValues, string | undefined>>;

const ALASAN_CHIPS = ['Barang masuk', 'Koreksi stok', 'Barang rusak', 'Stok opname', 'Lainnya'] as const;

interface StockAdjustModalProps {
  open: boolean;
  onClose: () => void;
  product: Product;
}

/**
 * Sesuaikan Stok (04 §3): pratinjau stok akhir + alasan wajib utk audit.
 * Stok tidak pernah diedit lewat form produk — hanya di sini (SDD §3.5).
 */
export function StockAdjustModal({ open, onClose, product }: StockAdjustModalProps) {
  const [arah, setArah] = useState<'tambah' | 'kurangi'>('tambah');
  const [jumlah, setJumlah] = useState('1');
  const [alasan, setAlasan] = useState<string>('');
  const [alasanLain, setAlasanLain] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const adjust = useAdjustStock(product.id);

  const delta = arah === 'tambah' ? Number(jumlah) : -Number(jumlah);
  const preview = product.stok + (Number.isFinite(delta) ? delta : 0);
  const melebihi = arah === 'kurangi' && Number.isFinite(delta) && delta < 0 && preview < 0;

  const alasanFinal = alasan === 'Lainnya' ? alasanLain.trim() : alasan;

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
          setFormError(err instanceof ApiError ? err.message : 'Gagal menyesuaikan stok. Coba lagi.'),
      }
    );
  }

  const arahOptions: readonly SegmentedOption<'tambah' | 'kurangi'>[] = [
    { value: 'tambah', label: 'Tambah' },
    { value: 'kurangi', label: 'Kurangi' },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Sesuaikan Stok">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="rounded-input border border-line-soft bg-surface-muted p-3 text-sm">
          <span className="text-muted">Stok saat ini: </span>
          <span className="font-bold text-primary">{product.stok}</span>
        </div>

        <SegmentedFilter label="Arah penyesuaian" options={arahOptions} value={arah} onChange={setArah} />

        <div className="flex items-end gap-2">
          <Button
            variant="icon"
            aria-label="Kurangi jumlah"
            className="h-12 w-12"
            disabled={Number(jumlah) <= 1}
            onClick={() => setJumlah(String(Math.max(1, Number(jumlah) - 1)))}
          >
            <Minus className="size-5" aria-hidden="true" />
          </Button>
          <TextField
            label="Jumlah"
            inputMode="numeric"
            value={jumlah}
            onChange={(e) => setJumlah(e.target.value.replace(/\D/g, ''))}
            error={errors.jumlah}
            className="flex-1"
            aria-label="Jumlah penyesuaian"
          />
          <Button
            variant="icon"
            aria-label="Tambah jumlah"
            className="h-12 w-12"
            onClick={() => setJumlah(String(Number(jumlah) + 1))}
          >
            <Plus className="size-5" aria-hidden="true" />
          </Button>
        </div>

        <div className="rounded-input border border-line-soft bg-surface-muted p-3 text-sm">
          <span className="text-muted">Stok setelah penyimpanan: </span>
          <span className={melebihi ? 'font-bold text-danger' : 'font-bold text-primary'}>{preview}</span>
        </div>

        {melebihi && (
          <p role="alert" className="text-xs font-medium text-danger">
            Jumlah pengurangan melebihi stok saat ini. Stok tersisa {product.stok}.
          </p>
        )}

        <fieldset>
          <legend className="mb-1.5 text-[12.5px] font-medium text-primary-soft">Alasan (wajib)</legend>
          <div className="flex flex-wrap gap-2">
            {ALASAN_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                aria-pressed={alasan === chip}
                onClick={() => {
                  setAlasan(chip);
                  if (chip !== 'Lainnya') setAlasanLain('');
                }}
                className={`h-10 rounded-full px-4 text-xs whitespace-nowrap ${
                  alasan === chip
                    ? 'bg-primary font-semibold text-bg'
                    : 'border border-line bg-surface font-medium text-primary-soft'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </fieldset>

        {alasan === 'Lainnya' && (
          <TextField
            label="Tulis alasan"
            value={alasanLain}
            onChange={(e) => setAlasanLain(e.target.value)}
            error={errors.alasanLain}
          />
        )}

        {formError && (
          <p role="alert" className="text-sm font-medium text-danger">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={adjust.isPending || melebihi || !alasanFinal} className="mt-1">
          {adjust.isPending ? 'Menyimpan…' : 'Simpan Penyesuaian'}
        </Button>
      </form>
    </Modal>
  );
}
