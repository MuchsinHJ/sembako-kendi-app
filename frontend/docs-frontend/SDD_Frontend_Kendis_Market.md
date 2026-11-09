# Software Design Document (SDD) — Front-End

## Kendi's Market

**Versi:** 1.0
**Tanggal:** 2026-11-09
**Tech stack:** React + TypeScript · Vite · Tailwind CSS · Zod · TanStack Query + native `fetch()` · Vitest + React Testing Library · ESLint
**Status:** Mengikuti SDD Backend v1.1. Bila bertentangan, urutan yang berlaku: PRD → SRS → SDD Backend → dokumen ini.

---

## 1. Pendahuluan

### 1.1 Tujuan

Dokumen ini mendesain **implementasi front-end** Kendi's Market: arsitektur folder, kontrak tipe, layer data (HTTP + server-state), validasi, styling, testing, dan urutan pengerjaan. Ini adalah **penerjemahan** SDD Backend ke sisi klien — bukan dokumen baru yang mengubah aturan bisnis.

### 1.2 Acuan (urutan kebenaran)

1. `docs/prd_kendi_s_market.md` (PRD Revisi 4)
2. `docs/SRS_Kendis_Market.md` (SRS v1.1)
3. `docs/SDD_Backend_Kendis_Market.md` (SDD Backend v1.1) — **patokan utama kontrak API**
4. `docs-frontend/01`–`06` — **patokan utama tampilan** (token, komponen, peta layar, aturan bisnis UI, layout responsif)

**Front-end tidak boleh** mengubah aturan bisnis. Semua derivasi (Lunas/Utang, saldo penitip, void 24 jam) **diotorisasi backend**; front-end hanya menghitung ulang untuk *umpan balik instan*, lalu selalu mempercayai respons server.

### 1.3 Ruang lingkup MVP

Autentikasi, dashboard, katalog & manajemen produk, manajemen stok (+ penyesuaian manual beralasan), transaksi Lunas/Utang, void 24 jam, cicilan utang, laporan penjualan/utang/tren, ekspor laporan penjualan & utang, dan **modul konsinyasi**.

### 1.4 Future Development — **dilarang dibangun**

QRIS/e-wallet · pemantauan kedaluwarsa & laporan kerugian kedaluwarsa · penanganan barang titipan rusak/hilang/kedaluwarsa · koreksi/pembatalan setoran penitip (setoran append-only) · batch/FIFO · pemisahan role Owner/Kasir · **ekspor laporan konsinyasi** (endpoint belum ada — SDD §5.8) · registrasi akun · filter penitip di katalog.

---

## 2. Keputusan Arsitektur (dan alasannya)

### 2.1 Data layer: TanStack Query + native `fetch()`

**Keputusan:** TanStack Query untuk semua server-state. **Tidak memakai axios.** HTTP ditangani helper `apiFetch()` tipis di atas `fetch()`.

Alasan (dikaitkan ke pola nyata proyek):

| Kebutuhan (sumber) | Yang diberi TanStack Query |
|---|---|
| Saldo penitip **diturunkan** (`SUM(jumlah × hargaModalSnapshot) − setoran`, SDD §3.14/§11.12) — invalidasi setelah Catat Setoran | `useMutation` + `invalidateQueries` |
| Void mengubah omzet, profit, **dan** saldo utang sekaligus (FR-29/FR-39) | invalidasi banyak key dalam satu mutasi |
| 4 angka Beranda dari sumber berbeda (`/dashboard/summary`, utang aktif, kewajiban penitip) | query key terpisah, cache per key |
| POS **offline-tolerant** di toko sinyal lemah (SRS IR-03 target <30 detik) | `networkMode`, retry, stale-while-revalidate |
| Ekspor butuh header auth + `responseType` blob (FR-40–FR-42) | di-handle di `apiFetch`, bukan tiap komponen |

**Kenapa buang axios** — axios dan TanStack Query menimpa satu sama lain: retry (`axios-retry` vs `retry`), error normalisasi (`interceptors` vs `QueryCache.onError`), loading state, cancellation (`AbortController` native di `fetch`). Satu-satunya nilai axios adalah *interceptor token*, yang digantikan wrapper `apiFetch()` ±15 baris. Hasil: **~3–4kb lebih ringan** — penting untuk mobile-web UMKM di jaringan pinggiran, dan hanya **satu** cara bicara ke server.

**Konsekuensi praktis:**

```
src/lib/http.ts        → apiFetch()  (fetch + token + error → ApiError)
src/lib/queryClient.ts → QueryClient (default staleTime, retry)
src/features/*/api.ts  → useQuery / useMutation per domain
```

### 2.2 Validasi: Zod

Zod adalah **sumber kebenaran tunggal bentuk data** — dipakai di tiga tempat:

