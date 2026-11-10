/* eslint-disable testing-library/prefer-screen-queries -- query dibatasi scope dialog via within() */
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../test/helpers';
import { PosPage } from './components/PosPage';
import { DebtsPage } from './components/DebtsPage';
import { RiwayatPage } from './components/RiwayatPage';

function renderAt(path: string, element: React.ReactElement) {
  return renderWithProviders(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={element} />
      </Routes>
    </MemoryRouter>
  );
}

function getDialog() {
  return within(screen.getByRole('dialog'));
}

async function tambahKeKeranjang(nama: string) {
  await userEvent.click(await screen.findByRole('button', { name: `Tambah ${nama}` }));
}

async function bukaKeranjang() {
  await userEvent.click(screen.getByRole('button', { name: /buka keranjang/i }));
}

describe('POS (Transaksi Baru)', () => {
  it('transaksi lunas: kembalian tampil setelah submit', async () => {
    renderAt('/transaksi', <PosPage />);
    await tambahKeKeranjang('Beras 5kg');
    await bukaKeranjang();

    const dlg = getDialog();
    expect(dlg.getByText('1 × Rp75.000')).toBeInTheDocument();
    expect(dlg.getByText('Rp75.000')).toBeInTheDocument();
    expect(dlg.getByText('Utang')).toBeInTheDocument();

    await userEvent.type(dlg.getByLabelText('Uang diterima'), '100000');
    expect(dlg.getByText('Lunas')).toBeInTheDocument();
    await userEvent.click(dlg.getByRole('button', { name: 'Buat Transaksi' }));

    expect(await dlg.findByText(/Transaksi berhasil/)).toBeInTheDocument();
    expect(dlg.getByText(/Kembalian Rp25\.000/)).toBeInTheDocument();
    await userEvent.click(dlg.getByRole('button', { name: 'Selesai' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('transaksi utang: nama pembeli wajib, lalu sisa utang tampil', async () => {
    renderAt('/transaksi', <PosPage />);
    await tambahKeKeranjang('Beras 5kg');
    await bukaKeranjang();

    const dlg = getDialog();
    await userEvent.type(dlg.getByLabelText('Uang diterima'), '50000');
    expect(dlg.getByText('Utang')).toBeInTheDocument();

    await userEvent.click(dlg.getByRole('button', { name: 'Buat Transaksi' }));
    expect(dlg.getByText('Isi nama pembeli untuk mencatat transaksi utang.')).toBeInTheDocument();

    await userEvent.type(dlg.getByLabelText('Nama pembeli'), 'Pak Budi');
    await userEvent.click(dlg.getByRole('button', { name: 'Buat Transaksi' }));

    expect(await dlg.findByText(/Sisa utang Rp25\.000/)).toBeInTheDocument();
  });
});

describe('Riwayat Transaksi', () => {
  it('menampilkan transaksi + filter status', async () => {
    renderAt('/riwayat', <RiwayatPage />);
    expect(await screen.findByText('Beras 5kg ×1')).toBeInTheDocument();
    expect(screen.getAllByText('Beras 5kg ×1').length).toBe(1);
    expect(screen.getByText('Gula Pasir 1kg ×2')).toBeInTheDocument();
    expect(screen.getByText('Rp75.000')).toBeInTheDocument();
    expect(screen.getAllByText('Dibatalkan').length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('radio', { name: 'Utang' }));
    expect(screen.getByText('Gula Pasir 1kg ×2')).toBeInTheDocument();
    expect(screen.queryByText('Beras 5kg ×1')).not.toBeInTheDocument();
  });

  it('tombol Batalkan hanya untuk transaksi 24 jam terakhir; void sukses', async () => {
    renderAt('/riwayat', <RiwayatPage />);
    await screen.findByText('Beras 5kg ×1');

    // t1 recent (2 jam) punya tombol; t2 lama (72 jam) tidak.
    const voidButtons = screen.getAllByRole('button', { name: 'Batalkan' });
    expect(voidButtons).toHaveLength(1);
    const voidBtn = voidButtons[0];
    if (!voidBtn) throw new Error('tombol batalkan tidak ada');
    await userEvent.click(voidBtn);
    const dlg = getDialog();
    expect(dlg.getByText(/Transaksi akan dibatalkan/)).toBeInTheDocument();

    await userEvent.click(dlg.getByRole('button', { name: 'Batalkan Transaksi' }));
    // t1 jadi DIBATALKAN + t3 fixture sudah DIBATALKAN → master + panel detail bisa dobel.
    await waitFor(() => expect(screen.getAllByText('Dibatalkan').length).toBeGreaterThanOrEqual(2));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Utang', () => {
  it('daftar utang: sisa, catat cicilan > sisa ditolak client, pelunasan menghapus baris', async () => {
    renderAt('/utang', <DebtsPage />);
    expect(await screen.findByText('Pak Budi')).toBeInTheDocument();
    expect(screen.getAllByText('Rp36.000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('1 transaksi utang aktif')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Catat Pembayaran' }));
    const dlg = getDialog();
    expect(dlg.getByText('Rp36.000')).toBeInTheDocument();

    const input = dlg.getByLabelText('Nominal cicilan');
    await userEvent.type(input, '40000');
    expect(
      dlg.getByText('Nominal cicilan melebihi sisa utang. Sisa utang transaksi ini Rp36.000.')
    ).toBeInTheDocument();
    expect(dlg.getByRole('button', { name: 'Simpan Cicilan' })).toBeDisabled();

    await userEvent.clear(input);
    await userEvent.type(input, '10000');
    await userEvent.click(dlg.getByRole('button', { name: 'Simpan Cicilan' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect((await screen.findAllByText('Rp26.000')).length).toBeGreaterThanOrEqual(1);

    await userEvent.click(screen.getByRole('button', { name: 'Catat Pembayaran' }));
    const dlg2 = getDialog();
    const input2 = dlg2.getByLabelText('Nominal cicilan');
    await userEvent.type(input2, '26000');
    await userEvent.click(dlg2.getByRole('button', { name: 'Simpan Cicilan' }));

    expect(await screen.findByText('Tidak ada utang aktif')).toBeInTheDocument();
  });

  it('riwayat cicilan kosong sebelum ada pembayaran', async () => {
    renderAt('/utang', <DebtsPage />);
    await screen.findByText('Pak Budi');
    await userEvent.click(screen.getByRole('button', { name: 'Riwayat cicilan' }));
    expect(getDialog().getByText('Belum ada cicilan untuk transaksi ini.')).toBeInTheDocument();
  });
});
