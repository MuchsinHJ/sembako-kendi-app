import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpDown,
  Check,
  Info,
  Package,
  PackageMinus,
  PackagePlus,
  Pencil,
  PowerOff,
  Trash2,
} from 'lucide-react';
import { useDeleteProduct, useProduct, useUpdateStatus } from './api';
import { ProductFormModal } from './components/ProductFormModal';
import { StockAdjustModal } from './components/StockAdjustModal';
import { MovementModal } from './components/MovementModal';
import { ConfirmDialog, DialogChip } from '@/components/ConfirmDialog';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formatRupiah } from '@/lib/money';
import { ApiError } from '@/lib/http';
import { cn } from '@/lib/cn';
import { labelKategoriTipe } from './kategori';

/** Baris rincian (pen Rincian …): label 12.5 muted · nilai 13/600 primary. */
function RincianRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12.5px] text-muted">{label}</span>
      <span className="text-[13px] font-semibold tabular-nums text-primary">{value}</span>
    </div>
  );
}

/**
 * Layar Detail Produk (pen Y9XcL / joT9S titipan / iqL2W nonaktif / bCJpv berhasil).
 * Body gap 8: foto 140 (titipan 78) · identitas · kartu harga jual · kartu rincian · aksi pill.
 */
export function DetailProdukPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: product, isLoading, isError, refetch } = useProduct(id);

  const [editOpen, setEditOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [nonaktifOpen, setNonaktifOpen] = useState(false);
  const [hapusOpen, setHapusOpen] = useState(false);
  const [hasTransaction, setHasTransaction] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [movement, setMovement] = useState<'TERIMA' | 'RETUR' | null>(null);
  const [berhasilNonaktif, setBerhasilNonaktif] = useState(false);

  const updateStatus = useUpdateStatus(id);
  const deleteProduct = useDeleteProduct();

  if (isLoading) {
    return (
      <div className="flex animate-pulse flex-col gap-2" aria-busy="true">
        <div className="h-11 w-1/2 rounded-full bg-muted-soft" />
        <div className="h-[140px] rounded-[16px] bg-muted-soft" />
        <div className="h-7 w-2/3 rounded bg-muted-soft" />
        <div className="h-[84px] rounded-[16px] bg-muted-soft" />
        <div className="h-[120px] rounded-[16px] bg-muted-soft" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="flex flex-col gap-3">
        <ScreenHeader onBack={() => navigate('/produk')} title="Detail Produk" />
        <Card variant="warning" className="items-start">
          <p className="text-sm font-semibold text-warning">Gagal memuat produk.</p>
          <Button variant="secondary" className="mt-1 h-10 px-4 text-xs" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </Card>
      </div>
    );
  }

  const p = product;
  const isTitipan = p.tipe === 'TITIPAN';
  const nonaktif = p.status === 'NONAKTIF';

  function deactivate() {
    setHasTransaction(false);
    setHapusOpen(false);
    setActionMsg(null);
    updateStatus.mutate('NONAKTIF', {
      onSuccess: () => {
        setNonaktifOpen(false);
        setBerhasilNonaktif(true);
      },
      onError: (err: unknown) => {
        setNonaktifOpen(false);
        setActionMsg(err instanceof ApiError ? err.message : 'Gagal menonaktifkan produk.');
      },
    });
  }

  function hapus() {
    setHapusOpen(false);
    deleteProduct.mutate(id, {
      onSuccess: () => navigate('/produk'),
      onError: (err: unknown) => {
        if (err instanceof ApiError && err.code === 'PRODUCT_HAS_TRANSACTION')
          setHasTransaction(true);
        else setActionMsg(err instanceof ApiError ? err.message : 'Gagal menghapus produk.');
      },
    });
  }

  /* Subflow / Produk Berhasil Dinonaktifkan (pen bCJpv): ikon 72, judul 20/700, chip nama, catatan, CTA */
  if (berhasilNonaktif) {
    return (
      <div className="flex min-h-[calc(100dvh-128px-env(safe-area-inset-bottom))] flex-col items-center justify-center gap-4 text-center md:min-h-[60dvh]">
        <div className="flex size-[72px] items-center justify-center rounded-full bg-success-soft">
          <Check className="size-[34px] text-primary" aria-hidden="true" />
        </div>
        <div role="status" className="flex w-full flex-col items-center gap-2">
          <h1 className="text-xl font-bold text-primary">Produk berhasil dinonaktifkan</h1>
          <DialogChip>{p.nama}</DialogChip>
          <p className="text-[12.5px] text-muted">
            Produk kini berstatus Nonaktif dan tidak bisa dipilih pada transaksi baru.
          </p>
        </div>
        <div className="flex w-full items-start gap-2 rounded-[12px] border border-line-soft bg-surface px-3 py-2.5 text-left">
          <Info className="mt-px size-4 shrink-0 text-primary-soft" aria-hidden="true" />
          <p className="text-xs text-muted">
            Riwayat transaksi dan catatan terkait produk ini tetap tersimpan.
          </p>
        </div>
        <Button className="w-full md:max-w-sm" onClick={() => navigate('/produk')}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Kembali ke Katalog Produk
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <ScreenHeader onBack={() => navigate('/produk')} title="Detail Produk" subtitle={p.nama} />

      <div className="flex flex-col gap-2 md:flex-row md:items-start md:gap-[18px]">
        {/* Foto Produk (pen): surface-muted r16, 140px (titipan 78px tanpa foto) */}
        <div className="w-full md:w-1/2">
          {p.fotoUrl ? (
            <img
              src={p.fotoUrl}
              alt={`Foto ${p.nama}`}
              className={cn(
                'h-[140px] w-full rounded-[16px] bg-surface-muted object-cover outline outline-1 -outline-offset-1 outline-black/10 md:aspect-square md:h-auto',
                nonaktif && 'opacity-60',
              )}
            />
          ) : (
            <div
              className={cn(
                'flex w-full items-center justify-center rounded-[16px] bg-surface-muted md:aspect-square md:h-auto',
                isTitipan && !nonaktif ? 'h-[78px]' : 'h-[140px]',
              )}
            >
              <Package
                className={cn('size-12 md:size-16', nonaktif ? 'text-muted' : 'text-primary-soft')}
                aria-hidden="true"
              />
            </div>
          )}
        </div>

        <div className={cn('flex min-w-0 flex-1 flex-col', nonaktif ? 'gap-3' : 'gap-2')}>
          {/* Blok Identitas (pen gap 6): nama 22/700 · kategori 12 muted + badge */}
          <div className="flex flex-col gap-1.5">
            <h2
              className={cn(
                'text-[22px] font-bold leading-tight',
                nonaktif ? 'text-muted' : 'text-primary',
              )}
            >
              {p.nama}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">
                {isTitipan ? labelKategoriTipe(p) : p.kategori}
              </span>
              <Badge
                variant={nonaktif ? 'netral' : 'lunas'}
                label={nonaktif ? 'Nonaktif' : 'Aktif'}
              />
            </div>
          </div>

          {/* Kartu Harga Jual (pen): p16 gap2 r16 stroke line-soft */}
          <div className="flex flex-col gap-0.5 rounded-[16px] border border-line-soft bg-surface p-4">
            <span className="text-xs text-muted">Harga jual</span>
            <span
              className={cn(
                'text-[28px] font-bold leading-tight tabular-nums',
                nonaktif ? 'text-muted' : 'text-primary',
              )}
            >
              {formatRupiah(p.hargaJual)}
            </span>
          </div>

          {/* Kartu Rincian Produk (pen): p16 gap10 + pemisah line-soft */}
          <div className="flex flex-col gap-2.5 rounded-[16px] border border-line-soft bg-surface p-4">
            <RincianRow
              label={isTitipan ? 'Harga setor' : 'Harga modal'}
              value={formatRupiah(p.hargaModal)}
            />
            <div className="h-px bg-line-soft" />
            <RincianRow label="Stok saat ini" value={p.stok} />
            <div className="h-px bg-line-soft" />
            <RincianRow label="Stok minimum" value={p.stokMinimum} />
          </div>

          {actionMsg && (
            <p
              role="status"
              className="rounded-[12px] bg-warning-soft px-3 py-2.5 text-xs font-medium text-warning"
            >
              {actionMsg}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Button
              className={cn('w-full', isTitipan && !nonaktif && 'h-11')}
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-4" aria-hidden="true" />
              Edit Produk
            </Button>

            {nonaktif ? (
              /* Catatan Produk Nonaktif (pen): surface-muted r12 p[10,12] gap 8 */
              <div className="flex items-start gap-2 rounded-[12px] bg-surface-muted px-3 py-2.5">
                <Info className="mt-px size-4 shrink-0 text-muted" aria-hidden="true" />
                <p className="text-xs text-muted">
                  Produk ini sudah nonaktif. Aktifkan kembali lewat Edit Produk bila ingin dijual
                  lagi.
                </p>
              </div>
            ) : (
              <>
                <Button
                  variant="secondary"
                  className={cn('w-full', isTitipan && 'h-11')}
                  onClick={() => setAdjustOpen(true)}
                >
                  <ArrowUpDown className="size-4" aria-hidden="true" />
                  Sesuaikan Stok
                </Button>
                {isTitipan && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <Button
                      variant="secondary"
                      className="px-3 text-[13px]"
                      onClick={() => setMovement('TERIMA')}
                    >
                      <PackagePlus className="size-4" aria-hidden="true" />
                      Terima Titipan
                    </Button>
                    <Button
                      variant="secondary"
                      className="px-3 text-[13px]"
                      onClick={() => setMovement('RETUR')}
                    >
                      <PackageMinus className="size-4" aria-hidden="true" />
                      Retur ke Penitip
                    </Button>
                  </div>
                )}
                <Button
                  variant="destructive"
                  className={cn('w-full', isTitipan && 'h-11')}
                  onClick={() => setNonaktifOpen(true)}
                >
                  <PowerOff className="size-4" aria-hidden="true" />
                  Nonaktifkan Produk
                </Button>
              </>
            )}

            {/* Tambahan di luar canvas: hapus permanen hanya untuk produk tanpa transaksi (BR-12). */}
            <button
              type="button"
              onClick={() => setHapusOpen(true)}
              className="press-scale mx-auto inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-semibold text-danger transition-colors duration-150 ease-out hover:bg-danger/10"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Hapus Produk
            </button>
          </div>
        </div>
      </div>

      <ProductFormModal
        key={`${p.id}-${p.updatedAt}`}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={p}
      />
      <StockAdjustModal open={adjustOpen} onClose={() => setAdjustOpen(false)} product={p} />
      {isTitipan && p.consignor && (
        <MovementModal
          key={movement ?? 'none'}
          open={movement !== null}
          tipe={movement ?? 'TERIMA'}
          product={p}
          consignorNama={p.consignor.nama}
          onClose={() => {
            setMovement(null);
            refetch();
          }}
        />
      )}

      {/* Dialog Konfirmasi Nonaktifkan Produk (pen kHwod) */}
      <ConfirmDialog
        open={nonaktifOpen}
        onClose={() => setNonaktifOpen(false)}
        title="Nonaktifkan produk ini?"
        chip={<DialogChip>{p.nama}</DialogChip>}
        description={
          <>
            Produk tidak lagi tersedia untuk transaksi baru. Riwayat transaksi dan laporan lama
            tetap tersimpan.
            {isTitipan && ' Produk titipan hanya dapat dinonaktifkan jika stoknya 0.'}
          </>
        }
        actions={
          <>
            <Button variant="secondary" className="w-full" onClick={() => setNonaktifOpen(false)}>
              Batal
            </Button>
            <Button
              variant="danger"
              className="w-full"
              onClick={deactivate}
              disabled={updateStatus.isPending}
            >
              <PowerOff className="size-4" aria-hidden="true" />
              {updateStatus.isPending ? 'Menyimpan…' : 'Nonaktifkan Produk'}
            </Button>
          </>
        }
      />

      <ConfirmDialog
        open={hapusOpen}
        onClose={() => setHapusOpen(false)}
        title="Hapus produk ini?"
        chip={<DialogChip>{p.nama}</DialogChip>}
        description="Produk akan dihapus permanen. Hapus hanya diizinkan bila produk belum pernah dipakai dalam transaksi."
        actions={
          <>
            <Button variant="secondary" className="w-full" onClick={() => setHapusOpen(false)}>
              Batal
            </Button>
            <Button
              variant="danger"
              className="w-full"
              onClick={hapus}
              disabled={deleteProduct.isPending}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {deleteProduct.isPending ? 'Menghapus…' : 'Hapus Produk'}
            </Button>
          </>
        }
      />

      {/* 422 PRODUCT_HAS_TRANSACTION (BR-12/BR-26) → tawarkan Nonaktifkan */}
      <ConfirmDialog
        open={hasTransaction}
        onClose={() => setHasTransaction(false)}
        title="Produk tidak dapat dihapus"
        description="Produk ini sudah memiliki riwayat transaksi. Hapus permanen tidak diizinkan — nonaktifkan produk agar tidak muncul dalam transaksi baru."
        actions={
          <>
            <Button variant="secondary" className="w-full" onClick={() => setHasTransaction(false)}>
              Tutup
            </Button>
            {!nonaktif && (
              <Button
                variant="danger"
                className="w-full"
                onClick={deactivate}
                disabled={updateStatus.isPending}
              >
                <PowerOff className="size-4" aria-hidden="true" />
                Nonaktifkan Produk
              </Button>
            )}
          </>
        }
      />
    </div>
  );
}