1. **Form** — `zodResolver` (react-hook-form) untuk validasi klien.
2. **Batas API** — `.parse()` respons endpoint kritis (transaksi, saldo) untuk menangkap drift kontrak lebih awal.
3. **Tipe** — `z.infer<>` menjadi tipe TS; tidak ada duplikasi `interface` + validator.

### 2.3 Keputusan lain

| Topik | Keputusan | Alasan |
|---|---|---|
| Form library | **react-hook-form** + `zodResolver` | uncontrolled, minim re-render, cocok POS cepat |
| Router | **React Router** (`createBrowserRouter`) | data router + `loader` untuk guard |
| Styling | **Tailwind CSS** + token di `@theme` | token `01` jadi CSS var, tanpa hex literal di komponen |
| Server-state | **TanStack Query v5** | lihat §2.1 |
| Client-state | React state + Context **minimal** | auth session + preferensi UI saja; tidak ada Redux |
| Uang di klien | simpan **string desimal** dari server; format saat render | hindari float; lihat §5.4 |
| i18n | tidak ada — string literal Bahasa Indonesia | SRS IR-02, satu bahasa |

---

## 3. Struktur Folder

```
src/
  main.tsx
  App.tsx                    ← RouterProvider
  routes/
    router.tsx               ← createBrowserRouter + guard
    paths.ts                 ← konstanta path (hindari magic string)
  features/                  ← PEMBERIAN KODE PER DOMAIN (bukan per tipe file)
    auth/
      api.ts                 ← useLogin, useLogout, useRefreshToken
      schemas.ts             ← loginSchema
      components/
      hooks/
    products/
      api.ts                 ← useProducts, useProduct, useCreateProduct, useAdjustStock, ...
      schemas.ts             ← productFormSchema, stockAdjustmentSchema
      types.ts
      components/            ← ProductCard, ProductForm, ...
    transactions/            ← POS
    debts/                   ← utang & cicilan
    consignors/              ← penitip (konsinyasi)
    reports/                 ← penjualan, utang, tren, konsinyasi + ekspor
    dashboard/
  components/                ← UI generik lintas fitur (Button, Badge, Card, Modal, Field, ...)
  lib/
    http.ts                  ← apiFetch + ApiError
    queryClient.ts
    money.ts                 ← formatRupiah, parseDecimal, ke string desimal
    rupiah.test.ts
    cn.ts                    ← clsx + tailwind-merge
  theme/
    tokens.css               ← 15 token dari 01-design-token.md §1
  test/
    setup.ts                 ← @testing-library/jest-dom, cleanup
    msw/                     ← (opsional) handler untuk test integrasi
```

**Prinsip:** satu `feature/` memegang api + schema + types + komponen milik domain itu. `components/` hanya untuk yang benar-benar generik. Menambah fitur = menambah folder `feature/`, bukan menyebarkan file ke 6 folder global.

---

## 4. Routing & Guard

### 4.1 Peta route (dari `docs-frontend/03` dan `06`)

| Path | Layar | Layout | Catatan |
|---|---|---|---|
| `/login` | Login | kosong (tanpa chrome) | publik |
| `/` | Beranda | AppShell | redirect `/login` bila tanpa session |
| `/produk` | Katalog | AppShell | grid kartu |
| `/produk/:id` | Detail Produk | AppShell | aksi + modal |
| `/transaksi` | POS | AppShell | dua panel |
| `/utang` | Utang | AppShell | master-detail |
| `/riwayat` | Riwayat | AppShell | master-detail |
| `/penitip` | Daftar Penitip | AppShell | grid kartu |
| `/penitip/:id` | Detail Penitip | AppShell | saldo + setoran |
| `/laporan/penjualan` | Laporan Penjualan | AppShell | + ekspor |
| `/laporan/konsinyasi` | Laporan Konsinyasi | AppShell | tanpa ekspor |

### 4.2 Layout `AppShell` — responsif per breakpoint

Dari `06-layout-tablet-desktop.md`:

| Breakpoint | Lebar | Navigasi | Komponen |
|---|---|---|---|
| Mobile | < 768px | Bottom Nav (5 item, Transaksi = FAB) | `<BottomNav>` |
| Tablet | 768–1279px | Sidebar 96px (7 item, vertikal) | `<SidebarNav variant="tablet">` |
| Desktop | ≥ 1280px | Sidebar 248px (7 item, horizontal) | `<SidebarNav variant="desktop">` |

**Satu navigasi per breakpoint.** Sidebar dan Bottom Nav tidak pernah tampil bersamaan. Laporan & Penitip = item sidebar di tablet/desktop; diakses dari Beranda di mobile.

### 4.3 Guard

