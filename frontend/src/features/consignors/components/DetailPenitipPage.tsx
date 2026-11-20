import { useId, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronRight,
  HandCoins,
  Package,
  Pencil,
  TriangleAlert,
  UserRoundCheck,
  UserRoundX,
} from 'lucide-react';
import {
  useConsignor,
  useConsignorBalance,
  useConsignorPayments,
  useCreateConsignorPayment,
  useUpdateConsignorStatus,
} from '../api';
import { useProducts } from '@/features/products/api';
import { ConsignorFormModal } from './ConsignorFormModal';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  AmountField,
  ContextCard,
  EstimateRow,
  InlineError,
  SoftTextField,
} from '@/components/SheetParts';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formatRupiah } from '@/lib/money';
import { cn } from '@/lib/cn';
import { ApiError } from '@/lib/http';
import type { ConsignorPayment } from '../types';

function formatTanggalPanjangSaja(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

/* ─── Sheet Catat Setoran (pen IfwBu / gya2S; BR-D: > 0 dan ≤ saldo, append-only) ── */

function SetoranSheet({
  consignorId,
  nama,
  saldo,
  onClose,
}: {
  consignorId: string;
  nama: string;
  saldo: string;
  onClose: () => void;
}) {
  const formId = useId();
  const [jumlah, setJumlah] = useState('');
  const [catatan, setCatatan] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const setoran = useCreateConsignorPayment(consignorId);
  const nominal = Number(jumlah || '0');
  const saldoNumber = Number(saldo);
  const melebihi = nominal > saldoNumber;
  const pesanMelebihi = `Jumlah setoran melebihi saldo kewajiban ${formatRupiah(saldo)}. Perbaiki sebelum menyimpan.`;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (nominal <= 0 || melebihi) return;
    setoran.mutate(
      { jumlahBayar: nominal, catatan: catatan.trim() || null },
      {
        onSuccess: onClose,
        onError: (err) =>
          setFormError(
            err instanceof ApiError && err.message.includes('melebihi')
              ? pesanMelebihi
              : err instanceof ApiError
                ? err.message
                : 'Gagal mencatat setoran.',
          ),
      },
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Catat Setoran"
      subtitle={`${nama} · saldo ${formatRupiah(saldo)}`}
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
            disabled={setoran.isPending || melebihi || nominal <= 0}
          >
            {setoran.isPending ? 'Menyimpan…' : 'Simpan Setoran'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <ContextCard label="Saldo kewajiban saat ini" value={formatRupiah(saldo)} />
        <AmountField
          label="Jumlah setoran"
          value={jumlah}
          onChange={setJumlah}
          invalid={melebihi}
          autoFocus
          helper={
            melebihi
              ? undefined
              : `Masukkan jumlah lebih dari Rp0 dan tidak melebihi saldo ${formatRupiah(saldo)}.`
          }
        />
        {melebihi && <InlineError>{pesanMelebihi}</InlineError>}
        <EstimateRow
          label="Saldo setelah setoran"
          value={melebihi ? 'Tidak bisa dihitung' : formatRupiah(saldoNumber - nominal)}
          danger={melebihi}
        />
        <SoftTextField
          label="Catatan (boleh dikosongkan)"
          placeholder="cth. Setoran minggu ke-3"
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
        />
        {formError && <InlineError>{formError}</InlineError>}
      </form>
    </Modal>
  );
}

/* ─── Produk Titipan (pen s8oNeK) ─────────────────────────────────────────── */

function ProdukTitipanContent({ consignorId }: { consignorId: string }) {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useProducts({
    tipe: 'TITIPAN',
    consignorId,
    limit: 100,
  });
  const products = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-xs text-muted">
        Pilih produk untuk melihat riwayat penerimaan, retur, dan penjualan.
      </p>
      {isLoading && (
        <div className="flex flex-col gap-2.5" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-[76px] animate-pulse rounded-[14px] bg-surface-muted" />
          ))}
        </div>
      )}
      {isError && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-danger">Gagal memuat produk titipan.</p>
          <Button variant="secondary" className="h-10 px-4 text-xs" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </div>
      )}
      {!isLoading && !isError && products.length === 0 && (
        <p className="rounded-[14px] bg-surface-muted px-3 py-6 text-center text-sm text-muted">
          Belum ada produk titipan untuk penitip ini.
        </p>
      )}
      {products.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => navigate(`/produk/${p.id}`)}
          className="press-scale flex min-h-[76px] items-center gap-2.5 rounded-[14px] border border-line-soft bg-surface p-3 text-left transition-colors duration-150 ease-out hover:bg-surface-muted"
        >
          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-surface-muted">
            {p.fotoUrl ? (
              <img
                src={p.fotoUrl}
                alt=""
                className="size-full object-cover outline outline-1 -outline-offset-1 outline-black/10"
              />
            ) : (
              <Package className="size-[22px] text-primary-soft" aria-hidden="true" />
            )}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span
              className={cn(
                'truncate text-sm font-semibold',
                p.status === 'NONAKTIF' ? 'text-muted' : 'text-primary',
              )}
            >
              {p.nama}
            </span>
            <span className="truncate text-[11.5px] text-muted">
              {p.kategori} · Stok {p.stok} · {formatRupiah(p.hargaJual)}
              {p.status === 'NONAKTIF' ? ' · Nonaktif' : ''}
            </span>
          </span>
          <ChevronRight className="size-[18px] shrink-0 text-primary-soft" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

