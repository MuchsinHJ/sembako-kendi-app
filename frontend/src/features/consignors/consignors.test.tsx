/* eslint-disable testing-library/prefer-screen-queries -- query dibatasi scope dialog via within() */
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../test/helpers';
import { DaftarPenitipPage } from './components/DaftarPenitipPage';
import { DetailPenitipPage } from './components/DetailPenitipPage';

function renderAt(pattern: string, path: string, element: React.ReactElement) {
  return renderWithProviders(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={pattern} element={element} />
      </Routes>
    </MemoryRouter>
  );
}

function getDialog() {
  return within(screen.getByRole('dialog'));
}

describe('Daftar Penitip', () => {
  it('menampilkan semua penitip (termasuk nonaktif)', async () => {
    renderAt('/penitip', '/penitip', <DaftarPenitipPage />);
    expect(await screen.findByText('Bu Rina')).toBeInTheDocument();
    expect(screen.getByText('Pak Joko')).toBeInTheDocument();
    expect(screen.getByText('Bu Sari')).toBeInTheDocument();
    expect(screen.getByText('Nonaktif')).toBeInTheDocument();
  });

  it('filter Punya saldo → hanya yang saldo ≠ 0 (c1 negatif, c2 positif)', async () => {
    renderAt('/penitip', '/penitip', <DaftarPenitipPage />);
    await screen.findByText('Bu Rina');

    await userEvent.click(screen.getByRole('button', { name: 'Punya saldo' }));

    await waitFor(() => {
      expect(screen.queryByText('Bu Sari')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Bu Rina')).toBeInTheDocument();
    expect(screen.getByText('Pak Joko')).toBeInTheDocument();
  });

  it('cari berdasarkan nama', async () => {
    renderAt('/penitip', '/penitip', <DaftarPenitipPage />);
    await screen.findByText('Bu Rina');

    await userEvent.type(screen.getByPlaceholderText(/cari penitip/i), 'joko');

    expect(await screen.findByText('Pak Joko')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Bu Rina')).not.toBeInTheDocument();
    });
  });

  it('klik kartu → navigasi ke detail', async () => {
    renderWithProviders(
      <MemoryRouter initialEntries={['/penitip']}>
        <Routes>
          <Route path="/penitip" element={<DaftarPenitipPage />} />
          <Route path="/penitip/:id" element={<DetailPenitipPage />} />
        </Routes>
      </MemoryRouter>
    );
    await userEvent.click(await screen.findByRole('button', { name: /bu rina/i }));
    expect(await screen.findByText('Saldo kewajiban')).toBeInTheDocument();
  });
});

describe('Detail Penitip (c1: saldo negatif)', () => {
  it('tampil saldo negatif + info setoran dilarang', async () => {
    renderAt('/penitip/:id', '/penitip/c1', <DetailPenitipPage />);

    expect(await screen.findByText('Saldo kewajiban')).toBeInTheDocument();
    expect(screen.getByText('-Rp15.000')).toBeInTheDocument();
    expect(screen.getByText(/saldo negatif/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Catat Setoran' })).toBeDisabled();
  });

  it('kartu rincian: modal terjual, disetor, 1 produk aktif stok 8', async () => {
    renderAt('/penitip/:id', '/penitip/c1', <DetailPenitipPage />);
    await screen.findByText('Saldo kewajiban');

    expect(screen.getByText('Rp40.000')).toBeInTheDocument(); // totalTerjualModal
    expect(screen.getByText('Rp55.000')).toBeInTheDocument(); // totalDisetor
    expect(screen.getByText('1 produk')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('Catat Setoran: nominal ≤ 0 diblokir, > saldo tampil error (c2 saldo positif)', async () => {
    renderAt('/penitip/:id', '/penitip/c2', <DetailPenitipPage />);
    await screen.findByText('Saldo kewajiban');
    await userEvent.click(screen.getByRole('button', { name: 'Catat Setoran' }));

    const dlg = getDialog();
    const input = dlg.getByLabelText('Nominal setoran');

    await userEvent.type(input, '0');
    expect(dlg.getByRole('button', { name: 'Simpan Setoran' })).toBeDisabled();

    await userEvent.clear(input);
    await userEvent.type(input, '130000');
    expect(dlg.getByText(/Nominal setoran melebihi saldo kewajiban/)).toBeInTheDocument();
    expect(dlg.getByRole('button', { name: 'Simpan Setoran' })).toBeDisabled();
  });

  it('riwayat setoran c2 menampilkan baris', async () => {
    renderAt('/penitip/:id', '/penitip/c2', <DetailPenitipPage />);
    await userEvent.click(await screen.findByRole('button', { name: /riwayat setoran/i }));

    const dlg = getDialog();
    expect(await dlg.findByText('Rp50.000')).toBeInTheDocument();
    expect(dlg.getByText(/Sisa Rp70\.000/)).toBeInTheDocument();
  });

  it('nonaktifkan c1 diblokir (422) dengan daftar produk berstok', async () => {
    renderAt('/penitip/:id', '/penitip/c1', <DetailPenitipPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Nonaktifkan Penitip' }));

    const dlg = getDialog();
    await userEvent.click(dlg.getByRole('button', { name: 'Nonaktifkan Penitip' }));

    expect(await dlg.findByText('Rokok (titipan)')).toBeInTheDocument();
    // Tombol konfirmasi disembunyikan saat ada penghalang.
    expect(dlg.queryByRole('button', { name: 'Nonaktifkan Penitip' })).not.toBeInTheDocument();
  });

  it('lihat produk titipan c1 (1 produk aktif, stok 8)', async () => {
    renderAt('/penitip/:id', '/penitip/c1', <DetailPenitipPage />);
    await userEvent.click(await screen.findByRole('button', { name: /lihat produk titipan/i }));

    const dlg = getDialog();
    expect(await dlg.findByText('Rokok (titipan)')).toBeInTheDocument();
    expect(dlg.getByText(/Rp30\.000 · Stok 8/)).toBeInTheDocument();
  });
});
