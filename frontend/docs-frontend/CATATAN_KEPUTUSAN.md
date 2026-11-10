# Catatan Keputusan Frontend — Kendi's Market

Catatan keputusan per fase; diisi saat fase selesai dikerjakan.

---

## Fase 6 — Katalog & Detail Produk (2026-11-10)

1. **Paginasi katalog pakai "Muat lebih banyak"** (bukan nomor halaman). Mobile-first, satu kolom → grid 2–3 kolom otomatis (`md`/`xl`). `useInfiniteQuery` dengan `initialPageParam: 1`; limit 20 (default backend). Loading halaman berikut tampil di tombol, bukan skeleton penuh.
2. **Filter "Kategori" di 03 §Katalog = filter tipe** (chip: Semua / Milik Sendiri / Titipan) karena backend tidak punya endpoint daftar kategori; `<kategori>` tetap string bebas di form. Filter status pakai `SegmentedFilter` (Semua / Aktif / Nonaktif).
3. **Form Tambah/Ubah Produk**: `kategori` input teks (label "Kategori", placeholder contoh) — tidak ada sumber daftar kategori; keputusan perlu konfirmasi jika nanti mau pilihan terkurasi. Mode edit: tipe + penitip read-only dengan keterangan (BR-A) — sesuai SDD §6 catatan.
4. **Foto**: upload terpisah `POST /products/:id/photo` setelah create/update (backend otomatis hapus foto lama saat ganti). Kegagalan foto tidak membatalkan simpanan produk; error foto di-swallow (log) — catatan: tanpa toast infra, error foto tidak ditampilkan ke user.
5. **Tombol "Hapus Produk" ditaruh di zona berbahaya modal Edit** (di bawah Simpan) — 03 tidak mendesain lokasi; flush delete hanya untuk produk tanpa riwayat (BR-12). Error `PRODUCT_HAS_TRANSACTION` → dialog "Produk tidak dapat dihapus" dengan jalan keluar "Nonaktifkan Produk".
6. **Badge status produk**: reuse `<Badge variant="netral">` untuk Aktif & Nonaktif (warna bukan satu-satunya makna; dot + label selalu ada) — konsisten dengan catatan 05: badge lunas dipakai ulang untuk status Aktif. Tombol nonaktifkan jadi disabled saat produk sudah nonaktif; toggle aktivasi tidak dibuat (di luar ruang lingkup Fase 6; aktivasi titipan kena BR-G nanti).
7. **Skeleton vs spinner**: loading katalog pakai kartu skeleton (6 placeholder), detail pakai blok skeleton — sesuai SDD FE §11.2.
8. **Invalidasi** mengikuti §5.5: create → `['products']`; update/threshold → `['products', id]` + `['products']`; status/adjustment → + `['products','low-stock']`.
9. **Query key infinite**: `['products', filters]` — object filter sebagai key (deterministik per nilai; TanStack Query hash struktural).
10. **Test**: tambah 16 test produk (Katalog, Detail, modal, stok, alur PRODUCT_HAS_TRANSACTION). Perbaiki helper MSW: handler default `login`/`refresh-token`/`logout` + `fail`/`upload`/`export.xlsx` dipulihkan; `resetProducts()` di `afterEach`; `testTimeout` 15s karena suite paralel.

## Fase 7 — Transaksi: POS, Riwayat & Utang (2026-11-10)

