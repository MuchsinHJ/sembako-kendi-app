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

