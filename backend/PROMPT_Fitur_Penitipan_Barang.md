# TUGAS: Tambah Fitur Penitipan Barang (Konsinyasi) di Backend Kendi's Market

## 0. Cara kerja
- Baca dulu seluruh codebase yang relevan (`prisma/schema.prisma`, `modules/product`, `modules/transaction`, `modules/debt`, `modules/report`, `modules/dashboard`, `utils/*`, `middlewares/*`, `tests/*`) dan `SDD_Backend_Kendis_Market.md` sebelum mengubah apa pun. Ikuti pola yang sudah ada, jangan memperkenalkan pola baru.
- Kerjakan **per tahap** (Tahap 1 → 2 → 3). Setelah setiap tahap selesai: jalankan `tsc --noEmit`, lint, dan seluruh test; laporkan ringkasan perubahan + asumsi yang diambil; **berhenti dan tunggu konfirmasi saya** sebelum lanjut.
- Jika ada ketidakjelasan kecil, ambil keputusan paling konservatif dan catat sebagai asumsi di laporan. Jangan berhenti hanya untuk bertanya hal sepele.
- Jangan mengerjakan apa pun yang tercantum di bagian "Di luar scope (Future Development)".

## 1. Konteks sistem (wajib diikuti)
Stack: Node.js, Express, TypeScript (strict), Zod, Prisma v6, PostgreSQL, JWT, Multer/Sharp/R2, Pino. Tanpa Docker.
Arsitektur: layered monolith. Tiap modul = `*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.schema.ts` di `src/modules/<nama>/`.

Aturan yang tidak boleh dilanggar:
- Business rule hanya di **service layer**. Controller tidak menentukan HTTP status; error dilempar sebagai turunan `AppError`/`BusinessRuleError` (422) dan dipetakan oleh `errorHandler`.
- Prisma Client dipakai **langsung di service** (tidak ada `*.repository.ts` per modul).
- Operasi multi-tabel wajib `prisma.$transaction(async (tx) => ...)`. Untuk race condition gunakan pengecekan ulang di dalam transaction dan/atau `SELECT ... FOR UPDATE` via `tx.$queryRaw` dengan `Prisma.sql` (bukan string concatenation).
- Uang selalu `Prisma.Decimal` di backend dan dikirim sebagai **string desimal 2 digit** lewat `utils/money.ts#decimalToString`. Jangan pakai float JS.
- Data historis **append-only**; transaksi tidak pernah di-DELETE, hanya void (`DIBATALKAN`).
- `DetailTransaction` menyimpan snapshot (`namaProdukSnapshot`, `hargaJualSnapshot`, `hargaModalSnapshot`); laba dihitung dari snapshot.
- Format response: `{ success, data, message }` dan `{ success:false, error:{ code, message, details } }`. Base path `/api/v1`. Pagination `?page=&limit=` (default 20).
- Migration: **jangan edit migration lama**; buat migration baru. `CHECK` constraint ditambahkan lewat raw SQL di file migration.
- Semua endpoint baru wajib melewati `auth.middleware` + `validate(schema)` Zod.

## 2. Deskripsi fitur
Pemilik toko menerima barang titipan dari pihak ketiga (penitip), memasukkannya ke aplikasi, dan menjualnya lewat kasir seperti produk biasa. **Modal barang titipan baru dianggap terjadi saat barang terjual**, sebesar `jumlah terjual × harga setor per unit`. Pemilik membayar penitip belakangan (setoran); aplikasi mencatat kewajiban, total yang sudah disetor, dan sisa saldo per penitip. Barang titipan yang tak laku dapat dikembalikan ke penitip.

Keputusan desain (final):
1. Barang titipan = baris `Product` yang sama dengan produk biasa, dibedakan field `tipe`. Alur kasir/transaksi/void/stok **tidak dipisah**.
2. Untuk produk `TITIPAN`, `Product.hargaModal` berarti **harga setor per unit ke penitip**. Karena `hargaModalSnapshot` sudah ada, rumus laba (jual − modal) tidak berubah.
3. **Kewajiban ke penitip tidak disimpan** sebagai tabel akrual. Ia diturunkan: `SUM(jumlah × hargaModalSnapshot)` dari `DetailTransaction` pada transaksi `statusTransaksi = AKTIF` untuk produk milik penitip tersebut, dikurangi `SUM(ConsignorPayment.jumlahBayar)`. Dengan begitu void otomatis mengoreksi kewajiban.
4. Kewajiban timbul saat barang terjual, terlepas dari status pembayaran pembeli (LUNAS atau UTANG).
5. Produk yang sama dari sumber berbeda = dua baris `Product` terpisah (modalnya beda). Tidak ada batch/FIFO.
6. Status ada di **dua level** (produk dan penitip), dan **saldo tidak bergantung pada status keduanya**: saldo dihitung dari semua transaksi `AKTIF` milik penitip, apa pun status produk maupun penitipnya.

