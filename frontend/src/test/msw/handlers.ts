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
    const kategori = url.searchParams.get('kategori');
    const search = url.searchParams.get('search') ?? '';
    const consignorId = url.searchParams.get('consignorId');
    const page = Number(url.searchParams.get('page') ?? '1');
    const limit = Number(url.searchParams.get('limit') ?? '20');

    const list = products.filter(
      (p) =>
        (!status || p.status === status) &&
        (!tipe || p.tipe === tipe) &&
        (!kategori || p.kategori.toLowerCase() === kategori.toLowerCase()) &&
        (!consignorId || p.consignorId === consignorId) &&
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

  // ─── Consignors ──────────────────────────────────────────────────────────────
  // Daftar + detail + payments + status + konsinyasi ditangani consignorHandlers
  // (di bawah), termasuk filter status=AKTIF utk form titipan.
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

// ─── Consignors / Consignment ─────────────────────────────────────────────────

export interface FixtureConsignor {
  id: string;
  nama: string;
  noHp: string | null;
  catatan: string | null;
  status: 'AKTIF' | 'NONAKTIF';
  createdAt: string;
  updatedAt: string;
}

/** Saldo per penitip (mock GET /consignors/:id/balance). */
export interface FixtureBalance {
  consignorId: string;
  totalTerjualModal: string;
  totalDisetor: string;
  saldo: string;
}

export const consignorFixtures: FixtureConsignor[] = [
  {
    id: 'c1',
    nama: 'Bu Rina',
    noHp: '081234567890',
    catatan: null,
    status: 'AKTIF',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'c2',
    nama: 'Pak Joko',
    noHp: null,
    catatan: 'Penitip rokok',
    status: 'AKTIF',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'c3',
    nama: 'Bu Sari',
    noHp: '089876543210',
    catatan: null,
    status: 'NONAKTIF',
    createdAt: now,
    updatedAt: now,
  },
];

/** Saldo c1 negatif (setoran > kewajiban) — BR-F. */
export const balanceFixtures: Record<string, FixtureBalance> = {
  c1: { consignorId: 'c1', totalTerjualModal: '40000.00', totalDisetor: '55000.00', saldo: '-15000.00' },
  c2: { consignorId: 'c2', totalTerjualModal: '120000.00', totalDisetor: '0.00', saldo: '120000.00' },
  c3: { consignorId: 'c3', totalTerjualModal: '0.00', totalDisetor: '0.00', saldo: '0.00' },
};

export const consignorPaymentFixtures: Array<{
  id: string;
  consignorId: string;
  tanggalBayar: string;
  jumlahBayar: string;
  saldoSetelahBayar: string;
  catatan: string | null;
  dicatatOlehId: string;
  dicatatOleh: typeof user;
}> = [
  {
    id: 'cp1',
    consignorId: 'c2',
    tanggalBayar: recentDate,
    jumlahBayar: '50000.00',
    saldoSetelahBayar: '70000.00',
    catatan: null,
    dicatatOlehId: 'u1',
    dicatatOleh: user,
  },
];

let consignors = [...consignorFixtures];
let payments = [...consignorPaymentFixtures];

function resetConsignors() {
  consignors = [...consignorFixtures];
  payments = [...consignorPaymentFixtures];
}

function ringkasan(id: string) {
  const titipan = products.filter((p) => p.consignorId === id && p.status === 'AKTIF');
  return {
    jumlahProdukTitipanAktif: titipan.length,
    totalStokTitipan: titipan.reduce((s, p) => s + p.stok, 0),
  };
}

const consignorNotFound = () =>
  HttpResponse.json(
    { success: false, error: { code: 'NOT_FOUND', message: 'Penitip tidak ditemukan.' } },
    { status: 404 }
  );

const consignorHandlers = [
  http.get('*/api/v1/consignors', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search') ?? '';
    const punyaSaldo = url.searchParams.get('punyaSaldo') === 'true';
    const page = Number(url.searchParams.get('page') ?? '1');
    const limit = Number(url.searchParams.get('limit') ?? '20');

    let list = consignors.filter(
      (c) => (!status || c.status === status) && (!search || c.nama.toLowerCase().includes(search.toLowerCase()))
    );
    if (punyaSaldo) {
      list = list.filter((c) => Number(balanceFixtures[c.id]?.saldo ?? '0') !== 0);
    }
    return HttpResponse.json({ success: true, data: paginate(list, page, limit) });
  }),

  http.get('*/api/v1/consignors/:id', ({ params }) => {
    const c = consignors.find((x) => x.id === params.id);
    if (!c) return consignorNotFound();
    return HttpResponse.json({ success: true, data: { ...c, ringkasan: ringkasan(c.id) } });
  }),

  http.get('*/api/v1/consignors/:id/balance', ({ params }) => {
    const b = balanceFixtures[params.id as string];
    if (!b) return consignorNotFound();
    return HttpResponse.json({ success: true, data: b });
  }),

  http.get('*/api/v1/consignors/:id/payments', ({ params, request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const limit = Number(url.searchParams.get('limit') ?? '20');
    const list = payments.filter((p) => p.consignorId === params.id);
    return HttpResponse.json({ success: true, data: paginate(list, page, limit) });
  }),

  http.post('*/api/v1/consignors/:id/payments', async ({ params, request }) => {
    const c = consignors.find((x) => x.id === params.id);
    const b = balanceFixtures[params.id as string];
    if (!c || !b) return consignorNotFound();
    const body = (await request.json()) as { jumlahBayar: number; catatan?: string };
    if (body.jumlahBayar <= 0 || body.jumlahBayar > Number(b.saldo)) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'CONSIGNOR_OVERPAYMENT',
            message: 'Nominal setoran melebihi saldo kewajiban penitip (BR-D).',
          },
        },
        { status: 422 }
      );
    }
    const payment = {
      id: `cp-${Date.now()}`,
      consignorId: c.id,
      tanggalBayar: new Date().toISOString(),
      jumlahBayar: String(body.jumlahBayar),
      saldoSetelahBayar: String(Number(b.saldo) - body.jumlahBayar),
      catatan: body.catatan ?? null,
      dicatatOlehId: 'u1',
      dicatatOleh: user,
    };
    payments = [payment, ...payments];
    balanceFixtures[c.id] = {
      ...b,
      totalDisetor: String(Number(b.totalDisetor) + body.jumlahBayar),
      saldo: String(Number(b.saldo) - body.jumlahBayar),
    };
    return HttpResponse.json({ success: true, data: payment });
  }),

  http.patch('*/api/v1/consignors/:id/status', async ({ params, request }) => {
    const c = consignors.find((x) => x.id === params.id);
    if (!c) return consignorNotFound();
    const body = (await request.json()) as { status: 'AKTIF' | 'NONAKTIF' };
    if (body.status === 'NONAKTIF') {
      const blockers = products.filter((p) => p.consignorId === c.id && p.status === 'AKTIF' && p.stok > 0);
      if (blockers.length > 0) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: 'CONSIGNOR_HAS_STOCK',
              message: 'Penitip masih memiliki produk titipan yang berstok, sehingga tidak dapat dinonaktifkan (BR-E).',
              details: { products: blockers.map((p) => ({ id: p.id, nama: p.nama, stok: p.stok })) },
            },
          },
          { status: 422 }
        );
      }
    }
    consignors = consignors.map((x) => (x.id === c.id ? { ...x, status: body.status } : x));
    return HttpResponse.json({ success: true, data: { ...c, status: body.status, ringkasan: ringkasan(c.id) } });
  }),

  http.post('*/api/v1/consignment/receipts', async ({ request }) => {
    const body = (await request.json()) as { productId: string; jumlah: number; catatan?: string };
    const p = products.find((x) => x.id === body.productId);
    if (!p) return notFound();
    return HttpResponse.json({
      success: true,
      data: {
        id: `m-${Date.now()}`,
        consignorId: p.consignorId ?? '',
        productId: p.id,
        tipe: 'TERIMA',
        jumlah: body.jumlah,
        stokSebelum: p.stok,
        stokSesudah: p.stok + body.jumlah,
        catatan: body.catatan ?? null,
        dicatatOlehId: 'u1',
        dicatatOleh: user,
        createdAt: new Date().toISOString(),
        product: { id: p.id, nama: p.nama, tipe: p.tipe, stok: p.stok + body.jumlah },
        consignor: { id: p.consignorId ?? '', nama: consignors.find((c) => c.id === p.consignorId)?.nama ?? '' },
      },
    });
  }),

  http.post('*/api/v1/consignment/returns', async ({ request }) => {
    const body = (await request.json()) as { productId: string; jumlah: number; catatan?: string };
    const p = products.find((x) => x.id === body.productId);
    if (!p) return notFound();
    if (body.jumlah > p.stok) {
      return HttpResponse.json(
        { success: false, error: { code: 'STOCK_EXCEEDED', message: 'Jumlah retur melebihi stok tersedia (BR-I).' } },
        { status: 422 }
      );
    }
    return HttpResponse.json({
      success: true,
      data: {
        id: `m-${Date.now()}`,
        consignorId: p.consignorId ?? '',
        productId: p.id,
        tipe: 'RETUR',
        jumlah: body.jumlah,
        stokSebelum: p.stok,
        stokSesudah: p.stok - body.jumlah,
        catatan: body.catatan ?? null,
        dicatatOlehId: 'u1',
        dicatatOleh: user,
        createdAt: new Date().toISOString(),
        product: { id: p.id, nama: p.nama, tipe: p.tipe, stok: p.stok - body.jumlah },
        consignor: { id: p.consignorId ?? '', nama: consignors.find((c) => c.id === p.consignorId)?.nama ?? '' },
      },
    });
  }),

  http.get('*/api/v1/consignment/movements', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const limit = Number(url.searchParams.get('limit') ?? '20');
    return HttpResponse.json({ success: true, data: paginate([], page, limit) });
  }),
];

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface ReportFixtures {
  sales: {
    periode: { start: string; end: string };
    omzet: string;
    profit: string;
    transactionCount: number;
    perTipe: { MILIK_SENDIRI: { omzet: string; profit: string }; TITIPAN: { omzet: string; profit: string } };
    transactions: Array<{ id: string; tanggal: string; total: string; statusPembayaran: string; namaPembeli: string | null }>;
  };
  debts: {
    periode: { start: string; end: string };
    totalSaldoUtang: string;
    debtCount: number;
    debts: Array<{
      id: string;
      tanggal: string;
      total: string;
      namaPembeli: string;
      noHpPembeli: string | null;
      sisaSaldoUtang: string;
      payments: Array<{ id: string; tanggalBayar: string; jumlahBayar: string; saldoSetelahBayar: string }>;
    }>;
  };
  trend: {
    periode: { start: string; end: string };
    topProducts: Array<{ productId: string; namaProduk: string; kategori: string; totalQuantitySold: number; totalRevenue: string }>;
  };
  consignment: {
    periode: { start: string; end: string };
    totalModalPeriode: string;
    totalDisetorPeriode: string;
    totalSaldoAkhir: string;
    consignors: Array<{
      consignorId: string;
      nama: string;
      status: string;
      terjualPeriode: string;
      modalPeriode: string;
      disetorPeriode: string;
      saldoAkhir: string;
    }>;
  };
}

