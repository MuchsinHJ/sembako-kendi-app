import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { deletePhotoApi, uploadPhotoApi, useActiveConsignors, useCreateProduct, useUpdateProduct } from '../api';
import { productFormSchema, type ProductFormValues } from '../schemas';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { SegmentedFilter, type SegmentedOption } from '@/components/SegmentedFilter';
import { ApiError } from '@/lib/http';
import type { Product, ProductPayload, ProductTipe, UpdateProductPayload } from '../types';

type FieldErrors = Partial<Record<keyof ProductFormValues, string | undefined>>;

const EMPTY: ProductFormValues = {
  nama: '',
  kategori: '',
  hargaJual: '',
  hargaModal: '',
  stokAwal: '',
  stokMinimum: '0',
  tipe: 'MILIK_SENDIRI',
  consignorId: null,
  foto: null,
};

/** Konversi produk → nilai form (edit). Stok tidak pernah diedit di form. */
function fromProduct(p: Product): ProductFormValues {
  return {
    nama: p.nama,
    kategori: p.kategori,
    hargaJual: String(Number(p.hargaJual)),
    hargaModal: String(Number(p.hargaModal)),
    stokAwal: undefined,
    stokMinimum: String(p.stokMinimum),
    tipe: p.tipe,
    consignorId: p.consignorId,
    foto: null,
  };
}

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Mode edit → isi nilai + tipe/penitip read-only (BR-A, AC-20). */
  initial?: Product;
}

