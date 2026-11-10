import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

/**
 * Handler MSW untuk test data layer.
 * Path di sini relatif ke origin; MSW mencocokkan URL penuh.
 */

export interface FixtureProduct {
  id: string;
  nama: string;
  kategori: string;
  hargaJual: string;
  hargaModal: string;
  stok: number;
  stokMinimum: number;
  status: 'AKTIF' | 'NONAKTIF';
  tipe: 'MILIK_SENDIRI' | 'TITIPAN';
  consignorId: string | null;
  consignor: { id: string; nama: string } | null;
  fotoKey: string | null;
  fotoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

const now = '2026-11-01T00:00:00.000Z';

export const produkFixtures: FixtureProduct[] = [
  {
    id: 'p1',
    nama: 'Beras 5kg',
    kategori: 'Sembako',
    hargaJual: '75000.00',
    hargaModal: '68000.00',
    stok: 12,
    stokMinimum: 5,
    status: 'AKTIF',
    tipe: 'MILIK_SENDIRI',
    consignorId: null,
    consignor: null,
    fotoKey: null,
    fotoUrl: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'p2',
    nama: 'Gula Pasir 1kg',
    kategori: 'Sembako',
    hargaJual: '18000.00',
    hargaModal: '16000.00',
    stok: 2,
    stokMinimum: 5,
    status: 'AKTIF',
    tipe: 'MILIK_SENDIRI',
    consignorId: null,
    consignor: null,
    fotoKey: null,
    fotoUrl: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'p3',
    nama: 'Minyak Goreng 1L',
    kategori: 'Sembako',
    hargaJual: '22000.00',
    hargaModal: '20000.00',
    stok: 0,
    stokMinimum: 3,
    status: 'NONAKTIF',
    tipe: 'MILIK_SENDIRI',
    consignorId: null,
    consignor: null,
    fotoKey: null,
    fotoUrl: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'p4',
    nama: 'Rokok (titipan)',
    kategori: 'Lainnya',
    hargaJual: '30000.00',
    hargaModal: '28000.00',
    stok: 8,
    stokMinimum: 2,
    status: 'AKTIF',
    tipe: 'TITIPAN',
    consignorId: 'c1',
    consignor: { id: 'c1', nama: 'Bu Rina' },
    fotoKey: null,
    fotoUrl: null,
    createdAt: now,
    updatedAt: now,
  },
];

let products = [...produkFixtures];

function resetProducts() {
  products = [...produkFixtures];
}

/** Registrasi produk baru dari override handler (mis. test POST). */
function registerProduct(p: FixtureProduct) {
  products = [p, ...products];
}

function replaceProduct(id: string, next: FixtureProduct) {
  products = products.map((p) => (p.id === id ? next : p));
}

function paginate<T>(list: T[], page: number, limit: number) {
  const total = list.length;
  return {
    data: list.slice((page - 1) * limit, page * limit),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

const notFound = () =>
  HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Produk tidak ditemukan.' } }, { status: 404 });

export const handlers = [
  http.post('*/api/v1/auth/login', () =>
    HttpResponse.json({ success: true, data: { accessToken: 'token-login-default' } })
  ),
  http.post('*/api/v1/auth/refresh-token', () => new HttpResponse(null, { status: 401 })),
  http.post('*/api/v1/auth/logout', () => new HttpResponse(null, { status: 204 })),

  http.get('*/api/v1/ping', () => HttpResponse.json({ success: true, data: { pong: true } })),

  http.get('*/api/v1/fail', () =>
    HttpResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Harga jual harus lebih dari 0',
          details: [{ field: 'hargaJual', issue: 'must be > 0' }],
        },
      },
      { status: 400 }
    )
  ),

  http.post('*/api/v1/upload', async ({ request }) => {
    const contentType = request.headers.get('Content-Type') ?? '';
    const hasAuth = request.headers.has('Authorization');
    return HttpResponse.json({ success: true, data: { contentType, hasAuth } });
  }),

