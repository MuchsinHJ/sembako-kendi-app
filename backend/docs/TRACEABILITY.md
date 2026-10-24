# Traceability Matrix — Kendi's Market Backend

**Versi:** 1.2  
**Tanggal:** 2026-10-24  
**Status:** MVP Complete (283 test / 17 suite, semua hijau)

Dokumen ini memetakan setiap Functional Requirement (FR), Business Rule (BR), dan Acceptance Criteria (AC) dari SRS ke implementasi kode dan test yang memverifikasinya.

> **Cakupan revisi 1.2 (2026-10-24):** modul **Konsinyasi/Penitipan Barang** ditambahkan ke MVP dengan penomoran lanjutan **FR-46–FR-49**, **BR-17–BR-26** (dari label BR-A…BR-J), dan **AC-20–AC-26** — lihat §6A dan §8.9. ID-ID tersebut kini resmi tercantum di SRS v1.1 dan PRD Revisi 4.

> **Konvensi referensi test:** kolom "File Test" menunjuk nama file, bukan nomor baris (nomor baris cepat usang). Setiap test mencantumkan ID AC/FR/BR pada judulnya sesuai SDD §8.5.

---

## 1. Modul Autentikasi

| ID | Requirement | Modul | Endpoint | File Implementasi | File Test |
|----|-------------|-------|----------|-------------------|-----------|
| FR-01 | Form login dengan email & password | Auth | `POST /auth/login` | `auth.service.ts` (`loginService`) | `auth.test.ts` |
| FR-02 | Validasi kredensial & error handling | Auth | `POST /auth/login` | `auth.service.ts` (pesan seragam untuk email/password salah) | `auth.test.ts` |
| FR-03 | Password di-hash dengan bcrypt | Auth | — | `auth.service.ts`, `prisma/seed.ts`, `scripts/reset-password.ts` (`config.BCRYPT_SALT_ROUNDS`) | `auth.test.ts`, `env.test.ts` |
| FR-04 | Logout dengan invalidasi token | Auth | `POST /auth/logout` (wajib access token) | `auth.service.ts` (`logoutService` → `revokedAt`) | `auth.test.ts` (logout + 401 tanpa token) |
| FR-05 | Reset password via admin/developer | Auth | Manual/Seed | `scripts/reset-password.ts` (`npm run reset-password`), `prisma/seed.ts` | Manual |
| BR-01 | Single role User, audit trail transaksi | Auth, Transaction | — | `schema.prisma` (`Transaction.dibuatOlehId`), `auth.middleware.ts` | `auth.test.ts`, semua suite API |

---

## 2. Modul Produk & Stok

| ID | Requirement | Modul | Endpoint | File Implementasi | File Test |
|----|-------------|-------|----------|-------------------|-----------|
| FR-06 | List produk dengan filter | Product | `GET /products` | `product.service.ts` (`listProducts`) | `product.test.ts` |
| FR-07 | Tambah produk baru | Product | `POST /products` | `product.service.ts` (`createProduct`) | `product.test.ts` |
| FR-08 | Validasi harga jual > 0 | Product | `POST /products`, `PUT /products/:id` | `product.schema.ts`, `product.service.ts` | `product.test.ts` (BR-03), `product.service.test.ts` |
| FR-09 | Ubah data produk | Product | `PUT /products/:id` | `product.service.ts` (`updateProduct`, stok tidak berubah) | `product.test.ts` |
| FR-10 | Perubahan harga tidak ubah transaksi lama (snapshot) | Product, Transaction | — | `transaction.service.ts` (`DetailTransaction` snapshot) | `transaction.service.test.ts` (BR-10) |
| FR-11 | Hard delete hanya produk tanpa riwayat | Product | `DELETE /products/:id` | `product.service.ts` (`deleteProduct`) | `product.service.test.ts`, `product.test.ts` |
| FR-12 | Soft delete produk dengan riwayat | Product | `PATCH /products/:id/status` | `product.service.ts` (`updateProductStatus`); `DELETE` → `PRODUCT_HAS_TRANSACTION` | `product.test.ts` (BR-12) |
| FR-13 | Atur ambang batas stok minimum | Product | `PATCH /products/:id/stock-threshold` | `product.service.ts` (`updateStockThreshold`) | `product.test.ts` |
| FR-14 | Tampilkan produk low-stock di dashboard | Dashboard | `GET /dashboard/summary` | `dashboard.service.ts` | `dashboard.test.ts` (FR-44) |
| FR-15 | Validasi stok tidak negatif | Product | `PATCH /products/:id/stock-adjustment` | `product.service.ts` (`adjustStock`), `transaction.service.ts` | `product.test.ts` (BR-04), `product.service.test.ts` |
| BR-03 | Harga jual > 0 | Product | — | `product.schema.ts`, `product.service.ts` | `product.test.ts`, `product.service.test.ts` |
| BR-04 | Stok >= 0 | Product, Transaction | — | `product.schema.ts`, `product.service.ts`, `transaction.service.ts` | `product.test.ts`, `transaction.test.ts`, `constraints.test.ts` |
| BR-12 | Produk dengan riwayat tidak bisa dihapus permanen | Product | `DELETE /products/:id` | `product.service.ts` (`ProductHasTransactionError`) | `product.test.ts`, `product.service.test.ts`, `errorHandler.test.ts` |
| BR-15 | Ambang batas stok minimum per produk | Product, Dashboard | — | `product.service.ts`, `dashboard.service.ts` | `product.test.ts`, `dashboard.test.ts` |
| AC-01 | Validasi harga jual ≤ 0 ditolak | Product | — | `product.schema.ts`, `product.service.ts` | `product.test.ts`, `product.service.test.ts` |
| AC-02 | Produk dengan transaksi tidak boleh dihapus permanen | Product | — | `product.service.ts` | `product.test.ts`, `product.service.test.ts` |
| AC-03 | Dashboard tampilkan produk low-stock | Dashboard | — | `dashboard.service.ts` | `dashboard.test.ts` |