1. **Status pembayaran diturunkan dari uang diterima vs total** (BR-08) — tidak ada input status manual di POS; badge Lunas/Utang hidup-sesuai-isi form, tombol submit disabled saat utang tanpa nama pembeli.
2. **Keranjang POS**: `Map<productId, CartItem>` (bukan array) untuk update qty O(1); bar keranjang sticky di atas BottomNav (`bottom-24` mobile / `bottom-6` md) hanya saat ada item; qty 0 menghapus item. Toast belum ada → sukses transaksi ditampilkan in-modal ("Transaksi berhasil. Kembalian/Sisa utang …").
3. **Riwayat**: rentang default 30 hari dihitung sekali per mount (`useState` lazy init) karena `new Date()` per render mengubah query key tiap render → refetch loop (bug ditemukan test). Filter status pakai `SegmentedFilter`.
4. **Void (BR-13)**: tombol "Batalkan" hanya saat `hitungSisaVoid` (≤24 jam, epoch diff) dan status bukan DIBATALKAN. Konfirmasi in-modal dengan pesan stok dikembalikan; error void (mis. sudah ada cicilan) ditampilkan in-modal, modal tidak tertutup diam-diam.
5. **Utang dikunci per transaksi** (SDD §15.1): kartu per transaksi utang; "Catat Pembayaran" validasi nominal > 0 dan ≤ sisa (client + server BR-14); pelunasan sisa → status LUNAS → hilang dari daftar. Riwayat cicilan per transaksi (modal).
6. **Invalidasi** mengikuti §5.5: create → dashboard/transactions/products/consignors; void → +debts; payment → debts + transactions(id) + dashboard. Mutasi tidak auto-retry.
7. **MSW**: fixture transaksi relatif ke waktu test (`Date.now() - 2j` untuk voidable, `-72j` untuk lewat jendela) — konstanta ISO statis membuat void tak teruji. Handler `POST /transactions/:id/void` menolak transaksi berpayments (BR-13); `POST /debts/:transactionId/payments` menerapkan lunas otomatis.
8. **Test**: 6 test baru (POS lunas/utang, riwayat+filter, void, utang cicilan → lunas, riwayat cicilan). Aksesibilitas: tombol Tambah produk POS diberi `aria-label` nama produk agar test & screen reader tidak ambigu.
9. **React Router v7 future warning** muncul di test (relativeSplatPath, startTransition) — tidak ditangani; cek di Fase 11 (audit).


## Fase 8 — Konsinyasi (Penitip & Barang Titipan) (2026-11-10)

1. **Saldo kewajiban dihitung di server (`GET /consignors/:id/balance`)** — bukan di klien. Fungsi `hitungSaldoPenitip` (utils) hanya alat bantu unit-test (BR-F: boleh negatif, tidak di-clamp; kewajiban hanya dari transaksi `AKTIF`). Klien membaca `saldo` dari balance endpoint agar logika BR-C/D/E/I tetap satu sumber kebenaran (server), sesuai arahan SDD §5.5 + SDD BE consignment module.
2. **Layar Daftar Penitip**: filter chip "Semua / Punya saldo / Aktif" — `punyaSaldo` dikirim ke query backend (`GET /consignors?punyaSaldo=true`), `status=AKTIF` juga sisi server. Pencarian nama di sisi server (`search`). `nonaktif` tampil di daftar utama (tidak difilter) sesuai 04-05: penitip nonaktif boleh diaktivasi ulang.
3. **Detail Penitip** menampilkan saldo all-time (Card variant `dark`, negatif memakai `text-warning-soft` + badge "Saldo negatif — setoran tidak dapat dicatat." — BR-F). Tombol "Catat Setoran" disabled saat saldo negatif.
4. **Modal Catat Setoran** (BR-D): validasi klien nominal > 0 dan ≤ saldo (`TextField` error inline + tombol disabled); 422 server `CONSIGNOR_OVERPAYMENT` memunculkan pesan yang sama. Riwayat setoran append-only (modal "Riwayat Setoran") — tidak ada tombol edit/hapus (BR-22).
5. **Nonaktifkan Penitip** (BR-E): 422 `CONSIGNOR_HAS_STOCK` mengembalikan `details.products` (daftar `{id,nama,stok}`). Tipe `ApiError.details` diperluas dari `Array<{field,issue}>` → `unknown` (backend mengirim bentuk berbeda per error: Zod → array field/issue; BusinessRuleError → objek). Perkecil tipe di call sites (ProductFormModal memakai `Array.isArray`; NonaktifModal memakai `'products' in details`). Modal menampilkan daftar produk penghalang + sembunyikan tombol konfirmasi.
6. **Modal Produk Titipan** hanya menampilkan daftar produk per penitip (kueri `useProducts({tipe:'TITIPAN', consignorId})`) — aksi Terima/Retur barang titipan dilakukan lewat form produk (create dengan tipe TITIPAN + consignorId), sesuai 04 §5.2 dan keterbatasan ruang layar detail. Aksi konsinyasi `POST /consignment/receipts|returns` disiapkan di api.ts tapi belum dihubungkan ke UI di fase ini (terbuka untuk Fase 11 audit).
7. **Router**: `/penitip` + `/penitip/:id` terdaftar di `createBrowserRouter`; Penitip hanya di sidebar (tablet/desktop), mobile akses lewat halaman lain (belum ada pintu masuk di Fase 8 — sesuai 02 §Nav: 5 item mobile tanpa Penitip).
8. **MSW**: handler `/consignors` lama (opsi form titipan Fase 6, stub 1 item) menghalangi handler baru — dihapus, digabung ke `consignorHandlers`. Fixtures relatif waktu (`recentDate`) untuk riwayat setoran. `resetConsignors()` dipanggil di `afterEach`.
9. **Test**: 6 test unit (`utils.test.ts`) + 10 test integrasi (`consignors.test.tsx`): daftar + filter punyaSaldo + cari + navigasi; detail saldo negatif; rincian; setoran nominal ≤ 0 diblokir & > saldo tampil error; riwayat setoran; nonaktifkan diblokir (422 daftar produk); produk titipan. Helper `renderAt(pattern, path)` dipisah agar `useParams().id` terisi.


