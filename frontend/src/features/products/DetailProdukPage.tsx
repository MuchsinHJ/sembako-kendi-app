import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Package } from 'lucide-react';
import { useDeleteProduct, useProduct, useUpdateStatus } from './api';
import { ProductFormModal } from './components/ProductFormModal';
import { StockAdjustModal } from './components/StockAdjustModal';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formatRupiah } from '@/lib/money';
import { ApiError } from '@/lib/http';

/** Dialog 422 `PRODUCT_HAS_TRANSACTION` (BR-12/BR-26) → hanya Nonaktifkan. */
function HasTransactionDialog({ onClose, onDeactivate }: { onClose: () => void; onDeactivate: () => void }) {
  return (
    <Modal open title="Produk tidak dapat dihapus" onClose={onClose}>
      <p className="text-sm text-primary">
        Produk ini sudah memiliki riwayat transaksi. Hapus permanen tidak diizinkan — Anda dapat
        menonaktifkan produk agar tidak muncul dalam transaksi baru.
      </p>
      <div className="mt-5 flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Tutup
        </Button>
        <Button className="flex-1" onClick={onDeactivate}>
          Nonaktifkan Produk
        </Button>
      </div>
    </Modal>
  );
}

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

  const updateStatus = useUpdateStatus(id);
  const deleteProduct = useDeleteProduct();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-9 w-1/2 rounded bg-muted-soft" />
        <div className="h-[140px] rounded-card bg-muted-soft" />
        <div className="h-24 rounded-card bg-muted-soft" />
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

  function deactivate() {
    setHasTransaction(false);
    setNonaktifOpen(false);
    setHapusOpen(false);
    updateStatus.mutate('NONAKTIF', {
      onSuccess: () => setActionMsg('Produk dinonaktifkan.'),
      onError: (err: unknown) =>
        setActionMsg(err instanceof ApiError ? err.message : 'Gagal menonaktifkan produk.'),
    });
  }

  function hapus() {
    setHapusOpen(false);
    deleteProduct.mutate(id, {
      onSuccess: () => navigate('/produk'),
      onError: (err: unknown) => {
        if (err instanceof ApiError && err.code === 'PRODUCT_HAS_TRANSACTION') setHasTransaction(true);
        else setActionMsg(err instanceof ApiError ? err.message : 'Gagal menghapus produk.');
      },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader
        onBack={() => navigate('/produk')}
        title="Detail Produk"
        subtitle={p.nama}
        action={<Badge variant={p.status === 'AKTIF' ? 'lunas' : 'netral'} label={p.status === 'AKTIF' ? 'Aktif' : 'Nonaktif'} />}
      />

      {p.fotoUrl ? (
        <img src={p.fotoUrl} alt={`Foto ${p.nama}`} className="h-[140px] w-full rounded-card border border-line-soft object-cover" />
      ) : (
        <div className="flex h-[140px] w-full items-center justify-center rounded-card border border-line-soft bg-surface-muted">
          <Package className="size-12 text-accent" aria-hidden="true" />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <h2 className="text-[22px] font-bold text-primary">{p.nama}</h2>
        <p className="text-xs text-muted">
          {p.kategori} · {isTitipan ? 'Titipan' : 'Milik Sendiri'}
          {isTitipan && p.consignor && ` · ${p.consignor.nama}`}
        </p>
      </div>

      <Card variant="metric">
        <span className="text-xs text-muted">Harga jual</span>
        <span className="text-[28px] font-bold leading-none text-primary">{formatRupiah(p.hargaJual)}</span>
      </Card>

      <Card variant="list" className="divide-y divide-line-soft">
        <div className="flex items-center justify-between py-2.5">
          <span className="text-sm text-muted">Harga modal</span>
          <span className="text-sm font-semibold text-primary">{formatRupiah(p.hargaModal)}</span>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <span className="text-sm text-muted">Stok saat ini</span>
          <span className="text-sm font-semibold text-primary">{p.stok}</span>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <span className="text-sm text-muted">Stok minimum</span>
          <span className="text-sm font-semibold text-primary">{p.stokMinimum}</span>
        </div>
      </Card>

      {actionMsg && (
        <p role="status" className="text-sm font-medium text-primary-soft">
          {actionMsg}
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        <Button onClick={() => setEditOpen(true)}>Edit Produk</Button>
        <Button variant="secondary" onClick={() => setAdjustOpen(true)}>
          Sesuaikan Stok
        </Button>
        <Button
          variant="destructive"
          disabled={p.status === 'NONAKTIF'}
          onClick={() => setNonaktifOpen(true)}
        >
          {p.status === 'NONAKTIF' ? 'Produk Nonaktif' : 'Nonaktifkan Produk'}
        </Button>
        <Button variant="destructive" onClick={() => setHapusOpen(true)}>
          Hapus Produk
        </Button>
      </div>

      <ProductFormModal open={editOpen} onClose={() => setEditOpen(false)} initial={p} />
      <StockAdjustModal open={adjustOpen} onClose={() => setAdjustOpen(false)} product={p} />

      <Modal open={nonaktifOpen} onClose={() => setNonaktifOpen(false)} title="Nonaktifkan Produk">
        <p className="text-sm text-primary">
          Produk nonaktif tidak lagi muncul dalam transaksi baru, tetapi riwayat transaksi lama tetap
          utuh. {isTitipan && 'Produk titipan hanya dapat dinonaktifkan jika stoknya 0.'}
        </p>
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setNonaktifOpen(false)}>
            Batal
          </Button>
          <Button className="flex-1" onClick={deactivate} disabled={updateStatus.isPending}>
            {updateStatus.isPending ? 'Menyimpan…' : 'Nonaktifkan'}
          </Button>
        </div>
      </Modal>

      <Modal open={hapusOpen} onClose={() => setHapusOpen(false)} title="Hapus Produk">
        <p className="text-sm text-primary">
          Produk akan dihapus permanen. Hapus hanya diizinkan bila produk belum pernah dipakai dalam
          transaksi.
        </p>
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setHapusOpen(false)}>
            Batal
          </Button>
          <Button variant="destructive" className="flex-1" onClick={hapus} disabled={deleteProduct.isPending}>
            {deleteProduct.isPending ? 'Menghapus…' : 'Hapus Produk'}
          </Button>
        </div>
      </Modal>

      {hasTransaction && (
        <HasTransactionDialog onClose={() => setHasTransaction(false)} onDeactivate={deactivate} />
      )}
    </div>
  );
}
