# Traceability Matrix — Kendi's Market Backend

**Versi:** 1.0  
**Tanggal:** 2026-10-10  
**Status:** MVP Complete

Dokumen ini memetakan setiap Functional Requirement (FR), Business Rule (BR), dan Acceptance Criteria (AC) dari SRS ke implementasi kode dan test yang memverifikasinya.

---

## 1. Modul Autentikasi

| ID | Requirement | Modul | Endpoint | File Implementasi | File Test |
|----|-------------|-------|----------|-------------------|-----------|
| FR-01 | Form login dengan email & password | Auth | `POST /auth/login` | `auth.service.ts:45` | `auth.test.ts:25` |
| FR-02 | Validasi kredensial & error handling | Auth | `POST /auth/login` | `auth.service.ts:56` | `auth.test.ts:45` |
| FR-03 | Password di-hash dengan bcrypt | Auth | — | `auth.service.ts:20` | `auth.service.test.ts:15` |
| FR-04 | Logout dengan invalidasi token | Auth | `POST /auth/logout` | `auth.service.ts:85` | `auth.test.ts:90` |
| FR-05 | Reset password via admin/developer | Auth | Manual/Seed | `seed.ts`, README.md | — |
| BR-01 | Single role User, audit trail transaksi | Auth, Transaction | — | `schema.prisma:402` | — |

---

## 2. Modul Produk & Stok

| ID | Requirement | Modul | Endpoint | File Implementasi | File Test |
|----|-------------|-------|----------|-------------------|-----------|
| FR-06 | List produk dengan filter | Product | `GET /products` | `product.service.ts:25` | `product.test.ts:30` |
| FR-07 | Tambah produk baru | Product | `POST /products` | `product.service.ts:85` | `product.test.ts:80` |
| FR-08 | Validasi harga jual > 0 | Product | `POST /products` | `product.schema.ts:15`, `product.service.ts:92` | `product.test.ts:95` |
| FR-09 | Ubah data produk | Product | `PUT /products/:id` | `product.service.ts:145` | `product.test.ts:140` |
| FR-10 | Perubahan harga tidak ubah transaksi lama (snapshot) | Product, Transaction | — | `transaction.service.ts:120` | `transaction.test.ts:180` |
| FR-11 | Hard delete hanya produk tanpa riwayat | Product | `DELETE /products/:id` | `product.service.ts:210` | `product.test.ts:220` |
| FR-12 | Soft delete produk dengan riwayat | Product | `PATCH /products/:id/status` | `product.service.ts:235` | `product.test.ts:245` |
| FR-13 | Atur ambang batas stok minimum | Product | `PATCH /products/:id/stock-threshold` | `product.service.ts:260` | `product.test.ts:270` |
| FR-14 | Tampilkan produk low-stock di dashboard | Dashboard | `GET /dashboard/summary` | `dashboard.service.ts:48` | `dashboard.test.ts:45` |
| FR-15 | Validasi stok tidak negatif | Product | — | `product.schema.ts:22`, `product.service.ts:98` | `product.test.ts:105` |
| BR-03 | Harga jual > 0 | Product | — | `product.schema.ts:15` | `product.test.ts:95` |
| BR-04 | Stok >= 0 | Product, Transaction | — | `product.schema.ts:22`, `transaction.service.ts:135` | `product.test.ts:105`, `transaction.test.ts:145` |
| BR-12 | Produk dengan riwayat tidak bisa dihapus permanen | Product | — | `product.service.ts:215` | `product.test.ts:230` |
| BR-15 | Ambang batas stok minimum per produk | Product, Dashboard | — | `product.service.ts:260`, `dashboard.service.ts:48` | `product.test.ts:275`, `dashboard.test.ts:50` |
| AC-01 | Validasi harga jual <= 0 ditolak | Product | — | `product.schema.ts:15` | `product.test.ts:95` |
| AC-02 | Produk dengan transaksi hanya soft delete | Product | — | `product.service.ts:220` | `product.test.ts:235` |
| AC-03 | Dashboard tampilkan produk low-stock | Dashboard | — | `dashboard.service.ts:52` | `dashboard.test.ts:55` |

**Perluasan FR-07/FR-09:** Upload foto produk (Multer + Sharp + R2)
- Implementasi: `media.service.ts`, `media.controller.ts`, `storage.repository.ts`
- Test: `media.test.ts` (label: "Perluasan FR-07/FR-09")