## Fase 9 — Laporan (2026-11-10)

1. **Query key laporan mengikuti §5.5** (kunci = rentang tanggal): `['reports','sales',range]`, `['reports','debts',range]`, `['reports','product-trend',range]`, `['reports','consignment',range]`. Helper `rangeQuery(range)` memakai `new URLSearchParams({startDate,endDate})` — `ReportRange` tak punya index signature, spread object gagal type-check.
2. **Rentang default = bulan berjalan** (`useDefaultMonthRange`: lazy init via `useState(useDefaultMonthRange())`, month-to-date lokal) — konsisten antar laporan; `DateRangePicker` menerima input tanggal + tombol "Terapkan"; `isValidRange` membatasi start ≤ end (tombol disabled).
3. **Satu pola halaman laporan**: `ScreenHeader` + `DateRangePicker` + `SummaryStat` grid (2 kolom mobile / 3 sm+) + daftar `Card variant="list"` + error/skeleton state seragam. Variabel `accent` pada `SummaryStat` untuk angka kunci (Total saldo utang, Saldo akhir all-time).
4. **Ekspor xlsx/pdf hanya di Penjualan & Utang** — Laporan Konsinyasi TANPA tombol ekspor (SDD §5.8). `exportReportApi(resource, range & {format})` memakai `apiFetch(raw:true)` → blob → `URL.createObjectURL` → anchor download; `revokeObjectURL` setelah klik.
5. **Laporan Penjualan menampilkan tren produk terlaris** via `useProductTrend` (top 5, kueri terpisah dari sales) — komposisi dua kueri pada satu layar; invalidasi tidak dibutuhkan (read-only).
6. **Laporan Konsinyasi**: saldo akhir dihitung all-time (seluruh riwayat, bukan hanya periode) — fixture & UI menampilkan keterangan "termasuk nonaktif" + "all-time" agar makna angka jelas. Total modal/disetor periode = penjumlahan per penitip dari respons `GET /reports/consignment`.
7. **Laporan Utang** menampilkan riwayat cicilan inline per utang ("Cicilan {tanggal} · bayar RpX · sisa RpY") — anggap satu sumber: respons laporan memuat `payments[]` (server), klien tidak fetch ulang per utang.
8. **MSW fixture laporan bisa dioverride per test** (`setReportFixtures`; `resetReportFixtures()` di `afterEach`) — fixture default dipakai 3 halaman; test error/edge memakai fixture khusus (mis. sales kosong dihitung sebagai 0, bukan crash).
9. **Test**: 5 test integrasi baru (Penjualan ringkasan+per tipe+tren+daftar, error state, ekspor xlsx memicu anchor click, Utang + cicilan, Konsinyasi termasuk nonaktif/saldo 0). Ekspor diuji dengan spy `HTMLAnchorElement.prototype.click` + mock `URL.createObjectURL` (spy `document.createElement` merusak render React).
10. **Konsinyasi: tidak ada tombol ekspor** — konsisten SDD §5.8; jika nanti perlu, `exportReportApi('consignment', …)` tinggal ditambahkan di UI (endpoint sudah tersedia).


