import { useState, type FormEvent } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useCreateMovement } from '@/features/consignors/api';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { ApiError } from '@/lib/http';
import type { Product } from '../types';

interface MovementModalProps {
  open: boolean;
  tipe: 'TERIMA' | 'RETUR';
  product: Product;
  consignorNama: string;
  onClose: () => void;
}

/**
 * Terima Titipan / Retur ke Penitip (03 §Subflow; BR-I/BR-J).
 * Mengubah stok titipan lewat endpoint konsinyasi — bukan edit stok manual.
 * Retur dibatasi stok tersedia; backend menolak dengan 422 bila melebihi.
 */
export function MovementModal({ open, tipe, product, consignorNama, onClose }: MovementModalProps) {
  const [jumlah, setJumlah] = useState('1');
  const [catatan, setCatatan] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const create = useCreateMovement(tipe);
  const n = Number(jumlah || '0');
  const terima = tipe === 'TERIMA';
  const melebihi = !terima && n > product.stok;
  const preview = terima ? product.stok + n : product.stok - n;

  function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!Number.isInteger(n) || n <= 0) {
      setFormError('Jumlah harus lebih dari 0.');
      return;
    }
    if (melebihi) {
      setFormError(`Jumlah retur melebihi stok tersedia (${product.stok}).`);
      return;
    }
    create.mutate(
      { productId: product.id, jumlah: n, catatan: catatan.trim() || null },
      {
        onSuccess: onClose,
        onError: (err: unknown) =>
          setFormError(err instanceof ApiError ? err.message : 'Gagal menyimpan pergerakan titipan.'),
      }
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={terima ? 'Terima Titipan' : 'Retur ke Penitip'}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <div className="rounded-input border border-line-soft bg-surface-muted p-3 text-sm">
          <p className="font-semibold text-primary">{product.nama}</p>
          <p className="text-xs text-muted">
            Penitip {consignorNama} · Stok saat ini {product.stok}
          </p>
        </div>

        <div className="flex items-end gap-2">
          <Button
            variant="icon"
            aria-label="Kurangi jumlah"
            className="h-12 w-12"
            disabled={n <= 1}
            onClick={() => setJumlah(String(Math.max(1, n - 1)))}
          >
            <Minus className="size-5" aria-hidden="true" />
          </Button>
          <TextField
            label="Jumlah"
            inputMode="numeric"
            value={jumlah}
            onChange={(e) => setJumlah(e.target.value.replace(/\D/g, ''))}
            className="flex-1"
            aria-label="Jumlah titipan"
          />
          <Button
            variant="icon"
            aria-label="Tambah jumlah"
            className="h-12 w-12"
            onClick={() => setJumlah(String(n + 1))}
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
            Jumlah retur melebihi stok tersedia. Stok saat ini {product.stok}.
          </p>
        )}

        <TextField label="Catatan (opsional)" value={catatan} onChange={(e) => setCatatan(e.target.value)} />

        {formError && (
          <p role="alert" className="text-sm font-medium text-danger">
            {formError}
          </p>
        )}

        <Button
          type="submit"
          disabled={create.isPending || melebihi || n <= 0}
          className="mt-1"
          variant={terima ? 'primary' : 'secondary'}
        >
          {create.isPending ? 'Menyimpan…' : terima ? 'Simpan Penerimaan' : 'Simpan Retur'}
        </Button>
      </form>
    </Modal>
  );
}