/* ─── Riwayat Setoran ─────────────────────────────────────────────────────── */

function SetoranRow({ p }: { p: ConsignorPayment }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[12px] border border-line-soft bg-surface p-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[12.5px] font-semibold text-primary">
          {formatTanggalPanjangSaja(p.tanggalBayar)}
        </span>
        <span className="truncate text-[11px] text-muted">{p.catatan || 'Tanpa catatan'}</span>
      </div>
      <span className="shrink-0 text-[13.5px] font-bold tabular-nums text-primary">
        {formatRupiah(p.jumlahBayar)}
      </span>
    </div>
  );
}

function RiwayatSetoranContent({ consignorId }: { consignorId: string }) {
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useConsignorPayments(consignorId);
  const payments = data?.pages.flatMap((p) => p.data) ?? [];
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted">
        Riwayat setoran hanya bisa ditambah — tidak dapat diedit atau dihapus.
      </p>
      {isLoading && <p className="text-sm text-muted">Memuat…</p>}
      {isError && <p className="text-sm text-danger">Gagal memuat riwayat setoran.</p>}
      {!isLoading && !isError && payments.length === 0 && (
        <p className="text-sm text-muted">Belum ada setoran.</p>
      )}
      {payments.map((p) => (
        <div
          key={p.id}
          className="flex items-center justify-between gap-3 rounded-[12px] border border-line-soft bg-surface p-3"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[12.5px] font-semibold text-primary">
              {formatTanggalPanjangSaja(p.tanggalBayar)}
            </span>
            <span className="truncate text-[11px] text-muted">{p.catatan || 'Tanpa catatan'}</span>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <span className="text-[13.5px] font-bold tabular-nums text-primary">
              {formatRupiah(p.jumlahBayar)}
            </span>
            <span className="text-[11px] tabular-nums text-muted">
              Sisa {formatRupiah(p.saldoSetelahBayar)}
            </span>
          </div>
        </div>
      ))}
      {hasNextPage && (
        <Button
          variant="secondary"
          className="h-10 self-center px-4 text-xs"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Memuat…' : 'Muat lebih banyak'}
        </Button>
      )}
    </div>
  );
}

/* ─── Dialog Nonaktifkan Penitip (pen TcBe6; BR-E/BR-21: 422 → daftar produk berstok) ── */

