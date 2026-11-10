/* eslint-disable testing-library/prefer-screen-queries -- query dibatasi scope dialog via within() */
import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server';
import { renderWithProviders } from '../../test/helpers';
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
    expect(screen.getByText('4 produk')).toBeInTheDocument();
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
    expect(await screen.findByText(/Tidak ada produk untuk/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hapus pencarian' }));
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
    await userEvent.click(screen.getByRole('button', { name: 'Muat lebih banyak' }));
    expect(await screen.findByText('Gula Pasir 1kg')).toBeInTheDocument();
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

    await userEvent.type(screen.getByLabelText('Nama produk'), 'Mie Instan');
    await userEvent.type(screen.getByLabelText('Kategori'), 'Sembako');
    await userEvent.type(screen.getByLabelText('Harga jual'), '3500');
    await userEvent.type(screen.getByLabelText('Harga modal'), '3000');
    await userEvent.type(screen.getByLabelText('Stok awal'), '10');
    await userEvent.type(screen.getByLabelText('Stok minimum'), '5');

    const file = new File(['foto'], 'foto.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText(/pilih foto/i), file);

    await userEvent.click(screen.getByRole('button', { name: 'Simpan Produk' }));

    await waitFor(() => expect(captured).toBeDefined());
    const body = captured as Record<string, unknown>;
    expect(body.nama).toBe('Mie Instan');
    expect(body.stok).toBe(10);
    expect(body.tipe).toBe('MILIK_SENDIRI');
    expect(body.consignorId).toBeNull();
    await waitFor(() => expect(photoSpy).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Mie Instan', {}, { timeout: 3000 })).toBeInTheDocument();
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

    const namaInput = screen.getByLabelText('Nama produk');
    expect(namaInput).toHaveValue('Beras 5kg');

    await userEvent.clear(namaInput);
    await userEvent.type(namaInput, 'Beras 10kg');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));

    await waitFor(() => expect(captured).toBeDefined());
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
    await userEvent.click(screen.getByRole('button', { name: 'Nonaktifkan' }));

    await waitFor(() => expect(captured).toBeDefined());
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

    await waitFor(() => expect(captured).toBeDefined());
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

    expect(dlg.getByText('Stok setelah penyimpanan:')).toBeInTheDocument();
    await userEvent.click(dlg.getByRole('radio', { name: 'Kurangi' }));
    await userEvent.click(dlg.getByRole('button', { name: 'Barang rusak' }));

    await userEvent.click(dlg.getByRole('button', { name: 'Simpan Penyesuaian' }));

    await waitFor(() => expect(captured).toBeDefined());
    expect(captured).toEqual({ delta: -1, alasan: 'Barang rusak' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('pengurangan melebihi stok: pesan perbaikan + tombol disabled', async () => {
    const dlg = await openAdjust();
    await userEvent.click(dlg.getByRole('radio', { name: 'Kurangi' }));
    const jumlahInput = dlg.getByLabelText('Jumlah penyesuaian');
    await userEvent.clear(jumlahInput);
    await userEvent.type(jumlahInput, '99');

    expect(dlg.getByText('Jumlah pengurangan melebihi stok saat ini. Stok tersisa 12.')).toBeInTheDocument();
    expect(dlg.getByRole('button', { name: 'Simpan Penyesuaian' })).toBeDisabled();
  });

  it('alasan kosong: tombol disabled', async () => {
    const dlg = await openAdjust();
    expect(dlg.getByRole('button', { name: 'Simpan Penyesuaian' })).toBeDisabled();
  });
});