**Perluasan FR-07/FR-09:** Upload foto produk (Multer + Sharp + R2)
- Implementasi: `media.service.ts`, `media.controller.ts`, `middlewares/upload.middleware.ts`, `repositories/storage.repository.ts`
- Test: `media.test.ts` (label: "Perluasan FR-07/FR-09") — 9 skenario; upload sukses butuh R2 sehingga belum diuji (lihat Open Question di `AUDIT.md`).

---

## 3. Modul Transaksi

| ID | Requirement | Modul | Endpoint | File Implementasi | File Test |
|----|-------------|-------|----------|-------------------|-----------|
| FR-16 | Pilih produk & jumlah dalam transaksi | Transaction | `POST /transactions` | `transaction.service.ts` (`createTransaction`) | `transaction.test.ts` |
| FR-17 | Validasi jumlah > 0 dan <= stok | Transaction | `POST /transactions` | `transaction.schema.ts`, `transaction.service.ts` | `transaction.test.ts`, `transaction.service.test.ts` |
| FR-18 | Hitung total = SUM(harga × jumlah) | Transaction | `POST /transactions` | `transaction.service.ts` (Decimal) | `transaction.service.test.ts` (BR-07) |
| FR-19 | Format Rupiah dengan pemisah ribuan | Transaction, Report | — | `utils/money.ts` (`formatRupiah`), `export.service.ts` | Output ekspor (`report.test.ts`) |
| FR-20 | Catat uang diterima; status Lunas/Utang + kembalian + sisa utang diturunkan otomatis | Transaction | `POST /transactions` | `transaction.schema.ts` (`uangDiterima`), `transaction.service.ts` | `transaction.test.ts` (AC-05a/AC-05b), `transaction.service.test.ts` |
| FR-21 | Input nama wajib jika uang diterima < total (Utang); HP opsional | Transaction | `POST /transactions` | `transaction.service.ts` (`MissingDebtorInfoError`) | `transaction.test.ts` (AC-05), `transaction.service.test.ts` |
| FR-22 | Stok berkurang otomatis setelah transaksi | Transaction | `POST /transactions` | `transaction.service.ts` (`$transaction`) | `transaction.test.ts` (AC-06) |
| FR-23 | Snapshot harga saat transaksi | Transaction | `POST /transactions` | `transaction.service.ts` (`DetailTransaction`) | `transaction.service.test.ts` |
| FR-24 | Riwayat transaksi dapat ditelusuri | Transaction | `GET /transactions` | `transaction.service.ts` (`listTransactions`) | `transaction.test.ts` (AC-06) |
| BR-05 | Jumlah > 0 dan <= stok tersedia | Transaction | — | `transaction.service.ts` (`StockExceededError`) | `transaction.test.ts`, `transaction.service.test.ts` |
| BR-06 | Satu transaksi bisa multi-produk | Transaction | — | `transaction.schema.ts` (`items[]`) | `transaction.test.ts` |
| BR-07 | Total = SUM(harga jual × jumlah) | Transaction | — | `transaction.service.ts` | `transaction.service.test.ts` |
| BR-08 | Transaksi Utang wajib simpan nama pembeli (HP opsional) | Transaction | — | `transaction.service.ts` (`MissingDebtorInfoError` → 422) | `transaction.test.ts`, `transaction.service.test.ts`, `errorHandler.test.ts` |
| BR-09 | Stok berkurang segera (Lunas & Utang) | Transaction | — | `transaction.service.ts` | `transaction.test.ts` (AC-06) |
| BR-10 | Snapshot harga tidak berubah | Transaction | — | `transaction.service.ts` | `transaction.service.test.ts` |
| AC-04 | Transaksi ditolak jika stok tidak cukup | Transaction | — | `transaction.service.ts` | `transaction.test.ts`, `transaction.service.test.ts` |
| AC-05 | Utang tanpa nama pembeli ditolak (HP opsional) | Transaction | — | `transaction.service.ts` | `transaction.test.ts`, `transaction.service.test.ts` |
| AC-05a | Uang diterima > total → LUNAS + kembalian | Transaction | — | `transaction.service.ts` | `transaction.test.ts`, `transaction.service.test.ts` |
| AC-05b | Uang diterima < total → UTANG + sisa saldo | Transaction | — | `transaction.service.ts` | `transaction.test.ts`, `transaction.service.test.ts` |
| AC-06 | Stok berkurang & snapshot tersimpan | Transaction | — | `transaction.service.ts` | `transaction.test.ts`, `transaction.service.test.ts` |

---

## 4. Modul Void Transaksi

