import { Link, useNavigate } from 'react-router-dom';
import {
  ChartColumn,
  ChevronRight,
  HandCoins,
  Package,
  Plus,
  ReceiptText,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { useTransactionsPage } from '@/features/transactions/api';
import {
  formatWaktuRelatif,
  kodeTransaksi,
  ringkasanProdukTransaksi,
} from '@/features/transactions/utils';
import type { Transaction } from '@/features/transactions/types';
import { formatRupiah } from '@/lib/money';
import { formatTanggalPanjang } from '@/lib/date';
import { cn } from '@/lib/cn';
import type { DashboardSummary } from './api';

const MAKS_STOK = 6;
const MAKS_TRANSAKSI = 6;

function MetricCard({
  label,
  value,
  hint,
  tone = 'surface',
  to,
}: {
  label: string;
  value: string;
  hint: ReactNode;
  tone?: 'dark' | 'surface' | 'warning';
  to?: string;
}) {
  const body = (
    <>
      <span
        className={cn(
          'text-[12.5px] font-medium',
          tone === 'dark' ? 'text-accent-soft' : tone === 'warning' ? 'text-warning' : 'text-muted',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'truncate text-[26px] font-bold leading-tight tabular-nums',
          tone === 'dark' ? 'text-bg' : 'text-primary',
        )}
      >
        {value}
      </span>
      <span
        className={cn(
          'flex items-center justify-between gap-2 text-xs',
          tone === 'dark'
            ? 'text-accent-soft'
            : tone === 'warning'
              ? 'text-primary-soft'
              : 'text-muted',
        )}
      >
        <span className="truncate">{hint}</span>
        {to && <ChevronRight className="size-4 shrink-0" aria-hidden="true" />}
      </span>
    </>
  );
  const cls = cn(
    'flex min-w-0 flex-col gap-1 rounded-[18px] p-4',
    tone === 'dark' && 'bg-primary',
    tone === 'warning' && 'bg-warning-soft',
    tone === 'surface' && 'border border-line-soft bg-surface',
  );
  return to ? (
    <Link
      to={to}
      className={cn(
        cls,
        'press-scale transition-colors duration-150 ease-out',
        tone === 'surface' && 'hover:bg-surface-muted',
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function Panel({
  title,
  icon: Icon,
  action,
  children,
  className,
  tone = 'surface',
}: {
  title: string;
  icon: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: 'surface' | 'warning';
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-[20px] p-4',
        tone === 'warning' ? 'bg-warning-soft' : 'border border-line-soft bg-surface',
        className,
      )}
    >
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-primary">
          <Icon
            className={cn('size-[18px]', tone === 'warning' ? 'text-warning' : 'text-primary-soft')}
            strokeWidth={2.25}
            aria-hidden="true"
          />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function PanelLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="press-scale -my-1.5 -me-2 flex h-11 items-center gap-1 rounded-full px-3 text-[12.5px] font-semibold text-primary-soft transition-colors duration-150 ease-out hover:bg-surface-muted"
    >
      {children}
      <ChevronRight className="size-4" aria-hidden="true" />
    </Link>
  );
}

function StatusBadge({ t }: { t: Transaction }) {
  if (t.statusTransaksi === 'DIBATALKAN') return <Badge variant="netral" label="Dibatalkan" />;
  return t.statusPembayaran === 'LUNAS' ? (
    <Badge variant="lunas" label="Lunas" />
  ) : (
    <Badge variant="utang" label="Utang" />
  );
}

function TransaksiTerbaru() {
  const { data, isLoading, isError, refetch } = useTransactionsPage({ limit: MAKS_TRANSAKSI }, 1);
  const list = data?.data ?? [];
  return (
    <Panel
      title="Transaksi terbaru"
      icon={ReceiptText}
      className="lg:col-span-3"
      action={<PanelLink to="/riwayat">Lihat semua</PanelLink>}
    >
      {isLoading && (
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-[12px] bg-surface-muted" />
          ))}
        </div>
      )}
      {isError && (
        <div className="flex items-center justify-between gap-3 rounded-[12px] bg-warning-soft px-3 py-2.5">
          <p className="text-[12.5px] font-medium text-warning">Gagal memuat transaksi.</p>
          <Button variant="secondary" className="h-10 px-4 text-xs" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </div>
      )}
      {!isLoading && !isError && list.length === 0 && (
        <p className="rounded-[12px] bg-surface-muted px-3 py-6 text-center text-[13px] text-muted">
          Belum ada transaksi. Transaksi yang disimpan akan muncul di sini.
        </p>
      )}
      {list.length > 0 && (
        <ul className="-mx-1 flex flex-col">
          {list.map((t, i) => {
            const batal = t.statusTransaksi === 'DIBATALKAN';
            return (
              <li key={t.id} className={cn(i > 0 && 'border-t border-line-soft')}>
                <Link
                  to={`/riwayat?trx=${t.id}`}
                  className="flex min-h-14 items-center gap-3 rounded-[12px] px-1 py-2 transition-colors duration-150 ease-out hover:bg-surface-muted"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span
                      className={cn(
                        'truncate text-[13px] font-bold',
                        batal ? 'text-muted' : 'text-primary',
                      )}
                    >
                      {kodeTransaksi(t)}
                    </span>
                    <span className="truncate text-xs text-muted">
                      {formatWaktuRelatif(t.tanggal)} ·{' '}
                      {t.namaPembeli?.trim() || ringkasanProdukTransaksi(t.items)}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 text-[14.5px] font-bold tabular-nums',
                      batal ? 'text-muted line-through' : 'text-primary',
                    )}
                  >
                    {formatRupiah(t.total)}
                  </span>
                  <span className="flex w-[92px] shrink-0 justify-end">
                    <StatusBadge t={t} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function StokMenipis({ produk }: { produk: DashboardSummary['produkLowStock'] }) {
  return (
    <Panel
      title="Stok menipis"
      icon={TriangleAlert}
      tone="warning"
      action={
        <span className="text-xs font-semibold text-primary-soft">{produk.length} produk</span>
      }
    >
      {produk.length === 0 ? (
        <p className="text-[13px] text-primary">Semua stok aman.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {produk.slice(0, MAKS_STOK).map((p) => {
            const rasio = p.stokMinimum > 0 ? Math.min(1, p.stok / p.stokMinimum) : 0;
            return (
              <li key={p.id}>
                <Link
                  to={`/produk/${p.id}`}
                  className="press-scale flex min-h-12 items-center gap-3 rounded-[12px] bg-surface px-3 py-2 transition-colors duration-150 ease-out hover:bg-surface-muted"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-surface-muted">
                    <Package className="size-4 text-primary-soft" aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-[13px] font-semibold text-primary">
                      {p.nama}
                    </span>
                    <span
                      className="h-1 w-full overflow-hidden rounded-full bg-warning-soft"
                      aria-hidden="true"
                    >
                      <span
                        className="block h-full rounded-full bg-warning"
                        style={{ width: `${Math.max(6, rasio * 100)}%` }}
                      />
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end">
                    <span className="text-[13px] font-bold tabular-nums text-warning">
                      Sisa {p.stok}
                    </span>
                    <span className="text-[11.5px] tabular-nums text-muted">
                      min. {p.stokMinimum}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {produk.length > MAKS_STOK && (
        <PanelLink to="/produk">+{produk.length - MAKS_STOK} produk lainnya</PanelLink>
      )}
    </Panel>
  );
}

const LAPORAN: Array<{ to: string; title: string; desc: string; icon: LucideIcon }> = [
  {
    to: '/laporan/penjualan',
    title: 'Laporan Penjualan',
    desc: 'Omzet, profit, tren, produk terlaris',
    icon: ChartColumn,
  },
  {
    to: '/laporan/konsinyasi',
    title: 'Laporan Konsinyasi',
    desc: 'Titipan terjual & kewajiban penitip',
    icon: HandCoins,
  },
  {
    to: '/laporan/utang',
    title: 'Laporan Utang',
    desc: 'Utang pelanggan per periode',
    icon: ReceiptText,
  },
];

/**
 * Beranda md+ (canvas W6JN0 / krHal, ditingkatkan):
 * 4 kartu metrik sebaris (2×2 di tablet potret) · Transaksi terbaru | Stok menipis + Bulan ini ·
 * pintasan laporan. Logout tidak diulang di sini (sudah ada di sidebar).
 */
export function HomeWide({
  data,
  isLoading,
  isError,
  onRetry,
  sapaan,
  jumlahUtang,
}: {
  data: DashboardSummary | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  sapaan: string;
  jumlahUtang: number | undefined;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-4 xl:gap-5">
      <header className="flex items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-xs font-semibold tracking-[1.2px] text-primary-soft">
            {formatTanggalPanjang(new Date()).toUpperCase()}
          </span>
          <h1 className="truncate text-[28px] font-bold leading-tight text-primary">
            {sapaan}, Kendi
          </h1>
        </div>
        <Button className="h-11 shrink-0 ps-4 pe-5" onClick={() => navigate('/transaksi')}>
          <Plus className="size-4" aria-hidden="true" />
          Transaksi Baru
        </Button>
      </header>

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className={cn(
                'h-[104px] animate-pulse rounded-[18px]',
                i === 0 ? 'bg-primary/10' : 'bg-surface',
              )}
            />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex items-center justify-between gap-3 rounded-[16px] bg-warning-soft p-4">
          <p className="text-sm font-semibold text-warning">Gagal memuat ringkasan toko.</p>
          <Button variant="secondary" className="h-10 px-4 text-xs" onClick={onRetry}>
            Coba lagi
          </Button>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            tone="dark"
            label="Omzet hari ini"
            value={formatRupiah(data.hariIni.omzet)}
            hint={`dari ${data.hariIni.transactionCount} transaksi`}
          />
          <MetricCard
            label="Estimasi profit"
            value={formatRupiah(data.hariIni.profit)}
            hint="Hari ini, setelah harga modal"
          />
          <MetricCard
            tone="warning"
            label="Total utang aktif"
            value={formatRupiah(data.totalSaldoUtang)}
            to="/utang"
            hint={
              jumlahUtang === undefined
                ? 'Lihat rincian utang'
                : jumlahUtang === 0
                  ? 'Tidak ada utang aktif'
                  : `${jumlahUtang} transaksi belum lunas`
            }
          />
          <MetricCard
            label="Kewajiban penitip"
            value={formatRupiah(data.totalKewajibanPenitip)}
            to="/penitip"
            hint="Saldo yang harus disetor"
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5 xl:gap-5">
        <TransaksiTerbaru />
        {data && (
          <div className="grid content-start items-start gap-4 md:grid-cols-2 lg:col-span-2 lg:grid-cols-1 xl:gap-5">
            <StokMenipis produk={data.produkLowStock} />
            <Panel
              title="Bulan ini"
              icon={ChartColumn}
              action={<PanelLink to="/laporan/penjualan">Laporan</PanelLink>}
            >
              <dl className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-0.5 rounded-[12px] bg-surface-muted p-3">
                  <dt className="text-xs text-muted">Omzet</dt>
                  <dd className="truncate text-[17px] font-bold tabular-nums text-primary">
                    {formatRupiah(data.bulanBerjalan.omzet)}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5 rounded-[12px] bg-surface-muted p-3">
                  <dt className="text-xs text-muted">Profit</dt>
                  <dd className="truncate text-[17px] font-bold tabular-nums text-primary">
                    {formatRupiah(data.bulanBerjalan.profit)}
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-muted">
                {data.bulanBerjalan.transactionCount} transaksi sejak awal bulan
              </p>
            </Panel>
          </div>
        )}
      </div>

      <nav aria-label="Pintasan laporan" className="grid gap-3 lg:grid-cols-3">
        {LAPORAN.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="press-scale flex items-center gap-3 rounded-[18px] border border-line-soft bg-surface p-4 transition-colors duration-150 ease-out hover:bg-surface-muted"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-surface-muted">
              <l.icon className="size-5 text-primary" aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-bold text-primary">{l.title}</span>
              <span className="truncate text-xs text-muted">{l.desc}</span>
            </span>
            <ChevronRight className="size-[18px] shrink-0 text-muted" aria-hidden="true" />
          </Link>
        ))}
      </nav>
    </div>
  );
}