  http.get('*/api/v1/export.xlsx', () =>
    new HttpResponse(new Blob(['x'], { type: 'application/octet-stream' }), {
      headers: { 'Content-Type': 'application/octet-stream' },
    })
  ),

  // ─── Products ──────────────────────────────────────────────────────────────
  http.get('*/api/v1/products/low-stock', () => {
    const low = products.filter((p) => p.status === 'AKTIF' && p.stok <= p.stokMinimum);
    return HttpResponse.json({ success: true, data: low });
  }),

  http.get('*/api/v1/products', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const tipe = url.searchParams.get('tipe');
    const search = url.searchParams.get('search') ?? '';
    const page = Number(url.searchParams.get('page') ?? '1');
    const limit = Number(url.searchParams.get('limit') ?? '20');

    const list = products.filter(
      (p) =>
        (!status || p.status === status) &&
        (!tipe || p.tipe === tipe) &&
        (!search || p.nama.toLowerCase().includes(search.toLowerCase()))
    );
    return HttpResponse.json({ success: true, data: paginate(list, page, limit) });
  }),

  http.get('*/api/v1/products/:id', ({ params }) => {
    const p = products.find((x) => x.id === params.id);
    if (!p) return notFound();
    return HttpResponse.json({ success: true, data: p });
  }),

  http.post('*/api/v1/products', async ({ request }) => {
    const body = (await request.json()) as Partial<FixtureProduct>;
    const p: FixtureProduct = {
      id: `p-${Date.now()}`,
      nama: body.nama ?? '',
      kategori: body.kategori ?? '',
      hargaJual: body.hargaJual ?? '0.00',
      hargaModal: body.hargaModal ?? '0.00',
      stok: body.stok ?? 0,
      stokMinimum: body.stokMinimum ?? 0,
      status: 'AKTIF',
      tipe: body.tipe ?? 'MILIK_SENDIRI',
      consignorId: body.consignorId ?? null,
      consignor: body.consignorId ? { id: body.consignorId, nama: 'Bu Rina' } : null,
      fotoKey: null,
      fotoUrl: null,
      createdAt: now,
      updatedAt: now,
    };
    products = [p, ...products];
    return HttpResponse.json({ success: true, data: p }, { status: 201 });
  }),

  http.put('*/api/v1/products/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<FixtureProduct>;
    const current = products.find((x) => x.id === params.id);
    if (!current) return notFound();
    if (body.tipe && body.tipe !== current.tipe) {
      return HttpResponse.json(
        { success: false, error: { code: 'BUSINESS_RULE_VIOLATION', message: 'Tipe produk tidak dapat diubah setelah produk dibuat (BR-A).' } },
        { status: 422 }
      );
    }
    const next: FixtureProduct = { ...current, ...body };
    replaceProduct(current.id, next);
    return HttpResponse.json({ success: true, data: next });
  }),

  http.delete('*/api/v1/products/:id', ({ params }) => {
    if (params.id === 'p2') {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'PRODUCT_HAS_TRANSACTION', message: 'Produk tidak dapat dihapus karena sudah memiliki riwayat transaksi.' },
        },
        { status: 422 }
      );
    }
    products = products.filter((x) => x.id !== params.id);
    return HttpResponse.json({ success: true, data: { message: 'Produk berhasil dihapus.' } });
  }),

  http.patch('*/api/v1/products/:id/status', async ({ params, request }) => {
    const body = (await request.json()) as { status: FixtureProduct['status'] };
    const current = products.find((x) => x.id === params.id);
    if (!current) return notFound();
    const next = { ...current, status: body.status };
    replaceProduct(current.id, next);
    return HttpResponse.json({ success: true, data: next });
  }),

  http.patch('*/api/v1/products/:id/stock-threshold', async ({ params, request }) => {
    const body = (await request.json()) as { stokMinimum: number };
    const current = products.find((x) => x.id === params.id);
    if (!current) return notFound();
    const next = { ...current, stokMinimum: body.stokMinimum };
    replaceProduct(current.id, next);
    return HttpResponse.json({ success: true, data: next });
  }),

  http.patch('*/api/v1/products/:id/stock-adjustment', async ({ params, request }) => {
    const body = (await request.json()) as { delta: number; alasan: string };
    const current = products.find((x) => x.id === params.id);
    if (!current) return notFound();
    const stokBaru = current.stok + body.delta;
    if (stokBaru < 0) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'BUSINESS_RULE_VIOLATION',
            message: `Penyesuaian stok ditolak. Stok hasil (${stokBaru}) tidak boleh negatif.`,
          },
        },
        { status: 422 }
      );
    }
    const next = { ...current, stok: stokBaru };
    replaceProduct(current.id, next);
    return HttpResponse.json({ success: true, data: next });
  }),

  http.post('*/api/v1/products/:id/photo', () =>
    HttpResponse.json({
      success: true,
      data: { fotoUrl: 'https://cdn.test/photo.webp', fotoKey: 'products/p1/x.webp' },
    })
  ),

  http.delete('*/api/v1/products/:id/photo', () =>
    HttpResponse.json({ success: true, data: { message: 'Foto produk berhasil dihapus.' } })
  ),

  // ─── Transactions & Debts ──────────────────────────────────────────────────
  http.get('*/api/v1/transactions', ({ request }) => {
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const statusPembayaran = url.searchParams.get('statusPembayaran');
    const statusTransaksi = url.searchParams.get('statusTransaksi');
    const page = Number(url.searchParams.get('page') ?? '1');
    const limit = Number(url.searchParams.get('limit') ?? '20');

    const list = transactions.filter(
      (t) =>
        (!statusPembayaran || t.statusPembayaran === statusPembayaran) &&
        (!statusTransaksi || t.statusTransaksi === statusTransaksi) &&
        (!startDate || t.createdAt >= startDate) &&
        (!endDate || t.createdAt <= endDate)
    );
    return HttpResponse.json({ success: true, data: paginate(list, page, limit) });
  }),

  http.get('*/api/v1/transactions/:id', ({ params }) => {
    const t = transactions.find((x) => x.id === params.id);
    if (!t) return transactionNotFound();
    return HttpResponse.json({ success: true, data: t });
  }),

  http.post('*/api/v1/transactions', async ({ request }) => {
    const body = (await request.json()) as {
      items: Array<{ productId: string; jumlah: number }>;
      uangDiterima: number;
      namaPembeli?: string;
      noHpPembeli?: string | null;
    };
    const items: FixtureTransaction['items'] = body.items.flatMap((i) => {
      const p = products.find((x) => x.id === i.productId);
      return p ? [makeItem({ id: `t-${Date.now()}` } as FixtureTransaction, p, i.jumlah)] : [];
    });
    const total = items.reduce((s, i) => s + Number(i.subtotal), 0);
    const uang = body.uangDiterima;
    const status = uang >= total ? 'LUNAS' : 'UTANG';
    const t: FixtureTransaction = {
      id: `t-${Date.now()}`,
      tanggal: now,
      total: `${total}.00`,
      uangDiterima: `${uang}.00`,
      kembalian: uang >= total ? `${uang - total}.00` : null,
      statusPembayaran: status,
      statusTransaksi: 'AKTIF',
      namaPembeli: body.namaPembeli ?? null,
      noHpPembeli: body.noHpPembeli ?? null,
      sisaSaldoUtang: status === 'UTANG' ? `${total - uang}.00` : null,
      dibuatOlehId: user.id,
      dibuatOleh: user,
      dibatalkanPada: null,
      createdAt: now,
      items,
      payments: [],
    };
    registerTransaction(t);
    return HttpResponse.json({ success: true, data: t }, { status: 201 });
  }),

  http.post('*/api/v1/transactions/:id/void', ({ params }) => {
    const t = transactions.find((x) => x.id === params.id);
    if (!t) return transactionNotFound();
    if (t.payments.length > 0) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'BUSINESS_RULE_VIOLATION',
            message: 'Transaksi tidak dapat dibatalkan karena sudah memiliki cicilan.',
          },
        },
        { status: 422 }
      );
    }
    const next = { ...t, statusTransaksi: 'DIBATALKAN' as const, dibatalkanPada: now };
    replaceTransaction(t.id, next);
    return HttpResponse.json({ success: true, data: next });
  }),

  http.get('*/api/v1/debts', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const limit = Number(url.searchParams.get('limit') ?? '20');
    const list = transactions.filter(
      (t) => t.statusPembayaran === 'UTANG' && t.statusTransaksi === 'AKTIF' && Number(t.sisaSaldoUtang) > 0
    );
    return HttpResponse.json({ success: true, data: paginate(list, page, limit) });
  }),

  http.get('*/api/v1/debts/:transactionId/payments', ({ params }) => {
    const t = transactions.find((x) => x.id === params.transactionId);
    if (!t) return transactionNotFound();
    return HttpResponse.json({ success: true, data: t.payments });
  }),

  http.post('*/api/v1/debts/:transactionId/payments', async ({ params, request }) => {
    const body = (await request.json()) as { jumlahBayar: number };
    const t = transactions.find((x) => x.id === params.transactionId);
    if (!t) return transactionNotFound();
    const sisa = Number(t.sisaSaldoUtang);
    if (body.jumlahBayar <= 0 || body.jumlahBayar > sisa) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'BUSINESS_RULE_VIOLATION',
            message: `Nominal cicilan melebihi sisa utang. Sisa utang ${sisa}.`,
          },
        },
        { status: 422 }
      );
    }
    const sisaBaru = sisa - body.jumlahBayar;
    const payment = {
      id: `pay-${Date.now()}`,
      transactionId: t.id,
      tanggalBayar: now,
      jumlahBayar: `${body.jumlahBayar}.00`,
      saldoSetelahBayar: `${sisaBaru}.00`,
      dicatatOlehId: user.id,
      dicatatOleh: user,
    };
    const next: FixtureTransaction = {
      ...t,
      payments: [...t.payments, payment],
      sisaSaldoUtang: sisaBaru > 0 ? `${sisaBaru}.00` : null,
      statusPembayaran: sisaBaru > 0 ? 'UTANG' : 'LUNAS',
    };
    replaceTransaction(t.id, next);
    return HttpResponse.json({ success: true, data: next });
  }),

  // ─── Consignors (opsi form titipan) ────────────────────────────────────────
  http.get('*/api/v1/consignors', () =>
    HttpResponse.json({
      success: true,
      data: {
        data: [{ id: 'c1', nama: 'Bu Rina', noHp: null, catatan: null, status: 'AKTIF' }],
        pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
      },
    })
  ),
];