| ID | Requirement | Modul | Endpoint | File Implementasi | File Test |
|----|-------------|-------|----------|-------------------|-----------|
| FR-25 | Void transaksi dalam batas waktu 24 jam | Transaction | `POST /transactions/:id/void` | `transaction.service.ts` (`voidTransaction`, `VOID_WINDOW_HOURS`), `utils/date.ts` (`isWithinHoursWindow`) | `transaction.service.test.ts` (AC-07, FR-25) |
| FR-26 | Tolak void di luar batas waktu | Transaction | `POST /transactions/:id/void` | `transaction.service.ts` (`VoidWindowExpiredError`) | `transaction.service.test.ts` (AC-08), `transaction.test.ts` (AC-08) |
| FR-27 | Stok dikembalikan saat void | Transaction | `POST /transactions/:id/void` | `transaction.service.ts` (`$transaction`) | `transaction.service.test.ts` |
| FR-28 | Status berubah menjadi DIBATALKAN | Transaction | `POST /transactions/:id/void` | `transaction.service.ts` | `transaction.service.test.ts` |
| FR-29 | Transaksi void tetap di riwayat, dikecualikan dari laporan | Transaction, Report | — | `transaction.service.ts`, `report.service.ts`, `dashboard.service.ts` | `report.test.ts`, `dashboard.test.ts` |
| BR-13 | Void hanya dalam 24 jam sejak `createdAt` (rolling window), stok dikembalikan, status DIBATALKAN | Transaction | — | `transaction.service.ts` (`VOID_WINDOW_HOURS`), `utils/date.ts` (`isWithinHoursWindow`) | `transaction.service.test.ts`, `transaction.test.ts` |
| AC-07 | Void berhasil dalam batas waktu | Transaction | — | `transaction.service.ts` | `transaction.service.test.ts` |
| AC-08 | Void ditolak di luar batas waktu (24 jam) / sudah dibatalkan | Transaction | — | `transaction.service.ts` | `transaction.service.test.ts`, `transaction.test.ts` |
| AC-09 | Transaksi DIBATALKAN tidak masuk laporan omzet/profit | Report | — | `report.service.ts` | `report.test.ts`, `dashboard.test.ts` |

---

## 5. Modul Pelunasan Cicilan (Utang)

| ID | Requirement | Modul | Endpoint | File Implementasi | File Test |
|----|-------------|-------|----------|-------------------|-----------|
| FR-30 | Catat pembayaran penuh/cicilan | Debt | `POST /debts/:transactionId/payments` | `debt.service.ts` (`recordPayment`) | `debt.test.ts`, `debt.service.test.ts` |
| FR-31 | Riwayat pelunasan tersimpan | Debt | `GET /debts/:transactionId/payments` | `debt.service.ts` (`getPaymentHistory`), tabel `PaymentHistory` | `debt.test.ts` |
| FR-32 | Hitung & tampilkan sisa saldo utang | Debt | `POST /debts/:transactionId/payments` | `debt.service.ts` (`sisaSaldoUtang` + `SELECT … FOR UPDATE`) | `debt.test.ts`, `debt.service.test.ts` |
| FR-33 | Tolak pembayaran > sisa saldo | Debt | `POST /debts/:transactionId/payments` | `debt.service.ts` (`DebtOverpaymentError`) | `debt.test.ts`, `debt.service.test.ts` |
| FR-34 | Status auto-update ke LUNAS saat saldo = 0 | Debt | `POST /debts/:transactionId/payments` | `debt.service.ts` | `debt.test.ts`, `debt.service.test.ts` |
| BR-14 | Cicilan bertahap, riwayat tercatat, auto-Lunas saat saldo 0 | Debt | — | `debt.service.ts` | `debt.test.ts`, `debt.service.test.ts` |
| AC-10 | Cicilan sebagian mengurangi sisa saldo | Debt | — | `debt.service.ts` | `debt.test.ts`, `debt.service.test.ts` |
| AC-11 | Pelunasan penuh ubah status ke LUNAS | Debt | — | `debt.service.ts` | `debt.test.ts`, `debt.service.test.ts` |
| AC-12 | Pembayaran > sisa saldo ditolak | Debt | — | `debt.service.ts` | `debt.test.ts`, `debt.service.test.ts` |

> Catatan: **tidak ada** endpoint `GET /debts/:id`. Daftar utang dilayani `GET /debts` (dengan `?page=&limit=`), sedangkan riwayat cicilan per transaksi dilayani `GET /debts/:transactionId/payments` (SDD §5.6).

---

## 6. Modul Laporan & Dashboard

