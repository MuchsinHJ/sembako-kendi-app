import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useConsignor,
  useConsignorBalance,
  useConsignorPayments,
  useCreateConsignorPayment,
  useUpdateConsignorStatus,
} from '../api';
import { useProducts } from '@/features/products/api';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextField } from '@/components/TextField';
import { formatRupiah } from '@/lib/money';
import { formatTanggal } from '@/features/transactions/utils';
import { ApiError } from '@/lib/http';

/** Modal catat setoran (BR-D): > 0 dan ≤ saldo; append-only. */
function SetoranModal({
  consignorId,
  saldo,
  onClose,
}: {
  consignorId: string;
  saldo: string;
  onClose: () => void;
}) {
  const [jumlah, setJumlah] = useState('');
  const [catatan, setCatatan] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const setoran = useCreateConsignorPayment(consignorId);
  const nominal = Number(jumlah || '0');
  const saldoNumber = Number(saldo);
  const melebihi = nominal > saldoNumber;

  function onSubmit() {
    setFormError(null);
    if (nominal <= 0) {
      setFormError('Nominal setoran harus lebih dari Rp0.');
      return;
    }
    setoran.mutate(
      { jumlahBayar: nominal, catatan: catatan.trim() || null },
      {
        onSuccess: onClose,
        onError: (err) =>
          setFormError(
            err instanceof ApiError && err.message.includes('melebihi')
              ? `Nominal setoran melebihi saldo kewajiban. Saldo saat ini ${formatRupiah(saldo)}.`
              : err instanceof ApiError
                ? err.message
                : 'Gagal mencatat setoran.'
          ),
      }
    );
  }

  return (
    <Modal open title="Catat Setoran" onClose={onClose}>
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="text-muted">Saldo kewajiban saat ini</span>
        <span className="font-bold text-primary">{formatRupiah(saldo)}</span>
      </div>
      <div className="flex flex-col gap-4">
        <TextField
          label="Nominal setoran"
          inputMode="numeric"
          placeholder="0"
          value={jumlah}
          onChange={(e) => setJumlah(e.target.value.replace(/[^\d.]/g, ''))}
          error={
            melebihi
              ? `Nominal setoran melebihi saldo kewajiban. Saldo saat ini ${formatRupiah(saldo)}.`
              : undefined
          }
        />
        <TextField label="Catatan (opsional)" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
      </div>
      {formError && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {formError}
        </p>
      )}
      <div className="mt-5 flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Batal
        </Button>
        <Button className="flex-1" onClick={onSubmit} disabled={setoran.isPending || melebihi || nominal <= 0}>
          {setoran.isPending ? 'Menyimpan…' : 'Simpan Setoran'}
        </Button>
      </div>
    </Modal>
  );
}

