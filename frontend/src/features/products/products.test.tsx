import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server';
import { mockViewport, renderWithProviders } from '../../test/helpers';
import { KatalogPage } from './KatalogPage';
import { DetailProdukPage } from './DetailProdukPage';
import { produkFixtures, registerProduct, type FixtureProduct } from '../../test/msw/handlers';

const [produk1, produk2] = produkFixtures as [FixtureProduct, FixtureProduct];
const listResponse = (data: unknown[], total: number) => ({
  success: true,
  data: { data, pagination: { page: 1, limit: 20, total, totalPages: total > 0 ? 1 : 0 } },
});

async function clickTambahProduk() {
  // Dua tombol bernama sama (header + empty state) — klik yang pertama muncul (header).
  const btns = await screen.findAllByRole('button', { name: /tambah produk/i });
  const first = btns[0];
  if (!first) throw new Error('tombol tambah produk tidak ditemukan');
  await userEvent.click(first);
}

function renderCatalog() {
  return renderWithProviders(
    <MemoryRouter initialEntries={['/produk']}>
      <Routes>
        <Route path="/produk" element={<KatalogPage />} />
        <Route path="/produk/:id" element={<DetailProdukPage />} />
      </Routes>
    </MemoryRouter>
  );
}

function renderDetail(id: string) {
  return renderWithProviders(
    <MemoryRouter initialEntries={[`/produk/${id}`]}>
      <Routes>
        <Route path="/produk" element={<KatalogPage />} />
        <Route path="/produk/:id" element={<DetailProdukPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Katalog', () => {
  it('menampilkan kartu produk + jumlah', async () => {
    renderCatalog();
    expect(await screen.findByText('Beras 5kg')).toBeInTheDocument();
    expect(screen.getByText('Gula Pasir 1kg')).toBeInTheDocument();
    expect(screen.getByText('Rp75.000')).toBeInTheDocument();
    expect(screen.getByText('Stok 12')).toBeInTheDocument();
  });

  it('empty state: "Belum ada produk" + tombol Tambah Produk', async () => {
    server.use(
      http.get('*/api/v1/products', () => HttpResponse.json(listResponse([], 0)))
    );
    renderCatalog();
    expect(await screen.findByText('Belum ada produk')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /tambah produk/i }).length).toBeGreaterThan(0);
  });

  it('pencarian tanpa hasil: pesan + hapus pencarian', async () => {
    renderCatalog();
    await userEvent.type(await screen.findByRole('searchbox'), 'tidak-ada');
    expect(await screen.findByText('Produk tidak ditemukan')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Kosongkan Pencarian' }));
    expect(await screen.findByText('Beras 5kg')).toBeInTheDocument();
  });

  it('error state: pesan + Coba lagi refetch', async () => {
    let fail = true;
    server.use(
      http.get('*/api/v1/products', () =>
        fail
          ? HttpResponse.json(
              { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'x' } },
              { status: 500 }
            )
          : HttpResponse.json(listResponse([produk1], 1))
      )
    );
    renderCatalog();
    expect(await screen.findByText('Gagal memuat produk.')).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(await screen.findByText('Beras 5kg')).toBeInTheDocument();
  });

  it('"Muat lebih banyak" memuat halaman berikutnya', async () => {
    server.use(
      http.get('*/api/v1/products', ({ request }) => {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get('page') ?? '1');
        if (page === 1) {
          return HttpResponse.json({
            success: true,
            data: {
              data: [produk1],
              pagination: { page: 1, limit: 20, total: 2, totalPages: 2 },
            },
          });
        }
        return HttpResponse.json({
          success: true,
          data: {
            data: [produk2],
            pagination: { page: 2, limit: 20, total: 2, totalPages: 2 },
          },
        });
      })
    );
    renderCatalog();
    expect(await screen.findByText('Beras 5kg')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Berikutnya/ }));
    expect(await screen.findByText('Gula Pasir 1kg')).toBeInTheDocument();
  });

  it('tablet/desktop (matchMedia min-width): grid kartu mengganti list — satu layout dirender', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(((query: string) => ({
      matches: query.includes('min-width'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia);

    renderCatalog();
    // Teks produk tampil tepat satu kali — bukan dobel (list+grid sekaligus).
    expect(await screen.findAllByText('Beras 5kg')).toHaveLength(1);

    vi.restoreAllMocks();
  });

  it('filter tipe "Titipan" hanya menampilkan produk titipan', async () => {
    renderCatalog();
    await userEvent.click(await screen.findByRole('button', { name: 'Tipe Titipan' }));
    expect(await screen.findByText('Rokok (titipan)')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Beras 5kg')).not.toBeInTheDocument());
  });

  it('tambah produk: POST + modal tertutup + daftar ter-update (dengan foto)', async () => {
    let captured: unknown;
    const photoSpy = vi.fn();
    server.use(
      http.post('*/api/v1/products', async ({ request }) => {
        captured = await request.json();
        const created: FixtureProduct = { ...produk1, id: 'p-baru', nama: 'Mie Instan', stok: 10 };
        registerProduct(created);
        return HttpResponse.json({ success: true, data: created }, { status: 201 });
      }),
      http.post('*/api/v1/products/:id/photo', () => {
        photoSpy();
        return HttpResponse.json({ success: true, data: { fotoUrl: 'x', fotoKey: 'y' } });
      })
    );
    renderCatalog();
    await clickTambahProduk();

    await userEvent.type(screen.getByLabelText(/^Nama Produk/), 'Mie Instan');
    await userEvent.type(screen.getByLabelText('Kategori'), 'Sembako');
    await userEvent.type(screen.getByLabelText(/^Harga Jual/), '3500');
    await userEvent.type(screen.getByLabelText(/^Harga Modal/), '3000');
    await userEvent.type(screen.getByLabelText(/^Stok Awal/), '10');
    await userEvent.type(screen.getByLabelText(/^Stok Minimum/), '5');

    const file = new File(['foto'], 'foto.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText(/pilih foto/i), file);

    await userEvent.click(screen.getByRole('button', { name: 'Simpan Produk' }));

    await waitFor(() => expect(captured).not.toBeNull());
    const body = captured as Record<string, unknown>;
    expect(body.nama).toBe('Mie Instan');
    expect(body.stok).toBe(10);
    expect(body.tipe).toBe('MILIK_SENDIRI');
    expect(body.consignorId).toBeNull();
    await waitFor(() => expect(photoSpy).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Mie Instan', {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it('tambah produk titipan dengan quick-add penitip baru langsung dari form produk', async () => {
    let captured: unknown = null;
    server.use(
      http.post('*/api/v1/products', async ({ request }) => {
        captured = await request.json();
        const created: FixtureProduct = {
          ...produk1,
          id: 'p-titipan-baru',
          nama: 'Keripik Tempe',
          tipe: 'TITIPAN',
          stok: 20,
        };
        registerProduct(created);
        return HttpResponse.json({ success: true, data: created }, { status: 201 });
      })
    );

    renderCatalog();
    await clickTambahProduk();

    await userEvent.type(screen.getByLabelText(/^Nama Produk/), 'Keripik Tempe');
    await userEvent.type(screen.getByLabelText('Kategori'), 'Makanan');
    await userEvent.type(screen.getByLabelText(/^Harga Jual/), '15000');
    await userEvent.type(screen.getByLabelText(/^Harga Modal/), '12000');

    // Pilih tipe Titipan
    const productDialog = screen.getByRole('dialog');
    await userEvent.click(within(productDialog).getByRole('radio', { name: 'Titipan' }));

    // Klik tombol quick-add penitip baru
    const tambahPenitipBtn = await within(productDialog).findByRole('button', { name: /tambah penitip baru/i });
    await userEvent.click(tambahPenitipBtn);

    // Dialog Tambah Penitip muncul di atas form
    const dialogs = screen.getAllByRole('dialog');
    const penitipDialog = dialogs[dialogs.length - 1];
    if (!penitipDialog) throw new Error('dialog penitip tidak ada');
    await userEvent.type(within(penitipDialog).getByLabelText(/nama penitip/i), 'Bu Ratna Snack');
    await userEvent.click(within(penitipDialog).getByRole('button', { name: 'Simpan Penitip' }));

    // Setelah simpan, dialog penitip tertutup dan penitip baru auto-selected
    await waitFor(() => {
      expect(screen.getAllByRole('dialog')).toHaveLength(1);
    });

    const selectPenitip = within(productDialog).getByLabelText(/^Penitip/) as HTMLSelectElement;
    await waitFor(() => {
      expect(selectPenitip.selectedOptions[0]?.text).toBe('Bu Ratna Snack');
    });

    // Simpan produk
    await userEvent.click(within(productDialog).getByRole('button', { name: 'Simpan Produk' }));

    await waitFor(() => expect(captured).not.toBeNull());
    const body = captured as Record<string, unknown>;
    expect(body.nama).toBe('Keripik Tempe');
    expect(body.tipe).toBe('TITIPAN');
    expect(body.consignorId).toBeTruthy();
  });
});

describe('Detail Produk', () => {
  it('menampilkan identitas + harga + rincian', async () => {
    renderDetail('p1');
    expect(await screen.findAllByText('Beras 5kg')).not.toHaveLength(0);
    expect(screen.getByText('Rp75.000')).toBeInTheDocument();
    expect(screen.getByText('Rp68.000')).toBeInTheDocument();
    expect(screen.getByText('Stok saat ini')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('produk titipan menampilkan nama penitip', async () => {
    renderDetail('p4');
    expect(await screen.findAllByText(/Bu Rina/)).not.toHaveLength(0);
  });

  it('edit: modal terisi nilai produk + PUT terkirim tanpa stok', async () => {
    let captured: unknown;
    server.use(
      http.put('*/api/v1/products/:id', async ({ request }) => {
        captured = await request.json();
        return HttpResponse.json({ success: true, data: produk1 });
      })
    );
    renderDetail('p1');
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Produk' }));

    const namaInput = screen.getByLabelText(/^Nama Produk/);
    expect(namaInput).toHaveValue('Beras 5kg');

    await userEvent.clear(namaInput);
    await userEvent.type(namaInput, 'Beras 10kg');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));

    await waitFor(() => expect(captured).not.toBeNull());
    const body = captured as Record<string, unknown>;
    expect(body.nama).toBe('Beras 10kg');
    expect(body).not.toHaveProperty('stok');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('nonaktifkan: konfirmasi → PATCH status NONAKTIF', async () => {
    let captured: unknown;
    server.use(
      http.patch('*/api/v1/products/:id/status', async ({ request }) => {
        captured = await request.json();
        return HttpResponse.json({ success: true, data: { ...produk1, status: 'NONAKTIF' } });
      })
    );
    renderDetail('p1');
    await userEvent.click(await screen.findByRole('button', { name: 'Nonaktifkan Produk' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Nonaktifkan Produk' }));

    await waitFor(() => expect(captured).not.toBeNull());
    expect(captured).toEqual({ status: 'NONAKTIF' });
  });

  it('delete berriwayat: dialog PRODUCT_HAS_TRANSACTION → Nonaktifkan', async () => {
    let captured: unknown;
    server.use(
      http.patch('*/api/v1/products/:id/status', async ({ request }) => {
        captured = await request.json();
        return HttpResponse.json({ success: true, data: { ...produk2, status: 'NONAKTIF' } });
      })
    );
    renderDetail('p2');
    await userEvent.click(await screen.findByRole('button', { name: 'Hapus Produk' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hapus Produk' }));

    expect(await screen.findByText(/riwayat transaksi/)).toBeInTheDocument();
    await userEvent.click(
      within(screen.getByRole('dialog', { name: 'Produk tidak dapat dihapus' })).getByRole('button', {
        name: 'Nonaktifkan Produk',
      })
    );

    await waitFor(() => expect(captured).not.toBeNull());
    expect(captured).toEqual({ status: 'NONAKTIF' });
  });

  it('hapus tanpa riwayat: DELETE sukses → kembali ke katalog tanpa produk', async () => {
    renderDetail('p1');
    await userEvent.click(await screen.findByRole('button', { name: 'Hapus Produk' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hapus Produk' }));

    expect(await screen.findByText('Gula Pasir 1kg')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Beras 5kg')).not.toBeInTheDocument());
  });
});

describe('Terima Titipan & Retur ke Penitip', () => {
  it('produk titipan: Terima Titipan terkirim ke /consignment/receipts + stok refetch', async () => {
    let captured: unknown;
    server.use(
      http.post('*/api/v1/consignment/receipts', async ({ request }) => {
        captured = await request.json();
        return HttpResponse.json({
          success: true,
          data: { id: 'm1', productId: 'p4', tipe: 'TERIMA', jumlah: 2, product: { id: 'p4', stok: 10 } },
        });
      })
    );
    renderDetail('p4');
    await userEvent.click(await screen.findByRole('button', { name: 'Terima Titipan' }));

    const dlg = within(await screen.findByRole('dialog'));
    const jumlahInput = dlg.getByLabelText('Jumlah diterima');
    fireEvent.change(jumlahInput, { target: { value: '2' } });
    await userEvent.click(dlg.getByRole('button', { name: 'Simpan Penerimaan' }));

    await waitFor(() => expect(captured).not.toBeNull());
    expect(captured).toMatchObject({ productId: 'p4', jumlah: 2 });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('produk titipan: Retur melebihi stok diblokir + pesan', async () => {
    renderDetail('p4'); // stok p4 = 8
    await userEvent.click(await screen.findByRole('button', { name: 'Retur ke Penitip' }));

    const dlg = within(await screen.findByRole('dialog'));
    fireEvent.change(dlg.getByLabelText('Jumlah diretur'), { target: { value: '99' } });

    expect(dlg.getByText(/Jumlah retur melebihi stok tersedia/)).toBeInTheDocument();
    expect(dlg.getByRole('button', { name: 'Simpan Retur' })).toBeDisabled();
  });

  it('produk milik sendiri: tombol titipan tidak tampil', async () => {
    renderDetail('p1');
    expect(await screen.findByRole('button', { name: 'Edit Produk' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Terima Titipan' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retur ke Penitip' })).not.toBeInTheDocument();
  });
});

describe('Sesuaikan Stok', () => {
  async function openAdjust() {
    renderDetail('p1');
    await userEvent.click(await screen.findByRole('button', { name: 'Sesuaikan Stok' }));
    return within(screen.getByRole('dialog'));
  }

  it('pratinjau stok akhir + PATCH delta negatif + alasan', async () => {
    let captured: unknown;
    server.use(
      http.patch('*/api/v1/products/:id/stock-adjustment', async ({ request }) => {
        captured = await request.json();
        return HttpResponse.json({ success: true, data: { ...produk1, stok: 11 } });
      })
    );
    const dlg = await openAdjust();

    expect(dlg.getByText('Setelah disimpan')).toBeInTheDocument();
    await userEvent.click(dlg.getByRole('radio', { name: 'Kurangi Stok' }));
    await userEvent.click(dlg.getByRole('button', { name: 'Barang rusak' }));

    await userEvent.click(dlg.getByRole('button', { name: /^(Tambahkan|Kurangi) \d+ Unit$/ }));

    await waitFor(() => expect(captured).not.toBeNull());
    expect(captured).toEqual({ delta: -1, alasan: 'Barang rusak' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('pengurangan melebihi stok: pesan perbaikan + tombol disabled', async () => {
    const dlg = await openAdjust();
    await userEvent.click(dlg.getByRole('radio', { name: 'Kurangi Stok' }));
    const jumlahInput = dlg.getByLabelText('Jumlah penyesuaian');
    await userEvent.clear(jumlahInput);
    await userEvent.type(jumlahInput, '99');

    expect(dlg.getByText('Jumlah pengurangan melebihi stok saat ini. Stok tersisa 12.')).toBeInTheDocument();
    expect(dlg.getByRole('button', { name: /^(Tambahkan|Kurangi) \d+ Unit$/ })).toBeDisabled();
  });

  it('alasan kosong: tombol disabled', async () => {
    const dlg = await openAdjust();
    expect(dlg.getByRole('button', { name: /^(Tambahkan|Kurangi) \d+ Unit$/ })).toBeDisabled();
  });
});

describe('Katalog md+', () => {
  let restore: () => void;
  beforeEach(() => {
    restore = mockViewport(1280);
    localStorage.removeItem('kendi.katalog.tampilan');
  });
  afterEach(() => restore());

  it('grid default, toggle ke tampilan daftar dan tersimpan', async () => {
    renderCatalog();
    expect(await screen.findByText('Beras 5kg')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Tampilan grid' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('radio', { name: 'Tampilan daftar' }));
    expect(screen.getByText('Harga jual')).toBeInTheDocument();
    expect(localStorage.getItem('kendi.katalog.tampilan')).toBe('list');
  });

  it('kartu ringkasan Produk aktif memfilter status', async () => {
    renderCatalog();
    await screen.findByText('Beras 5kg');
    await userEvent.click(screen.getByRole('button', { name: /Produk aktif/ }));
    expect(screen.getByRole('radio', { name: 'Aktif' })).toHaveAttribute('aria-checked', 'true');
  });
});