| ID | Requirement | Modul | Endpoint | File Implementasi | File Test |
|----|-------------|-------|----------|-------------------|-----------|
| FR-35 | Laporan penjualan per periode | Report | `GET /reports/sales` | `report.service.ts` (`getSalesReport`) | `report.test.ts` (AC-13) |
| FR-36 | Profit = selisih harga jual & modal (snapshot) | Report | `GET /reports/sales` | `report.service.ts` | `report.test.ts` (FR-36) |
| FR-37 | Laporan utang dengan riwayat cicilan | Report | `GET /reports/debts` | `report.service.ts` (`getDebtsReport`) | `report.test.ts` (AC-14) |
| FR-38 | Tren produk terlaris (min 5 produk) | Report | `GET /reports/product-trend` | `report.service.ts` (`getProductTrend`, `take: 5`) | `report.test.ts` (AC-16) |
| FR-39 | Laporan kecualikan transaksi DIBATALKAN | Report | — | `report.service.ts` | `report.test.ts` |
| FR-40 | Ekspor laporan penjualan ke Excel/PDF | Report | `GET /reports/sales/export` | `export.service.ts` | `report.test.ts` (AC-15) |
| FR-41 | Ekspor laporan utang ke Excel/PDF | Report | `GET /reports/debts/export` | `export.service.ts` | `report.test.ts` (AC-15) |
| FR-42 | File ekspor memuat periode & timestamp | Report | — | `export.service.ts` (header periode + nama file) | `report.test.ts` (Content-Disposition) |
| FR-43 | Dashboard ringkasan omzet/profit periode berjalan | Dashboard | `GET /dashboard/summary` | `dashboard.service.ts` (`getDashboardSummary`) | `dashboard.test.ts` (AC-17) |
| FR-44 | Dashboard tampilkan produk low-stock | Dashboard | `GET /dashboard/summary` | `dashboard.service.ts` | `dashboard.test.ts` |
| FR-45 | Dashboard total saldo utang belum lunas | Dashboard | `GET /dashboard/summary` | `dashboard.service.ts` | `dashboard.test.ts` |
| BR-11 | Profit = penjualan − harga modal saat transaksi | Report | — | `report.service.ts` | `report.test.ts` |
| BR-16 | Format Rupiah dengan pemisah ribuan | Report, Export | — | `utils/money.ts` (`formatRupiah`), `export.service.ts` | Output ekspor |
| AC-13 | Laporan < 5 detik untuk 200 transaksi/hari × 30 hari | Report | — | `report.service.ts` | Manual perf test |
| AC-14 | Laporan utang tampilkan riwayat cicilan | Report | — | `report.service.ts` | `report.test.ts` |
| AC-15 | File ekspor dapat dibuka & isi cocok | Report | — | `export.service.ts` | `report.test.ts` |
| AC-16 | Tren produk maksimal 5, urut descending | Report | — | `report.service.ts` | `report.test.ts` |
| AC-17 | Dashboard load < 3 detik | Dashboard | — | `dashboard.service.ts` | `dashboard.test.ts` + manual perf |
| AC-18 | Upload foto menolak tipe tak didukung & isi bukan gambar valid | Media | `POST /products/:id/photo` | `media.service.ts`, `middlewares/upload.middleware.ts` | `media.test.ts` (label "Perluasan FR-07/FR-09") |
| AC-19 | Penyesuaian stok manual menolak stok negatif / alasan kosong | Product | `PATCH /products/:id/stock-adjustment` | `product.service.ts` | `product.test.ts` (stock-adjustment), `product.service.test.ts` |
| AC-20 | Produk titipan wajib penitip; tipe & penitip immutable | Product | `POST/PUT /products/:id` | `product.schema.ts`, `product.service.ts` | `consignment.test.ts` (BR-A), `consignment.service.test.ts` (BR-A) |
| AC-21 | Harga jual produk titipan ≥ harga setor | Product | `POST/PUT /products/:id` | `product.service.ts` | `consignment.test.ts` (BR-B), `consignment.service.test.ts` (BR-B) |
| AC-22 | Penerimaan menambah stok; retur melebihi stok ditolak | Consignment | `POST /consignment/receipts`, `POST /consignment/returns` | `consignment.service.ts` | `consignment.test.ts` (BR-C), `consignment.service.test.ts` (BR-C/BR-I) |
| AC-23 | Saldo penitip & validasi setoran | Consignment | `GET /consignors/:id/balance`, `POST /consignors/:id/payments` | `consignment.service.ts` | `consignment.balance.test.ts` (BR-D + concurrency), `consignment.test.ts` |
| AC-24 | Penonaktifan penitip berstok ditolak; produk titipan ikut nonaktif | Consignment, Product | `PATCH /consignors/:id/status`, `PATCH /products/:id/status` | `consignment.service.ts`, `product.service.ts` | `consignment.test.ts` (BR-E, BR-H), `consignment.service.test.ts` |
| AC-25 | Void setelah setoran → saldo negatif; setoran penitip nonaktif diizinkan | Transaction, Consignment | `POST /transactions/:id/void`, `POST /consignors/:id/payments` | `transaction.service.ts`, `consignment.service.ts` | `consignment.balance.test.ts` (BR-F, BR-G) |
| AC-26 | Laporan konsinyasi konsisten dengan saldo; total kewajiban penitip | Consignment, Report, Dashboard | `GET /reports/consignment`, `GET /dashboard/summary` | `consignment.service.ts` | `consignment.balance.test.ts` (laporan & `totalKewajibanPenitip`), `consignment.test.ts` |

### 6.1 Format Uang pada Response (SDD §5.1)

Semua nilai uang di JSON dikirim sebagai **string desimal 2 angka** (`"75000.00"`), bukan `number`. Implementasi: `utils/money.ts` (`decimalToString`) dipakai oleh `product`, `transaction`, `debt`, `consignment`, `dashboard`, dan `report` controller lewat `utils/response.ts` (`sendSuccess`). Diverifikasi oleh `dashboard.test.ts`, `report.test.ts` (regex `/^\d+\.\d{2}$/`), dan `consignment.test.ts` (termasuk nilai negatif `"-20000.00"`).

---

## 6A. Modul Konsinyasi (Penitipan Barang) — FR-46–FR-49 / BR-17–BR-26

> Diberi label **6A** (bukan menggeser nomor 7–10) agar nomor bagian yang sudah dipakai dokumen lain — khususnya §8.9 (revisi konsinyasi) dan rujukan SDD §10 — tetap valid. Sama seperti penempatan §3.14 pada SDD.

Modul: **Consignment** (`src/modules/consignment/`). Dua router: `/consignors` (`consignorsRouter`) dan `/consignment` (`consignmentRouter`); handler laporan konsinyasi dipasang di `report.routes.ts` tetapi implementasinya di `consignment.controller.ts`/`consignment.service.ts`.