function NonaktifDialog({ consignorId, onClose }: { consignorId: string; onClose: () => void }) {
  const [blockers, setBlockers] = useState<Array<{ nama: string; stok?: number }>>([]);
  const [error, setError] = useState<string | null>(null);
  const deactivate = useUpdateConsignorStatus(consignorId);
  const terhalang = blockers.length > 0;

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
          setBlockers(
            (err.details as { products: Array<{ nama: string; stok?: number }> }).products,
          );
        } else {
          setError(err instanceof ApiError ? err.message : 'Gagal menonaktifkan penitip.');
        }
      },
    });
  }

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      compact={terhalang}
      title={terhalang ? 'Penitip belum bisa dinonaktifkan' : 'Nonaktifkan penitip ini?'}
      description={
        terhalang
          ? 'Masih ada barang titipan yang tersisa di toko. Kosongkan atau retur dulu stoknya.'
          : 'Penitip nonaktif tidak dapat menerima titipan baru. Produk titipan yang masih aktif akan ikut dinonaktifkan.'
      }
      actions={
        terhalang ? (
          <Button className="h-11 w-full text-[13.5px]" onClick={onClose}>
            Mengerti
          </Button>
        ) : (
          <>
            <Button variant="secondary" className="w-full" onClick={onClose}>
              Batal
            </Button>
            <Button
              variant="danger"
              className="w-full"
              onClick={confirm}
              disabled={deactivate.isPending}
            >
              <UserRoundX className="size-4" aria-hidden="true" />
              {deactivate.isPending ? 'Menyimpan…' : 'Nonaktifkan Penitip'}
            </Button>
          </>
        )
      }
    >
      {terhalang && (
        <div className="flex w-full flex-col gap-1.5">
          <span className="text-[11.5px] font-semibold text-primary-soft">
            Produk yang masih berstok
          </span>
          {blockers.map((b) => (
            <div
              key={b.nama}
              className="flex items-center gap-2 rounded-[10px] bg-surface-muted px-2.5 py-2"
            >
              <Package className="size-3.5 shrink-0 text-primary-soft" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-primary">
                {b.nama}
              </span>
              {typeof b.stok === 'number' && (
                <span className="shrink-0 text-[11px] text-muted">{b.stok} barang</span>
              )}
            </div>
          ))}
        </div>
      )}
      {error && <InlineError className="w-full">{error}</InlineError>}
    </ConfirmDialog>
  );
}

function RincianRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12.5px] text-muted">{label}</span>
      <span className="text-[13px] font-semibold tabular-nums text-primary">{value}</span>
    </div>
  );
}

/**
 * Detail Penitip (pen q89u32 / l2TSZ saldo negatif). Mobile: kartu saldo r18 · rincian r14 ·
 * Catat Setoran · riwayat setoran (3 terbaru) · Lihat produk titipan · Nonaktifkan.
 * lg+: kolom kanan memuat riwayat setoran & produk titipan inline (06 §5.7).
 */