/** Isi produk titipan (dipakai modal mobile & panel desktop). */
function ProdukTitipanContent({ consignorId }: { consignorId: string }) {
  const { data, isLoading, isError, refetch } = useProducts({
    tipe: 'TITIPAN',
    consignorId,
    limit: 100,
  });
  const products = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <>
      {isLoading && <p className="text-sm text-muted">Memuat…</p>}
      {isError && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-danger">Gagal memuat produk titipan.</p>
          <Button variant="secondary" className="h-10 self-start px-4 text-xs" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </div>
      )}
      {!isLoading && !isError && products.length === 0 && (
        <p className="text-sm text-muted">Belum ada produk titipan untuk penitip ini.</p>
      )}
      {!isLoading && !isError && products.length > 0 && (
        <div className="flex flex-col">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 border-b border-line-soft py-3 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-primary">{p.nama}</p>
                <p className="text-xs text-muted">
                  {formatRupiah(p.hargaJual)} · Stok {p.stok}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/** Isi riwayat setoran (dipakai modal mobile & panel desktop). */
function RiwayatSetoranContent({ consignorId }: { consignorId: string }) {
  const { data, isLoading, isError } = useConsignorPayments(consignorId);
  const payments = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <>
      <p className="mb-3 text-xs text-muted">Riwayat setoran hanya bisa ditambah — tidak dapat diedit atau dihapus.</p>
      {isLoading && <p className="text-sm text-muted">Memuat…</p>}
      {isError && <p className="text-sm text-danger">Gagal memuat riwayat setoran.</p>}
      {!isLoading && !isError && payments.length === 0 && (
        <p className="text-sm text-muted">Belum ada setoran.</p>
      )}
      {!isLoading && !isError && payments.length > 0 && (
        <div className="flex flex-col">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between border-b border-line-soft py-2.5 last:border-0">
              <div>
                <p className="text-sm font-semibold text-primary">{formatRupiah(p.jumlahBayar)}</p>
                <p className="text-xs text-muted">{formatTanggal(p.tanggalBayar)}</p>
              </div>
              <span className="text-xs text-muted">Sisa {formatRupiah(p.saldoSetelahBayar)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/** Modal daftar produk titipan penitip (mobile). */
function ProdukTitipanModal({ consignorId, onClose }: { consignorId: string; onClose: () => void }) {
  return (
    <Modal open title="Produk Titipan" onClose={onClose}>
      <ProdukTitipanContent consignorId={consignorId} />
    </Modal>
  );
}

/** Modal riwayat setoran (append-only) — mobile. */
function RiwayatSetoranModal({ consignorId, onClose }: { consignorId: string; onClose: () => void }) {
  return (
    <Modal open title="Riwayat Setoran" onClose={onClose}>
      <RiwayatSetoranContent consignorId={consignorId} />
    </Modal>
  );
}

/** Panel kanan desktop (06 §5.7) — riwayat + produk inline. */
function RiwayatSetoranSection({ consignorId }: { consignorId: string }) {
  return (
    <Card variant="list" className="flex flex-col gap-3">
      <h2 className="text-base font-bold text-primary">Riwayat Setoran</h2>
      <RiwayatSetoranContent consignorId={consignorId} />
    </Card>
  );
}

function ProdukTitipanSection({ consignorId }: { consignorId: string }) {
  return (
    <Card variant="list" className="flex flex-col gap-3">
      <h2 className="text-base font-bold text-primary">Produk Titipan</h2>
      <ProdukTitipanContent consignorId={consignorId} />
    </Card>
  );
}

/** Konfirmasi nonaktifkan penitip (BR-E, BR-21). 422 → daftar produk penghalang. */
function NonaktifModal({ consignorId, onClose }: { consignorId: string; onClose: () => void }) {
  const [blockers, setBlockers] = useState<Array<{ nama: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const deactivate = useUpdateConsignorStatus(consignorId);

  function confirm() {
    setBlockers([]);
    setError(null);
    deactivate.mutate('NONAKTIF', {
      onSuccess: onClose,
      onError: (err) => {
        if (
          err instanceof ApiError &&
          err.details &&
          typeof err.details === 'object' &&
          'products' in err.details
        ) {
          setBlockers((err.details as { products: Array<{ nama: string }> }).products);
        } else {
          setError(err instanceof ApiError ? err.message : 'Gagal menonaktifkan penitip.');
        }
      },
    });
  }

  return (
    <Modal open title="Nonaktifkan Penitip" onClose={onClose}>
      {blockers.length === 0 ? (
        <p className="text-sm text-primary">
          Penitip nonaktif tidak dapat menerima titipan baru. Produk titipan yang masih aktif akan ikut
          dinonaktifkan.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-primary">
            Penitip masih memiliki produk berstok. Retur atau habiskan stok produk berikut terlebih
            dahulu:
          </p>
          <ul className="list-inside list-disc text-sm text-primary-soft">
            {blockers.map((b) => (
              <li key={b.nama}>{b.nama}</li>
            ))}
          </ul>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <div className="mt-5 flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Tutup
        </Button>
        {blockers.length === 0 && (
          <Button className="flex-1" onClick={confirm} disabled={deactivate.isPending}>
            {deactivate.isPending ? 'Menyimpan…' : 'Nonaktifkan Penitip'}
          </Button>
        )}
      </div>
    </Modal>
  );
}

/** Detail Penitip: saldo all-time (boleh negatif), setoran, produk titipan, status. */
export function DetailPenitipPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const { data: consignor, isLoading, isError, refetch } = useConsignor(id);
  const { data: balance } = useConsignorBalance(id);
  const [setoranOpen, setSetoranOpen] = useState(false);
  const [produkOpen, setProdukOpen] = useState(false);
  const [riwayatOpen, setRiwayatOpen] = useState(false);
  const [nonaktifOpen, setNonaktifOpen] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const reactivate = useUpdateConsignorStatus(id);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-9 w-1/2 rounded bg-muted-soft" />
        <div className="h-28 rounded-card bg-muted-soft" />
        <div className="h-24 rounded-card bg-muted-soft" />
      </div>
    );
  }

  if (isError || !consignor) {
    return (
      <div className="flex flex-col gap-3">
        <ScreenHeader onBack={() => navigate('/penitip')} title="Detail Penitip" />
        <Card variant="warning" className="items-start">
          <p className="text-sm font-semibold text-warning">Gagal memuat penitip.</p>
          <Button variant="secondary" className="mt-1 h-10 px-4 text-xs" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </Card>
      </div>
    );
  }

  const saldoNumber = Number(balance?.saldo ?? '0');
  const saldoNegatif = saldoNumber < 0;

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader
        onBack={() => navigate('/penitip')}
        title="Detail Penitip"
        subtitle={consignor.nama}
        action={<Badge variant={consignor.status === 'AKTIF' ? 'lunas' : 'netral'} label={consignor.status === 'AKTIF' ? 'Aktif' : 'Nonaktif'} />}
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-[18px]">
        {/* Kiri: saldo + rincian + aksi (06 §5.7) */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Card variant="dark">
            <span className="text-xs text-bg/70">Saldo kewajiban ke penitip</span>
            <span className={`text-[28px] font-bold leading-none ${saldoNegatif ? 'text-warning-soft' : 'text-bg'}`}>
              {formatRupiah(balance?.saldo ?? '0')}
            </span>
            <span className="text-[11px] text-bg/70">
              Nilai barang terjual dikurangi setoran. Dihitung dari seluruh riwayat.
            </span>
            {saldoNegatif && (
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-3 py-1 text-[11px] font-semibold text-warning">
                Saldo negatif — kewajiban sudah lebih dari terbayar.
              </span>
            )}
          </Card>

          <Card variant="list" className="divide-y divide-line-soft">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted">Modal terjual (all-time)</span>
              <span className="text-sm font-semibold text-primary">{formatRupiah(balance?.totalTerjualModal ?? '0')}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted">Total disetor</span>
              <span className="text-sm font-semibold text-primary">{formatRupiah(balance?.totalDisetor ?? '0')}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted">Produk titipan aktif</span>
              <span className="text-sm font-semibold text-primary">{consignor.ringkasan.jumlahProdukTitipanAktif} produk</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted">Total stok titipan</span>
              <span className="text-sm font-semibold text-primary">{consignor.ringkasan.totalStokTitipan}</span>
            </div>
          </Card>

          {actionMsg && (
            <p role="status" className="text-sm font-medium text-primary-soft">
              {actionMsg}
            </p>
          )}

          <div className="flex flex-col gap-2.5">
            <Button onClick={() => setSetoranOpen(true)} disabled={saldoNegatif}>
              Catat Setoran
            </Button>
            {saldoNegatif && (
              <p className="-mt-1 text-xs text-muted">Setoran tidak bisa dicatat selama saldo masih minus.</p>
            )}
            <Button variant="secondary" onClick={() => setProdukOpen(true)}>
              Lihat Produk Titipan ({consignor.ringkasan.jumlahProdukTitipanAktif})
            </Button>
            <Button variant="secondary" onClick={() => setRiwayatOpen(true)}>
              Riwayat Setoran
            </Button>
            {consignor.status === 'AKTIF' ? (
              <Button variant="destructive" onClick={() => setNonaktifOpen(true)}>
                Nonaktifkan Penitip
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() =>
                  reactivate.mutate('AKTIF', {
                    onSuccess: () => setActionMsg('Penitip diaktifkan kembali.'),
                    onError: (err: unknown) =>
                      setActionMsg(err instanceof ApiError ? err.message : 'Gagal mengaktifkan penitip.'),
                  })
                }
                disabled={reactivate.isPending}
              >
                Aktifkan Penitip
              </Button>
            )}
          </div>
        </div>

        {/* Kanan: riwayat setoran (06 §5.7) */}
        <div className="hidden min-w-0 flex-1 lg:block">
          <div className="sticky top-6 flex flex-col gap-3">
            <RiwayatSetoranSection consignorId={id} />
            <ProdukTitipanSection consignorId={id} />
          </div>
        </div>
      </div>

      {setoranOpen && balance && (
        <SetoranModal consignorId={id} saldo={balance.saldo} onClose={() => setSetoranOpen(false)} />
      )}
      {produkOpen && <ProdukTitipanModal consignorId={id} onClose={() => setProdukOpen(false)} />}
      {riwayatOpen && <RiwayatSetoranModal consignorId={id} onClose={() => setRiwayatOpen(false)} />}
      {nonaktifOpen && <NonaktifModal consignorId={id} onClose={() => setNonaktifOpen(false)} />}
    </div>
  );
}