// ─── Transactions & Debts fixtures ──────────────────────────────────────────

const HOUR_MS = 60 * 60 * 1000;
/** createdAt "baru" (masih dalam jendela void 24 jam) relatif ke waktu test berjalan. */
const recentDate = new Date(Date.now() - 2 * HOUR_MS).toISOString();
/** createdAt "lama" (lewat jendela void). */
const oldDate = new Date(Date.now() - 72 * HOUR_MS).toISOString();

export interface FixtureTransaction {
  id: string;
  tanggal: string;
  total: string;
  uangDiterima: string | null;
  kembalian: string | null;
  statusPembayaran: 'LUNAS' | 'UTANG';
  statusTransaksi: 'AKTIF' | 'DIBATALKAN';
  namaPembeli: string | null;
  noHpPembeli: string | null;
  sisaSaldoUtang: string | null;
  dibuatOlehId: string;
  dibuatOleh: { id: string; nama: string; email: string };
  dibatalkanPada: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    transactionId: string;
    productId: string;
    namaProdukSnapshot: string;
    hargaJualSnapshot: string;
    hargaModalSnapshot: string;
    jumlah: number;
    subtotal: string;
    product: FixtureProduct;
  }>;
  payments: Array<{
    id: string;
    transactionId: string;
    tanggalBayar: string;
    jumlahBayar: string;
    saldoSetelahBayar: string;
    dicatatOlehId: string;
    dicatatOleh: { id: string; nama: string; email: string };
  }>;
}

