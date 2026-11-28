import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { mockViewport, renderWithProviders } from '../../test/helpers';
import { PosPage } from './components/PosPage';
import { RiwayatPage } from './components/RiwayatPage';
import { DebtsPage } from './components/DebtsPage';

function renderAt(path: string, element: React.ReactElement) {
  return renderWithProviders(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path.split('?')[0]} element={element} />
        <Route path="/riwayat" element={<p>Halaman Riwayat</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

let restore: () => void;
beforeEach(() => {
  restore = mockViewport(1024);
});
afterEach(() => restore());

/** Tombol + pada tile grid (stepper panel memakai nama yang sama, jadi ambil yang pertama). */
async function tombolGrid(nama: string) {
  const [btn] = await screen.findAllByRole('button', { name: `Tambah ${nama}` });
  if (!btn) throw new Error(`Tombol tambah ${nama} tidak ada`);
  return btn;
}

function panel() {
  return within(screen.getByRole('complementary', { name: 'Panel checkout' }));
}

describe('POS md+ (panel checkout)', () => {
  it('keranjang kosong → tambah dari grid → uang pas → konfirmasi → tersimpan di panel', async () => {
    renderAt('/transaksi', <PosPage />);
    expect(await panel().findByText('Keranjang masih kosong')).toBeInTheDocument();
    expect(panel().getByRole('button', { name: 'Periksa Transaksi' })).toBeDisabled();

    // Tombol + di grid (bukan stepper panel) — ambil yang pertama.
    await userEvent.click(await tombolGrid('Beras 5kg'));
    expect(panel().getByText('Rp75.000 × 1')).toBeInTheDocument();
    // Tidak ada bar keranjang mobile / langkah via URL.
    expect(screen.queryByRole('button', { name: /buka keranjang/i })).not.toBeInTheDocument();

    await userEvent.click(panel().getByRole('button', { name: 'Uang pas' }));
    expect(panel().getByText('Kembalian')).toBeInTheDocument();
    await userEvent.click(panel().getByRole('button', { name: 'Periksa Transaksi' }));

    expect(panel().getByRole('heading', { name: 'Konfirmasi Transaksi' })).toBeInTheDocument();
    expect(panel().getByText('Lunas')).toBeInTheDocument();
    // Grid produk tetap tampil di kiri.
    expect(screen.getByRole('heading', { name: 'Transaksi Baru' })).toBeInTheDocument();
    await userEvent.click(panel().getByRole('button', { name: 'Simpan Transaksi' }));

    expect(await panel().findByText('Transaksi tersimpan')).toBeInTheDocument();
    expect(panel().getByRole('button', { name: 'Lihat di Riwayat' })).toBeInTheDocument();
    await userEvent.click(panel().getByRole('button', { name: 'Transaksi Baru' }));
    expect(await panel().findByText('Keranjang masih kosong')).toBeInTheDocument();
  });

  it('utang di panel: nama pembeli wajib sebelum simpan', async () => {
    renderAt('/transaksi', <PosPage />);
    await userEvent.click(await tombolGrid('Beras 5kg'));
    await userEvent.type(panel().getByLabelText('Uang diterima'), '50000');
    expect(panel().getByText('Sisa utang')).toBeInTheDocument();
    await userEvent.click(panel().getByRole('button', { name: 'Periksa Transaksi' }));
    await userEvent.click(panel().getByRole('button', { name: 'Simpan Transaksi' }));
    expect(
      panel().getByText('Nama pembeli wajib diisi untuk transaksi utang.'),
    ).toBeInTheDocument();

    await userEvent.type(panel().getByLabelText(/^Nama Pembeli/), 'Pak Budi');
    await userEvent.click(panel().getByRole('button', { name: 'Simpan Transaksi' }));
    expect(await panel().findByText('Transaksi tersimpan')).toBeInTheDocument();
    expect(panel().getByText('Pak Budi')).toBeInTheDocument();
  });

  it('mengubah isi saat konfirmasi kembali ke langkah Keranjang', async () => {
    renderAt('/transaksi', <PosPage />);
    const tambahGrid = await tombolGrid('Beras 5kg');
    await userEvent.click(tambahGrid);
    await userEvent.click(panel().getByRole('button', { name: 'Uang pas' }));
    await userEvent.click(panel().getByRole('button', { name: 'Periksa Transaksi' }));
    expect(panel().getByRole('heading', { name: 'Konfirmasi Transaksi' })).toBeInTheDocument();
    await userEvent.click(tambahGrid);
    expect(panel().getByRole('heading', { name: 'Keranjang' })).toBeInTheDocument();
    expect(panel().getByText('Rp75.000 × 2')).toBeInTheDocument();
  });
});

describe('Riwayat lg+ (master-detail)', () => {
  it('transaksi pertama terpilih otomatis; memilih kartu lain mengganti panel detail', async () => {
    renderAt('/riwayat', <RiwayatPage />);
    const detail = within(await screen.findByRole('region', { name: 'Detail transaksi' }));
    expect(await detail.findByRole('heading', { name: 'Detail Transaksi' })).toBeInTheDocument();
    expect((await detail.findAllByText('Rp75.000')).length).toBeGreaterThan(0);
    expect(detail.getByRole('button', { name: 'Batalkan Transaksi' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Rp36\.000/ }));
    expect(await detail.findByText(/sudah melewati batas pembatalan 24 jam/i)).toBeInTheDocument();
    expect(detail.queryByRole('button', { name: 'Batalkan Transaksi' })).not.toBeInTheDocument();
    // Daftar tetap tampil (tidak berganti ke layar penuh).
    expect(screen.getByRole('button', { name: 'Ubah rentang tanggal' })).toBeInTheDocument();
  });
});

describe('Utang lg+ (master-detail)', () => {
  it('ringkasan sebaris + detail di panel + catat pembayaran dengan chip Lunasi', async () => {
    renderAt('/utang', <DebtsPage />);
    expect(await screen.findByText('Transaksi belum lunas')).toBeInTheDocument();
    const detail = within(await screen.findByRole('region', { name: 'Detail utang' }));
    expect(await detail.findByRole('heading', { name: 'Detail Transaksi Utang' })).toBeInTheDocument();

    await userEvent.click(detail.getByRole('button', { name: 'Catat Pembayaran' }));
    const sheet = within(screen.getByRole('dialog'));
    await userEvent.click(sheet.getByRole('button', { name: /^Lunasi/ }));
    expect(sheet.getByLabelText('Nominal cicilan')).toHaveValue('36.000');
    await userEvent.click(sheet.getByRole('button', { name: 'Lanjutkan' }));
    const konfirmasi = within(await screen.findByRole('dialog', { name: 'Catat pembayaran ini?' }));
    await userEvent.click(konfirmasi.getByRole('button', { name: 'Simpan Cicilan' }));

    expect(await detail.findByText('Pembayaran tercatat')).toBeInTheDocument();
    expect(
      detail.getByText('Status pembayaran otomatis menjadi Lunas saat saldo mencapai Rp0.'),
    ).toBeInTheDocument();
  });
});