const defaultReportFixtures: ReportFixtures = {
  sales: {
    periode: { start: '', end: '' },
    omzet: '111000.00',
    profit: '23000.00',
    transactionCount: 2,
    perTipe: {
      MILIK_SENDIRI: { omzet: '105000.00', profit: '19000.00' },
      TITIPAN: { omzet: '6000.00', profit: '4000.00' },
    },
    transactions: [
      { id: 't1', tanggal: recentDate, total: '75000.00', statusPembayaran: 'LUNAS', namaPembeli: null },
      {
        id: 't2',
        tanggal: oldDate,
        total: '36000.00',
        statusPembayaran: 'UTANG',
        namaPembeli: 'Pak Budi',
      },
    ],
  },
  debts: {
    periode: { start: '', end: '' },
    totalSaldoUtang: '36000.00',
    debtCount: 1,
    debts: [
      {
        id: 't2',
        tanggal: oldDate,
        total: '36000.00',
        namaPembeli: 'Pak Budi',
        noHpPembeli: null,
        sisaSaldoUtang: '36000.00',
        payments: [],
      },
    ],
  },
  trend: {
    periode: { start: '', end: '' },
    topProducts: [
      { productId: 'p1', namaProduk: 'Beras 5kg', kategori: 'Sembako', totalQuantitySold: 3, totalRevenue: '225000.00' },
      { productId: 'p2', namaProduk: 'Gula Pasir 1kg', kategori: 'Sembako', totalQuantitySold: 2, totalRevenue: '36000.00' },
    ],
  },
  consignment: {
    periode: { start: '', end: '' },
    totalModalPeriode: '25000.00',
    totalDisetorPeriode: '0.00',
    totalSaldoAkhir: '45000.00',
    consignors: [
      {
        consignorId: 'c1',
        nama: 'Bu Rina',
        status: 'AKTIF',
        terjualPeriode: '30000.00',
        modalPeriode: '25000.00',
        disetorPeriode: '0.00',
        saldoAkhir: '-15000.00',
      },
      {
        consignorId: 'c2',
        nama: 'Pak Joko',
        status: 'AKTIF',
        terjualPeriode: '0.00',
        modalPeriode: '0.00',
        disetorPeriode: '0.00',
        saldoAkhir: '45000.00',
      },
      {
        consignorId: 'c3',
        nama: 'Bu Sari',
        status: 'NONAKTIF',
        terjualPeriode: '0.00',
        modalPeriode: '0.00',
        disetorPeriode: '0.00',
        saldoAkhir: '0.00',
      },
    ],
  },
};