## 3. Business rule baru
Nomori BR-A…BR-J sebagai BR baru dengan nomor lanjutan setelah BR-16 (atau nomor terakhir yang ada di SRS/SDD) saat menulis dokumentasi.

- **BR-A** Produk `TITIPAN` wajib punya `consignorId`; produk `MILIK_SENDIRI` harus `consignorId = null`. `tipe` dan `consignorId` **tidak dapat diubah** setelah produk dibuat.
- **BR-B** Pada produk `TITIPAN`, `hargaJual` harus ≥ `hargaModal` (harga setor). Jika tidak, tolak dengan `BUSINESS_RULE_VIOLATION`.
- **BR-C** Penerimaan titipan menambah stok; retur ke penitip mengurangi stok dan tidak boleh melebihi stok saat ini (BR-04 tetap berlaku). Keduanya dicatat append-only.
- **BR-D** Setoran: `jumlahBayar > 0` dan tidak boleh melebihi saldo kewajiban saat ini; dicek ulang di dalam transaction dengan locking per consignor. Jika saldo ≤ 0, setoran apa pun ditolak.
- **BR-E** Consignor tidak pernah dihapus jika sudah punya produk/riwayat. Penonaktifan:
  - a) `PATCH /consignors/:id/status` ke `NONAKTIF` hanya diizinkan jika SEMUA produk titipannya berstok 0. Produk yang masih `AKTIF` (stok 0) otomatis di-set `NONAKTIF` dalam transaction yang sama. Saldo kewajiban TIDAK harus 0. Pengecekan stok dilakukan ulang di dalam transaction (ada kemungkinan transaksi penjualan berjalan bersamaan).
  - b) Jika ada produk berstok > 0, tolak dengan `BUSINESS_RULE_VIOLATION` dan sertakan daftar produk + stok di `details`.
  - c) Mengaktifkan kembali consignor diizinkan kapan saja; produk TIDAK ikut aktif otomatis.
- **BR-F** Void transaksi boleh dilakukan walau menyebabkan saldo consignor negatif (berarti kelebihan setor). Saldo negatif ditampilkan apa adanya; void tidak diblokir.
- **BR-G** Consignor `NONAKTIF` tidak dapat dipakai membuat produk titipan baru, menerima titipan (`receipt`), atau mengaktifkan produk titipannya. **Setoran tetap diizinkan.**
- **BR-H** Produk `TITIPAN` hanya dapat di-set `NONAKTIF` jika stok = 0 (berlaku di `PATCH /products/:id/status`; produk `MILIK_SENDIRI` tidak terpengaruh). Produk `TITIPAN` hanya dapat di-set `AKTIF` jika consignor-nya `AKTIF`.
- **BR-I** `receipt` hanya untuk produk `TITIPAN` berstatus `AKTIF` milik consignor `AKTIF`.
- **BR-J** Produk titipan yang sudah punya riwayat transaksi tidak dapat di-hard-delete (BR-12 tetap berlaku).

Skenario nyata yang harus tertampung:
| Situasi | Alur |
|---|---|
| Produk diambil, diganti baru | Retur sisa stok sampai 0 → produk lama `NONAKTIF` → buat produk titipan baru atas penitip yang sama. Penitip tetap `AKTIF`. |
| Bawa produk yang sama lagi | Harga setor sama: `receipt` ke produk lama. Harga setor beda: buat produk baru, nonaktifkan yang lama. |
| Ambil sebagian | Retur sebagian; status tidak berubah. |
| Penitip berhenti | Retur semua stok → penitip `NONAKTIF` (produk ikut nonaktif otomatis). Setoran tetap dicatat sampai saldo lunas. |
| Penitip kembali menitip | Aktifkan penitip; aktifkan produk lama secara manual atau buat produk baru. |

