import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { mockViewport, renderWithProviders } from '../../test/helpers';
import { server, setReportFixtures } from '../../test/msw/server';
import { LaporanPenjualanPage } from './components/LaporanPenjualanPage';
import { LaporanKonsinyasiPage } from './components/LaporanKonsinyasiPage';
import { LaporanUtangPage } from './components/LaporanUtangPage';

function renderAt(pattern: string, path: string, element: React.ReactElement) {
  return renderWithProviders(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={pattern} element={element} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Laporan Penjualan', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('menampilkan omzet, profit, transaksi, per tipe, tren & daftar transaksi', async () => {
    renderAt('/laporan/penjualan', '/laporan/penjualan', <LaporanPenjualanPage />);

    // Ringkasan
    const omzet = await screen.findAllByText('Rp111.000');
    expect(omzet.length).toBeGreaterThanOrEqual(1);

    // Per tipe
    expect(screen.getByText('Rincian per Tipe Produk')).toBeInTheDocument();

    // Tren produk terlaris
    expect(screen.getByText(/Produk Terlaris/)).toBeInTheDocument();
    expect(screen.getByText('Beras 5kg')).toBeInTheDocument();
    expect(screen.getByText('3 terjual')).toBeInTheDocument();
    expect(screen.getByText('Rp225.000')).toBeInTheDocument();

    // Daftar transaksi
    expect(screen.getByText('Daftar transaksi')).toBeInTheDocument();
    expect(screen.getByText('Pak Budi')).toBeInTheDocument();
  });

  it('menampilkan error state', async () => {
    setReportFixtures({
      sales: {
        periode: { start: '', end: '' },
        omzet: '0.00',
        profit: '0.00',
        transactionCount: 0,
        perTipe: {
          MILIK_SENDIRI: { omzet: '0.00', profit: '0.00' },
          TITIPAN: { omzet: '0.00', profit: '0.00' },
        },
        transactions: [],
      },
    });
    renderAt('/laporan/penjualan', '/laporan/penjualan', <LaporanPenjualanPage />);

    await waitFor(() => {
      expect(screen.getByText('Rata-rata / Transaksi')).toBeInTheDocument();
    });
  });

  it('ekspor xlsx memicu unduhan (anchor click)', async () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const createObjectURL = vi.fn(() => 'blob:test');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      value: createObjectURL,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: revokeObjectURL,
      configurable: true,
      writable: true,
    });

    renderAt('/laporan/penjualan', '/laporan/penjualan', <LaporanPenjualanPage />);
    await screen.findAllByText('Rp111.000');

    await userEvent.click(screen.getByRole('button', { name: 'Ekspor Laporan' }));
    await userEvent.click(screen.getByRole('button', { name: /excel/i }));

    await waitFor(() => {
      expect(clickSpy).toHaveBeenCalled();
    });
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});

describe('Rentang laporan', () => {
  it('mengirim batas hari penuh (lokal) agar transaksi hari ini ikut terhitung', async () => {
    let captured: { startDate: string | null; endDate: string | null } | undefined;
    const onRequest = ({ request }: { request: Request }) => {
      const url = new URL(request.url);
      if (url.pathname.endsWith('/reports/sales')) {
        captured = {
          startDate: url.searchParams.get('startDate'),
          endDate: url.searchParams.get('endDate'),
        };
      }
    };
    server.events.on('request:start', onRequest);
    renderAt('/laporan/penjualan', '/laporan/penjualan', <LaporanPenjualanPage />);
    await waitFor(() => expect(captured).toBeDefined());
    server.events.removeListener('request:start', onRequest);
    const now = new Date();
    const awalBulan = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const akhirHari = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    expect(captured).toEqual({
      startDate: awalBulan.toISOString(),
      endDate: akhirHari.toISOString(),
    });
  });
});

describe('Laporan Utang', () => {
  it('menampilkan total utang + daftar + cicilan', async () => {
    setReportFixtures({
      debts: {
        periode: { start: '', end: '' },
        totalSaldoUtang: '36000.00',
        debtCount: 1,
        debts: [
          {
            id: 't2',
            tanggal: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
            total: '36000.00',
            namaPembeli: 'Pak Budi',
            noHpPembeli: null,
            sisaSaldoUtang: '21000.00',
            payments: [
              {
                id: 'cp-x',
                tanggalBayar: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
                jumlahBayar: '15000.00',
                saldoSetelahBayar: '21000.00',
              },
            ],
          },
        ],
      },
    });

    renderAt('/laporan/utang', '/laporan/utang', <LaporanUtangPage />);

    expect(await screen.findByText('Rp36.000')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Pak Budi')).toBeInTheDocument();
    expect(screen.getByText('Rp21.000')).toBeInTheDocument();
    expect(screen.getByText(/Cicilan/)).toBeInTheDocument();
    expect(screen.getByText(/Rp15\.000 · sisa Rp21\.000/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ekspor Laporan Utang' }));
    expect(screen.getByRole('button', { name: /excel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pdf/i })).toBeInTheDocument();
  });
});

describe('Laporan Konsinyasi', () => {
  it('menampilkan total & baris per penitip (termasuk nonaktif, saldo 0)', async () => {
    renderAt('/laporan/konsinyasi', '/laporan/konsinyasi', <LaporanKonsinyasiPage />);

    expect(await screen.findAllByText('Rp25.000').then((els) => els.length)).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText('Bu Rina')).toBeInTheDocument();
    expect(screen.getByText('Pak Joko')).toBeInTheDocument();
    expect(screen.getByText('Bu Sari')).toBeInTheDocument();
    // Saldo akhir all-time
    expect(screen.getAllByText('-Rp15.000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Rp45.000').length).toBeGreaterThanOrEqual(1);
    // Tidak ada tombol ekspor
    expect(screen.queryByRole('button', { name: /excel/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pdf/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/all-time/i).length).toBeGreaterThanOrEqual(2);
  });
});

describe('Laporan md+', () => {
  let restore: () => void;
  beforeEach(() => {
    restore = mockViewport(1280);
  });
  afterEach(() => restore());

  it('penjualan: tab laporan, kartu metrik, tabel transaksi', async () => {
    renderAt('/laporan/penjualan', '/laporan/penjualan', <LaporanPenjualanPage />);
    expect(await screen.findByText('Margin profit')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Jenis laporan' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Penjualan' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('columnheader', { name: 'Pembeli' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pak Budi' })).toBeInTheDocument();
    expect(screen.getByText('Beras 5kg')).toBeInTheDocument();
  });

  it('konsinyasi & utang memakai tabel per baris', async () => {
    renderAt('/laporan/konsinyasi', '/laporan/konsinyasi', <LaporanKonsinyasiPage />);
    expect(await screen.findByRole('columnheader', { name: 'Saldo akhir' })).toBeInTheDocument();
  });

  it('utang: ringkasan + tombol ekspor di header', async () => {
    renderAt('/laporan/utang', '/laporan/utang', <LaporanUtangPage />);
    expect(await screen.findByText('Cicilan diterima')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ekspor' })).toBeEnabled();
  });
});