export function DetailPenitipPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const { data: consignor, isLoading, isError, refetch } = useConsignor(id);
  const { data: balance } = useConsignorBalance(id);
  const { data: paymentsData } = useConsignorPayments(id);
  const payments = paymentsData?.pages.flatMap((p) => p.data) ?? [];

  const [editOpen, setEditOpen] = useState(false);
  const [setoranOpen, setSetoranOpen] = useState(false);
  const [produkOpen, setProdukOpen] = useState(false);
  const [riwayatOpen, setRiwayatOpen] = useState(false);
  const [nonaktifOpen, setNonaktifOpen] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const reactivate = useUpdateConsignorStatus(id);

  if (isLoading) {
    return (
      <div className="flex animate-pulse flex-col gap-3" aria-busy="true">
        <div className="h-11 w-1/2 rounded-full bg-muted-soft" />
        <div className="h-[118px] rounded-[18px] bg-muted-soft" />
        <div className="h-[86px] rounded-[14px] bg-muted-soft" />
        <div className="h-12 rounded-full bg-muted-soft" />
      </div>
    );
  }

  if (isError || !consignor) {
    return (
      <div className="flex flex-col gap-3">
        <ScreenHeader
          onBack={() => navigate('/penitip')}
          title="Detail Penitip"
          titleClassName="text-[22px]"
        />
        <Card variant="warning" className="items-start">
          <p className="text-sm font-semibold text-warning">Gagal memuat penitip.</p>
          <Button variant="secondary" className="mt-1 h-10 px-4 text-xs" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </Card>
      </div>
    );
  }

  const saldo = balance?.saldo ?? '0';
  const saldoNegatif = Number(saldo) < 0;
  const nonaktif = consignor.status === 'NONAKTIF';
  const jumlahProduk = consignor.ringkasan.jumlahProdukTitipanAktif;

  return (
    <div className="flex flex-col gap-3">
      <ScreenHeader
        onBack={() => navigate('/penitip')}
        title="Detail Penitip"
        titleClassName="text-[22px]"
        subtitle={`${consignor.nama} · ${consignor.noHp ?? 'Tanpa no. HP'}${nonaktif ? ' · Nonaktif' : ''}`}
        action={
          <Button variant="icon" aria-label="Edit Penitip" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-[18px]">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* Kartu Saldo Penitip (pen): primary r18 p16 gap3 — negatif: warning-soft + nilai danger */}
          <div
            className={cn(
              'flex flex-col gap-[3px] rounded-[18px] p-4',
              saldoNegatif ? 'bg-warning-soft' : 'bg-primary',
            )}
          >
            <span
              className={cn('text-xs', saldoNegatif ? 'text-primary-soft' : 'text-accent-soft')}
            >
              Saldo kewajiban ke penitip
            </span>
            <span
              className={cn(
                'text-[28px] font-bold leading-tight tabular-nums',
                saldoNegatif ? 'text-danger' : 'text-bg',
              )}
            >
              {formatRupiah(saldo)}
            </span>
            <span
              className={cn(
                'text-[11px] leading-normal',
                saldoNegatif ? 'text-primary-soft' : 'text-accent-soft',
              )}
            >
              {saldoNegatif
                ? 'Saldo negatif: setoran sudah melebihi nilai barang yang terjual. Setoran baru bisa dicatat setelah saldo kembali positif.'
                : 'Nilai barang terjual dikurangi setoran. Dihitung dari seluruh riwayat.'}
            </span>
          </div>

          {/* Rincian Saldo Penitip (pen): surface r14 p14 gap8 + pemisah */}
          <div className="flex flex-col gap-2 rounded-[14px] border border-line-soft bg-surface p-3.5">
            <RincianRow
              label="Nilai barang terjual"
              value={formatRupiah(balance?.totalTerjualModal ?? '0')}
            />
            <div className="h-px bg-line-soft" />
            <RincianRow label="Sudah disetor" value={formatRupiah(balance?.totalDisetor ?? '0')} />
            <div className="h-px bg-line-soft" />
            <RincianRow label="Produk titipan aktif" value={`${jumlahProduk} produk`} />
            <div className="h-px bg-line-soft" />
            <RincianRow label="Total stok titipan" value={consignor.ringkasan.totalStokTitipan} />
          </div>

          {actionMsg && (
            <p
              role="status"
              className="rounded-[12px] bg-surface-muted px-3 py-2.5 text-xs font-medium text-primary-soft"
            >
              {actionMsg}
            </p>
          )}

          <Button
            onClick={() => setSetoranOpen(true)}
            disabled={saldoNegatif || !balance}
            className="w-full text-[13.5px] disabled:border disabled:border-line"
          >
            <HandCoins className="size-4" aria-hidden="true" />
            Catat Setoran
          </Button>
          {saldoNegatif && (
            <div className="flex items-center gap-2 rounded-[12px] bg-warning-soft p-3">
              <TriangleAlert className="size-4 shrink-0 text-warning" aria-hidden="true" />
              <p className="text-[11.5px] text-warning">
                Setoran tidak bisa dicatat selama saldo masih minus.
              </p>
            </div>
          )}

          {/* Blok Riwayat Setoran (pen): gap 8 — mobile & tablet; lg+ di kolom kanan */}
          <section aria-label="Riwayat setoran" className="flex flex-col gap-2 lg:hidden">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-primary">Riwayat setoran</h2>
              <span className="text-[11px] text-muted">hanya bisa ditambah</span>
            </div>
            {payments.length === 0 ? (
              <p className="rounded-[12px] border border-line-soft bg-surface p-3 text-center text-xs text-muted">
                Belum ada riwayat setoran.
              </p>
            ) : (
              payments.slice(0, 3).map((p) => <SetoranRow key={p.id} p={p} />)
            )}
            {payments.length > 0 && (
              <button
                type="button"
                onClick={() => setRiwayatOpen(true)}
                className="press-scale -mt-0.5 inline-flex h-10 items-center justify-center gap-1 self-center rounded-full px-3 text-xs font-semibold text-primary-soft transition-colors duration-150 ease-out hover:bg-surface"
              >
                Lihat semua riwayat setoran
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </section>

          <Button
            variant="secondary"
            className="h-[46px] w-full text-[13px] lg:hidden"
            onClick={() => setProdukOpen(true)}
          >
            <Package className="size-4" aria-hidden="true" />
            Lihat produk titipan ({jumlahProduk})
          </Button>

          {nonaktif ? (
            <Button
              variant="secondary"
              className="h-[46px] w-full text-[13.5px]"
              disabled={reactivate.isPending}
              onClick={() =>
                reactivate.mutate('AKTIF', {
                  onSuccess: () => setActionMsg('Penitip diaktifkan kembali.'),
                  onError: (err: unknown) =>
                    setActionMsg(
                      err instanceof ApiError ? err.message : 'Gagal mengaktifkan penitip.',
                    ),
                })
              }
            >
              <UserRoundCheck className="size-4" aria-hidden="true" />
              Aktifkan Penitip
            </Button>
          ) : (
            <Button
              variant="secondary"
              className="h-[46px] w-full text-[13.5px] text-danger"
              onClick={() => setNonaktifOpen(true)}
            >
              <UserRoundX className="size-4 text-danger" aria-hidden="true" />
              Nonaktifkan Penitip
            </Button>
          )}
        </div>

        {/* Kanan lg+: riwayat setoran & produk titipan */}
        <div className="hidden min-w-0 flex-1 lg:block">
          <div className="sticky top-6 flex flex-col gap-3">
            <Card variant="list" className="flex flex-col gap-3 p-4">
              <h2 className="text-base font-bold text-primary">Riwayat Setoran</h2>
              <RiwayatSetoranContent consignorId={id} />
            </Card>
            <Card variant="list" className="flex flex-col gap-3 p-4">
              <h2 className="text-base font-bold text-primary">Produk Titipan</h2>
              <ProdukTitipanContent consignorId={id} />
            </Card>
          </div>
        </div>
      </div>

      <ConsignorFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={consignor}
        onSuccess={() => refetch()}
      />

      {setoranOpen && balance && (
        <SetoranSheet
          consignorId={id}
          nama={consignor.nama}
          saldo={balance.saldo}
          onClose={() => setSetoranOpen(false)}
        />
      )}
      {produkOpen && (
        <Modal
          open
          title="Produk Titipan"
          subtitle={`${consignor.nama} · ${jumlahProduk} produk`}
          onClose={() => setProdukOpen(false)}
        >
          <ProdukTitipanContent consignorId={id} />
        </Modal>
      )}
      {riwayatOpen && (
        <Modal
          open
          title="Riwayat Setoran"
          subtitle={consignor.nama}
          onClose={() => setRiwayatOpen(false)}
        >
          <RiwayatSetoranContent consignorId={id} />
        </Modal>
      )}
      {nonaktifOpen && <NonaktifDialog consignorId={id} onClose={() => setNonaktifOpen(false)} />}
    </div>
  );
}