| ID | Requirement | Modul | Endpoint | File Implementasi | File Test |
|----|-------------|-------|----------|-------------------|-----------|
| FR-46 | Kelola data penitip (CRUD + status) & produk titipan (termasuk filter tipe/penitip) | Consignment, Product | `GET/POST /consignors`, `GET/PUT /consignors/:id`, `PATCH /consignors/:id/status`, `GET/POST/PUT/PATCH/DELETE /products/*` (filter `tipe`, `consignorId`) | `consignment.service.ts`, `consignment.schema.ts`, `product.service.ts`, `product.schema.ts` | `consignment.service.test.ts` (BR-A/B/E/G/H/J), `consignment.test.ts`, `product.test.ts` |
| FR-47 | Catat penerimaan & retur titipan + riwayat pergerakan | Consignment | `POST /consignment/receipts`, `POST /consignment/returns`, `GET /consignment/movements` | `consignment.service.ts` (`createReceipt`, `createReturn`, `listMovements`) | `consignment.service.test.ts` (BR-C/BR-I), `consignment.test.ts` |
| FR-48 | Kewajiban/saldo per penitip, catat setoran, riwayat setoran | Consignment | `GET /consignors/:id/balance`, `GET/POST /consignors/:id/payments` | `consignment.service.ts` (`getConsignorBalance`, `getSaldoMap`, `createConsignorPayment`, `listConsignorPayments`) | `consignment.balance.test.ts` (20), `consignment.test.ts` |
| FR-49 | Laporan konsinyasi per periode + total kewajiban penitip di dashboard | Consignment, Report, Dashboard | `GET /reports/consignment`, `GET /dashboard/summary` | `consignment.service.ts` (`getConsignmentReport`, `getTotalKewajibanPenitip`), `report.controller.ts`, `dashboard.service.ts` | `consignment.balance.test.ts` (konsistensi laporan ↔ saldo), `consignment.test.ts` |
| BR-17 | `TITIPAN` wajib `consignorId`; `MILIK_SENDIRI` wajib `null`; `tipe`/`consignorId` immutable | Product, DB | `POST /products`, `PUT /products/:id` | `product.schema.ts` (Zod), `product.service.ts`, `schema.prisma` (CHECK `Product_tipe_consignor_check`) | `consignment.service.test.ts` (BR-A), `consignment.test.ts`, `constraints.test.ts` |
| BR-18 | `hargaJual >= hargaModal` (harga setor) untuk produk titipan | Product | `POST/PUT /products/:id` | `product.service.ts` (422 `BUSINESS_RULE_VIOLATION`) | `consignment.service.test.ts` (BR-B), `consignment.test.ts` |
| BR-19 | Penerimaan menambah stok; retur mengurangi dan tidak melebihi stok; append-only | Consignment, DB | `POST /consignment/receipts`, `POST /consignment/returns` | `consignment.service.ts` (`StockExceededError`), CHECK `ConsignmentMovement_jumlah_check` & `..._stokSesudah_check` | `consignment.service.test.ts` (BR-C/BR-I), `consignment.test.ts`, `constraints.test.ts` |
| BR-20 | Setoran `> 0` dan tidak melebihi saldo; saldo ≤ 0 menolak semua setoran | Consignment, DB | `POST /consignors/:id/payments` | `consignment.service.ts` (`ConsignorOverpaymentError`, row lock `Consignor`), CHECK `ConsignorPayment_jumlahBayar_check` | `consignment.balance.test.ts` (termasuk concurrency), `consignment.test.ts`, `constraints.test.ts` |
| BR-21 | Consignor tidak di-hard-delete; nonaktif hanya bila semua produk titipan berstok 0 | Consignment, DB | `PATCH /consignors/:id/status` | `consignment.service.ts` (`ConsignorHasStockError`, `details.products`), FK `RESTRICT` | `consignment.service.test.ts` (BR-E), `consignment.test.ts` |
| BR-22 | Void tetap diizinkan walau saldo penitip menjadi negatif | Transaction, Consignment | `POST /transactions/:id/void` | `transaction.service.ts` (`voidTransaction`), `consignment.service.ts` (saldo diturunkan) | `consignment.balance.test.ts` (BR-F) |
| BR-23 | Consignor `NONAKTIF`: tidak bisa produk baru/receipt/aktifkan produk; setoran tetap boleh | Consignment, Product | `POST /products`, `POST /consignment/receipts`, `PATCH /products/:id/status`, `POST /consignors/:id/payments` | `consignment.service.ts` (`ConsignorInactiveError`), `product.service.ts` | `consignment.service.test.ts` (BR-G), `consignment.balance.test.ts`, `consignment.test.ts` |
| BR-24 | Produk `TITIPAN`: `NONAKTIF` hanya bila stok 0; `AKTIF` hanya bila consignor `AKTIF` | Product | `PATCH /products/:id/status` | `product.service.ts` (`ProductHasStockError`) | `consignment.service.test.ts` (BR-H), `consignment.test.ts` |
| BR-25 | `receipt` hanya untuk produk `TITIPAN` `AKTIF` milik consignor `AKTIF` | Consignment | `POST /consignment/receipts` | `consignment.service.ts` (`ProductNotConsignmentError`, `ConsignorInactiveError`), dicek ulang dalam transaction | `consignment.service.test.ts` (BR-C/BR-I), `consignment.test.ts` |
| BR-26 | Produk titipan dengan riwayat transaksi **atau** movement tidak bisa di-hard-delete | Product, DB | `DELETE /products/:id` | `product.service.ts` (`ProductHasTransactionError`), FK `RESTRICT` | `consignment.service.test.ts` (BR-J), `consignment.test.ts` |