export function ProductFormModal({ open, onClose, initial }: ProductFormModalProps) {
  const isEdit = !!initial;
  const [values, setValues] = useState<ProductFormValues>(() => (initial ? fromProduct(initial) : EMPTY));
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [hapusFoto, setHapusFoto] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const consignors = useActiveConsignors();
  const create = useCreateProduct();
  const update = useUpdateProduct(initial?.id ?? '');
  const busy = create.isPending || update.isPending;

  const set = <K extends keyof ProductFormValues>(key: K, val: ProductFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  const payload = (parsed: ProductFormValues): ProductPayload | UpdateProductPayload => {
    const stok = parsed.stokAwal && parsed.stokAwal !== '' ? Number(parsed.stokAwal) : 0;
    const base = {
      nama: parsed.nama,
      kategori: parsed.kategori,
      hargaJual: parsed.hargaJual,
      hargaModal: parsed.hargaModal,
      stokMinimum: Number(parsed.stokMinimum),
      tipe: parsed.tipe,
      consignorId: parsed.tipe === 'TITIPAN' ? parsed.consignorId ?? null : null,
    };
    return isEdit ? base : { ...base, stok };
  };

  async function handleFoto(saved: Product) {
    if (fotoFile) await uploadPhotoApi(saved.id, fotoFile);
    else if (isEdit && hapusFoto && initial?.fotoUrl) await deletePhotoApi(saved.id);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = productFormSchema.safeParse(values);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      const next: FieldErrors = {};
      for (const key of Object.keys(flat) as Array<keyof ProductFormValues>) {
        next[key] = flat[key]?.[0];
      }
      setErrors(next);
      return;
    }
    setErrors({});

    const input = payload(parsed.data);
    const onSuccess = async (saved: Product) => {
      try {
        await handleFoto(saved);
      } catch {
        // Produk tersimpan; kegagalan foto tidak membatalkan simpanan.
      }
      setFotoFile(null);
      setHapusFoto(false);
      onClose();
    };
    const onError = (err: unknown) => {
      if (err instanceof ApiError && err.status === 400 && Array.isArray(err.details)) {
        const next: FieldErrors = {};
        for (const d of err.details) next[d.field as keyof ProductFormValues] = d.issue;
        setErrors(next);
        setFormError(null);
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Gagal menyimpan produk. Coba lagi.');
      }
    };

    if (isEdit) {
      update.mutate(input as UpdateProductPayload, { onSuccess, onError });
    } else {
      create.mutate(input as ProductPayload, { onSuccess, onError });
    }
  }

  const tipeOptions: readonly SegmentedOption<ProductTipe>[] = [
    { value: 'MILIK_SENDIRI', label: 'Milik Sendiri' },
    { value: 'TITIPAN', label: 'Titipan' },
  ];

  const fotoAda = hapusFoto ? false : initial?.fotoUrl ? true : false;

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Produk' : 'Tambah Produk'}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <TextField
          label="Nama produk"
          value={values.nama}
          onChange={(e) => set('nama', e.target.value)}
          error={errors.nama}
        />
        <TextField
          label="Kategori"
          placeholder="Mis. Sembako, Minuman"
          value={values.kategori}
          onChange={(e) => set('kategori', e.target.value)}
          error={errors.kategori}
        />

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Harga jual"
            inputMode="numeric"
            placeholder="0"
            value={values.hargaJual}
            onChange={(e) => set('hargaJual', e.target.value.replace(/[^\d.]/g, ''))}
            error={errors.hargaJual}
          />
          <TextField
            label="Harga modal"
            inputMode="numeric"
            placeholder="0"
            value={values.hargaModal}
            onChange={(e) => set('hargaModal', e.target.value.replace(/[^\d.]/g, ''))}
            error={errors.hargaModal}
            hint={values.tipe === 'TITIPAN' ? 'Harga setor ke penitip' : undefined}
          />
        </div>

        {isEdit ? (
          <div className="rounded-input border border-line-soft bg-surface-muted p-3 text-xs text-muted">
            <span className="font-semibold text-primary-soft">Tipe: </span>
            {values.tipe === 'TITIPAN' ? 'Titipan' : 'Milik Sendiri'}
            {values.tipe === 'TITIPAN' && initial?.consignor?.nama && ` · ${initial.consignor.nama}`}
            <span className="mt-1 block">Tipe dan penitip tidak dapat diubah setelah produk dibuat.</span>
          </div>
        ) : (
          <>
            <SegmentedFilter
              label="Tipe produk"
              options={tipeOptions}
              value={values.tipe}
              onChange={(tipe) => set('tipe', tipe)}
            />
            {values.tipe === 'TITIPAN' && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="consignorId" className="text-[12.5px] font-medium text-primary-soft">
                  Penitip
                </label>
                <select
                  id="consignorId"
                  value={values.consignorId ?? ''}
                  onChange={(e) => set('consignorId', e.target.value || null)}
                  className="h-12 rounded-input border border-line bg-surface px-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="">Pilih penitip…</option>
                  {consignors.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama}
                    </option>
                  ))}
                </select>
                {errors.consignorId && <p className="text-xs font-medium text-danger">{errors.consignorId}</p>}
                {consignors.isLoading && <p className="text-xs text-muted">Memuat penitip…</p>}
              </div>
            )}
          </>
        )}

        {!isEdit && (
          <TextField
            label="Stok awal"
            inputMode="numeric"
            placeholder="0"
            value={values.stokAwal ?? ''}
            onChange={(e) => set('stokAwal', e.target.value.replace(/\D/g, ''))}
            error={errors.stokAwal}
          />
        )}

        <TextField
          label="Stok minimum"
          inputMode="numeric"
          placeholder="0"
          value={values.stokMinimum}
          onChange={(e) => set('stokMinimum', e.target.value.replace(/\D/g, ''))}
          error={errors.stokMinimum}
          hint="Peringatan stok menipis muncul saat stok ≤ angka ini"
        />

        {/* Foto */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-medium text-primary-soft">Foto produk</span>
          <div className="flex items-center gap-3">
            {fotoAda ? (
              <img src={initial?.fotoUrl ?? ''} alt="Foto produk saat ini" className="size-14 rounded-input object-cover" />
            ) : (
              <div className="flex size-14 items-center justify-center rounded-input bg-muted-soft text-xs text-muted">
                Tanpa foto
              </div>
            )}
            <label className="press-scale inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-line bg-surface px-4 text-sm font-semibold text-primary">
              {fotoAda ? 'Ganti foto' : 'Pilih foto'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFotoFile(f);
                  setHapusFoto(false);
                }}
              />
            </label>
            {isEdit && initial?.fotoUrl && (
              <Button
                variant="destructive"
                className="h-11 px-4"
                onClick={() => {
                  setFotoFile(null);
                  setHapusFoto(true);
                }}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Hapus
              </Button>
            )}
          </div>
          {errors.foto && <p className="text-xs font-medium text-danger">{errors.foto}</p>}
        </div>

        {formError && (
          <p role="alert" className="text-sm font-medium text-danger">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={busy} className="mt-1">
          {busy ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Simpan Produk'}
        </Button>
      </form>
    </Modal>
  );
}