---
# TAHAP 1 — Produk titipan, consignor, penerimaan, retur, dan penonaktifan

### 1.1 Skema Prisma (tambahkan; jangan ubah yang lama selain yang disebut)
```prisma
enum ProductType { MILIK_SENDIRI TITIPAN }
enum ConsignorStatus { AKTIF NONAKTIF }
enum ConsignmentMovementType { TERIMA RETUR }

model Consignor {
  id        String          @id @default(uuid())
  nama      String
  noHp      String?
  catatan   String?
  status    ConsignorStatus @default(AKTIF)
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  products  Product[]
  movements ConsignmentMovement[]
  // Tahap 2: payments ConsignorPayment[]

  @@index([status])
}

model ConsignmentMovement {
  id            String   @id @default(uuid())
  consignorId   String
  consignor     Consignor @relation(fields: [consignorId], references: [id])
  productId     String
  product       Product  @relation(fields: [productId], references: [id])
  tipe          ConsignmentMovementType
  jumlah        Int      // selalu positif; arah ditentukan oleh `tipe`
  stokSebelum   Int
  stokSesudah   Int
  catatan       String?
  dicatatOlehId String
  dicatatOleh   User     @relation(fields: [dicatatOlehId], references: [id])
  createdAt     DateTime @default(now())

  @@index([consignorId])
  @@index([productId])
}
```
Pada `Product` tambahkan: `tipe ProductType @default(MILIK_SENDIRI)`, `consignorId String?`, relasi `consignor Consignor?`, relasi `consignmentMovements ConsignmentMovement[]`, `@@index([tipe])`, `@@index([consignorId])`. Pada `User` tambahkan relasi balik `consignmentMovements`.

Migration: data lama otomatis `MILIK_SENDIRI`. Tambahkan CHECK via raw SQL:
- `Product`: `(tipe='TITIPAN' AND "consignorId" IS NOT NULL) OR (tipe='MILIK_SENDIRI' AND "consignorId" IS NULL)`
- `ConsignmentMovement`: `jumlah > 0`

### 1.2 Perubahan modul `product`
- `POST /products`: terima `tipe` (default `MILIK_SENDIRI`) dan `consignorId`; validasi Zod + BR-A, BR-B, BR-G di service.
- `PUT /products/:id`: tolak perubahan `tipe`/`consignorId`; BR-B tetap diperiksa saat `hargaJual`/`hargaModal` berubah pada produk titipan.
- `PATCH /products/:id/status`: terapkan BR-H untuk produk titipan.
- `DELETE /products/:id`: BR-J (perilaku BR-12 yang sudah ada tetap jalan).
- `GET /products`: tambah filter `tipe` dan `consignorId`. Response produk menyertakan `tipe` dan `consignor: { id, nama } | null`.
- Jangan ubah logika `transaction.service` kecuali ditemukan bug; **verifikasi lewat test** bahwa `hargaModalSnapshot` produk titipan terisi harga setor saat transaksi dibuat.

