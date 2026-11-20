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
    </MemoryRouter>,
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
  it('transaksi lunas: keranjang → konfirmasi → tersimpan dengan kembalian', async () => {
    renderAt('/transaksi', <PosPage />);
    await tambahKeKeranjang('Beras 5kg');
    await bukaKeranjang();

    // Langkah Keranjang (pen p6iFM)
    expect(await screen.findByText('Rp75.000 × 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Periksa Transaksi' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Uang diterima'), '100000');
    expect(screen.getByText('Kembalian')).toBeInTheDocument();
    expect(screen.getByText('Rp25.000')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Periksa Transaksi' }));

    // Langkah Konfirmasi (pen Iz4Nr)
    expect(
      await screen.findByRole('heading', { name: 'Konfirmasi Transaksi' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Lunas')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Simpan Transaksi' }));

    // Langkah Berhasil (pen maq6j)
    expect(await screen.findByText('Transaksi tersimpan')).toBeInTheDocument();
    expect(screen.getByText('Kembalian')).toBeInTheDocument();
    expect(screen.getByText('Rp25.000')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Transaksi Baru' }));
    expect(await screen.findByRole('button', { name: 'Tambah Beras 5kg' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /buka keranjang/i })).not.toBeInTheDocument();
  });

  it('transaksi utang: nama pembeli wajib di konfirmasi, lalu sisa utang tampil', async () => {
    renderAt('/transaksi', <PosPage />);
    await tambahKeKeranjang('Beras 5kg');
    await bukaKeranjang();

    await userEvent.type(await screen.findByLabelText('Uang diterima'), '50000');
    expect(screen.getByText('Sisa utang')).toBeInTheDocument();
    expect(screen.getByText('Nama pembeli wajib diisi di langkah konfirmasi.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Periksa Transaksi' }));

    expect(await screen.findByText('Utang')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Simpan Transaksi' }));
    expect(screen.getByText('Nama pembeli wajib diisi untuk transaksi utang.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/^Nama Pembeli/), 'Pak Budi');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan Transaksi' }));

    expect(await screen.findByText('Transaksi tersimpan')).toBeInTheDocument();
    expect(screen.getByText('Sisa utang')).toBeInTheDocument();
    expect(screen.getByText('Rp25.000')).toBeInTheDocument();
    expect(screen.getByText('Pak Budi')).toBeInTheDocument();
  });

  it('jumlah di keranjang dibatasi stok produk', async () => {
    renderAt('/transaksi', <PosPage />);
    await tambahKeKeranjang('Beras 5kg');
    await bukaKeranjang();
    const tambah = await screen.findByRole('button', { name: 'Tambah Beras 5kg' });
    for (let i = 0; i < 11; i++) await userEvent.click(tambah);
    expect(screen.getByText('Rp75.000 × 12')).toBeInTheDocument();
    expect(tambah).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Kurangi Beras 5kg' })).toBeEnabled();
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
      }),
    );
    renderAt('/riwayat', <RiwayatPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Ubah rentang tanggal' }));
    const dlg = within(await screen.findByRole('dialog'));

    fireEvent.change(await dlg.findByLabelText('Tanggal mulai'), {
      target: { value: '2026-10-01' },
    });
    fireEvent.change(await dlg.findByLabelText('Tanggal akhir'), {
      target: { value: '2026-10-31' },
    });
    await userEvent.click(dlg.getByRole('button', { name: 'Terapkan' }));

    await waitFor(() => expect(captured).toBeDefined());
    // Konversi lokal→ISO di klien; bandingkan dengan hasil konversi yang sama (tahan TZ).
    expect(captured).toEqual({
      startDate: new Date('2026-10-01T00:00:00').toISOString(),
      endDate: new Date('2026-10-31T23:59:59').toISOString(),
    });
    // Empty state memakai rentang yang baru, bukan teks statis 30 hari.
    expect(
      await screen.findByText(/Tidak ada transaksi pada rentang 1 Okt 2026 – 31 Okt 2026/),
    ).toBeInTheDocument();
  });

  it('transaksi di luar 24 jam: detail tanpa tombol batalkan + penjelasan batas waktu', async () => {
    renderAt('/riwayat', <RiwayatPage />);
    await screen.findByText('Rp75.000');
    // Detail dibuka sebagai layar penuh (pen k4IRS) dari kartu t2 (72 jam).
    await userEvent.click(screen.getByRole('button', { name: /Rp36\.000/ }));
    expect(await screen.findByRole('heading', { name: 'Detail Transaksi' })).toBeInTheDocument();
    expect(
      await screen.findByText(/Pembatalan hanya bisa dilakukan maksimal 24 jam/),
    ).toBeInTheDocument();
    expect(screen.getByText(/sudah melewati batas pembatalan 24 jam/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Batalkan Transaksi' })).not.toBeInTheDocument();
    // Tombol kembali menutup detail dan memunculkan daftar lagi.
    await userEvent.click(screen.getByRole('button', { name: 'Kembali' }));
    expect(await screen.findByRole('button', { name: 'Ubah rentang tanggal' })).toBeInTheDocument();
  });

  it('transaksi 24 jam terakhir: batalkan dari detail → dialog konfirmasi → status Dibatalkan', async () => {
    renderAt('/riwayat', <RiwayatPage />);
    await screen.findByText('Rp75.000');
    await userEvent.click(screen.getByRole('button', { name: /Rp75\.000/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Batalkan Transaksi' }));
    const dlg = getDialog();
    expect(dlg.getByText(/dikembalikan otomatis setelah pembatalan disimpan/)).toBeInTheDocument();
    await userEvent.click(dlg.getByRole('button', { name: 'Ya, Batalkan' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByTestId('badge-netral')).toHaveTextContent('Dibatalkan');
    expect(screen.getByText(/Transaksi dibatalkan/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Batalkan Transaksi' })).not.toBeInTheDocument();
  });
});

describe('Utang', () => {
  async function bukaDetailPakBudi() {
    renderAt('/utang', <DebtsPage />);
    await userEvent.click(await screen.findByRole('button', { name: /Utang Pak Budi/ }));
    expect(
      await screen.findByRole('heading', { name: 'Detail Transaksi Utang' }),
    ).toBeInTheDocument();
  }

  async function catat(nominal: string) {
    await userEvent.click(screen.getByRole('button', { name: 'Catat Pembayaran' }));
    const sheet = getDialog();
    await userEvent.type(sheet.getByLabelText('Nominal cicilan'), nominal);
    await userEvent.click(sheet.getByRole('button', { name: 'Lanjutkan' }));
    const konfirmasi = within(await screen.findByRole('dialog', { name: 'Catat pembayaran ini?' }));
    await userEvent.click(konfirmasi.getByRole('button', { name: 'Simpan Cicilan' }));
    expect(await screen.findByText('Pembayaran tercatat')).toBeInTheDocument();
  }

  it('daftar utang: jumlah transaksi + sisa utang per pembeli', async () => {
    renderAt('/utang', <DebtsPage />);
    expect(await screen.findByText('Pak Budi')).toBeInTheDocument();
    expect(screen.getAllByText('Rp36.000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('1 transaksi belum lunas')).toBeInTheDocument();
  });

  it('cicilan melebihi sisa ditolak di klien; cicilan sebagian lalu pelunasan', async () => {
    await bukaDetailPakBudi();

    await userEvent.click(screen.getByRole('button', { name: 'Catat Pembayaran' }));
    const sheet = getDialog();
    await userEvent.type(sheet.getByLabelText('Nominal cicilan'), '40000');
    expect(
      sheet.getByText('Nominal cicilan melebihi sisa utang. Sisa utang transaksi ini Rp36.000.'),
    ).toBeInTheDocument();
    expect(sheet.getByText('Tidak bisa dihitung')).toBeInTheDocument();
    expect(sheet.getByRole('button', { name: 'Lanjutkan' })).toBeDisabled();
    await userEvent.click(sheet.getByRole('button', { name: 'Batal' }));

    await catat('10000');
    expect(
      screen.getByText('Status pembayaran tetap Utang karena saldo belum mencapai Rp0.'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Rp26.000').length).toBeGreaterThanOrEqual(1);

    await userEvent.click(screen.getByRole('button', { name: 'Kembali ke Detail Utang' }));
    expect(
      await screen.findByRole('heading', { name: 'Detail Transaksi Utang' }),
    ).toBeInTheDocument();
    await catat('26000');
    expect(
      screen.getByText('Status pembayaran otomatis menjadi Lunas saat saldo mencapai Rp0.'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Lihat Daftar Utang' }));
    expect(
      await screen.findByText('Semua transaksi utang sudah lunas atau belum ada transaksi utang.'),
    ).toBeInTheDocument();
  });

  it('riwayat cicilan kosong sebelum ada pembayaran', async () => {
    await bukaDetailPakBudi();
    const riwayat = within(screen.getByRole('region', { name: 'Riwayat cicilan' }));
    expect(await riwayat.findByText('Belum ada cicilan untuk transaksi ini.')).toBeInTheDocument();
  });
});