```ts
// routes/router.tsx (sketsa)
const rootRoute = createRootRoute({ component: AppShell });
// Guard auth: redirect ke /login bila accessToken kosong & route privat.
```

- Route privat dibungkus `<RequireAuth>`: cek accessToken valid (memory) → bila kosong, coba `refresh-token` sekali → gagal = redirect `/login`.
- Login dan refresh-token **tidak** lewat guard.

---

## 5. Layer Data

### 5.1 Kontrak respons (dari SDD Backend §5.1)

**Sukses:**
```json
{ "success": true, "data": { }, "message": "optional" }
```

**Gagal:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Harga jual harus lebih dari 0",
    "details": [{ "field": "hargaJual", "issue": "must be > 0" }]
  }
}
```

Base path `/api/v1`. Autentikasi `Authorization: Bearer <access_token>` untuk semua endpoint kecuali `/auth/login` dan `/auth/refresh-token`.

### 5.2 `lib/http.ts` — satu pintu HTTP

```ts
// Sketsa — nilai final mengikuti implementasi
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,          // "VALIDATION_ERROR", "PRODUCT_HAS_TRANSACTION", ...
    message: string,
    public details?: Array<{ field: string; issue: string }>
  ) { super(message); }
}

export async function apiFetch<T>(
  path: string,
  opts: RequestInit & { auth?: boolean; raw?: boolean } = {}
): Promise<T> {
  const { auth = true, raw = false, ...init } = opts;
  const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/v1${path}`, {
    ...init,
    credentials: 'include',   // cookie refresh token (httpOnly) ikut terkirim — SDD §11.6
    headers: {
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(auth && getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      ...init.headers,
    },
    signal: init.signal,
  });

  if (raw) return res as unknown as T;          // untuk ekspor blob

  const json = await res.json().catch(() => null);
  if (!res.ok || json?.success === false) {
    throw new ApiError(
      res.status,
      json?.error?.code ?? 'UNKNOWN',
      json?.error?.message ?? 'Terjadi kesalahan.',
      json?.error?.details
    );
  }
  return json.data as T;
}
```

Aturan:
- **`body instanceof FormData` → jangan set `Content-Type`** (biarkan browser set boundary untuk upload foto, SDD §5.3 `POST /products/:id/photo`).
- **`credentials: 'include'`** selalu dikirim agar cookie refresh token (httpOnly, `sameSite=strict`) ikut — SDD §11.6.
- **Semua error dilempar sebagai `ApiError`** — komponen tidak pernah parse `res.ok` sendiri.
- **Tidak ada axios, tidak ada `fetch()` langsung di komponen.** Semua lewat `apiFetch`.

### 5.2b Penyimpanan token & alur refresh

Mengikuti SDD Backend §3.2 + §11.6 (strategi default JWT):

| Token | Di mana disimpan | Siapa yang mengelola |
|---|---|---|
| Access token (15 menit) | **Memori** (Context/state), **bukan** `localStorage`/`sessionStorage` | `getAccessToken()` / `setAccessToken()` |
| Refresh token | **httpOnly cookie** — tidak pernah disentuh JS | Browser + backend |

**Alur:**
1. **Boot** — sebelum render route privat, panggil `POST /auth/refresh-token` sekali (cookie terkirim via `credentials:'include'`) → dapat access token → simpan di memori.
2. **Request** — `apiFetch` menyuntikkan `Authorization: Bearer <access_token>`.
3. **401** — interceptor tunggal: coba `POST /auth/refresh-token` **satu kali**; berhasil → ulangi request asli; gagal → clear token, redirect `/login`.
4. **Logout** — `POST /auth/logout` (wajib access token valid, SDD §5.2) → backend merevoke refresh token → clear token di memori.

Jangan simpan access token di storage agar tidak terekspos ke XSS; kehilangan memori saat refresh halaman dipulihkan lewat langkah 1.

### 5.3 `lib/queryClient.ts`

```ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,          // 30 detik — Beranda & katalog tidak spam refetch
      gcTime: 5 * 60_000,
      retry: (count, err) => {
        if (err instanceof ApiError && err.status >= 400 && err.status < 500) return false; // 4xx jangan retry
        return count < 2;                                                                // 5xx / jaringan retry
      },
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },   // mutasi tidak pernah auto-retry (hindari transaksi ganda)
  },
});
```

**Mutasi tidak auto-retry** — mencegah `POST /transactions` terkirim dua kali saat timeout. Ini keputusan keamanan data, jangan diubah tanpa pertimbangan idempotency.

### 5.4 Uang — string desimal

SDD Backend §5.1: nilai uang dikirim sebagai **string desimal 2 digit** (`"75000.00"`), bukan `number`. Field nullable (`uangDiterima`, `kembalian`, `sisaSaldoUtang` pada LUNAS) dikirim `null`.

```ts
// lib/money.ts
export function formatRupiah(decimal: string | null | undefined): string {
  if (decimal === null || decimal === undefined) return '—';
  const n = Number(decimal);                       // "75000.00" → 75000
  return `Rp${new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(n).replace(/\s/g, '')}`;               // "Rp75.000" — tanpa spasi, tanpa desimal (BR-16)
}
```

- **Server = sumber kebenaran.** Front-end menghitung ulang total/kembalian **hanya untuk umpan balik instan di POS**; nilai yang disimpan adalah hasil server.
- Nominal wajib `tabular-nums` (dokumen `01` §2).

### 5.5 Query keys (konvensi)

```
['products', filters]
['products', id]
['products', 'low-stock']
['transactions', filters]
['transactions', id]
['debts', filters]
['dashboard', 'summary']
['reports', 'sales', { startDate, endDate }]
['reports', 'consignment', { startDate, endDate }]
['consignors', filters]
['consignors', id, 'balance']
['consignors', id, 'payments']
['consignment', 'movements', filters]
```

**Invalidasi setelah mutasi** (contoh):

| Mutasi | Invalidasi |
|---|---|
| `POST /transactions` | `['dashboard','summary']`, `['transactions']`, `['products']`, `['consignors']` (stok & kewajiban berubah) |
| `POST /transactions/:id/void` | `['dashboard','summary']`, `['transactions']`, `['debts']`, `['products']`, `['consignors']` |
| `POST /debts/:id/payments` | `['debts']`, `['transactions', id]`, `['dashboard','summary']` |
| `POST /consignors/:id/payments` | `['consignors', id, 'balance']`, `['consignors', id, 'payments']`, `['dashboard','summary']` |
| `PATCH /products/:id/stock-adjustment` | `['products']`, `['products','low-stock']` |
| `POST /consignment/receipts` / `returns` | `['products']`, `['consignors']`, `['consignment','movements']` |

---

## 6. Kontrak Tipe & Schemas (contoh representatif)

Tipe dihasilkan dari Zod (`z.infer`), bukan `interface` terpisah.

```ts
// features/products/schemas.ts
import { z } from 'zod';

export const tipeProduk = z.enum(['MILIK_SENDIRI', 'TITIPAN']);
export const statusProduk = z.enum(['AKTIF', 'NONAKTIF']);

// Form Tambah Produk (BR-17, BR-18)
export const productFormSchema = z.object({
  nama: z.string().min(1, 'Nama produk wajib diisi'),
  kategori: z.string().min(1, 'Kategori wajib dipilih'),
  hargaJual: z.string().refine((v) => Number(v) > 0, 'Harga jual harus lebih dari 0'),
  hargaModal: z.string().min(1, 'Harga modal wajib diisi'),
  stokAwal: z.string().optional(),        // hanya mode tambah
  stokMinimum: z.string(),
  tipe: tipeProduk.default('MILIK_SENDIRI'),
  consignorId: z.string().uuid().optional().nullable(),
  foto: z.instanceof(File).optional().nullable(),
})
.superRefine((val, ctx) => {
  // BR-18: produk titipan, harga jual ≥ harga setor (hargaModal = harga setor)
  if (val.tipe === 'TITIPAN' && Number(val.hargaJual) < Number(val.hargaModal)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['hargaJual'],
      message: 'Harga jual produk titipan harus sama dengan atau lebih tinggi dari harga setor.',
    });
  }
});

export type ProductForm = z.infer<typeof productFormSchema>;
```

```ts
// features/transactions/schemas.ts
export const transactionItemSchema = z.object({
  productId: z.string().uuid(),
  jumlah: z.number().int().min(1),
});

export const createTransactionSchema = z.object({
  items: z.array(transactionItemSchema).min(1, 'Keranjang kosong'),
  uangDiterima: z.number().min(0),
  namaPembeli: z.string().optional(),
  noHpPembeli: z.string().optional(),
})
.superRefine((val, ctx) => {
  // BR-08: uangDiterima < total → namaPembeli wajib.
  // total dihitung dari harga snapshot produk di keranjang (umpan balik instan).
  if (val.uangDiterima < hitungTotalKeranjang(val.items)
      && !val.namaPembeli?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['namaPembeli'],
      message: 'Isi nama pembeli untuk mencatat transaksi utang.',
    });
  }
});
```

```ts
// features/consignors/schemas.ts
export const setoranSchema = z.object({
  jumlahBayar: z.string()
    .refine((v) => Number(v) > 0, 'Nominal setoran harus lebih dari Rp0.')
    // BR-20: ≤ saldo — divalidasi juga di server
    .refine((v) => Number(v) <= Number(saldoAktif), 'Nominal setoran melebihi saldo kewajiban.'),
  catatan: z.string().optional(),
});
```

**Catatan penting validasi:**
- Validasi klien adalah **UX**, bukan keamanan. Backend tetap otoritatif (BR-04, BR-14, BR-18, BR-20, BR-24).
- Pesan error di sisi klien **menyamai** pesan dari `04-interaksi-dan-aturan-bisnis.md` §6.
- `PUT /products/:id` **menolak** perubahan `tipe`/`consignorId` (`422`) — di UI, kedua field itu **read-only** di mode edit (BR-17, AC-20).

---

## 7. Styling & Design System

### 7.1 Token → Tailwind

15 token dari `docs-frontend/01-design-token.md` §1 didefinisikan sebagai CSS variable di `theme/tokens.css`, lalu diregistrasi ke Tailwind. **Tidak ada hex literal di komponen.**

```css
/* theme/tokens.css */
@theme {
  --color-bg: #E3EED4;
  --color-surface: #F6FAEF;
  --color-surface-muted: #EDF4E2;
  --color-primary: #0F2A1D;
  --color-primary-soft: #375534;
  --color-accent: #6B9071;
  --color-accent-soft: #AEC3B0;
  --color-line: #D3E0C1;
  --color-line-soft: #E4EBD8;
  --color-muted: #5C6A5C;
  --color-muted-soft: #E6EBDF;
  --color-warning: #9A552F;
  --color-warning-soft: #F3E1D2;
  --color-success-soft: #D8E6C9;
  --color-danger: #A33B2B;
}
```

Pemakaian: `bg-surface`, `text-primary`, `border-line-soft`, `bg-warning-soft`, dst.

### 7.2 Aturan styling yang mengikat (dari `01`, `02`)

- **Tanpa shadow** di seluruh breakpoint. Struktur pakai `border border-line-soft`.
- **Tombol primer** selalu `rounded-full`, `bg-primary text-bg`, satu per blok aksi.
- **Badge** selalu dot + label teks — warna tidak pernah pembawa makna tunggal.
- **Nominal uang** `tabular-nums`.
- **Target sentuh** min `44×44px`; input utama `46–56px`.
- **Satu keluarga sans-serif.** Tidak ada serif (keputusan dikunci — lihat §15.2).
- Ikon **Lucide**, `currentColor`, ukuran dari tabel `01` §5.

### 7.3 `cn()` helper

```ts
// lib/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
```

---

## 8. Testing

### 8.1 Tools

- **Vitest** — unit & integrasi (runner, `describe/it/expect`).
- **React Testing Library** — render komponen, query by role/label (aksesibilitas-first).
- **`@testing-library/jest-dom`** — matcher DOM (`toBeVisible`, `toHaveTextContent`).
- **MSW (opsional, disarankan)** — mock jaringan untuk test integrasi, sehingga `apiFetch` diuji sungguhan.

### 8.2 Prioritas (piramida praktis)

| Level | Apa yang diuji | Contoh |
|---|---|---|
| **Unit (banyak)** | fungsi murni | `formatRupiah`, `hitungSaldoPenitip`, `totalKewajibanPenitip`, `hitungSisaVoid` |
| **Komponen (sedang)** | render + interaksi | `<Badge>` punya dot+label; `<Button>` disabled tetap berlabel; form menampilkan pesan error Zod |
| **Integrasi (sedikit)** | alur penting | POS: input uangDiterima → badge Lunas/Utang berubah + Nama Pembeli muncul saat utang; Utang: cicilan > saldo ditolak |
| **Jaringan** | handler error | `ApiError` dari `PRODUCT_HAS_TRANSACTION` → pesan Nonaktifkan |

### 8.3 Fungsi murni wajib ada test (dari `05` §6)

Ini logika bisnis yang **berulang dan rawan salah** — masing-masing minimal satu test positif + satu negatif:

1. `formatRupiah(decimal)` — `"75000.00"` → `Rp75.000`; `null` → `—`; nilai negatif `-Rp24.000`.
2. `hitungSaldoPenitip(transaksi, setoran)` — transaksi `dibatalkan` dikecualikan; hasil **boleh negatif, tidak di-clamp** (SDD §3.14, BR-22).
3. `totalKewajibanPenitip(saldoList)` — hanya saldo positif; penitip nonaktif tetap dihitung (SRS IR-13).
4. `hitungSisaVoid(createdAt, nowServer)` — > 0 tampilkan tombol; ≤ 0 sembunyikan + pesan satuan jam (FR-25, IR-06). **Rolling 24 jam, bukan hari kalender.**
5. `derivasiStatusPembayaran(uangDiterima, total)` — `>= total` → LUNAS; `< total` → UTANG + butuh namaPembeli (BR-08).

### 8.4 Aturan test

- **Tidak mock `fetch` manual per test** — pakai MSW bila ada; kalau tidak, `vi.stubGlobal('fetch', ...)`.
- Query client di-reset antar test (`queryClient.clear()` di `afterEach`).
- RTL: query by **role/label**, bukan class. Ini sekaligus mengaudit aksesibilitas.
- ESLint + `eslint-plugin-testing-library` — cegah anti-pattern (`await` pada `userEvent`, query tanpa `role`).

---

## 9. ESLint & Konvensi Kode

| Aturan | Nilai | Alasan |
|---|---|---|
| `typescript-eslint` recommended + strict | on | tipe ketat |
| `no-explicit-any` | error | keamanan tipe |
| `react-hooks/rules-of-hooks`, `exhaustive-deps` | error | bug TanStack Query |
| `@tanstack/query/exhaustive-deps` | error | query key tidak hilang |
| `no-restricted-imports` → larang impor `axios` | error | jaga keputusan §2.1 |
| `no-restricted-syntax` → larang hex literal di komponen | warning | token saja (§7) |
| `eslint-plugin-testing-library` | error | test bersih |
| `eslint-plugin-tailwindcss` (opsional) | warning | urutan class konsisten |

Prettier untuk format. `type-check` (`tsc --noEmit`) di CI terpisah dari lint.

---

## 10. Pemetaan Fitur → Endpoint (ringkas)

| Fitur | Endpoint (SDD §) | Query key | Mutasi + invalidasi |
|---|---|---|---|
| Login / logout | `POST /auth/login`, `/auth/logout` (5.2) | — | set/clear session |
| Refresh token | `POST /auth/refresh-token` (5.2) | — | interceptor 401 → refresh sekali |
| Beranda | `GET /dashboard/summary` (5.7) | `['dashboard','summary']` | — |
| Katalog | `GET /products`, `/products/:id` (5.3) | `['products', ...]` | — |
| Tambah produk | `POST /products` (5.3) | | invalidate `['products']` |
| Edit produk | `PUT /products/:id` (**422** bila ubah tipe/penitip) (5.3) | | invalidate `['products', id]` |
| Nonaktifkan | `PATCH /products/:id/status` (5.3, BR-24) | | invalidate `['products']` |
| Atur stok minimum | `PATCH /products/:id/stock-threshold` (5.3, BR-15) | | invalidate `['products', id]` |
| Upload / hapus foto | `POST`/`DELETE /products/:id/photo` (5.3) | | invalidate `['products', id]` |
| Low-stock | `GET /products/low-stock` (5.4) | `['products','low-stock']` | — |
| Sesuaikan stok | `PATCH /products/:id/stock-adjustment` (5.4, alasan wajib) | | invalidate `['products']`, `['products','low-stock']` |
| POS buat transaksi | `POST /transactions` (5.5) | | invalidate dashboard/transactions/products/consignors |
| Riwayat | `GET /transactions`, `/:id` (5.5) | `['transactions', ...]` | — |
| Void | `POST /transactions/:id/void` (5.5, 24 jam) | | invalidate dashboard/transactions/debts/products/consignors |
| Utang | `GET /debts` (5.6) | `['debts']` | — |
| Riwayat cicilan | `GET /debts/:transactionId/payments` (5.6) | `['debts', id, 'payments']` | — |
| Catat pembayaran | `POST /debts/:transactionId/payments` (5.6, BR-14) | | invalidate `['debts']`, `['transactions', id]` |
| Penitip | `GET /consignors`, `/:id` (5.10) | `['consignors', ...]` | — |
| Saldo penitip | `GET /consignors/:id/balance` (5.10) | `['consignors', id, 'balance']` | — |
| Catat setoran | `POST /consignors/:id/payments` (5.10, append-only, BR-20/23) | | invalidate balance/payments/dashboard |
| Nonaktifkan penitip | `PATCH /consignors/:id/status` (5.10, BR-21 → `422` + `details.products`) | | invalidate `['consignors']` |
| Terima titipan | `POST /consignment/receipts` (5.10, BR-19) | | invalidate products/consignors/movements |
| Retur titipan | `POST /consignment/returns` (5.10, BR-19) | | invalidate products/consignors/movements |
| Pergerakan titipan | `GET /consignment/movements` (5.10) | `['consignment','movements']` | — |
| Laporan penjualan | `GET /reports/sales` (+`perTipe`) (5.8) | `['reports','sales',...]` | — |
| Laporan utang | `GET /reports/debts` (5.8) | `['reports','debts',...]` | — |
| Tren produk | `GET /reports/product-trend` (5.8) | `['reports','product-trend',...]` | — |
| Laporan konsinyasi | `GET /reports/consignment` (5.8, saldo akhir **all-time**) | `['reports','consignment',...]` | — |
| **Ekspor** penjualan/utang | `GET /reports/{sales,debts}/export?format=xlsx\|pdf` (5.8) | — | `apiFetch(..., { raw:true })` → `res.blob()` → unduh |

**Ekspor konsinyasi TIDAK ADA** — endpoint belum diimplementasikan (SDD §5.8). Jangan buat tombolnya.

---

## 11. Penanganan Error & State Non-Data

### 11.1 Peta error → UI

| `ApiError.code` / status | UI |
|---|---|
| `VALIDATION_ERROR` (400) | pesan per field dari `details[]` |
| `PRODUCT_HAS_TRANSACTION` (409) | dialog: produk punya riwayat → hanya "Nonaktifkan" (BR-12/BR-26) |
| 422 (`tipe`/`consignorId` diubah; penitip masih berstok) | `details.products` ditampilkan sebagai daftar penghalang (BR-17, BR-21) |
| 401 | coba refresh token sekali → gagal = redirect `/login` |
| 403 | toast "Tidak diizinkan" |
| 404 | halaman "Tidak ditemukan" + tombol kembali |
| 5xx / jaringan | retry otomatis (query), lalu error state + tombol "Coba lagi" |

### 11.2 State wajib tiap layar

Setiap layar/daftar punya state **loading** (skeleton, bukan spinner penuh), **error** (pesan + aksi), dan **empty** (dari `04` §7 — sebut apa tempat ini + satu langkah lanjut). State ini bukan tambahan; bagian dari definisi "selesai".

---

## 12. Aksesibilitas

Dari SRS IR-02 & WCAG 2.2 AA (detail `04` §8):

- Kontras teks ≥ 4.5:1; batas komponen ≥ 3:1 — sudah dipetakan di `01` §1.
- Status tidak hanya warna — selalu dot + label.
- Setiap kontrol punya nama aksesibel; tombol ikon punya `aria-label` yang menyebut **aksi**, bukan nama ikon.
- Fokus keyboard terlihat di seluruh aplikasi (ring, bukan dihapus).
- Zoom teks 200% tidak memotong konten.
- Dialog: `role="dialog"`, `aria-modal`, trap focus, tutup dengan Esc, kembalikan fokus.
- Overlay scrollable: `overscroll-behavior: contain`.
- `prefers-reduced-motion`: matikan/melunakkan transisi.

---

## 13. Performa

| Aspek | Keputusan |
|---|---|
| Kode splitting | `React.lazy` per route (POS, Laporan, Penitip dipisah) |
| Gambar produk | `loading="lazy"`, ukuran tetap (hindari layout shift); placeholder blok + ikon Lucide (tidak ada aset sungguhan) |
| TanStack Query | `staleTime` 30s; `keepPreviousData` untuk daftar ber-paginasi agar tidak flicker |
| Daftar panjang | paginasi dari server (`?page=&limit=`), default `limit=20` |
| Bundle | analisis ukuran; TanStack Query + Zod + react-hook-form, **tanpa axios, tanpa moment** |
| POS offline | query cache menyajikan data terakhir saat offline; mutasi gagal → pesan jelas (tidak ada antrian offline di MVP) |

---

## 14. Urutan Implementasi

1. **Fondasi:** Vite + TS + Tailwind + ESLint; `theme/tokens.css`; `lib/cn.ts`; `lib/money.ts` + test.
2. **Data layer:** `lib/http.ts` (`apiFetch`, `ApiError`); `lib/queryClient.ts`; setup Vitest + RTL + MSW.
3. **Auth:** schemas, `useLogin`/`useLogout`, guard, `/login`.
4. **Komponen dasar:** `Button` (4 varian), `Badge` (3), `Card`, `Field`/`TextField`, `SearchField`, `ChipFilter`, `SegmentedFilter`, `Modal`, `ScreenHeader`.
5. **Navigasi:** `AppShell` responsif — `<BottomNav>` (mobile) + `<SidebarNav variant="tablet|desktop">` (7 item, state aktif).
6. **Layar sederhana:** Katalog (grid kartu), Detail Produk.
7. **Layar derivasi:** POS (Lunas/Utang otomatis), Utang (cicilan), Riwayat (void 24 jam).
8. **Konsinyasi:** Daftar Penitip, Detail Penitip (+saldo negatif), Catat Setoran, Terima/Retur Titipan.
9. **Laporan:** Penjualan (+`perTipe`, ekspor), Utang (+ekspor), Tren, Konsinyasi (tanpa ekspor).
10. **Responsif penuh:** turunkan tiap layar ke tablet & desktop mengikuti `06`.
11. **Audit akhir:** checklist `06` §6 + `01` §8 + `04` §9.

---

## 15. Keputusan yang Sudah Dikunci

Ketiga hal di bawah **tidak diatur** PRD/SRS/SDD Backend secara eksplisit. Front-end tidak mengarang aturan bisnis, jadi masing-masing diberi **posisi aman berdasar dokumen acuan**, lalu **dikunci oleh keputusan pengguna (2026-11-09)**. Ini bukan lagi daftar tertunda — sudut pandang final untuk koding.

### 15.1 Halaman Utang: tampilkan per transaksi — DIKUNCI

**Keputusan pengguna:** utang **tidak dikelompokkan per pembeli**. Tampilkan **per transaksi**, persis seperti `GET /debts`.

**Fakta dari dokumen acuan:**
- SDD tidak punya entity `Debtor`/`Customer`. `namaPembeli` adalah `String?` bebas, `noHpPembeli` opsional (SDD §4.2, §4.3, §5.5).
- `GET /debts` mengembalikan **baris per transaksi** (SDD §5.6).
- PRD/SRS/SDD **tidak mengatur** pengelompokan per pembeli.

**Implikasi implementasi:**
- Halaman Utang = daftar baris per transaksi: nama pembeli, ID transaksi + waktu, badge Utang, sisa utang (`danger`).
- **Tidak ada agregasi per pembeli di sisi klien** — jangan dibangun. Ini menghindari salah gabung (dua orang bernama sama) dan salah pecah (satu orang mengetik nama berbeda).
- Cicilan (`POST /debts/:transactionId/payments`) tetap beroperasi **per transaksi** — tidak terpengaruh.
- Bila kelak diminta pengelompokan, itu **perubahan kebutuhan** yang perlu keputusan + kemungkinan tambah entity pembeli di backend (di luar cakupan saat ini).

### 15.2 Font heading: sans-serif — DIKUNCI

**Keputusan pengguna:** pertahankan **sans-serif**.

**Fakta:**
- Canvas `ui-kendi.pen` memakai **satu keluarga sans-serif** untuk heading dan body, dibedakan lewat weight/ukuran (`01-design-token.md` §2).
- `docs-frontend/01` §2: "Tidak ada font serif di implementasi saat ini. Ikuti canvas."
- PRD & SRS **tidak mengatur** font. Sebutan serif hanya ada di `MASTER-DESIGN-PROMPT.md` §4 (brief desain, **bukan** dokumen acuan bisnis).

**Implikasi implementasi:** seluruh heading, judul, dan body memakai **satu keluarga sans-serif**, dibedakan lewat weight/ukuran. **Tidak ada font serif** di kode, termasuk nama aplikasi. Checklist `06` §6 ("tidak ada font serif") berlaku penuh.

### 15.3 Persistensi sesi: JWT + refresh cookie — mengikuti SDD Backend

**Fakta dari SDD Backend §3.2 + §11.6 (sudah diatur, bukan terbuka):**
- Strategi default **JWT**: access token **15 menit**, refresh token di **httpOnly, secure, `sameSite=strict` cookie**, hash-nya di tabel `RefreshToken` (bisa direvoke saat logout).
- `POST /auth/refresh-token` menghasilkan access token baru dari cookie.
- CORS memakai `credentials: true` agar cookie terkirim antar origin.
- Frontend **tidak** menyimpan refresh token di `localStorage` — hanya access token di memori.

**Implikasi ke front-end (diadopsi ke §5.2b):**
- Access token disimpan **di memori** (React state/Context), bukan `localStorage`/`sessionStorage` — refresh token tidak pernah disentuh JS.
- Saat boot aplikasi, panggil `POST /auth/refresh-token` sekali untuk mendapat access token awal (cookie dikirim otomatis).
- Pada respons `401`, coba refresh **satu kali**; gagal → redirect `/login`.
- `fetch` wajib `credentials: 'include'` agar cookie refresh ikut.

---

## 16. Pemetaan ke Dokumen Lain

| Butuh | Buka |
|---|---|
| Nilai token warna, tipografi, radius, spacing, ikon, format Rupiah | `01-design-token.md` |
| Ukuran persis tiap komponen | `02-spesifikasi-komponen.md` |
| Peta layar, alur, state wajib tiap layar | `03-peta-layar-dan-alur.md` |
| Aturan bisnis di layar, validasi, pesan error, larangan | `04-interaksi-dan-aturan-bisnis.md` |
| Node canvas ↔ komponen, fungsi inti + kode | `05-inventaris-canvas-dan-implementasi.md` |
| Layout tablet/desktop, breakpoint, sidebar 7 item | `06-layout-tablet-desktop.md` |
| Kontrak endpoint & bentuk respons (sumber kebenaran) | `docs/SDD_Backend_Kendis_Market.md` §5 |