## Fase 10 — Layout Tablet & Desktop (Responsif Penuh) (2026-11-10)

1. **Satu navigasi per breakpoint sudah ada sejak awal** (02 §Nav): mobile BottomNav 5 item, tablet (md–lg) sidebar 96px, desktop (lg+) sidebar 248px — 7 item termasuk Laporan & Penitip langsung di sidebar (06 §3). Fase 10 menyelesaikan layout konten per layar agar menggunakan ruang ekstra, bukan melebarkan satu kolom.
2. **POS dua panel (06 §5.3)**: panel kiri grid kartu produk bergambar (2 kolom md / 3 xl, `sm` grid 2), panel kanan keranjang SELALU tampil (`hidden md:flex`, lebar 350/400px). Isi modal keranjang diekstrak ke `CartForm` reusable; mobile tetap modal + bar keranjang sticky (`md:hidden`). Satu sumber form → status Lunas/Utang diturunkan sama di kedua saluran.
3. **Riwayat master-detail (06 §5.4)**: lg+ daftar kiri 42%, panel detail kanan sticky (item, total, kembalian/sisa, tombol Batalkan). Mobile tetap daftar + modal void. Pemilihan bar → `selectedId`, border accent menandai aktif.
4. **Utang master-detail (06 §5.5)**: + Kartu ringkasan total saldo utang + tombol "Ekspor Laporan Utang" → navigasi ke `/laporan/utang` (bukan unduh langsung — laporan utang punya pemilih tanggal). Form cicilan diekstrak `PaymentForm` dipakai modal mobile & panel desktop.
5. **Detail Produk dua kolom (06 §5.6)**: kiri foto besar (aspect-square), kanan identitas + harga + rincian + aksi. Modal tetap pola lama.
6. **Penitip**: daftar → grid kartu inisial+nama+noHP+badge (2 sm / 3 xl, 06 §5.7); `punyaSaldo`/`Aktif` chip tetap. Detail → kiri saldo+setoran+aksi, kanan (lg) Riwayat Setoran + Produk Titipan inline; `RiwayatSetoranContent`/`ProdukTitipanContent` dipakai ulang modal mobile & panel desktop. `useConsignorPayments` & `useProducts` tetap satu kueri per sisi (query cache di-share, data tidak digandakan).
7. **Katalog grid 3/4 (06 §5.1)**: kartu bergambar (placeholder ikon per produk, badge Aktif/Nonaktif + Titipan, opacity 0.55 nonaktif, harga 18px tabular-nums, stok menipis = icon triangle-alert + teks warning). Ringkasan header "N produk · m stok menipis · k titipan". Toggle Grid/Daftar TIDAK dibuat (data foto placeholder belum real di semua produk; keputusan Fase 11 audit).
8. **Modal tengah 600px (06 §5.8)**: `Modal` dari bottom-sheet mobile → `sm:max-w-[600px]` + radius 20px dua-duanya (mobile rounded-t 20px, sm rounded 20px) dengan border line-soft, overlay primary transparan, tanpa shadow. Berlaku semua dialog (form produk, stok, nonaktif, cicilan, setoran, void).
9. **Login dua panel (06 §5.10)**: md+ panel kiri `primary` (brand + tagline), kanan form. Mobile tetap kartu tunggal. Eyebrow brand disembunyikan di mobile (duplikat).
10. **Beranda utuh (06 §5.2)**: `GET /dashboard/summary` (backend sudah ada, Fase 9 BE) — 4 metrik kartu (Omzet Hari Ini kartu gelap, Estimasi Profit, Total Utang Aktif warning, Kewajiban Penitip) 2×2 mobile / 4 kolom desktop; bawah dua kolom 50/50: Peringatan Stok Menipis (link ke detail produk) + Transaksi Terakhir (`useTransactions({limit:5})`). `TransactionFilters` + `limit`. HomeStub dihapus.
11. **Test**: 2 test Beranda baru; 100→102 total. Header info katalog `getByText(/4 produk/)` regex (semua "N produk" gabung ringkasan); konsinyasi `findAllByText` (duplikat teks di 06 §5.7).