/** Fixture laporan aktif (bisa diganti per-test). */
export let reportFixtures: ReportFixtures = { ...defaultReportFixtures };

/** Ganti fixture laporan dari override test. */
export function setReportFixtures(next: Partial<ReportFixtures>) {
  reportFixtures = { ...reportFixtures, ...next };
}

export function resetReportFixtures() {
  reportFixtures = { ...defaultReportFixtures };
}

const reportHandlers = [
  http.get('*/api/v1/reports/sales', ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json({
      success: true,
      data: { ...reportFixtures.sales, periode: { start: url.searchParams.get('startDate') ?? '', end: url.searchParams.get('endDate') ?? '' } },
    });
  }),

  http.get('*/api/v1/reports/debts', ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json({
      success: true,
      data: { ...reportFixtures.debts, periode: { start: url.searchParams.get('startDate') ?? '', end: url.searchParams.get('endDate') ?? '' } },
    });
  }),

  http.get('*/api/v1/reports/product-trend', ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json({
      success: true,
      data: { ...reportFixtures.trend, periode: { start: url.searchParams.get('startDate') ?? '', end: url.searchParams.get('endDate') ?? '' } },
    });
  }),

  http.get('*/api/v1/reports/consignment', ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json({
      success: true,
      data: { ...reportFixtures.consignment, periode: { start: url.searchParams.get('startDate') ?? '', end: url.searchParams.get('endDate') ?? '' } },
    });
  }),

  http.get('*/api/v1/reports/sales/export', ({ request }) => {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') ?? 'xlsx';
    const start = (url.searchParams.get('startDate') ?? '').replaceAll('-', '');
    const end = (url.searchParams.get('endDate') ?? '').replaceAll('-', '');
    const type =
      format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    return new HttpResponse(new Blob(['x'], { type }), {
      headers: {
        'Content-Type': type,
        'Content-Disposition': `attachment; filename="laporan-penjualan_${start}_${end}.${format}"`,
      },
    });
  }),

  http.get('*/api/v1/reports/debts/export', ({ request }) => {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') ?? 'xlsx';
    const start = (url.searchParams.get('startDate') ?? '').replaceAll('-', '');
    const end = (url.searchParams.get('endDate') ?? '').replaceAll('-', '');
    const type =
      format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    return new HttpResponse(new Blob(['x'], { type }), {
      headers: {
        'Content-Type': type,
        'Content-Disposition': `attachment; filename="laporan-utang_${start}_${end}.${format}"`,
      },
    });
  }),

  http.get('*/api/v1/dashboard/summary', () => {
    const totalTransaksi = transactions.filter((t) => t.statusTransaksi === 'AKTIF');
    const omzetHariIni = totalTransaksi.reduce((s, t) => s + Number(t.total), 0);
    return HttpResponse.json({
      success: true,
      data: {
        hariIni: { omzet: `${omzetHariIni}.00`, profit: '0.00', transactionCount: totalTransaksi.length },
        bulanBerjalan: { omzet: `${omzetHariIni}.00`, profit: '0.00', transactionCount: totalTransaksi.length },
        produkLowStock: products
          .filter((p) => p.status === 'AKTIF' && p.stok <= p.stokMinimum)
          .map((p) => ({ id: p.id, nama: p.nama, stok: p.stok, stokMinimum: p.stokMinimum, kategori: p.kategori })),
        totalSaldoUtang: '36000.00',
        totalKewajibanPenitip: '0.00',
      },
    });
  }),
];

export const server = setupServer(...handlers, ...consignorHandlers, ...reportHandlers);

export { resetProducts, registerProduct, resetTransactions, registerTransaction, resetConsignors };