### 1.3 Modul baru `src/modules/consignment/` (routes, controller, service, schema)
| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/consignors` | List (filter `status`, search `nama`, pagination) |
| GET | `/consignors/:id` | Detail + ringkasan (jumlah produk titipan aktif, total stok titipan) |
| POST | `/consignors` | Tambah penitip |
| PUT | `/consignors/:id` | Ubah data penitip |
| PATCH | `/consignors/:id/status` | AKTIF/NONAKTIF sesuai BR-E |
| POST | `/consignment/receipts` | Terima titipan `{ productId, jumlah, catatan? }` → stok bertambah (BR-I) |
| POST | `/consignment/returns` | Retur ke penitip `{ productId, jumlah, catatan? }` → stok berkurang (BR-C) |
| GET | `/consignment/movements` | Riwayat (filter `consignorId`, `productId`, `tipe`, `startDate`, `endDate`, pagination) |

- Receipt dan return: satu `$transaction` (update stok produk + insert `ConsignmentMovement` dengan `stokSebelum/stokSesudah`). Produk harus bertipe `TITIPAN`; `consignorId` pada movement diambil dari produk, bukan dari input client. Validasi stok untuk retur dilakukan ulang di dalam transaction.
- Error class baru (turunan `BusinessRuleError`, status 422): `ProductNotConsignmentError`, `ConsignorInactiveError`, `ConsignorHasStockError` (BR-E), `ProductHasStockError` (BR-H).
- Daftarkan router di `app.ts`; perbarui ringkasan endpoint.

### 1.4 Laporan (bagian modal & laba)
- `GET /reports/sales`: tambahkan breakdown `perTipe: { MILIK_SENDIRI: { omzet, profit }, TITIPAN: { omzet, profit } }` tanpa mengubah field lama (backward compatible). Gunakan snapshot `DetailTransaction` join `Product.tipe`, hanya transaksi `AKTIF`.

### 1.5 Test Tahap 1 (ikuti struktur `tests/unit|integration|api`)
- BR-A/B/C/E/G/H/I/J: tiap aturan punya minimal satu kasus lolos dan satu kasus ditolak.
- Receipt menambah stok; retur > stok ditolak; `tipe`/`consignorId` tidak bisa diubah.
- Transaksi atas produk titipan menghasilkan `hargaModalSnapshot` = harga setor dan laba benar; void mengembalikan stok.
- Nonaktifkan consignor dengan produk stok > 0 → ditolak (dengan `details`); semua stok 0 → sukses dan produk aktif ikut nonaktif.
- Nonaktifkan produk titipan berstok > 0 → ditolak; aktifkan produk titipan milik consignor NONAKTIF → ditolak.
- `receipt` ke produk NONAKTIF atau consignor NONAKTIF → ditolak.
- Breakdown laporan `perTipe` benar.

**⏸ Berhenti di sini, laporkan, tunggu konfirmasi.**

---
# TAHAP 2 — Setoran ke penitip & saldo

### 2.1 Skema
```prisma
model ConsignorPayment {
  id                String   @id @default(uuid())
  consignorId       String
  consignor         Consignor @relation(fields: [consignorId], references: [id])
  tanggalBayar      DateTime @default(now())
  jumlahBayar       Decimal  @db.Decimal(12, 2)
  saldoSetelahBayar Decimal  @db.Decimal(12, 2) // snapshot audit; boleh negatif jika terjadi void setelahnya
  catatan           String?
  dicatatOlehId     String
  dicatatOleh       User     @relation(fields: [dicatatOlehId], references: [id])
  createdAt         DateTime @default(now())

  @@index([consignorId])
}
```
Tambahkan relasi balik di `Consignor` (`payments`) dan `User`. CHECK: `jumlahBayar > 0`. Append-only: tidak ada endpoint edit/hapus setoran.

### 2.2 Endpoint (di modul `consignment`)
| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/consignors/:id/balance` | `{ totalTerjualModal, totalDisetor, saldo }` (all-time) |
| GET | `/consignors/:id/payments` | Riwayat setoran (pagination) |
| POST | `/consignors/:id/payments` | Catat setoran `{ jumlahBayar, catatan? }` |

- `totalTerjualModal` dihitung dengan `$queryRaw` + `Prisma.sql`: `SUM(d.jumlah * d."hargaModalSnapshot")` dari `DetailTransaction d` join `Transaction t` (`t."statusTransaksi" = 'AKTIF'`) join `Product p` (`p."consignorId" = $id`). Konversi hasil ke `Prisma.Decimal`. Tidak memfilter berdasarkan status produk atau consignor (aturan desain no. 6).
- `POST payments`: dalam `$transaction`, kunci baris consignor (`SELECT ... FOR UPDATE`), hitung ulang saldo, tolak jika `jumlahBayar > saldo` atau saldo ≤ 0 (BR-D), lalu insert `ConsignorPayment` dengan `saldoSetelahBayar`. Setoran tetap diizinkan untuk consignor `NONAKTIF` (BR-G).
- Error baru: `ConsignorOverpaymentError` (turunan `BusinessRuleError`). Pola dan test mengikuti modul `debt`.
- `GET /consignors`: tambah filter `punyaSaldo=true` (saldo ≠ 0) agar penitip nonaktif yang masih punya saldo tidak "hilang" dari daftar.

