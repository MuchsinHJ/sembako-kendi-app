/* eslint-disable testing-library/prefer-screen-queries -- query dibatasi scope dialog via within() */
import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server';
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
    await userEvent.click(dlg.getByRole('button', { name: 'Selesaikan Transaksi' }));

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

    await userEvent.click(dlg.getByRole('button', { name: 'Selesaikan Transaksi' }));
    expect(dlg.getByText('Isi nama pembeli untuk mencatat transaksi utang.')).toBeInTheDocument();

    await userEvent.type(dlg.getByLabelText('Nama pembeli'), 'Pak Budi');
    await userEvent.click(dlg.getByRole('button', { name: 'Selesaikan Transaksi' }));

    expect(await dlg.findByText(/Sisa utang Rp25\.000/)).toBeInTheDocument();
  });
});

describe('Riwayat Transaksi', () => {
  it('menampilkan transaksi + filter status', async () => {
    renderAt('/riwayat', <RiwayatPage />);
    // Kartu memakai ringkasan "N produk · N item" (layout pen), bukan nama produk.
    expect(await screen.findByText('1 produk · 1 item')).toBeInTheDocument();
    expect(screen.getAllByText('1 produk · 1 item').length).toBe(1);
    expect(screen.getByText('1 produk · 2 item')).toBeInTheDocument(); // t2: Gula Pasir ×2
    expect(screen.getByText('Rp75.000')).toBeInTheDocument();
    expect(screen.getAllByText('Dibatalkan').length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('radio', { name: 'Utang' }));
    expect(screen.getByText('1 produk · 2 item')).toBeInTheDocument();
    expect(screen.queryByText('1 produk · 1 item')).not.toBeInTheDocument();
  });

  it('rentang tanggal berfungsi: ubah rentang mengirim query baru + empty state pakai rentang aktif', async () => {
    let captured: { startDate: string | null; endDate: string | null } | undefined;
    server.use(
      http.get('*/api/v1/transactions', ({ request }) => {
        const url = new URL(request.url);
        captured = {
          startDate: url.searchParams.get('startDate'),
          endDate: url.searchParams.get('endDate'),
        };
        return HttpResponse.json({
          success: true,
          data: { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
        });
      })
    );
    renderAt('/riwayat', <RiwayatPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Ubah rentang tanggal' }));
    const dlg = within(await screen.findByRole('dialog'));

    fireEvent.change(await dlg.findByLabelText('Tanggal mulai'), { target: { value: '2026-10-01' } });
    fireEvent.change(await dlg.findByLabelText('Tanggal akhir'), { target: { value: '2026-10-31' } });
    await userEvent.click(dlg.getByRole('button', { name: 'Terapkan' }));

    await waitFor(() => expect(captured).toBeDefined());
    // Konversi lokal→ISO di klien; bandingkan dengan hasil konversi yang sama (tahan TZ).
    expect(captured).toEqual({
      startDate: new Date('2026-10-01T00:00:00').toISOString(),
      endDate: new Date('2026-10-31T23:59:59').toISOString(),
    });
    // Empty state memakai rentang yang baru, bukan teks statis 30 hari.
    expect(await screen.findByText(/Tidak ada transaksi pada rentang 1 Okt 2026 – 31 Okt 2026/)).toBeInTheDocument();
  });

  it('transaksi di luar 24 jam: tombol disembunyikan, penjelasan batas waktu', async () => {
    renderAt('/riwayat', <RiwayatPage />);
    await screen.findByText('Rp75.000');
    // Daftar hanya menampilkan tombol Batalkan untuk t1 (2 jam); t2 (72 jam) tidak punya.
    expect(screen.getAllByRole('button', { name: 'Batalkan' })).toHaveLength(1);

    // Penjelasan batas waktu ada di panel detail (canvas k4IRS) — pilih t2.
    await userEvent.click(screen.getByRole('button', { name: /Transaksi t2, Rp36\.000/ }));
    expect(await screen.findByText(/Pembatalan hanya bisa dilakukan maksimal 24 jam/)).toBeInTheDocument();
    expect(screen.getByText(/sudah melewati batas pembatalan 24 jam/i)).toBeInTheDocument();
  });

  it('tombol Batalkan hanya untuk transaksi 24 jam terakhir; void sukses', async () => {
    renderAt('/riwayat', <RiwayatPage />);
    await screen.findByText('Rp75.000');

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
    expect(screen.getByText('1 transaksi belum lunas')).toBeInTheDocument();

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