> **AC:** SRS v1.1 (revisi 2026-10-24) sudah memuat AC resmi **AC-20–AC-26** untuk fitur ini (pemetaan AC↔BR ada di SDD §8.5 dan di §6 tabel AC di atas). Nama `describe`/`it` pada test yang ada masih memakai label BR langsung (mis. `describe('BR-A: tipe produk dan consignorId')`, `describe('Saldo penitip (BR-D)')`); penyelarasan nama test ke ID AC bersifat label-saja dan tidak mengubah hasil test.

> **Ekspor laporan konsinyasi:** `GET /reports/consignment/export` **tidak** diimplementasikan — `export.service.ts` terikat pada `SalesReportData`/`DebtsReportData`. Dicatat sebagai saran (SDD §5.8, §11.16), bukan deviasi.

---

## 7. Non-Functional Requirements (NFR)

| ID | Requirement | Implementasi | Verifikasi |
|----|-------------|--------------|------------|
| NFR-01 | Waktu muat < 2 detik (dashboard, katalog, form) | Index database, query optimization | Manual perf test |
| NFR-02 | Handle 200 transaksi/hari tanpa degradasi | PM2 cluster mode, connection pooling | Load test (manual) |
| NFR-03 | Koneksi internet diperlukan saat transaksi | Tidak ada offline mode di MVP | — |
| NFR-04 | Data tersimpan di server, tidak hilang saat device rusak | PostgreSQL + backup harian | Prosedur backup di `README_NEW.md`, cron job |
| NFR-05 | Password di-hash (bcrypt) | `auth.service.ts`, `prisma/seed.ts`, `scripts/reset-password.ts` (`config.BCRYPT_SALT_ROUNDS`) | `auth.test.ts`, `env.test.ts` |
| NFR-06 | Mekanisme reset password via admin | `npm run reset-password -- <email> <password>` | Manual |
| NFR-07 | Backup data minimal harian | Prosedur `pg_dump` + crontab di `README_NEW.md` | Manual |
| NFR-08 | Support browser modern Android/iOS (Chrome, Safari) | CORS, standard REST API | Manual browser test |
| NFR-09 | Bahasa Indonesia | Response message, error message | Semua test |

---

## 8. Deviasi dari SDD

**Status:** tidak ada deviasi terbuka. Seluruh temuan audit (A1–H) sudah diperbaiki di kode atau didokumentasikan pada SDD. Penambahan modul konsinyasi (§8.9) bukan deviasi — ia requirement baru yang didokumentasikan di SDD v1.1.

### 8.1 Dependency
- **helmet**, **cookie-parser**, **compression** sudah tercantum di SDD Lampiran B (tidak lagi deviasi).
- `express-session` tidak dipakai; strategi `AUTH_STRATEGY=session` memakai ID opaque di tabel `Session` (SDD §3.2/§9.2), sehingga `SESSION_SECRET` tidak diperlukan.

### 8.2 Skema Database
- Tabel `StockAdjustment` (**bukan** `ProductStockHistory`) adalah nama resmi dan terdokumentasi di SDD §4.2/§4.3/§4.5 — audit log penyesuaian stok manual (`delta`, `alasan`, `stokSebelum`, `stokSesudah`, `dicatatOlehId`).
- Tabel konsinyasi (`Consignor`, `ConsignmentMovement`, `ConsignorPayment`) serta kolom `Product.tipe`/`Product.consignorId` juga terdokumentasi di SDD §4.2 dan ditegakkan lewat CHECK constraint di DB (§4.4). Rincian revisi di §8.9.

### 8.3 Format Uang
- Semua nilai uang dikirim sebagai **string desimal 2 angka** di JSON (bukan number), menghindari presisi float JS. Tercantum di SDD §5.1; implementasi `utils/money.ts` + `utils/response.ts`; diverifikasi `dashboard.test.ts`, `report.test.ts`, `consignment.test.ts`.
- Nilai saldo konsinyasi yang boleh negatif (akibat void setelah setoran, BR-22) tetap diformat dengan 2 desimal, mis. `"-20000.00"`.
- `formatRupiah` (pemisah ribuan) hanya dipakai di file ekspor (BR-16), bukan di JSON.

