import { useEffect, useId, useState, type FormEvent } from 'react';
import { useCreateConsignor, useUpdateConsignor } from '../api';
import { consignorFormSchema, type ConsignorFormValues } from '../schemas';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { ApiError } from '@/lib/http';
import type { Consignor, ConsignorDetail } from '../types';

interface ConsignorFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Mode edit → terisi data awal; mode tambah → undefined */
  initial?: Consignor | ConsignorDetail | null | undefined;
  onSuccess?: ((saved: ConsignorDetail) => void) | undefined;
}

type FieldErrors = Partial<Record<keyof ConsignorFormValues, string | undefined>>;

const EMPTY: ConsignorFormValues = {
  nama: '',
  noHp: '',
  catatan: '',
};

export function ConsignorFormModal({ open, onClose, initial, onSuccess }: ConsignorFormModalProps) {
  const isEdit = Boolean(initial);
  const formId = useId();
  const [values, setValues] = useState<ConsignorFormValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      setValues({
        nama: initial.nama,
        noHp: initial.noHp ?? '',
        catatan: initial.catatan ?? '',
      });
    } else {
      setValues(EMPTY);
    }
    setErrors({});
    setFormError(null);
  }, [initial, open]);

  const create = useCreateConsignor();
  const update = useUpdateConsignor(initial?.id ?? '');
  const busy = create.isPending || update.isPending;

  function set<K extends keyof ConsignorFormValues>(field: K, val: ConsignorFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: val }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = consignorFormSchema.safeParse({
      nama: values.nama.trim(),
      noHp: values.noHp ? values.noHp.trim() : undefined,
      catatan: values.catatan ? values.catatan.trim() : undefined,
    });

    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setErrors({
        nama: flat.nama?.[0],
        noHp: flat.noHp?.[0],
        catatan: flat.catatan?.[0],
      });
      return;
    }

    setErrors({});
    const payload = {
      nama: parsed.data.nama,
      noHp: parsed.data.noHp || null,
      catatan: parsed.data.catatan || null,
    };

    if (isEdit && initial) {
      update.mutate(payload, {
        onSuccess: (saved) => {
          onClose();
          onSuccess?.(saved);
        },
        onError: (err) => {
          setFormError(err instanceof ApiError ? err.message : 'Gagal memperbarui data penitip.');
        },
      });
    } else {
      create.mutate(payload, {
        onSuccess: (saved) => {
          onClose();
          onSuccess?.(saved);
        },
        onError: (err) => {
          setFormError(err instanceof ApiError ? err.message : 'Gagal menambahkan penitip baru.');
        },
      });
    }
  }

  /* Tambahan di luar canvas — mengikuti pola sheet ringkas (pen Sheet Catat Setoran):
     judul 17/700, field form 46px, footer Batal (soft, 110) + aksi utama. */
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Penitip' : 'Tambah Penitip'}
      subtitle={
        isEdit ? 'Ubah data penitip' : 'Penitip baru langsung bisa dipilih untuk produk titipan'
      }
      titleClassName="text-[17px] font-bold"
      footer={
        <>
          <Button variant="soft" className="w-[110px] shrink-0" onClick={onClose}>
            Batal
          </Button>
          <Button
            className="flex-1"
            type="submit"
            form={formId}
            disabled={busy || !values.nama.trim()}
          >
            {busy ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Simpan Penitip'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
        <TextField
          label="Nama Penitip"
          requiredMark
          placeholder="cth. Bu Ratna"
          value={values.nama}
          onChange={(e) => set('nama', e.target.value)}
          error={errors.nama}
          autoFocus
        />

        <TextField
          label="Nomor HP (boleh dikosongkan)"
          inputMode="tel"
          placeholder="cth. 0812 3456 7890"
          value={values.noHp ?? ''}
          onChange={(e) => set('noHp', e.target.value)}
          error={errors.noHp}
        />

        <TextField
          label="Catatan (boleh dikosongkan)"
          placeholder="cth. Setoran tiap Senin"
          value={values.catatan ?? ''}
          onChange={(e) => set('catatan', e.target.value)}
          error={errors.catatan}
          hint="Informasi tambahan terkait barang titipan atau jadwal setoran."
        />

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