### 2.3 Laporan & dashboard
- `GET /reports/consignment?startDate=&endDate=`: per consignor → `terjualPeriode` (omzet), `modalPeriode` (kewajiban yang timbul di periode), `disetorPeriode`, `saldoAkhir` (all-time). Tambahkan ekspor `.../export?format=xlsx|pdf` hanya jika polanya mudah di-reuse dari ekspor yang sudah ada; jika tidak, laporkan sebagai saran, jangan dipaksakan.
- `GET /dashboard/summary`: tambahkan `totalKewajibanPenitip` = jumlah saldo positif SEMUA consignor, termasuk yang `NONAKTIF`. Field lama tidak boleh berubah.

### 2.4 Test Tahap 2
- Saldo benar setelah penjualan; void mengurangi saldo.
- Setoran > saldo ditolak; setoran saat saldo 0 ditolak.
- Dua setoran paralel tidak membuat saldo negatif (skenario concurrency seperti pada modul `debt`).
- Void setelah setoran membuat saldo negatif tetapi tidak diblokir (BR-F).
- Setoran ke consignor `NONAKTIF` yang masih punya saldo → sukses.
- Consignor `NONAKTIF` dengan saldo ≠ 0 muncul di filter `punyaSaldo=true` dan masuk `totalKewajibanPenitip`.
- Laporan `/reports/consignment` konsisten dengan `/consignors/:id/balance`.

**⏸ Berhenti di sini, laporkan, tunggu konfirmasi.**

---
# TAHAP 3 — Dokumentasi
Perbarui `SDD_Backend_Kendis_Market.md` (bahasa Indonesia, gaya yang sama dengan dokumen yang ada):
- §1.5: pindahkan "Modul konsinyasi" dari Out of Scope ke MVP. Tambahkan ke Out of Scope: "Penanganan barang titipan rusak/hilang/kedaluwarsa (penanggung kerugian dan dampaknya ke kewajiban penitip)".
- §2.4 & Lampiran A: tambah modul `consignment/`.
- §3: tambah sub-bagian Consignment (consignor, receipt/retur, setoran).
- §4.2–4.6: skema baru, relasi, constraint, index, dan daftar operasi atomik (receipt, retur, setoran, penonaktifan consignor).
- §5 & Lampiran C: endpoint baru serta perubahan pada `/products`, `/reports/sales`, `/dashboard/summary`.
- §7.4: error class baru.
- §10 Traceability: tambahkan baris untuk FR/BR baru (BR-A…BR-J diberi nomor lanjutan; FR baru dinomori lanjut setelah FR terakhir di SRS) beserta file test-nya.
- §11: tambah entri keputusan: (1) produk titipan satu tabel dengan produk biasa, (2) kewajiban diturunkan, bukan disimpan, (3) `hargaModal` = harga setor, (4) status dua level dan saldo independen dari status, (5) alternatif batch/FIFO ditolak beserta alasannya.
- Beri catatan bahwa SRS dan PRD perlu diselaraskan; jangan mengubah keduanya.

---
## Di luar scope (Future Development) — JANGAN dikerjakan
- **Barang titipan rusak/hilang/kedaluwarsa**: siapa yang menanggung kerugian (toko atau penitip) dan dampaknya ke kewajiban penitip. Untuk saat ini, koreksi stok memakai `PATCH /products/:id/stock-adjustment` dengan alasan, dan **tidak** mengubah kewajiban ke penitip (tidak ada penjualan, tidak ada modal timbul).
- Pembatalan/koreksi setoran yang salah input.
- Batch/FIFO dengan harga setor berbeda dalam satu produk.
- Pemantauan tanggal kedaluwarsa barang titipan.

## Definition of done
- [ ] `tsc --noEmit`, lint, dan seluruh test (lama + baru) hijau
- [ ] Migration baru valid dan bisa di-apply pada database yang sudah berisi data; data lama tetap `MILIK_SENDIRI`
- [ ] Tidak ada perubahan perilaku pada endpoint/laporan lama (hanya penambahan field)
- [ ] Tidak ada float JS untuk uang; tidak ada HTTP status di controller; tidak ada file `*.repository.ts` baru untuk modul domain
- [ ] Tidak ada fitur dari daftar Future Development yang ikut terimplementasi
- [ ] Laporan akhir tiap tahap berisi: daftar file diubah/dibuat, asumsi yang diambil, dan hal yang sengaja tidak dikerjakan
