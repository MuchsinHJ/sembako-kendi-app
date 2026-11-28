import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { mockViewport, renderWithProviders } from '../../test/helpers';
import { HomePage } from './HomePage';

function renderHome() {
  return renderWithProviders(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Beranda', () => {
  it('menampilkan omzet, metrik, penitip, stok menipis & kartu laporan', async () => {
    renderHome();

    expect(await screen.findByText('Omzet Hari Ini')).toBeInTheDocument();
    expect(screen.getByText('Estimasi Profit')).toBeInTheDocument();
    expect(screen.getByText('Total Utang Aktif')).toBeInTheDocument();
    expect(screen.getByText('Penitip & Kewajiban')).toBeInTheDocument();

    expect(screen.getByText('Stok Menipis')).toBeInTheDocument();
    expect(screen.getByText('Gula Pasir 1kg')).toBeInTheDocument();

    expect(screen.getByText('Laporan')).toBeInTheDocument();
    expect(screen.getByText('Beranda')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keluar' })).toBeInTheDocument();
  });

  it('tautan laporan, penitip & utang menavigasi', async () => {
    renderHome();
    await screen.findByText('Omzet Hari Ini');
    expect(screen.getByRole('link', { name: /Laporan/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Penitip & Kewajiban/ })).toBeInTheDocument();
  });
});

describe('Beranda md+', () => {
  let restore: () => void;
  beforeEach(() => {
    restore = mockViewport(1280);
  });
  afterEach(() => restore());

  it('4 kartu metrik + transaksi terbaru + stok menipis + pintasan laporan', async () => {
    renderHome();
    expect(await screen.findByText('Omzet hari ini')).toBeInTheDocument();
    expect(screen.getByText('Estimasi profit')).toBeInTheDocument();
    expect(screen.getByText('Total utang aktif')).toBeInTheDocument();
    expect(screen.getByText('Kewajiban penitip')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Stok menipis' })).toHaveTextContent('Gula Pasir 1kg');
    const terbaru = screen.getByRole('region', { name: 'Transaksi terbaru' });
    expect(await within(terbaru).findAllByRole('link', { name: /TRX-/ })).not.toHaveLength(0);
    expect(screen.getByRole('link', { name: /Laporan Konsinyasi/ })).toBeInTheDocument();
    // Logout hanya di sidebar pada md+.
    expect(screen.queryByRole('button', { name: 'Keluar' })).not.toBeInTheDocument();
  });
});