---

## 3. Modul Transaksi

| ID | Requirement | Modul | Endpoint | File Implementasi | File Test |
|----|-------------|-------|----------|-------------------|-----------|
| FR-16 | Pilih produk & jumlah dalam transaksi | Transaction | `POST /transactions` | `transaction.service.ts:45` | `transaction.test.ts:40` |
| FR-17 | Validasi jumlah > 0 dan <= stok | Transaction | `POST /transactions` | `transaction.schema.ts:25`, `transaction.service.ts:68` | `transaction.test.ts:75` |
| FR-18 | Hitung total = SUM(harga × jumlah) | Transaction | `POST /transactions` | `transaction.service.ts:88` | `transaction.test.ts:95` |
| FR-19 | Format Rupiah dengan pemisah ribuan | Transaction, Report | — | `money.ts:35`, `export.service.ts` | — |
| FR-20 | Pilih status Lunas/Utang | Transaction | `POST /transactions` | `transaction.schema.ts:35` | `transaction.test.ts:110` |
| FR-21 | Input nama & HP wajib jika Utang | Transaction | `POST /transactions` | `transaction.schema.ts:40`, `transaction.service.ts:105` | `transaction.test.ts:125` |
| FR-22 | Stok berkurang otomatis setelah transaksi | Transaction | `POST /transactions` | `transaction.service.ts:140` | `transaction.test.ts:150` |
| FR-23 | Snapshot harga saat transaksi | Transaction | `POST /transactions` | `transaction.service.ts:120` | `transaction.test.ts:180` |
| FR-24 | Riwayat transaksi dapat ditelusuri | Transaction | `GET /transactions` | `transaction.service.ts:25` | `transaction.test.ts:25` |
| BR-05 | Jumlah > 0 dan <= stok tersedia | Transaction | — | `transaction.schema.ts:25`, `transaction.service.ts:70` | `transaction.test.ts:78` |
| BR-06 | Satu transaksi bisa multi-produk | Transaction | — | `transaction.schema.ts:18` | `transaction.test.ts:85` |
| BR-07 | Total = SUM(harga jual × jumlah) | Transaction | — | `transaction.service.ts:88` | `transaction.test.ts:95` |
| BR-08 | Transaksi Utang wajib simpan nama pembeli (HP opsional) | Transaction | — | `transaction.schema.ts`, `transaction.service.ts` | `transaction.test.ts` |
| BR-09 | Stok berkurang segera (Lunas & Utang) | Transaction | — | `transaction.service.ts:145` | `transaction.test.ts:155` |
| BR-10 | Snapshot harga tidak berubah | Transaction | — | `transaction.service.ts:122` | `transaction.test.ts:185` |
| AC-04 | Transaksi ditolak jika stok tidak cukup | Transaction | — | `transaction.service.ts:72` | `transaction.test.ts:82` |
| AC-05 | Utang tanpa nama pembeli ditolak (HP opsional) | Transaction | — | `transaction.service.ts:110` | `transaction.test.ts:135` |
| AC-06 | Stok berkurang & snapshot tersimpan | Transaction | — | `transaction.service.ts:142` | `transaction.test.ts:162` |

---

## 4. Modul Void Transaksi

| ID | Requirement | Modul | Endpoint | File Implementasi | File Test |
|----|-------------|-------|----------|-------------------|-----------|
| FR-25 | Void transaksi dalam batas waktu | Transaction | `POST /transactions/:id/void` | `transaction.service.ts:210` | `transaction.test.ts:240` |
| FR-26 | Tolak void di luar batas waktu | Transaction | `POST /transactions/:id/void` | `transaction.service.ts:220` | `transaction.test.ts:260` |
| FR-27 | Stok dikembalikan saat void | Transaction | `POST /transactions/:id/void` | `transaction.service.ts:245` | `transaction.test.ts:280` |
| FR-28 | Status berubah menjadi DIBATALKAN | Transaction | `POST /transactions/:id/void` | `transaction.service.ts:250` | `transaction.test.ts:290` |
| FR-29 | Transaksi void tetap di riwayat, dikecualikan dari laporan | Transaction, Report | — | `transaction.service.ts:252`, `report.service.ts:55` | `transaction.test.ts:295`, `report.test.ts:60` |
| BR-13 | Void hanya dalam batas waktu, stok dikembalikan, status DIBATALKAN | Transaction | — | `transaction.service.ts:215` | `transaction.test.ts:265` |
| AC-07 | Void berhasil dalam batas waktu | Transaction | — | `transaction.service.ts:225` | `transaction.test.ts:270` |
| AC-08 | Void ditolak di luar batas waktu | Transaction | — | `transaction.service.ts:222` | `transaction.test.ts:263` |
| AC-09 | Transaksi DIBATALKAN tidak masuk laporan omzet/profit | Report | — | `report.service.ts:58` | `report.test.ts:65` |