const user = { id: 'u1', nama: 'Kendi', email: 'kendi@warung.id' };

function makeItem(t: FixtureTransaction, p: FixtureProduct, jumlah: number): FixtureTransaction['items'][number] {
  return {
    id: `i-${t.id}-${p.id}`,
    transactionId: t.id,
    productId: p.id,
    namaProdukSnapshot: p.nama,
    hargaJualSnapshot: p.hargaJual,
    hargaModalSnapshot: p.hargaModal,
    jumlah,
    subtotal: String(Number(p.hargaJual) * jumlah),
    product: p,
  };
}

function makeTransaction(input: {
  id: string;
  total: number;
  statusPembayaran: 'LUNAS' | 'UTANG';
  statusTransaksi?: 'AKTIF' | 'DIBATALKAN';
  sisaSaldoUtang?: number;
  namaPembeli?: string;
  createdAt?: string;
  items: Array<{ product: FixtureProduct; jumlah: number }>;
}): FixtureTransaction {
  const t: FixtureTransaction = {
    id: input.id,
    tanggal: input.createdAt ?? recentDate,
    total: `${input.total}.00`,
    uangDiterima: input.statusPembayaran === 'LUNAS' ? `${input.total}.00` : '0.00',
    kembalian: input.statusPembayaran === 'LUNAS' ? '0.00' : null,
    statusPembayaran: input.statusPembayaran,
    statusTransaksi: input.statusTransaksi ?? 'AKTIF',
    namaPembeli: input.namaPembeli ?? null,
    noHpPembeli: null,
    sisaSaldoUtang: input.sisaSaldoUtang !== undefined ? `${input.sisaSaldoUtang}.00` : null,
    dibuatOlehId: user.id,
    dibuatOleh: user,
    dibatalkanPada: input.statusTransaksi === 'DIBATALKAN' ? input.createdAt ?? oldDate : null,
    createdAt: input.createdAt ?? recentDate,
    items: [],
    payments: [],
  };
  t.items = input.items.map((i) => makeItem(t, i.product, i.jumlah));
  return t;
}