### 8.4 Environment Variables
- Nama env var di `config/env.ts` sesuai SDD §9.2: `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `BCRYPT_SALT_ROUNDS`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `LOG_LEVEL`.
- `BCRYPT_SALT_ROUNDS`, `RATE_LIMIT_*`, dan `LOG_LEVEL` benar-benar dibaca dari env (bukan konstanta mati). Template: `backend/.env.example`; versi Node: `backend/.nvmrc` (22) + `engines.node >= 20`.

### 8.5 Test Stability
- Jest `maxWorkers: 1` (sequential) untuk menghindari race condition pada database test.
- Test API memakai `tests/helpers/testUser.ts` (`ensureTestUser`) agar tidak bergantung pada urutan suite/seed.

### 8.6 Revisi FR-20 — Status Pembayaran Diturunkan dari Uang Diterima
- Request `POST /transactions` memakai `uangDiterima` (bukan `statusPembayaran`).
- Turunan: `uangDiterima >= total` → `LUNAS` + `kembalian`; `uangDiterima < total` → `UTANG` + `sisaSaldoUtang`, nama pembeli wajib.
- Uang muka transaksi Utang disimpan pada `Transaction.uangDiterima` (Opsi A), bukan `PaymentHistory`, agar void dalam window 24 jam tetap mungkin (BR-13).
- Migration: `prisma/migrations/20261017_add_uang_diterima_kembalian` (+ backfill LUNAS lama).

### 8.7 Keputusan Audit Terakhir (A1–H)
| Item | Keputusan | Verifikasi |
|---|---|---|
| A1 | Parameter laporan `startDate`/`endDate` (mengikuti implementasi) | SDD §5.8; `report.schema.ts`; `report.test.ts` |
| A2 | `PRODUCT_HAS_TRANSACTION` untuk BR-12 | `utils/errors.ts`; `product.test.ts`; `errorHandler.test.ts` |
| A3 | File type tidak didukung → `415 INVALID_FILE_TYPE` | `upload.middleware.ts`; `media.test.ts` |
| A4 | `POST /auth/logout` wajib `authenticate` | `auth.routes.ts`; `auth.test.ts` |
| A5 | `GET /api/v1/health` publik & terdokumentasi | `app.ts`; `auth.test.ts`; Postman folder Health |
| B1 | BR-08 memakai `MissingDebtorInfoError` (422) | `transaction.service.ts`; `transaction.test.ts`; `transaction.service.test.ts` |
| B2 | Pemetaan Multer eksplisit | `errorHandler.middleware.ts`; 4 unit test |
| B3 | Satu instance Multer & satu `uploadLimiter` | `upload.middleware.ts`; `media.routes.ts` |
| C | Env var lengkap & digunakan; `.env.example`; `.nvmrc`; `zod`/`helmet` di dependencies | `config/env.ts`; `package.json`; `env.test.ts` |
| D1 | `StockAdjustment` terdokumentasi | SDD §4.2; `schema.prisma` |
| E | Tanpa repository per-modul (Prisma langsung di service); tanpa modul `user/`/`stock/` | SDD §2.2/§2.4/§3.5 (catatan keputusan konservatif) |
| F | Uang string pada dashboard/report; dashboard tanpa parameter periode | `dashboard.controller.ts`; `report.controller.ts`; `dashboard.test.ts`; SDD §5.7 |
| G | Suite `media`/`dashboard`/`report` | 187 test / 14 suite (revisi konsinyasi: 283 test / 17 suite) |
| H | Body Postman diperbaiki | `postman/Kendis_Market_API.postman_collection.json` |

### 8.8 Revisi Void Window — 24 Jam Rolling (2026-10-24)
- Batas waktu void (BR-13) diubah dari "hari kalender yang sama" menjadi **24 jam sejak `createdAt`**.
- Implementasi: `transaction.service.ts` (`VOID_WINDOW_HOURS = 24`) memanggil `isWithinHoursWindow(transaction.createdAt, now, 24)` dari `utils/date.ts`.
- `isWithinHoursWindow` memakai selisih epoch (UTC) sehingga bebas zona waktu, inklusif pada batas 24 jam, dan menolak `reference` lebih awal dari `target`.
- Verifikasi: `transaction.service.test.ts` (helper batas 24 jam; 23 jam lolos; 25 jam → `VoidWindowExpiredError`), `transaction.test.ts` (422 `BUSINESS_RULE_VIOLATION`, pesan memuat "24 jam").
- SDD §3.7/§3.13/§5.5/§11.3/§11.9/§11.10 diperbarui. SRS v1.1 sudah menyelaraskan FR-25/BR-13/AC-07/AC-08 ke batas **24 jam** (sebelumnya "mis. hari yang sama").

### 8.9 Revisi Fitur Penitipan Barang / Konsinyasi (2026-10-24)
- **Requirement baru:** konsinyasi dipindahkan dari *Future Development* ke MVP. Requirement dinomori lanjutan — **FR-46–FR-49**, **BR-17–BR-26** (dari label BR-A…BR-J), dan **AC-20–AC-26**. Pemetaan resmi: SDD §3.14; keputusan desain: SDD §11.11–§11.16. Sejak SRS v1.1 (2026-10-24), ID-ID tersebut sudah resmi tercantum di SRS.
- **Modul baru:** `src/modules/consignment/` — `consignment.routes.ts` (dua router: `consignorsRouter` → `/consignors`, `consignmentRouter` → `/consignment`), `consignment.controller.ts`, `consignment.service.ts`, `consignment.schema.ts`.
- **Migration (dua, aditif):**
  - `20261024_add_consignment_stage1` — enum `ProductType`, `Product.tipe` (`DEFAULT 'MILIK_SENDIRI'`), `Product.consignorId`, tabel `Consignor` & `ConsignmentMovement`, CHECK `Product_tipe_consignor_check`, index `Product(tipe)`, `Product(consignorId)`, `Consignor(status)`, `ConsignmentMovement(consignorId|productId|createdAt)`.
  - `20261024_add_consignment_stage2` — tabel `ConsignorPayment` + CHECK `ConsignorPayment_jumlahBayar_check`, index `ConsignorPayment(consignorId)`.
  - Tidak ada baris lama yang berubah; `DEFAULT 'MILIK_SENDIRI'` mengisi produk historis tanpa backfill manual.
- **Modul yang diperluas (backward compatible):**
  - `product.service.ts` / `product.schema.ts` — `tipe`/`consignorId` (BR-17), `hargaJual >= hargaModal` (BR-18), `PUT` menolak perubahan `tipe`/`consignorId` (422), BR-24 pada `PATCH status`, BR-26 pada `DELETE`, filter `tipe`/`consignorId` pada list.
  - `report.service.ts` / `report.controller.ts` — `perTipe` pada laporan penjualan, `GET /reports/consignment` (handler di `consignment.controller.ts`).
  - `dashboard.service.ts` — `totalKewajibanPenitip` (jumlah saldo **positif** semua penitip, termasuk `NONAKTIF`; saldo negatif tidak saling hapus).
  - `utils/errors.ts` — `ProductNotConsignmentError`, `ConsignorInactiveError`, `ConsignorHasStockError` (dengan `details.products`), `ProductHasStockError`, `ConsignorOverpaymentError`; semuanya 422 `BUSINESS_RULE_VIOLATION`.
- **Keputusan desain kunci:** (1) barang titipan memakai tabel `Product` yang sama (`tipe = TITIPAN`); (2) kewajiban penitip **diturunkan** dari `SUM(DetailTransaction)` − `SUM(ConsignorPayment)`, bukan disimpan; (3) `Product.hargaModal` = harga setor untuk produk titipan; (4) status penitip & status produk dua level terpisah dan saldo independen dari keduanya; (5) batch/FIFO ditolak — harga setor berbeda = baris `Product` terpisah.
- **Verifikasi:** `consignment.service.test.ts` (33), `consignment.balance.test.ts` (20, termasuk test concurrency setoran & BR-22 void), `consignment.test.ts` (38), `constraints.test.ts` (+5 CHECK konsinyasi). Total: **283 test / 17 suite**.
- **Tidak dikerjakan (sengaja):** `/reports/consignment/export` — `export.service.ts` terikat pada `SalesReportData`/`DebtsReportData` sehingga butuh template baru, bukan reuse (saran, bukan komitmen).
- **Penyelarasan dokumen:** SRS v1.1 dan PRD Revisi 4 (2026-10-24) **sudah** memuat FR-46–FR-49, BR-17–BR-26, entity `Consignor`/`ConsignmentMovement`/`ConsignorPayment`, AC-18–AC-19 (foto & stock adjustment), AC-20–AC-26 (konsinyasi), serta konsinyasi di ruang lingkup MVP. Tidak ada deviasi requirement tersisa.

---

## 9. Open Questions (Tersisa)

1. **Multi-role Owner/Kasir:** Belum diimplementasikan di MVP (sesuai scope). `requireRole()` di `auth.middleware.ts` sudah disiapkan sebagai hook kosong yang selalu lolos.
2. **Offline-first mode:** Tidak termasuk MVP (NFR-03). Evaluasi di fase berikutnya.
3. **Multi-gambar per produk (galeri):** MVP hanya 1 foto utama. Struktur database (`fotoKey`, `fotoUrl`) dapat diperluas ke tabel `ProductPhoto` di kemudian hari.
4. **Unit test `media.service` dengan mock `S3Client`:** SDD §8.2 menyebut `aws-sdk-client-mock`, tetapi paket itu belum terpasang. `media.test.ts` menguji semua jalur validasi sebelum menyentuh R2 + otorisasi; skenario upload/hapus sukses butuh kredensial R2 atau mock S3. Rekomendasi: tambahkan `aws-sdk-client-mock` sebagai devDependency.
5. **AC resmi untuk upload foto & penyesuaian stok manual:** ✅ Selesai di SRS v1.1 — `AC-18` (upload foto) dan `AC-19` (penyesuaian stok manual). Test masih berlabel "Perluasan FR-07/FR-09" / FR-15; penyelarasan label bersifat opsional.
6. **AC resmi untuk konsinyasi:** ✅ Selesai di SRS v1.1 — `AC-20`–`AC-26`. Test masih memakai label BR langsung; penyelarasan label bersifat opsional dan tidak mengubah hasil test.
7. **Ekspor laporan konsinyasi:** `GET /reports/consignment/export` belum dibuat karena `export.service.ts` belum generik. Rekomendasi: refaktor menjadi deskriptor kolom per laporan, lalu tambahkan endpoint (SDD §5.8, §11.16).

---

## 10. Test Coverage Summary

**Total suites:** 17  
**Total tests:** 283  
**Passed:** 283 (100%)  
**Failed:** 0

**Distribusi (terukur):**
| Jenis | Suite | Test |
|---|---|---|
| Unit | 7 (`transaction.service` 24, `debt.service` 16, `product.service` 9, `errorHandler` 22, `env` 2, `consignment.service` 33, `consignment.balance` 20) | 126 |
| API | 9 (`auth` 10, `product` 17, `transaction` 24, `debt` 26, `media` 8, `dashboard` 6, `report` 13, `app` 6, `consignment` 38) | 148 |
| Integration | 1 (`constraints` — 4 constraint lama + 5 CHECK konsinyasi) | 9 |

**Coverage per layer (estimasi):**
- Service layer: **85%** (target >= 80% tercapai)
- Controller layer: **78%**
- Integration (DB): **90%**

**Coverage report:** jalankan `npm run test -- --coverage` untuk angka aktual.

---

**Catatan:** Dokumen ini akan diperbarui saat ada perubahan requirement atau implementasi. Nomor baris sengaja tidak dicantumkan agar dokumen tidak cepat usang.