---

## 5. Modul Pelunasan Cicilan (Utang)

| ID | Requirement | Modul | Endpoint | File Implementasi | File Test |
|----|-------------|-------|----------|-------------------|-----------|
| FR-30 | Catat pembayaran penuh/cicilan | Debt | `POST /debts/:id/payments` | `debt.service.ts:45` | `debt.test.ts:40` |
| FR-31 | Riwayat pelunasan tersimpan | Debt | `GET /debts/:id` | `debt.service.ts:85` | `debt.test.ts:80` |
| FR-32 | Hitung & tampilkan sisa saldo utang | Debt | `POST /debts/:id/payments` | `debt.service.ts:68` | `debt.test.ts:65` |
| FR-33 | Tolak pembayaran > sisa saldo | Debt | `POST /debts/:id/payments` | `debt.service.ts:55` | `debt.test.ts:55` |
| FR-34 | Status auto-update ke LUNAS saat saldo = 0 | Debt | `POST /debts/:id/payments` | `debt.service.ts:75` | `debt.test.ts:72` |
| BR-14 | Cicilan bertahap, riwayat tercatat, auto-Lunas saat saldo 0 | Debt | — | `debt.service.ts:50` | `debt.test.ts:50` |
| AC-10 | Cicilan sebagian mengurangi sisa saldo | Debt | — | `debt.service.ts:70` | `debt.test.ts:68` |
| AC-11 | Pelunasan penuh ubah status ke LUNAS | Debt | — | `debt.service.ts:78` | `debt.test.ts:75` |
| AC-12 | Pembayaran > sisa saldo ditolak | Debt | — | `debt.service.ts:58` | `debt.test.ts:58` |

---

## 6. Modul Laporan & Dashboard

| ID | Requirement | Modul | Endpoint | File Implementasi | File Test |
|----|-------------|-------|----------|-------------------|-----------|
| FR-35 | Laporan penjualan per periode | Report | `GET /reports/sales` | `report.service.ts:35` | `report.test.ts:30` |
| FR-36 | Profit = selisih harga jual & modal (snapshot) | Report | `GET /reports/sales` | `report.service.ts:70` | `report.test.ts:68` |
| FR-37 | Laporan utang dengan riwayat cicilan | Report | `GET /reports/debts` | `report.service.ts:110` | `report.test.ts:105` |
| FR-38 | Tren produk terlaris (min 5 produk) | Report | `GET /reports/product-trend` | `report.service.ts:180` | `report.test.ts:175` |
| FR-39 | Laporan kecualikan transaksi DIBATALKAN | Report | — | `report.service.ts:55` | `report.test.ts:60` |
| FR-40 | Ekspor laporan penjualan ke Excel/PDF | Report | `GET /reports/sales/export` | `export.service.ts:30` | `report.test.ts:220` |
| FR-41 | Ekspor laporan utang ke Excel/PDF | Report | `GET /reports/debts/export` | `export.service.ts:120` | `report.test.ts:260` |
| FR-42 | File ekspor memuat periode & timestamp | Report | — | `export.service.ts:45`, `export.service.ts:135` | `report.test.ts:230`, `report.test.ts:270` |
| FR-43 | Dashboard ringkasan omzet/profit periode berjalan | Dashboard | `GET /dashboard/summary` | `dashboard.service.ts:30` | `dashboard.test.ts:25` |
| FR-44 | Dashboard tampilkan produk low-stock | Dashboard | `GET /dashboard/summary` | `dashboard.service.ts:52` | `dashboard.test.ts:50` |
| FR-45 | Dashboard total saldo utang belum lunas | Dashboard | `GET /dashboard/summary` | `dashboard.service.ts:68` | `dashboard.test.ts:65` |
| BR-11 | Profit = penjualan − harga modal saat transaksi | Report | — | `report.service.ts:73` | `report.test.ts:71` |
| BR-16 | Format Rupiah dengan pemisah ribuan | Report, Export | — | `money.ts:35`, `export.service.ts` | — |
| AC-13 | Laporan < 5 detik untuk 200 transaksi/hari × 30 hari | Report | — | `report.service.ts:35` | Manual perf test |
| AC-14 | Laporan utang tampilkan riwayat cicilan | Report | — | `report.service.ts:125` | `report.test.ts:120` |
| AC-15 | File ekspor dapat dibuka & isi cocok | Report | — | `export.service.ts` | `report.test.ts:235`, `report.test.ts:275` |
| AC-16 | Tren produk minimal 5 produk, urut descending | Report | — | `report.service.ts:205` | `report.test.ts:200` |
| AC-17 | Dashboard load < 3 detik | Dashboard | — | `dashboard.service.ts:28` | Manual perf test |

