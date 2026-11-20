import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, Check, ChevronDown, Lock, Plus, Trash2 } from 'lucide-react';
import {
  deletePhotoApi,
  updateStatusApi,
  uploadPhotoApi,
  useActiveConsignors,
  useCreateProduct,
  useUpdateProduct,
} from '../api';
import { productFormSchema, type ProductFormValues } from '../schemas';
import { rapikanKategori } from '../kategori';
import { ConsignorFormModal } from '@/features/consignors/components/ConsignorFormModal';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { SegmentedFilter, type SegmentedOption } from '@/components/SegmentedFilter';
import { ApiError } from '@/lib/http';
import { cn } from '@/lib/cn';
import type {
  Product,
  ProductPayload,
  ProductStatus,
  ProductTipe,
  UpdateProductPayload,
} from '../types';

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

const TIPE_OPTIONS: readonly SegmentedOption<ProductTipe>[] = [
  { value: 'MILIK_SENDIRI', label: 'Milik Sendiri' },
  { value: 'TITIPAN', label: 'Titipan' },
];

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

/**
 * Sheet Tambah/Edit Produk (pen VWcec / rHlft). Urutan field mengikuti canvas:
 * Foto · Nama · Kategori · Tipe (+ Penitip) · Harga Modal/Setor + Harga Jual · Stok Awal + Stok Minimum · Status.
 * Tambahan di luar canvas: "+ Tambah penitip baru" (quick-add tanpa menutup form).
 */
