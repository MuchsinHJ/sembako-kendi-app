import { useId, useState, type FormEvent } from 'react';
import { useCreateMovement } from '@/features/consignors/api';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import {
  AmountField,
  ContextCard,
  EstimateRow,
  InlineError,
  SoftTextField,
} from '@/components/SheetParts';
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
 * Sheet Terima Titipan / Retur ke Penitip (pen GvEGl / TR9j6; BR-I/BR-J):
 * kartu stok saat ini · jumlah · perkiraan stok · catatan · footer Batal + Simpan.
 * Mengubah stok titipan lewat endpoint konsinyasi — bukan edit stok manual.
 * Retur dibatasi stok tersedia; backend menolak dengan 422 bila melebihi.
 */
export function MovementModal({ open, tipe, product, consignorNama, onClose }: MovementModalProps) {
  const formId = useId();
  const [jumlah, setJumlah] = useState('');
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
    if (melebihi) return;
    create.mutate(
      { productId: product.id, jumlah: n, catatan: catatan.trim() || null },
      {
        onSuccess: onClose,
        onError: (err: unknown) =>
          setFormError(
            err instanceof ApiError ? err.message : 'Gagal menyimpan pergerakan titipan.',
          ),
      },
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={terima ? 'Terima Titipan' : 'Retur ke Penitip'}
      subtitle={`${product.nama} · ${consignorNama}`}
      titleClassName="text-[17px] font-bold"
      footer={
        <>
          <Button variant="soft" className="w-[110px] shrink-0" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            form={formId}
            className="flex-1"
            disabled={create.isPending || melebihi || n <= 0}
          >
            {create.isPending ? 'Menyimpan…' : terima ? 'Simpan Penerimaan' : 'Simpan Retur'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
        <ContextCard label="Stok saat ini" value={product.stok} />

        <AmountField
          label={terima ? 'Jumlah diterima' : 'Jumlah diretur'}
          currency={false}
          value={jumlah}
          onChange={setJumlah}
          invalid={melebihi}
          helper={
            terima
              ? 'Masukkan jumlah barang yang diterima dari penitip.'
              : `Maksimal ${product.stok} barang. Stok tidak boleh minus.`
          }
        />

        {melebihi && (
          <InlineError>
            Jumlah retur melebihi stok tersedia. Stok saat ini {product.stok}.
          </InlineError>
        )}

        <EstimateRow
          label={terima ? 'Stok setelah diterima' : 'Stok setelah retur'}
          value={melebihi ? 'Tidak bisa dihitung' : preview}
          danger={melebihi}
        />

        <SoftTextField
          label="Catatan (boleh dikosongkan)"
          placeholder={terima ? 'cth. Titipan tambahan minggu ke-3' : 'cth. Barang ditarik penitip'}
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
        />

        {formError && <InlineError>{formError}</InlineError>}
      </form>
    </Modal>
  );
}