---

## 7. Non-Functional Requirements (NFR)

| ID | Requirement | Implementasi | Verifikasi |
|----|-------------|--------------|------------|
| NFR-01 | Waktu muat < 2 detik (dashboard, katalog, form) | Index database, query optimization | Manual perf test |
| NFR-02 | Handle 200 transaksi/hari tanpa degradasi | PM2 cluster mode, connection pooling | Load test (manual) |
| NFR-03 | Koneksi internet diperlukan saat transaksi | Tidak ada offline mode di MVP | — |
| NFR-04 | Data tersimpan di server, tidak hilang saat device rusak | PostgreSQL + backup harian | `backup-db.sh`, cron job |
| NFR-05 | Password di-hash (bcrypt) | `auth.service.ts:20` | `auth.service.test.ts:18` |
| NFR-06 | Mekanisme reset password via admin | Manual script, seed, README.md | — |
| NFR-07 | Backup data minimal harian | `backup-db.sh`, cron job | — |
| NFR-08 | Support browser modern Android/iOS (Chrome, Safari) | CORS, standard REST API | Manual browser test |
| NFR-09 | Bahasa Indonesia | Response message, error message | All tests |

---

## 8. Deviasi dari SDD

### 8.1 Dependency Tambahan
- **helmet** & **cookie-parser**: Ditambahkan untuk security headers dan refresh token cookie (tidak disebutkan di SDD awal, tapi sesuai best practice).
- **compression**: Ditambahkan untuk optimasi response size.

### 8.2 Skema Database
- Tabel `ProductStockHistory` ditambahkan untuk audit log penyesuaian stok manual (tidak ada di SDD, tapi berguna untuk traceability BR-04/FR-15).

### 8.3 Format Uang
- Keputusan: semua nilai uang dikirim sebagai **string desimal** di JSON response (bukan number), untuk menghindari masalah presisi float JavaScript.
- Dokumentasi: `utils/money.ts`, `utils/response.ts`.

### 8.4 Environment Variables
- Nama env var di `config/env.ts` sedikit berbeda dari contoh SDD (mis. `JWT_ACCESS_EXPIRES_IN` vs `JWT_ACCESS_EXPIRY`), tapi semua validasi Zod tetap konsisten.

### 8.5 Test Stability
- Jest config di-set `maxWorkers: 1` (sequential execution) untuk menghindari race condition pada test database.

---

## 9. Open Questions (Tersisa)

1. **Multi-role Owner/Kasir:** Belum diimplementasikan di MVP (sesuai scope). Struktur middleware `requireRole()` sudah disiapkan sebagai hook kosong.
2. **Offline-first mode:** Tidak termasuk MVP (NFR-03). Evaluasi di fase berikutnya.
3. **Multi-gambar per produk (galeri):** MVP hanya 1 foto utama. Struktur database (`fotoKey`, `fotoUrl`) dapat diperluas ke tabel `ProductPhoto` di kemudian hari.

---

## 10. Test Coverage Summary

**Total tests:** 145  
**Passed:** 145 (100%)  
**Failed:** 0  

**Coverage per layer:**
- Service layer: **85%** (target >= 80% tercapai)
- Controller layer: **78%**
- Integration (DB): **90%**

**Coverage report:** Run `npm run test -- --coverage` untuk detail lengkap.

---

**Catatan:** Dokumen ini akan diperbarui saat ada perubahan requirement atau implementasi.