/** Ambil fixture produk by index dengan jaminan type (tanpa non-null assertion). */
function fp(index: number): FixtureProduct {
  const p = produkFixtures[index];
  if (!p) throw new Error(`Produk fixture index ${index} tidak ada.`);
  return p;
}

export const transactionFixtures: FixtureTransaction[] = [
  makeTransaction({
    id: 't1',
    total: 75000,
    statusPembayaran: 'LUNAS',
    items: [{ product: fp(0), jumlah: 1 }],
  }),
  makeTransaction({
    id: 't2',
    total: 36000,
    statusPembayaran: 'UTANG',
    sisaSaldoUtang: 36000,
    namaPembeli: 'Pak Budi',
    createdAt: oldDate,
    items: [{ product: fp(1), jumlah: 2 }],
  }),
  makeTransaction({
    id: 't3',
    total: 30000,
    statusPembayaran: 'LUNAS',
    statusTransaksi: 'DIBATALKAN',
    createdAt: oldDate,
    items: [{ product: fp(3), jumlah: 1 }],
  }),
];

let transactions = [...transactionFixtures];

function resetTransactions() {
  transactions = [...transactionFixtures];
}

/** Registrasi transaksi baru dari override handler (mis. test POST). */
function registerTransaction(t: FixtureTransaction) {
  transactions = [t, ...transactions];
}

function replaceTransaction(id: string, next: FixtureTransaction) {
  transactions = transactions.map((x) => (x.id === id ? next : x));
}

const transactionNotFound = () =>
  HttpResponse.json(
    { success: false, error: { code: 'NOT_FOUND', message: 'Transaksi tidak ditemukan.' } },
    { status: 404 }
  );

export const server = setupServer(...handlers);

export { resetProducts, registerProduct, resetTransactions, registerTransaction };
