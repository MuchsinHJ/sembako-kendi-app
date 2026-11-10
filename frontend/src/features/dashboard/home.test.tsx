import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../test/helpers';
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
  it('menampilkan metrik, peringatan stok menipis & transaksi terakhir', async () => {
    renderHome();

    expect(await screen.findByText('Omzet Hari Ini')).toBeInTheDocument();
    expect(screen.getByText('Estimasi Profit')).toBeInTheDocument();
    expect(screen.getByText('Total Utang Aktif')).toBeInTheDocument();
    expect(screen.getByText('Kewajiban Penitip')).toBeInTheDocument();

    expect(screen.getByText('Peringatan Stok Menipis')).toBeInTheDocument();
    expect(screen.getByText('Gula Pasir 1kg')).toBeInTheDocument();
    expect(screen.getByText('Menipis')).toBeInTheDocument();

    expect(screen.getByText('Transaksi Terakhir')).toBeInTheDocument();
    expect(screen.getByText('Rp75.000')).toBeInTheDocument();
    expect(screen.getByText(/Pak Budi/)).toBeInTheDocument();
  });

  it('tautan katalog & riwayat menavigasi', async () => {
    renderHome();
    await screen.findByText('Omzet Hari Ini');
    expect(screen.getByRole('button', { name: 'Lihat Katalog' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lihat Riwayat/ })).toBeInTheDocument();
  });
});
