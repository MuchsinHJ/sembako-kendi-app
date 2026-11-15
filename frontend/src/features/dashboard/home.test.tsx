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