export function ProductFormModal({ open, onClose, initial }: ProductFormModalProps) {
  const isEdit = !!initial;
  const formId = useId();
  const qc = useQueryClient();
  const [values, setValues] = useState<ProductFormValues>(() =>
    initial ? fromProduct(initial) : EMPTY,
  );
  const [status, setStatus] = useState<ProductStatus>(initial?.status ?? 'AKTIF');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [hapusFoto, setHapusFoto] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(() => initial?.fotoUrl ?? null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);

  useEffect(() => {
    if (fotoFile) {
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        const url = URL.createObjectURL(fotoFile);
        setPreviewUrl(url);
        return () => {
          if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
        };
      }
      setPreviewUrl('mock-preview');
    } else if (!hapusFoto && initial?.fotoUrl) {
      setPreviewUrl(initial.fotoUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [fotoFile, hapusFoto, initial?.fotoUrl]);

  const consignors = useActiveConsignors();
  const [consignorModalOpen, setConsignorModalOpen] = useState(false);
  const [createdConsignors, setCreatedConsignors] = useState<Array<{ id: string; nama: string }>>(
    [],
  );

  const allActiveConsignors = useMemo(() => {
    const list = [...(consignors.data ?? [])];
    for (const c of createdConsignors) {
      if (!list.some((existing) => existing.id === c.id)) list.push(c);
    }
    return list;
  }, [consignors.data, createdConsignors]);

  const create = useCreateProduct();
  const update = useUpdateProduct(initial?.id ?? '');
  const busy = create.isPending || update.isPending || statusBusy;

  const isTitipan = values.tipe === 'TITIPAN';
  const stokEfektif = isEdit ? (initial?.stok ?? 0) : Number(values.stokAwal || 0);
  // Aturan BE: produk titipan hanya boleh nonaktif saat stoknya 0.
  const nonaktifTerkunci =
    isTitipan && stokEfektif > 0 && (initial?.status ?? 'AKTIF') !== 'NONAKTIF';
  const statusOptions: readonly SegmentedOption<ProductStatus>[] = [
    { value: 'AKTIF', label: 'Aktif' },
    { value: 'NONAKTIF', label: 'Nonaktif', disabled: nonaktifTerkunci },
  ];

  useEffect(() => {
    if (nonaktifTerkunci && status === 'NONAKTIF') setStatus('AKTIF');
  }, [nonaktifTerkunci, status]);

  const set = <K extends keyof ProductFormValues>(key: K, val: ProductFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  const payload = (parsed: ProductFormValues): ProductPayload | UpdateProductPayload => {
    const stok = parsed.stokAwal && parsed.stokAwal !== '' ? Number(parsed.stokAwal) : 0;
    const base = {
      nama: parsed.nama,
      kategori: rapikanKategori(parsed.kategori),
      hargaJual: parsed.hargaJual,
      hargaModal: parsed.hargaModal,
      stokMinimum: Number(parsed.stokMinimum),
      tipe: parsed.tipe,
      consignorId: parsed.tipe === 'TITIPAN' ? (parsed.consignorId ?? null) : null,
    };
    return isEdit ? base : { ...base, stok };
  };

  async function handleFoto(saved: Product) {
    if (fotoFile) await uploadPhotoApi(saved.id, fotoFile);
    else if (isEdit && hapusFoto && initial?.fotoUrl) await deletePhotoApi(saved.id);
  }

  function pilihFoto(f: File | null) {
    if (!f) return;
    setFotoFile(f);
    setHapusFoto(false);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = productFormSchema.safeParse(values);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      const next: FieldErrors = {};
      for (const key of Object.keys(flat) as Array<keyof ProductFormValues>)
        next[key] = flat[key]?.[0];
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
      if (saved.status !== status) {
        setStatusBusy(true);
        try {
          await updateStatusApi(saved.id, status);
          await qc.invalidateQueries({ queryKey: ['products'] });
        } catch (err) {
          setStatusBusy(false);
          setFormError(
            `Produk tersimpan, tetapi status belum berubah: ${err instanceof ApiError ? err.message : 'coba lagi dari Detail Produk.'}`,
          );
          return;
        }
        setStatusBusy(false);
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

    if (isEdit) update.mutate(input as UpdateProductPayload, { onSuccess, onError });
    else create.mutate(input as ProductPayload, { onSuccess, onError });
  }

  const tipePenitipLabel = isTitipan
    ? `Titipan${initial?.consignor?.nama ? ` · ${initial.consignor.nama}` : ''}`
    : 'Milik Sendiri';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Produk' : 'Tambah Produk'}
      subtitle={isEdit ? 'Ubah data produk' : 'Isi data produk baru'}
      footerDivider
      footer={
        <Button type="submit" form={formId} disabled={busy} className="w-full gap-[7px]">
          {!busy && <Check className="size-4" aria-hidden="true" />}
          {busy ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Simpan Produk'}
        </Button>
      }
    >
      <form id={formId} onSubmit={onSubmit} noValidate className="flex flex-col gap-2">
        {/* Field Foto Produk (pen): kotak 52 surface-muted r10 stroke line */}
        <div className="flex flex-col gap-[5px]">
          <span className="text-[12.5px] font-medium text-primary-soft">
            {isEdit ? 'Foto Produk' : 'Foto Produk (boleh dikosongkan)'}
          </span>
          {previewUrl ? (
            <div className="flex h-[52px] items-center gap-2.5 rounded-[10px] border border-line bg-surface-muted ps-1 pe-1">
              <img
                src={previewUrl}
                alt="Pratinjau foto produk"
                className="size-11 shrink-0 rounded-[6px] bg-surface object-cover outline outline-1 -outline-offset-1 outline-black/10"
              />
              <label className="flex min-w-0 flex-1 cursor-pointer flex-col justify-center">
                <span className="truncate text-xs font-semibold text-primary">
                  {fotoFile ? fotoFile.name : 'Ganti foto produk'}
                </span>
                <span className="truncate text-[11px] text-muted">
                  {fotoFile
                    ? `${Math.max(1, Math.round(fotoFile.size / 1024))} KB · ketuk untuk ganti`
                    : 'Ketuk untuk memilih foto lain'}
                </span>
                <input
                  type="file"
                  aria-label="Pilih foto"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => pilihFoto(e.target.files?.[0] ?? null)}
                />
              </label>
              <button
                type="button"
                aria-label="Hapus foto"
                onClick={() => {
                  setFotoFile(null);
                  setHapusFoto(true);
                  setPreviewUrl(null);
                }}
                className="press-scale flex size-10 shrink-0 items-center justify-center rounded-full text-danger transition-colors duration-150 ease-out hover:bg-surface"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <label className="flex h-[52px] w-full cursor-pointer items-center justify-center gap-[9px] rounded-[10px] border border-line bg-surface-muted px-3 transition-colors duration-150 ease-out hover:bg-surface">
              <Camera className="size-[18px] shrink-0 text-primary-soft" aria-hidden="true" />
              <span className="text-xs text-muted">Tambah foto (JPG, PNG, WEBP)</span>
              <input
                type="file"
                aria-label="Pilih foto"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => pilihFoto(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
          {errors.foto && <p className="text-xs font-medium text-danger">{errors.foto}</p>}
        </div>

        <TextField
          label="Nama Produk"
          requiredMark
          placeholder="cth. Beras Ramos 5 kg"
          value={values.nama}
          onChange={(e) => set('nama', e.target.value)}
          error={errors.nama}
          inputClassName={isEdit ? 'font-semibold' : undefined}
        />
        <TextField
          label="Kategori"
          placeholder="cth. Sembako"
          value={values.kategori}
          onChange={(e) => set('kategori', e.target.value)}
          error={errors.kategori}
        />

        {isEdit ? (
          /* Field Tipe dan Penitip (Hanya Baca) */
          <div className="flex flex-col gap-[5px]">
            <span className="flex items-baseline gap-1 text-[12.5px] font-medium text-primary-soft">
              Tipe Produk &amp; Penitip
              <span className="text-[11px] font-normal text-muted">tidak dapat diubah</span>
            </span>
            <div className="flex h-[46px] items-center gap-1.5 rounded-[10px] border border-line bg-surface-muted px-3">
              <Lock className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
              <span className="truncate text-sm font-semibold text-primary-soft">
                {tipePenitipLabel}
              </span>
            </div>
            <p className="text-[11.5px] text-muted">
              Tipe produk tidak bisa diubah setelah produk dibuat.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-[5px]">
              <SegmentedFilter
                label="Tipe Produk"
                showLabel
                requiredMark
                variant="form"
                options={TIPE_OPTIONS}
                value={values.tipe}
                onChange={(tipe) => set('tipe', tipe)}
              />
              {isTitipan && (
                <p className="text-[11.5px] text-muted">
                  Harga setor diisi sesuai kesepakatan dengan penitip.
                </p>
              )}
            </div>

            {isTitipan && (
              <div className="flex flex-col gap-[5px]">
                <div className="flex min-h-[18px] items-center justify-between gap-2">
                  <label
                    htmlFor="consignorId"
                    className="flex items-baseline gap-[3px] text-[12.5px] font-medium text-primary-soft"
                  >
                    Penitip
                    <span aria-hidden="true" className="font-bold text-danger">
                      *
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setConsignorModalOpen(true)}
                    className="press-scale -my-2 inline-flex h-8 items-center gap-1 rounded-full ps-2 pe-2.5 text-xs font-semibold text-primary-soft transition-colors duration-150 ease-out hover:bg-surface-muted"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    Tambah penitip baru
                  </button>
                </div>
                <div
                  className={cn(
                    'relative flex h-[46px] items-center rounded-[10px] border bg-surface',
                    'focus-within:ring-2 focus-within:ring-accent/40',
                    errors.consignorId ? 'border-danger' : 'border-line',
                  )}
                >
                  <select
                    id="consignorId"
                    value={values.consignorId ?? ''}
                    onChange={(e) => set('consignorId', e.target.value || null)}
                    aria-invalid={!!errors.consignorId || undefined}
                    className={cn(
                      'h-full w-full appearance-none bg-transparent ps-3 pe-9 text-sm focus:outline-none',
                      values.consignorId ? 'text-primary' : 'text-muted',
                    )}
                  >
                    <option value="">Pilih penitip</option>
                    {allActiveConsignors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nama}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute end-3 size-4 text-muted"
                    aria-hidden="true"
                  />
                </div>
                {errors.consignorId && (
                  <p className="text-xs font-medium text-danger">{errors.consignorId}</p>
                )}
                {consignors.isLoading && (
                  <p className="text-[11.5px] text-muted">Memuat penitip…</p>
                )}
              </div>
            )}
          </>
        )}

        {/* Baris Harga (pen gap 10) */}
        <div className="grid grid-cols-2 gap-2.5">
          <TextField
            label={isTitipan ? 'Harga Setor' : 'Harga Modal'}
            requiredMark
            prefix="Rp"
            inputMode="numeric"
            placeholder="cth. 48.000"
            value={values.hargaModal}
            onChange={(e) => set('hargaModal', e.target.value.replace(/[^\d.]/g, ''))}
            error={errors.hargaModal}
          />
          <TextField
            label="Harga Jual"
            requiredMark
            prefix="Rp"
            inputMode="numeric"
            placeholder="cth. 65.000"
            value={values.hargaJual}
            onChange={(e) => set('hargaJual', e.target.value.replace(/[^\d.]/g, ''))}
            error={errors.hargaJual}
          />
        </div>

        {/* Baris Stok (pen gap 10). Edit: stok hanya lewat Sesuaikan Stok. */}
        {isEdit ? (
          <TextField
            label="Stok Minimum"
            inputMode="numeric"
            placeholder="cth. 5"
            value={values.stokMinimum}
            onChange={(e) => set('stokMinimum', e.target.value.replace(/\D/g, ''))}
            error={errors.stokMinimum}
            hint="Ubah jumlah stok lewat menu Sesuaikan Stok di Detail Produk."
          />
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <TextField
              label="Stok Awal"
              inputMode="numeric"
              placeholder="cth. 24"
              value={values.stokAwal ?? ''}
              onChange={(e) => set('stokAwal', e.target.value.replace(/\D/g, ''))}
              error={errors.stokAwal}
            />
            <TextField
              label="Stok Minimum"
              inputMode="numeric"
              placeholder="cth. 5"
              value={values.stokMinimum}
              onChange={(e) => set('stokMinimum', e.target.value.replace(/\D/g, ''))}
              error={errors.stokMinimum}
            />
          </div>
        )}

        {/* Field Status (pen Toggle Status) */}
        <div className="flex flex-col gap-[5px]">
          <SegmentedFilter
            label="Status Produk"
            showLabel
            variant="form"
            options={statusOptions}
            value={status}
            onChange={setStatus}
          />
          {nonaktifTerkunci && (
            <p className="text-[11.5px] text-muted">
              Produk titipan hanya bisa dinonaktifkan saat stoknya 0.
            </p>
          )}
        </div>

        {formError && (
          <p
            role="alert"
            className="rounded-[12px] bg-warning-soft px-3 py-2.5 text-xs font-medium text-warning"
          >
            {formError}
          </p>
        )}
      </form>

      <ConsignorFormModal
        open={consignorModalOpen}
        onClose={() => setConsignorModalOpen(false)}
        onSuccess={(saved) => {
          setCreatedConsignors((prev) => [...prev, { id: saved.id, nama: saved.nama }]);
          set('consignorId', saved.id);
          setConsignorModalOpen(false);
        }}
      />
    </Modal>
  );
}
