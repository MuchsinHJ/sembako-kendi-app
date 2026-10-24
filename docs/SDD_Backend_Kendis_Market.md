# Software Design Document (SDD) — Backend
## Kendi's Market

**Versi:** 1.1 (revisi 2026-10-24 — penambahan Fitur Penitipan Barang/Konsinyasi)
**Diturunkan dari:** SRS Kendi's Market v1.1, PRD Kendi's Market — Revisi 4
**Komponen:** Backend Service (REST API)
**Tech Stack:** Node.js, Express, TypeScript, Zod, Prisma, PostgreSQL, JWT/Session, bcrypt, Sharp, Multer, AWS SDK for S3 (Cloudflare R2), Pino, CORS, express-rate-limit, dotenv

> **Catatan revisi 1.1.** Dokumen ini menambahkan modul **Konsinyasi (Penitipan Barang)** ke MVP beserta business rule baru **BR-17–BR-26** (diturunkan dari label BR-A…BR-J pada spesifikasi fitur) dan functional requirement baru **FR-46–FR-49**. Nomor FR/BR baru dipakai *lanjut* setelah nomor terakhir di SRS agar tidak bentrok. **SRS v1.1 dan PRD Revisi 4 sudah diselaraskan** dengan dokumen ini (FR-46–FR-49, BR-17–BR-26, AC-18–AC-26, entity konsinyasi, dan pemindahan konsinyasi ke MVP); lihat Bagian 11.16.

---

## 1. Pendahuluan

### 1.1 Tujuan Dokumen
Dokumen ini menjabarkan **desain teknis backend** sistem Kendi's Market: arsitektur, struktur modul, desain database, kontrak API, desain keamanan, error handling, strategi pengujian, dan rencana deployment. SDD ini menjadi acuan implementasi bagi developer backend agar seluruh functional requirement (FR) dan business rule (BR) pada SRS terealisasi secara konsisten pada level kode dan database.

### 1.2 Ruang Lingkup
Dokumen ini mencakup **sisi backend (server-side)** saja: REST API, business logic, akses database, autentikasi, keamanan, serta penyimpanan dan optimasi file gambar produk. Desain frontend/UI tidak dibahas di sini (lihat SRS bagian 8 — Interface Requirements). Ruang lingkup teknis meliputi seluruh modul MVP: Auth, User, Produk & Stok, Media/Upload Gambar, Transaksi, Void, Pelunasan Cicilan, Konsinyasi (Penitipan Barang), Dashboard, Laporan, dan Ekspor.

### 1.3 Acuan Dokumen
| Dokumen | Keterangan |
|---|---|
| PRD Kendi's Market — Revisi 4 | Kebutuhan bisnis, business rules (BR-01–BR-26), user stories (US-01–US-17), metrik sukses |
| SRS Kendi's Market v1.1 | Functional requirements (FR-01–FR-49), NFR, data requirements (termasuk field `foto_url` pada entity Produk, Bagian 7.2, serta entity konsinyasi pada Bagian 7.6–7.8), acceptance criteria (AC-01–AC-26) |
| Spesifikasi Fitur Penitipan Barang (Konsinyasi) | Business rule BR-A…BR-J (dinomori ulang **BR-17–BR-26** di dokumen ini), keputusan desain fitur, dan kontrak endpoint |

Setiap desain pada dokumen ini mereferensikan ID FR/BR/AC yang relevan dari SRS agar traceable (lihat Bagian 10). Sejak revisi SRS v1.1, ID **BR-17–BR-26**, **FR-46–FR-49**, dan **AC-20–AC-26** sudah menjadi bagian resmi SRS sehingga traceability dapat merujuk ID AC langsung; riwayat keputusan ada pada Bagian 11.16.

### 1.4 Definisi & Singkatan
| Istilah | Definisi |
|---|---|
| SDD | Software Design Document |
| FR / BR / AC | Functional Requirement / Business Rule / Acceptance Criteria (rujukan ke SRS) |
| JWT | JSON Web Token, untuk autentikasi stateless |
| ORM | Object-Relational Mapping (di sini: Prisma) |
| DTO | Data Transfer Object — bentuk data yang dipertukarkan lewat API |
| Soft delete | Penonaktifan data tanpa menghapus fisik dari database |
| Snapshot | Salinan nilai (harga) pada waktu tertentu yang tidak berubah meski data asal berubah |
| R2 / Cloudflare R2 | Layanan object storage dari Cloudflare, kompatibel dengan API S3, digunakan untuk menyimpan file gambar produk |
| S3-compatible | Object storage yang mengikuti protokol Amazon S3, sehingga dapat diakses dengan SDK yang sama (`@aws-sdk/client-s3`) walau providernya bukan AWS |
| Object key | Identitas unik sebuah file di dalam bucket object storage (setara "nama file" di R2) |
| Multer | Middleware Express untuk menerima file upload (`multipart/form-data`) |
| Sharp | Library pemrosesan gambar (resize, kompresi, konversi format) berbasis `libvips` |
| PM2 | Process manager Node.js untuk menjalankan, memonitor, dan me-restart aplikasi di server production |
| Konsinyasi / penitipan barang | Model bisnis di mana toko menjual barang milik pihak lain dan membayar pemiliknya setelah barang terjual |
| Consignor / penitip | Pihak ketiga yang menitipkan barang ke toko (`Consignor`) |
| Produk titipan | Baris `Product` dengan `tipe = TITIPAN`; `hargaModal` berarti harga setor per unit |
| Harga setor | Nilai yang harus dibayar toko ke penitip untuk setiap unit barang titipan yang terjual |
| Kewajiban penitip / saldo | Uang yang masih harus disetor toko ke penitip. **Diturunkan** (tidak disimpan) dari penjualan barang titipan dikurangi setoran yang sudah dicatat |
| Setoran | Pembayaran dari toko ke penitip (`ConsignorPayment`), append-only |

### 1.5 Scope MVP & Out of Scope
**Termasuk (MVP):**
- Auth (login, logout, refresh token / session)
- CRUD Produk & Kategori, manajemen stok, ambang batas stok minimum
- Upload & optimasi foto produk (Multer + Sharp + Cloudflare R2)
- Transaksi (Lunas/Utang), Void transaksi
- Pelunasan utang bertahap (cicilan)
- **Modul konsinyasi (produk titipan pihak ketiga):** data penitip, penerimaan & retur titipan, kewajiban/saldo per penitip, pencatatan setoran ke penitip, laporan konsinyasi
- Dashboard ringkasan
- Laporan penjualan, laporan utang, tren produk, laporan konsinyasi
- Ekspor laporan ke Excel/PDF (belum termasuk ekspor laporan konsinyasi — lihat catatan pada 5.8)

**Di luar scope (mengikuti PRD Future Development):**
- Multi-role/hak akses (Owner/Kasir)
- Penanganan barang titipan rusak/hilang/kedaluwarsa (siapa yang menanggung kerugian dan dampaknya ke kewajiban penitip)
- Pembatalan/koreksi setoran ke penitip yang salah input
- Batch/FIFO untuk produk titipan dengan harga setor berbeda dalam satu produk
- Pemantauan tanggal kedaluwarsa
- Integrasi pembayaran digital (QRIS/e-wallet)
- Mode offline-first / sinkronisasi multi-perangkat
- Multi-gambar per produk (galeri) — MVP hanya 1 foto utama per produk

---

## 2. Arsitektur Sistem Backend

### 2.1 Gambaran Arsitektur
Backend dibangun sebagai **monolithic REST API** menggunakan Node.js + Express + TypeScript, mengakses PostgreSQL melalui Prisma ORM, dan berkomunikasi dengan **Cloudflare R2** untuk penyimpanan file gambar produk. Pilihan monolith (bukan microservices) diambil karena skala MVP (satu toko, satu role pengguna) tidak membutuhkan kompleksitas layanan terdistribusi (lihat Bagian 11.6 untuk justifikasi).

```
┌─────────────┐   HTTPS/JSON multipart   ┌────────────────────────────┐
│  Mobile Web │ ───────────────────────▶ │        Express App        │
│  (Client)   │ ◀─────────────────────── │  (Node.js + TypeScript)   │
└─────────────┘                          │                            │
                                          │ Middleware → Router →      │
                                          │ Controller → Service →     │
                                          │ Repository (Prisma)        │
                                          └───────┬──────────────┬─────┘
                                                  │              │
                                                  ▼              ▼
                                        ┌──────────────────┐  ┌────────────────────┐
                                        │   PostgreSQL DB   │  │  Cloudflare R2      │
                                        │ (data transaksi,  │  │ (object storage:    │
                                        │  produk, dst.)    │  │  file foto produk)  │
                                        └──────────────────┘  └────────────────────┘
```

Alur upload gambar secara ringkas: client mengirim file via `multipart/form-data` → **Multer** menampung buffer di memori → **Sharp** melakukan resize/kompresi/konversi format → hasil akhir diunggah ke **Cloudflare R2** melalui `@aws-sdk/client-s3` → object key/URL hasil unggahan disimpan pada kolom `Product.fotoKey`/`fotoUrl` di PostgreSQL.

### 2.2 Arsitektur Layer
Backend menggunakan **layered architecture** dengan pemisahan tanggung jawab sebagai berikut. Seluruh kode ditulis dalam TypeScript dengan tipe eksplisit (interface/type) pada setiap boundary layer.

| Layer | Tanggung Jawab | Contoh |
|---|---|---|
| **Router** | Mendefinisikan endpoint, menghubungkan ke controller, menerapkan middleware per-route | `routes/product.routes.ts` |
| **Middleware** | Cross-cutting concerns: auth, validasi, rate limit, logging, error handling, upload file (Multer) | `middlewares/auth.middleware.ts`, `middlewares/upload.middleware.ts` |
| **Controller** | Menerima request, memanggil service, membentuk response HTTP | `controllers/product.controller.ts` |
| **Validation (Zod schema)** | Memvalidasi bentuk & tipe data request (body/query/params) | `validations/product.schema.ts` |
| **Service** | Business logic murni (business rules BR-01–BR-16), tidak tahu soal HTTP | `services/product.service.ts` |
| **Media Service** | Optimasi gambar (Sharp) & komunikasi dengan R2 (S3 client) | `services/media.service.ts` |
| **Repository (Prisma Client)** | Akses data ke PostgreSQL | `repositories/storage.repository.ts` (khusus object storage) |
| **Model (Prisma Schema)** | Definisi struktur tabel & relasi | `prisma/schema.prisma` |

**Catatan implementasi (keputusan konservatif):** hanya *object storage* yang dipisahkan ke layer repository (`repositories/storage.repository.ts`, mengimplementasikan `IObjectStorage` — lihat 2.5), karena di situlah pergantian provider paling mungkin terjadi. Untuk modul domain, **Prisma Client dipakai langsung di service layer** tanpa file `*.repository.ts` per modul: query Prisma sudah type-safe dan tipis, sehingga lapisan tambahan hanya menambah boilerplate tanpa manfaat yang jelas pada skala MVP ini (dan berpotensi menyembunyikan `$transaction` interaktif yang wajib dipakai untuk operasi multi-tabel di 4.6). Konsekuensinya, Lampiran A tidak memuat `product.repository.ts`; jika modul tumbuh dan butuh query yang dipakai ulang lintas service, ekstraksi repository dapat dilakukan tanpa mengubah kontrak API.

Alasan pemisahan Service dari Controller: business rule (mis. BR-04 stok tidak boleh negatif, BR-13 aturan void, BR-14 cicilan) harus dapat diuji (unit test) tanpa perlu menjalankan HTTP server. TypeScript memungkinkan setiap DTO (request/response) dan hasil Prisma Client didefinisikan sebagai `interface`/`type` eksplisit, sehingga kesalahan bentuk data antar layer dapat terdeteksi saat *compile time*, melengkapi validasi run-time dari Zod.

### 2.3 Alur Request

**Contoh 1 — Membuat transaksi** (`POST /transactions`):
```
Client
  → [express-rate-limit] cek batas request
  → [helmet, cors] header keamanan
  → [auth.middleware] verifikasi JWT/session → req.user
  → [validate(transactionSchema)] validasi body via Zod
  → transaction.controller.create()
      → transaction.service.createTransaction()
          → cek stok tiap item (BR-05)
          → hitung total (BR-07)
          → turunkan status pembayaran dari uangDiterima vs total (BR-08)
          → jalankan dalam DB transaction (Prisma $transaction):
              - insert Transaksi
              - insert Detail_Transaksi (snapshot harga, BR-10)
              - update stok Produk (BR-09, BR-04)
          → commit / rollback otomatis jika gagal (Bagian 7.6)
      ← DTO transaksi
  ← [error.middleware] (jika terjadi error di titik mana pun)
← Response JSON (Bagian 5.1)
```

**Contoh 2 — Upload foto produk** (`POST /products/:id/photo`):
```
Client (multipart/form-data, field "photo")
  → [express-rate-limit], [helmet, cors]
  → [auth.middleware] verifikasi JWT/session
  → [upload.middleware] Multer: terima file ke memory buffer, validasi mimetype (jpeg/png/webp) & ukuran maks (mis. 5MB)
  → product.controller.uploadPhoto()
      → media.service.processAndUpload(buffer, productId)
          → Sharp: resize (mis. max 1000px), kompresi, konversi ke format .webp
          → S3Client.putObject() ke bucket R2 dengan object key unik (mis. `products/{productId}/{uuid}.webp`)
          → hapus object lama di R2 jika produk sebelumnya sudah punya foto (mencegah file sampah/orphan)
      → product.service.updatePhotoReference(productId, { fotoKey, fotoUrl })
  → errorHandler (mis. INVALID_FILE_TYPE, FILE_TOO_LARGE, UPLOAD_FAILED)
← Response JSON berisi fotoUrl terbaru
```

### 2.4 Diagram Komponen
```
src/
 ├── config/          → koneksi DB, environment (Zod-validated), logger, konfigurasi S3 client (R2)
 ├── middlewares/      → auth, validate, rateLimiter, errorHandler, upload (Multer)
 ├── modules/
 │    ├── auth/
 │    ├── product/       → termasuk concern Product & Stock (3.4, 3.5)
 │    ├── media/        → image processing & R2 client wrapper
 │    ├── transaction/
 │    ├── debt/
 │    ├── consignment/   → penitip, penerimaan/retur titipan, saldo & setoran (3.14)
 │    ├── dashboard/
 │    └── report/
 ├── repositories/     → hanya wrapper object storage (storage.repository.ts)
 ├── types/            → shared TypeScript types/interfaces (DTO, Express Request augmentation)
 ├── utils/            → response helper, money formatter, date helper
 └── app.ts / server.ts
```
Setiap module (mis. `product/`) berisi: `*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.schema.ts`.

**Catatan modul `consignment/`:** modul ini memakai **dua prefix routing** (`/consignors` untuk data penitip, `/consignment` untuk penerimaan/retur/riwayat pergerakan) sehingga mengekspor dua router dari satu file `consignment.routes.ts`. Service-nya juga melayani sebagian kebutuhan laporan (`GET /reports/consignment`, 5.8) dan dashboard (`totalKewajibanPenitip`, 5.7), karena seluruh rumus kewajiban penitip dipusatkan di satu tempat agar tidak ada duplikasi perhitungan.

**Catatan modul `user/` dan `stock/`:** keduanya tidak dibuat sebagai direktori terpisah.
- `stock/` — sesuai 3.5, stok bukan modul routing; seluruh endpoint stok (`/products/low-stock`, `/products/:id/stock-threshold`, `/products/:id/stock-adjustment`) berada di modul `product/`, dan perubahan stok sebagai efek samping transaksi berada di `transaction.service.ts`.
- `user/` — MVP hanya punya satu akun yang dibuat lewat seed/admin, dan tidak ada endpoint profile atau ganti password di kontrak API (Bagian 5). Membuat modul kosong hanya menambah permukaan kode tanpa fitur; kebutuhan FR-05 akan ditambahkan bersama endpoint-nya pada fase berikutnya.

### 2.5 Prinsip Desain
- **Separation of Concerns** — HTTP, validasi, business logic, dan akses data dipisah per layer (2.2).
- **Fail fast & explicit validation** — seluruh input divalidasi dengan Zod sebelum menyentuh business logic.
- **Single source of truth untuk business rule** — seluruh BR diimplementasikan di Service layer, bukan di Controller atau di Frontend.
- **Atomicity untuk operasi multi-tabel** — operasi yang menyentuh lebih dari satu tabel (transaksi + stok, void + stok, cicilan + saldo) wajib dibungkus `prisma.$transaction()` (lihat 4.6, 7.6).
- **Stateless authentication** — JWT dipilih sebagai strategi default agar backend mudah di-scale horizontal tanpa shared session store (lihat 11.6).
- **Type safety end-to-end** — TypeScript `strict: true`; tipe data dari Prisma Client (auto-generated) dipakai konsisten hingga ke Controller & DTO response, mengurangi bug akibat *shape mismatch*.
- **Storage-agnostic media service** — `media.service.ts` mengakses R2 melalui interface `IObjectStorage` (bukan memanggil S3 client langsung dari service lain), sehingga jika provider storage berpindah di kemudian hari, cukup mengganti implementasi tanpa mengubah business logic modul lain.
- **Proses gambar sebelum penyimpanan, bukan sesudah** — optimasi (resize/kompresi) dilakukan di server sebelum file diunggah ke R2, agar ukuran file yang tersimpan sudah efisien dan biaya storage/bandwidth terkendali (selaras NFR-01).
- **Konsisten dengan BR & FR SRS** — setiap keputusan desain merujuk balik ke ID FR/BR agar tidak menyimpang dari kebutuhan bisnis yang sudah disepakati client.
- **Saldo/kewajiban diturunkan, bukan disimpan** — kewajiban ke penitip selalu dihitung dari data sumber (`DetailTransaction` + `ConsignorPayment`) alih-alih dipelihara sebagai kolom/tabel akrual, sehingga void dan koreksi otomatis ikut terkoreksi tanpa logika rekonsiliasi terpisah (lihat 3.14 & 11.12).

---

## 3. Desain Modul & Komponen

### 3.1 Config & Environment
- `config/env.ts` — memuat & memvalidasi environment variable dengan Zod, menghasilkan objek `env` yang **fully typed** (`z.infer<typeof envSchema>`) sehingga autocomplete & type-checking environment variable tersedia di seluruh kode. Aplikasi gagal start dengan pesan jelas jika ada variabel penting yang hilang/salah tipe.
- `config/db.ts` — instansiasi Prisma Client singleton untuk dipakai seluruh repository.
- `config/logger.ts` — instansiasi **Pino** logger, dikonfigurasi berbeda untuk `development` (pretty-print) dan `production` (JSON terstruktur untuk log aggregator), dengan `redact` untuk field sensitif (password hash, token, kredensial R2).
- `config/storage.ts` — instansiasi `S3Client` dari `@aws-sdk/client-s3`, dikonfigurasi dengan `endpoint` milik Cloudflare R2 (`https://<account-id>.r2.cloudflarestorage.com`), `region: "auto"`, dan kredensial R2 (Bagian 9.2). Diekspor sebagai singleton agar tidak membuat koneksi baru di setiap request.

### 3.2 Authentication
- Menangani: `POST /login`, `POST /refresh-token` atau perpanjangan session, `POST /logout`.
- Backend menyediakan dua strategi autentikasi yang dapat dipilih via konfigurasi (`AUTH_STRATEGY=jwt|session`), dengan implementasi default **JWT** (access token masa berlaku pendek + refresh token disimpan sebagai httpOnly cookie, di-hash dan disimpan di tabel `RefreshToken` agar dapat direvoke saat logout) karena lebih sederhana untuk deployment stateless. Strategi **session** (disimpan di PostgreSQL melalui tabel `Session`, dibaca via cookie `sid`) disiapkan sebagai alternatif jika di kemudian hari dibutuhkan revocation instan tanpa kompleksitas refresh-token rotation. Lihat justifikasi lengkap di 11.6.
- Password diverifikasi menggunakan **bcrypt** (`bcrypt.compare`).
- Referensi: FR-01–FR-05, NFR-05, NFR-06.

### 3.3 User
- CRUD terbatas (MVP: hanya self-profile & ganti password); pembuatan akun baru pada MVP dilakukan lewat seed/admin manual mengingat single-role dan skala satu toko.
- Referensi: BR-01, FR-05.

### 3.4 Product & Category
- CRUD produk dengan validasi Zod: `harga_jual > 0` (BR-03), `stok >= 0` (BR-04).
- Kategori disederhanakan sebagai field string pada MVP (bukan tabel terpisah) untuk mengurangi kompleksitas — dapat dinormalisasi ke tabel `Category` pada fase berikutnya jika jumlah kategori bertambah kompleks.
- Field foto produk terdiri dari `fotoKey` (object key di R2, untuk keperluan internal seperti penghapusan) dan `fotoUrl` (URL publik yang dikirim ke frontend) — lihat 4.2.
- Delete produk: cek relasi ke `DetailTransaksi` sebelum memutuskan hard delete vs soft delete (BR-12, FR-11, FR-12). Saat produk dihapus permanen (belum punya riwayat), object foto terkait di R2 turut dihapus oleh `media.service` agar tidak menyisakan file yatim (orphan file) di storage.
- Referensi: FR-06–FR-15.

### 3.5 Stock
- Bukan modul terpisah secara routing, tetapi *concern* yang ditangani bersama di `product.service.ts` dan `transaction.service.ts`, karena stok selalu berubah sebagai efek samping transaksi/void, bukan diubah bebas oleh user (kecuali penyesuaian manual dengan log alasan).
- Validasi ambang batas stok minimum (BR-15) dihitung saat query dashboard, bukan disimpan sebagai flag statis, agar selalu akurat terhadap stok terkini.
- Referensi: FR-13, FR-14, FR-15, BR-04, BR-15.

### 3.6 Media & Image Upload
Modul yang menangani seluruh siklus upload dan optimasi foto produk.

**Tanggung jawab:**
1. Menerima file dari client melalui **Multer** (disimpan sementara di memory buffer, **bukan** disk, agar tidak meninggalkan file sisa di server jika terjadi crash di tengah proses).
2. Validasi tipe file (whitelist MIME: `image/jpeg`, `image/png`, `image/webp`) dan ukuran maksimum (dikonfigurasi via `MAX_UPLOAD_SIZE_MB`, default 5MB) — ditolak sebelum diproses Sharp jika tidak sesuai.
3. Optimasi gambar dengan **Sharp**:
   - Resize ke lebar maksimum (mis. 1000px, mempertahankan aspect ratio) agar ukuran seragam dan tidak membebani bandwidth mobile client.
   - Kompresi kualitas (mis. `quality: 80`) dan konversi ke format **WebP** untuk ukuran file lebih kecil dengan kualitas visual yang setara dibanding JPEG/PNG asli.
   - (Opsional lanjutan) Membuat versi *thumbnail* tambahan (mis. 200px) untuk tampilan daftar produk, disimpan sebagai object terpisah di R2 — dapat ditambahkan bila performa daftar produk memerlukannya.
4. Mengunggah hasil ke **Cloudflare R2** memakai `@aws-sdk/client-s3` (`PutObjectCommand`), dengan object key terstruktur: `products/{productId}/{uuid}.webp`.
5. Menghapus object lama di R2 saat foto produk diganti atau produk dihapus permanen (`DeleteObjectCommand`), mencegah *orphan file*.
6. Mengembalikan `fotoKey` dan `fotoUrl` publik ke `product.service` untuk disimpan di database.

**Struktur:** `media.routes.ts` (di-mount di bawah `/products/:id/photo`), `media.controller.ts`, `media.service.ts` (business logic optimasi + storage), `repositories/storage.repository.ts` (wrapper tipis di atas `S3Client`, mengimplementasikan interface `IObjectStorage` — lihat 2.5), `media.schema.ts` (validasi tambahan di luar yang sudah ditangani Multer). Konfigurasi Multer (memory storage, `fileFilter` MIME, `limits.fileSize`/`files`) berada di `middlewares/upload.middleware.ts` dan dipakai ulang oleh route media, sehingga aturan ukuran/tipe file hanya didefinisikan di satu tempat.

Referensi: memperluas FR-07 (tambah produk) dan FR-09 (ubah produk) pada SRS, khususnya field `foto_url` pada entity Produk (SRS 7.2).

### 3.7 Transaction
- Modul inti sistem. Menangani pembuatan transaksi (Lunas/Utang) dan void.
- Seluruh operasi tulis (create, void) dibungkus `prisma.$transaction()` untuk menjamin konsistensi stok, detail transaksi, dan saldo utang (BR-09, BR-13).
- Aturan batas waktu void (BR-13) dihitung di service layer berdasarkan `createdAt` transaksi dibandingkan waktu server saat ini (bukan waktu client, untuk mencegah manipulasi).
- **Batas waktu void = 24 jam (rolling window)** sejak `createdAt`, bukan "hari kalender yang sama". Konstanta `VOID_WINDOW_HOURS = 24` di `transaction.service.ts`; perbandingan memakai `isWithinHoursWindow()` dari `utils/date.ts` yang menghitung selisih epoch (UTC), sehingga transaksi pukul 23.00 tanggal 24 masih dapat dibatalkan sampai pukul 23.00 tanggal 25 (lihat 11.10).
- Referensi: FR-16–FR-29.

### 3.8 Debt / Installment
- Menangani pencatatan pembayaran cicilan terhadap transaksi Utang (`PaymentHistory`).
- Validasi: jumlah bayar tidak boleh melebihi sisa saldo (BR-14, FR-33); dilakukan dalam DB transaction bersama update `sisaSaldoUtang` dan `statusPembayaran` pada tabel Transaksi agar tidak terjadi race condition saat dua pembayaran dicatat hampir bersamaan (lihat 4.6).
- Referensi: FR-30–FR-34.

### 3.9 Dashboard
- Endpoint agregasi read-only yang menggabungkan data dari Product, Transaction, dan Debt untuk satu response ringkas (menghindari client melakukan banyak request terpisah — selaras NFR-01 target waktu muat).
- Sejak revisi konsinyasi, ringkasan juga menyertakan `totalKewajibanPenitip` (jumlah saldo positif semua penitip) yang dihitung lewat service konsinyasi agar rumus kewajiban tidak terduplikasi (3.14).
- Referensi: FR-43–FR-45, FR-49.

### 3.10 Report & Trend
- Query agregasi berbasis rentang tanggal (`GROUP BY`, `SUM`) untuk omzet, profit, dan tren produk terlaris.
- `GET /reports/sales` mendapat breakdown `perTipe` (milik sendiri vs titipan) tanpa mengubah field lama (5.8).
- Laporan konsinyasi (`GET /reports/consignment`) logikanya berada di `consignment.service.ts` dan dipanggil dari controller report, agar seluruh rumus kewajiban penitip terpusat di satu modul (3.14).
- Ekspor Excel menggunakan **ExcelJS**, ekspor PDF menggunakan **PDFKit** (lihat Lampiran B). Ekspor laporan konsinyasi belum tersedia (5.8).
- Referensi: FR-35–FR-42, FR-46, FR-49.

### 3.11 Middleware
| Middleware | Fungsi |
|---|---|
| `helmet()` | Menetapkan HTTP security header (lihat 6) |
| `cors()` | Membatasi origin yang diizinkan mengakses API (6.5) |
| `express.json()` | Parsing body JSON |
| `multer()` | Parsing `multipart/form-data`, menyimpan file ke memory buffer dengan batas ukuran |
| `pino-http` | Request logging terstruktur, termasuk request ID |
| `express-rate-limit` | Membatasi jumlah request per IP/route (6.6), diterapkan lebih ketat pada endpoint upload |
| `auth.middleware` | Verifikasi JWT/session, melampirkan `req.user` (tipe augmentasi Express — lihat `types/express.d.ts`) |
| `validate(schema)` | Validasi `body`/`query`/`params` dengan Zod, generik untuk semua route |
| `errorHandler` | Middleware terakhir; menyeragamkan format error response, termasuk error khusus Multer dan S3/R2 (Bagian 7) |

### 3.12 Error Handling
Lihat Bagian 7 secara detail. Prinsip umum: setiap error (validasi, business rule, database, upload, tak terduga) melewati satu `errorHandler` terpusat sehingga format response konsisten dan tidak ada stack trace bocor ke client di production.

### 3.13 Utilities
- `utils/response.ts` — helper untuk membentuk response sukses/gagal yang konsisten (Bagian 5.1).
- `utils/money.ts` — format Rupiah untuk kebutuhan ekspor/label (BR-16).
- `utils/date.ts` — perhitungan rentang waktu dan hari kalender (mis. batas "hari ini"/"bulan berjalan" dashboard, rentang laporan) menggunakan **date-fns** + **date-fns-tz** agar konsisten dengan timezone `Asia/Jakarta`. Untuk void window BR-13 dipakai `isWithinHoursWindow(target, reference, hours)` — perbandingan berbasis selisih epoch, bebas zona waktu, karena batasnya berupa rolling window 24 jam dan bukan batas hari kalender.
- `utils/asyncHandler.ts` — wrapper agar error di fungsi `async` controller otomatis diteruskan ke `errorHandler` tanpa perlu `try/catch` berulang.
- `utils/objectKey.ts` — helper pembuatan object key R2 yang konsisten dan aman (`makeProductPhotoKey`), menambahkan UUID agar tidak collision.

### 3.14 Konsinyasi (Penitipan Barang)
> Ditempatkan di akhir Bagian 3 agar penomoran sub-bagian lain (3.1–3.13) yang sudah dirujuk dokumen lain tidak berubah. Secara alur baca, modul ini berdiri sejajar dengan Transaction (3.7) dan Debt (3.8).

Modul `src/modules/consignment/` menangani seluruh siklus barang titipan pihak ketiga: data penitip, penerimaan/retur barang, kewajiban (saldo) per penitip, dan setoran ke penitip.

**Prinsip inti.** Barang titipan **bukan** entitas terpisah — ia baris `Product` biasa dengan `tipe = TITIPAN` dan `consignorId` terisi. Alur kasir, transaksi, void, dan stok tidak dipisah. Untuk produk titipan, `Product.hargaModal` bermakna **harga setor per unit ke penitip**; karena `DetailTransaction` sudah menyimpan `hargaModalSnapshot`, rumus laba (jual − modal) tidak berubah dan laba produk titipan otomatis benar.

**Data penitip (Consignor).**
- CRUD: list (filter `status`, `search` nama, `punyaSaldo`, pagination), detail (+ ringkasan: jumlah produk titipan aktif & total stok titipan), tambah, ubah, ubah status.
- `Consignor` tidak pernah di-hard-delete; penonaktifan adalah satu-satunya "penghapusan" (BR-21).
- Status penitip (`AKTIF`/`NONAKTIF`) dan status produk (`AKTIF`/`NONAKTIF`) adalah **dua level terpisah**, dan **saldo tidak bergantung pada keduanya** (11.13).

**Penerimaan & retur titipan (ConsignmentMovement).**
- `POST /consignment/receipts` `{ productId, jumlah, catatan? }` — menambah stok produk titipan dan mencatat `ConsignmentMovement` bertipe `TERIMA` dengan `stokSebelum`/`stokSesudah`.
- `POST /consignment/returns` `{ productId, jumlah, catatan? }` — mengurangi stok dan mencatat `RETUR`; retur melebihi stok ditolak `StockExceededError` (BR-19).
- Keduanya append-only. `consignorId` pada movement **diambil dari produk**, bukan dari input client (mencegah movement tercatat atas penitip yang salah).
- `GET /consignment/movements` — riwayat dengan filter `consignorId`, `productId`, `tipe`, `startDate`, `endDate`, pagination.
- Retur **tidak** mensyaratkan produk/penitip `AKTIF`, karena retur justru dipakai untuk mengosongkan stok sebelum produk/penitip dinonaktifkan (skenario "penitip berhenti").
- Penerimaan mensyaratkan produk `TITIPAN` berstatus `AKTIF` milik penitip `AKTIF` (BR-25).

**Kewajiban/saldo penitip (diturunkan, tidak disimpan).**
```
saldo(consignor) = SUM(d.jumlah × d.hargaModalSnapshot)   -- DetailTransaction d
                                                          -- JOIN Transaction t (t.statusTransaksi = 'AKTIF')
                                                          -- JOIN Product p (p.consignorId = consignor)
                 − SUM(ConsignorPayment.jumlahBayar)      -- semua setoran penitip tsb
```
- Kewajiban **timbul saat barang terjual**, terlepas dari status pembayaran pembeli (LUNAS maupun UTANG), karena toko sudah menerima/mengakui penjualan (11.12).
- Karena diturunkan, **void otomatis mengoreksi kewajiban** tanpa logika tambahan (BR-22).
- Tidak memfilter status produk maupun status penitip (11.13).
- Perhitungan memakai `$queryRaw` + `Prisma.sql` (tagged template, bukan string concatenation) dan hasilnya dikonversi ke `Prisma.Decimal`; tidak ada float JS.
- Endpoint: `GET /consignors/:id/balance` → `{ consignorId, totalTerjualModal, totalDisetor, saldo }` (all-time, string desimal 2 digit).

**Setoran ke penitip (ConsignorPayment).**
- `POST /consignors/:id/payments` `{ jumlahBayar, catatan? }` — append-only, tidak ada endpoint edit/hapus (koreksi setoran salah input = Future Development).
- Di dalam `prisma.$transaction`: lock baris `Consignor` (`SELECT ... FOR UPDATE`), hitung ulang saldo, tolak bila `saldo ≤ 0` atau `jumlahBayar > saldo` (`ConsignorOverpaymentError`, BR-20), lalu insert `ConsignorPayment` beserta `saldoSetelahBayar` sebagai snapshot audit.
- Setoran **tetap diizinkan** untuk penitip `NONAKTIF` (BR-23) — penitip yang berhenti menitip tetap harus dibayar.
- `GET /consignors/:id/payments` — riwayat setoran (pagination, urut `tanggalBayar` terbaru).
- `saldoSetelahBayar` boleh menjadi baseline yang "basi" bila transaksi terkait di-void setelah setoran; itu memang disengaja (snapshot audit), dan saldo **aktual** tetap dihitung ulang dari sumber (BR-22).

**Perubahan pada modul `product`.**
- `POST /products` menerima `tipe` (default `MILIK_SENDIRI`) dan `consignorId`; divalidasi di Zod (bentuk) **dan** service (BR-17, BR-18, BR-23).
- `PUT /products/:id` **menolak** perubahan `tipe`/`consignorId` — ditolak di service dengan `422` agar pesannya jelas (bukan `400` tanpa penjelasan). `tipe`/`consignorId` tetap ada di schema hanya agar nilai yang tidak berubah dapat dikirim ulang oleh client lama.
- `PATCH /products/:id/status` menerapkan BR-24 untuk produk titipan.
- `DELETE /products/:id` — selain cek `DetailTransaction` (BR-12), kini juga mengecek `ConsignmentMovement` agar FK `ON DELETE RESTRICT` tidak muncul sebagai error 500 (BR-26).
- `GET /products` menerima filter `tipe` dan `consignorId`; response produk menyertakan `tipe` dan `consignor: { id, nama } | null`.

**Laporan & dashboard.**
- `GET /reports/sales` menambahkan `perTipe: { MILIK_SENDIRI: { omzet, profit }, TITIPAN: { omzet, profit } }` tanpa mengubah field lama (backward compatible), dihitung dari snapshot + join `Product.tipe`, hanya transaksi `AKTIF`.
- `GET /reports/consignment` — laporan konsinyasi per penitip dalam periode (lihat 5.8).
- `GET /dashboard/summary` menambahkan `totalKewajibanPenitip` = jumlah **saldo positif** seluruh penitip, termasuk yang `NONAKTIF` (lihat 5.7).

**Pemetaan business rule.** Label BR-A…BR-J pada spesifikasi fitur dipetakan ke nomor lanjutan SRS/SDD: BR-A→**BR-17**, BR-B→**BR-18**, BR-C→**BR-19**, BR-D→**BR-20**, BR-E→**BR-21**, BR-F→**BR-22**, BR-G→**BR-23**, BR-H→**BR-24**, BR-I→**BR-25**, BR-J→**BR-26**.

**Daftar business rule konsinyasi:**

| ID | Aturan |
|---|---|
| **BR-17** | Produk `TITIPAN` wajib punya `consignorId`; produk `MILIK_SENDIRI` wajib `consignorId = null`. `tipe` dan `consignorId` **tidak dapat diubah** setelah produk dibuat. |
| **BR-18** | Pada produk `TITIPAN`, `hargaJual` harus ≥ `hargaModal` (harga setor). Pelanggaran → `422 BUSINESS_RULE_VIOLATION`. |
| **BR-19** | Penerimaan titipan menambah stok; retur mengurangi stok dan tidak boleh melebihi stok saat ini (BR-04 tetap berlaku). Keduanya dicatat append-only. |
| **BR-20** | Setoran: `jumlahBayar > 0` dan tidak boleh melebihi saldo kewajiban saat itu; dicek ulang di dalam transaction dengan locking per `Consignor`. Bila saldo ≤ 0, setoran apa pun ditolak. |
| **BR-21** | Consignor tidak pernah dihapus bila sudah punya produk/riwayat. Penonaktifan hanya diizinkan bila **semua** produk titipannya berstok 0; produk yang masih `AKTIF` (stok 0) otomatis menjadi `NONAKTIF` dalam transaction yang sama. Saldo kewajiban **tidak** harus 0. Bila masih ada stok > 0 → tolak `422` dengan `details.products`. Mengaktifkan kembali diizinkan kapan saja; produk tidak ikut aktif otomatis. |
| **BR-22** | Void transaksi boleh dilakukan walau menyebabkan saldo consignor negatif (kelebihan setor). Saldo negatif ditampilkan apa adanya; void **tidak** diblokir. |
| **BR-23** | Consignor `NONAKTIF` tidak dapat dipakai membuat produk titipan baru, menerima titipan (`receipt`), atau mengaktifkan produk titipannya. **Setoran tetap diizinkan.** |
| **BR-24** | Produk `TITIPAN` hanya dapat di-set `NONAKTIF` bila stok = 0, dan hanya dapat di-set `AKTIF` bila consignor-nya `AKTIF`. Produk `MILIK_SENDIRI` tidak terpengaruh. |
| **BR-25** | `receipt` hanya untuk produk `TITIPAN` berstatus `AKTIF` milik consignor `AKTIF`. |
| **BR-26** | Produk titipan yang sudah punya riwayat transaksi **atau** riwayat penerimaan/retur tidak dapat di-hard-delete (BR-12 tetap berlaku). |

**Daftar functional requirement konsinyasi (penomoran lanjutan setelah FR-45):**

| ID | Requirement |
|---|---|
| **FR-46** | Owner dapat mengelola data penitip (tambah, ubah, lihat daftar/detail, aktif/nonaktif) dan membuat produk titipan yang terhubung ke penitip, termasuk filter produk berdasarkan tipe & penitip. |
| **FR-47** | Owner dapat mencatat penerimaan barang titipan (menambah stok) dan retur ke penitip (mengurangi stok), serta melihat riwayat pergerakannya. |
| **FR-48** | Owner dapat melihat kewajiban/saldo per penitip, mencatat setoran ke penitip, dan melihat riwayat setoran. |
| **FR-49** | Owner dapat melihat laporan konsinyasi per penitip untuk suatu periode dan total kewajiban penitip pada dashboard. |

Referensi: FR-46–FR-49, BR-17–BR-26.

---

## 4. Desain Database

### 4.1 Gambaran Database
Database: **PostgreSQL**, diakses melalui **Prisma ORM** (schema-first, migration otomatis). Skema dirancang agar seluruh riwayat (transaksi, pembayaran) bersifat **append-only** — tidak ada `UPDATE` yang menghapus jejak data lama (selaras BR-10, BR-13, BR-14). File gambar fisik disimpan di Cloudflare R2 — database hanya menyimpan referensi (key/URL) ke object tersebut.

### 4.2 Entity & Table
Skema Prisma yang menurunkan entity pada SRS Bagian 7:

```prisma
model User {
  id            String   @id @default(uuid())
  nama          String
  email         String   @unique
  passwordHash  String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  transactions  Transaction[]
  payments      PaymentHistory[]
  refreshTokens RefreshToken[]
  sessions      Session[] // dipakai jika AUTH_STRATEGY=session
  stockAdjustments StockAdjustment[]
  consignmentMovements ConsignmentMovement[] // konsinyasi
  consignorPayments    ConsignorPayment[]     // konsinyasi
}

model RefreshToken {
  id         String   @id @default(uuid())
  tokenHash  String   @unique
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  expiresAt  DateTime
  revokedAt  DateTime?
  createdAt  DateTime @default(now())
}

// tabel opsional, dipakai hanya jika AUTH_STRATEGY=session
model Session {
  id         String   @id @default(uuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  expiresAt  DateTime
  createdAt  DateTime @default(now())
}

model Product {
  id            String   @id @default(uuid())
  nama          String
  kategori      String
  // Untuk produk TITIPAN, hargaModal = harga setor per unit ke penitip (BR-18).
  hargaJual     Decimal  @db.Decimal(12, 2)
  hargaModal    Decimal  @db.Decimal(12, 2)
  stok          Int      @default(0)
  stokMinimum   Int      @default(0)
  status        ProductStatus @default(AKTIF)
  // BR-17: tipe & consignorId IMMUTABLE setelah produk dibuat.
  tipe          ProductType   @default(MILIK_SENDIRI)
  consignorId   String?
  consignor     Consignor?    @relation(fields: [consignorId], references: [id])
  fotoKey       String?  // object key di Cloudflare R2, mis. "products/{id}/{uuid}.webp"
  fotoUrl       String?  // URL publik hasil upload, dikirim ke frontend
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  detailTransaksi DetailTransaction[]
  stockAdjustments StockAdjustment[]
  consignmentMovements ConsignmentMovement[]

  @@index([status])
  @@index([kategori])
  @@index([tipe])
  @@index([consignorId])
}

enum ProductStatus {
  AKTIF
  NONAKTIF
}

enum ProductType {
  MILIK_SENDIRI
  TITIPAN
}

// ─────────────────────────────────────────────────────────────────────────────
// KONSINYASI (Penitipan Barang) — BR-17…BR-26
// ─────────────────────────────────────────────────────────────────────────────

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
  payments  ConsignorPayment[]

  @@index([status])
}

enum ConsignorStatus {
  AKTIF
  NONAKTIF
}

// Append-only. Mencatat penerimaan/retur barang titipan beserta jejak stok.
// `jumlah` selalu positif; arah ditentukan oleh `tipe`.
model ConsignmentMovement {
  id            String                  @id @default(uuid())
  consignorId   String                  // diambil dari produk, bukan input client
  consignor     Consignor               @relation(fields: [consignorId], references: [id])
  productId     String
  product       Product                 @relation(fields: [productId], references: [id])
  tipe          ConsignmentMovementType
  jumlah        Int
  stokSebelum   Int
  stokSesudah   Int
  catatan       String?
  dicatatOlehId String
  dicatatOleh   User                    @relation(fields: [dicatatOlehId], references: [id])
  createdAt     DateTime                @default(now())

  @@index([consignorId])
  @@index([productId])
  @@index([createdAt])
}

enum ConsignmentMovementType {
  TERIMA
  RETUR
}

// Setoran ke penitip. Append-only: tidak ada endpoint edit/hapus.
// `saldoSetelahBayar` adalah snapshot audit; saldo AKTUAL selalu diturunkan
// ulang dari sumber (BR-22) sehingga boleh tidak sama bila ada void menyusul.
model ConsignorPayment {
  id                String   @id @default(uuid())
  consignorId       String
  consignor         Consignor @relation(fields: [consignorId], references: [id])
  tanggalBayar      DateTime @default(now())
  jumlahBayar       Decimal  @db.Decimal(12, 2)
  saldoSetelahBayar Decimal  @db.Decimal(12, 2)
  catatan           String?
  dicatatOlehId     String
  dicatatOleh       User     @relation(fields: [dicatatOlehId], references: [id])
  createdAt         DateTime @default(now())

  @@index([consignorId])
}

model Transaction {
  id                 String   @id @default(uuid())
  tanggal            DateTime @default(now())
  total              Decimal  @db.Decimal(12, 2)
  uangDiterima       Decimal? @db.Decimal(12, 2)
  kembalian          Decimal? @db.Decimal(12, 2)
  statusPembayaran   PaymentStatus
  statusTransaksi    TransactionStatus @default(AKTIF)
  namaPembeli        String?
  noHpPembeli        String?
  sisaSaldoUtang     Decimal? @db.Decimal(12, 2)
  dibuatOlehId       String
  dibuatOleh         User     @relation(fields: [dibuatOlehId], references: [id])
  dibatalkanPada     DateTime?
  createdAt          DateTime @default(now())

  items              DetailTransaction[]
  payments           PaymentHistory[]

  @@index([statusTransaksi])
  @@index([statusPembayaran])
  @@index([tanggal])
}

enum PaymentStatus {
  LUNAS
  UTANG
}

enum TransactionStatus {
  AKTIF
  DIBATALKAN
}

// Catatan: `uangDiterima` dan `kembalian` nullable hanya untuk kompatibilitas
// data historis sebelum revisi ini. Untuk transaksi baru, `uangDiterima` selalu
// diisi dan `statusPembayaran` diturunkan oleh service layer:
//   uangDiterima >= total → LUNAS, kembalian = uangDiterima − total
//   uangDiterima <  total → UTANG, sisaSaldoUtang = total − uangDiterima

model DetailTransaction {
  id                  String   @id @default(uuid())
  transactionId       String
  transaction         Transaction @relation(fields: [transactionId], references: [id])
  productId           String
  product             Product  @relation(fields: [productId], references: [id])
  namaProdukSnapshot  String
  hargaJualSnapshot   Decimal  @db.Decimal(12, 2)
  hargaModalSnapshot  Decimal  @db.Decimal(12, 2)
  jumlah              Int
  subtotal            Decimal  @db.Decimal(12, 2)

  @@index([transactionId])
  @@index([productId])
}

model PaymentHistory {
  id                  String   @id @default(uuid())
  transactionId       String
  transaction         Transaction @relation(fields: [transactionId], references: [id])
  tanggalBayar        DateTime @default(now())
  jumlahBayar         Decimal  @db.Decimal(12, 2)
  saldoSetelahBayar   Decimal  @db.Decimal(12, 2)
  dicatatOlehId       String
  dicatatOleh         User     @relation(fields: [dicatatOlehId], references: [id])

  @@index([transactionId])
}

// Audit trail penyesuaian stok manual (PATCH /products/:id/stock-adjustment, 5.4).
// Append-only: setiap penyesuaian mencatat delta, alasan, dan stok sebelum/sesudah
// sehingga perubahan stok di luar transaksi tetap dapat ditelusuri (BR-04, FR-15).
model StockAdjustment {
  id            String   @id @default(uuid())
  productId     String
  product       Product  @relation(fields: [productId], references: [id])
  delta         Int      // positif = tambah, negatif = kurangi (tidak boleh 0)
  alasan        String   // wajib diisi untuk audit
  stokSebelum   Int
  stokSesudah   Int
  dicatatOlehId String
  dicatatOleh   User     @relation(fields: [dicatatOlehId], references: [id])
  createdAt     DateTime @default(now())

  @@index([productId])
}
```

### 4.3 Relasi
- `User (1) — (N) Transaction` — satu user dapat membuat banyak transaksi (audit trail, BR-01).
- `Transaction (1) — (N) DetailTransaction` — satu transaksi berisi satu atau lebih item (BR-06).
- `DetailTransaction (N) — (1) Product` — setiap detail merujuk produk asal, namun menyimpan snapshot nilai independen (BR-10).
- `Transaction (1) — (N) PaymentHistory` — khusus transaksi berstatus Utang; riwayat cicilan (BR-14).
- `User (1) — (N) RefreshToken` — mendukung multi-sesi & revocation saat logout.
- `User (1) — (N) Session` — relevan hanya jika strategi auth = session.
- `Product (1) — (N) StockAdjustment` — riwayat penyesuaian stok manual untuk audit (BR-04, FR-15).
- `User (1) — (N) StockAdjustment` — mencatat siapa yang melakukan penyesuaian.

**Konsinyasi (BR-17–BR-26):**
- `Consignor (1) — (N) Product` — satu penitip dapat menitipkan banyak produk; `Product.consignorId` **nullable** karena produk `MILIK_SENDIRI` tidak punya penitip. Relasi ditegakkan oleh CHECK constraint, bukan NOT NULL, agar kedua tipe produk hidup di satu tabel (11.11).
- `Consignor (1) — (N) ConsignmentMovement` dan `Product (1) — (N) ConsignmentMovement` — riwayat penerimaan/retur. `consignorId` didenormalisasi dari produk agar riwayat per penitip dapat di-query tanpa join.
- `Consignor (1) — (N) ConsignorPayment` — riwayat setoran ke penitip (append-only).
- `User (1) — (N) ConsignmentMovement` dan `User (1) — (N) ConsignorPayment` — siapa yang mencatat penerimaan/retur/setoran (audit trail).
- `DetailTransaction (N) — (1) Product` **tetap** menjadi satu-satunya sumber angka kewajiban: tidak ada tabel akrual terpisah, sehingga kewajiban penitip = agregasi `DetailTransaction` (transaksi `AKTIF`) − `ConsignorPayment` (11.12).
- Semua FK konsinyasi memakai `ON DELETE RESTRICT`: penitip/produk yang sudah punya riwayat tidak dapat dihapus fisik (BR-21, BR-26).

### 4.4 Constraint
| Constraint | Diterapkan di | Referensi |
|---|---|---|
| `hargaJual > 0` | Aplikasi (Zod) + `CHECK` constraint DB | BR-03 |
| `stok >= 0` | Aplikasi (Zod/service) + `CHECK` constraint DB | BR-04 |
| `jumlah > 0` pada `DetailTransaction` | Aplikasi (Zod) + `CHECK` constraint DB | BR-05 |
| `email` unik pada `User` | `@unique` Prisma | FR-01 |
| `uangDiterima >= 0`, `kembalian >= 0` | Aplikasi (Zod) + `CHECK` constraint DB | BR-07, BR-16 |
| `statusPembayaran`, `kembalian`, dan `sisaSaldoUtang` konsisten dengan `uangDiterima` vs `total` | Service layer (satu-satunya penulis field tersebut saat create) | BR-08 |
| `namaPembeli` wajib jika `statusPembayaran = UTANG` (`noHpPembeli` opsional) | Validasi service layer (tidak feasible sebagai DB constraint sederhana) | BR-08 |
| `jumlahBayar <= sisaSaldoUtang` saat insert | Validasi service layer dalam DB transaction | BR-14 |
| Produk dengan `DetailTransaction` terkait tidak dapat di-`DELETE`, hanya `UPDATE status = NONAKTIF` | Service layer (cek relasi sebelum delete) | BR-12 |
| Tipe file foto produk harus salah satu dari `jpeg/png/webp` | Multer `fileFilter` + validasi ulang di `media.service` | Perluasan FR-07/FR-09 |
| Ukuran file upload ≤ `MAX_UPLOAD_SIZE_MB` (default 5MB) | Multer `limits.fileSize` | Perluasan FR-07/FR-09, NFR-01 |
| Object R2 lama dihapus saat foto diganti/produk dihapus | `media.service` (dijalankan setelah update DB berhasil, lihat 7.6) | Kebersihan storage |

**Konsinyasi (BR-17–BR-26):**

| Constraint | Diterapkan di | Referensi |
|---|---|---|
| `(tipe = 'TITIPAN' AND consignorId IS NOT NULL) OR (tipe = 'MILIK_SENDIRI' AND consignorId IS NULL)` | Zod (400) + `CHECK` constraint DB `Product_tipe_consignor_check` | BR-17 |
| `tipe` & `consignorId` tidak berubah setelah produk dibuat | Service layer (menolak `422` bila nilainya berubah) | BR-17 |
| `hargaJual >= hargaModal` untuk produk `TITIPAN` | Service layer, dicek ulang saat `hargaJual`/`hargaModal` berubah | BR-18 |
| `jumlah > 0` pada `ConsignmentMovement` | Zod + `CHECK` constraint DB `ConsignmentMovement_jumlah_check` | BR-19 |
| `stokSesudah >= 0` pada `ConsignmentMovement` | `CHECK` constraint DB `ConsignmentMovement_stokSesudah_check` | BR-19, BR-04 |
| Retur tidak melebihi stok saat ini | Service layer, dicek ulang di dalam transaction + row lock | BR-19 |
| `jumlahBayar > 0` pada `ConsignorPayment` | Zod (400) + `CHECK` constraint DB `ConsignorPayment_jumlahBayar_check` | BR-20 |
| `jumlahBayar <= saldo` dan `saldo > 0` saat insert setoran | Service layer, dihitung ulang di dalam transaction + row lock `Consignor` (`FOR UPDATE`) | BR-20 |
| Penonaktifan consignor hanya jika semua produk titipannya berstok 0 | Service layer, dicek ulang di dalam transaction | BR-21 |
| Penerimaan hanya untuk produk `TITIPAN` `AKTIF` milik consignor `AKTIF` | Service layer, dicek ulang di dalam transaction | BR-25 |
| Produk `TITIPAN` hanya `NONAKTIF` bila stok 0; hanya `AKTIF` bila consignor `AKTIF` | Service layer | BR-24 |
| Produk titipan dengan riwayat transaksi/pergerakan tidak dapat di-hard-delete | Service layer (cek `DetailTransaction` & `ConsignmentMovement`) + FK `RESTRICT` | BR-26, BR-12 |
| Penitip tidak pernah dihapus bila sudah punya produk/riwayat | FK `RESTRICT` pada `Product.consignorId`, `ConsignmentMovement.consignorId`, `ConsignorPayment.consignorId` | BR-21 |

Prisma migration menyertakan `CHECK` constraint tambahan via raw SQL (`ALTER TABLE ... ADD CONSTRAINT`) untuk aturan yang bisa ditegakkan di level DB, sebagai lapisan pertahanan kedua selain validasi aplikasi (defense in depth). Migration konsinyasi dibuat dalam dua berkas terpisah (`20261024_add_consignment_stage1`, `20261024_add_consignment_stage2`) dan keduanya **aditif**: kolom `Product.tipe` diberi `DEFAULT 'MILIK_SENDIRI'` sehingga seluruh baris lama otomatis menjadi produk milik sendiri tanpa perlu `UPDATE` manual.

### 4.5 Index
- `Product(status)`, `Product(kategori)` — mempercepat filter katalog aktif per kategori.
- `Transaction(statusTransaksi)`, `Transaction(statusPembayaran)`, `Transaction(tanggal)` — mempercepat query laporan per periode & status (FR-35, FR-37, NFR-01).
- `DetailTransaction(transactionId)`, `DetailTransaction(productId)` — mempercepat join saat menampilkan detail transaksi dan tren produk (FR-38).
- `PaymentHistory(transactionId)` — mempercepat query riwayat cicilan per transaksi (FR-37).
- `StockAdjustment(productId)` — mempercepat query riwayat penyesuaian stok per produk (FR-15).

**Konsinyasi (BR-17–BR-26):**
- `Product(tipe)`, `Product(consignorId)` — mempercepat filter katalog "hanya titipan" dan daftar produk per penitip (FR-46).
- `Consignor(status)` — mempercepat filter daftar penitip aktif/nonaktif (FR-46).
- `ConsignmentMovement(consignorId)`, `ConsignmentMovement(productId)`, `ConsignmentMovement(createdAt)` — mempercepat riwayat penerimaan/retur per penitip, per produk, dan filter periode (FR-47).
- `ConsignorPayment(consignorId)` — mempercepat riwayat setoran dan agregasi `SUM(jumlahBayar)` per penitip (FR-48).

> Agregasi kewajiban memakai join `DetailTransaction → Transaction → Product` dengan filter `Transaction.statusTransaksi` dan `Product.consignorId`; index yang sudah ada (`Transaction(statusTransaksi)`, `DetailTransaction(productId)`, `Product(consignorId)`) mencukupi pada skala UMKM. Bila data tumbuh, langkah berikutnya adalah index komposit `Product(consignorId, tipe)` atau tabel ringkasan — tetapi itu **belum** dilakukan karena bertentangan dengan prinsip "kewajiban diturunkan" (11.12).

### 4.6 Transaction / Atomicity
Operasi berikut **wajib** dibungkus `prisma.$transaction([...])` atau interactive transaction (`prisma.$transaction(async (tx) => {...})`):

| Operasi | Langkah yang harus atomik |
|---|---|
| Membuat transaksi baru | Insert `Transaction` (termasuk `uangDiterima`, `kembalian`, `statusPembayaran`, `sisaSaldoUtang` hasil turunan) + insert N `DetailTransaction` + update stok tiap `Product` (decrement) |
| Void transaksi | Update `Transaction.statusTransaksi = DIBATALKAN` + update stok tiap `Product` (increment kembali) |
| Mencatat pelunasan | Insert `PaymentHistory` + update `Transaction.sisaSaldoUtang` + kemungkinan update `Transaction.statusPembayaran = LUNAS` |
| **Menerima titipan (`receipt`)** | Lock baris `Product` (`SELECT ... FOR UPDATE`) + validasi tipe/status produk & status consignor + update `Product.stok` (increment) + insert `ConsignmentMovement` (`TERIMA`, `stokSebelum`/`stokSesudah`) |
| **Retur titipan** | Lock baris `Product` + validasi `stokSesudah >= 0` + update `Product.stok` (decrement) + insert `ConsignmentMovement` (`RETUR`, `stokSebelum`/`stokSesudah`) |
| **Mencatat setoran ke penitip** | Lock baris `Consignor` (`FOR UPDATE`) + hitung ulang saldo di dalam transaction + tolak bila `saldo ≤ 0` atau `jumlahBayar > saldo` + insert `ConsignorPayment` |
| **Menonaktifkan consignor** | Lock baris `Consignor` + cek ulang seluruh produk titipan `stok > 0` + update `Product.status = NONAKTIF` untuk produk titipan yang masih `AKTIF` (stok 0) + update `Consignor.status = NONAKTIF` |

Untuk kasus pelunasan, digunakan **row-level locking** (`SELECT ... FOR UPDATE` via `tx.$queryRaw` atau pengecekan ulang saldo di dalam transaction) untuk mencegah dua request pembayaran simultan menyebabkan saldo menjadi negatif (race condition) — lihat juga Bagian 7.6.

Pola yang sama dipakai untuk **setoran ke penitip (BR-20)**: baris `Consignor` di-lock, saldo dihitung ulang dari `DetailTransaction` + `ConsignorPayment` di dalam transaction, baru `ConsignorPayment` di-insert. Dengan begitu dua setoran paralel tidak mungkin sama-sama lolos dan membuat saldo negatif (diuji di `consignment.balance.test.ts` dengan pola `Promise.allSettled`, mengikuti `debt.service.test.ts`).

**Receipt/retur** juga memakai `FOR UPDATE` pada baris `Product` karena `stokSebelum`/`stokSesudah` dicatat sebagai jejak audit: tanpa lock, dua receipt paralel dapat menulis angka `stokSebelum` yang sama dan membuat riwayat tidak konsisten dengan stok akhir.

**Penonaktifan consignor** memakai lock pada baris `Consignor` untuk mencegah balapan dengan `receipt`/penjualan yang sedang berjalan — pengecekan "semua stok 0" dilakukan **di dalam** transaction, bukan sebelumnya.

Untuk modul Media, karena operasi melibatkan **dua sistem berbeda** (PostgreSQL dan R2, yang tidak bisa dibungkus dalam satu database transaction), urutan operasi dirancang agar tidak menyisakan state tidak konsisten:
1. Upload file baru ke R2 **terlebih dahulu** (belum menyentuh DB).
2. Jika upload sukses → update `Product.fotoKey`/`fotoUrl` di database.
3. Jika update DB sukses **dan** produk sebelumnya sudah punya foto lama → baru hapus object lama di R2.
4. Jika langkah manapun gagal, langkah berikutnya tidak dijalankan; jika upload sukses tapi update DB gagal, sistem mencatat log warning (object baru menjadi *orphan sementara*, dibersihkan lewat job berkala — lihat 7.6) — desain ini memprioritaskan **tidak pernah kehilangan foto yang sudah tersimpan**, dengan trade-off kemungkinan kecil object tak terpakai tertinggal di storage.

### 4.7 Migration & Seed
- Migration dikelola dengan `prisma migrate dev` (development) dan `prisma migrate deploy` (production/CI).
- Seed (`prisma/seed.ts`) menyediakan: 1 akun `User` awal (untuk MVP single-role), beberapa `Product` contoh, agar tim QA dapat langsung menguji tanpa setup manual.
- Setiap perubahan skema wajib disertai migration file baru (tidak pernah mengedit migration lama yang sudah di-apply ke lingkungan manapun).
- Fitur konsinyasi menambahkan dua migration **aditif** yang terpisah per tahap: `20261024_add_consignment_stage1` (enum `ProductType`/`ConsignorStatus`/`ConsignmentMovementType`; tabel `Consignor` & `ConsignmentMovement`; kolom `Product.tipe`/`Product.consignorId`; CHECK `Product_tipe_consignor_check`, `ConsignmentMovement_jumlah_check`, `ConsignmentMovement_stokSesudah_check`) dan `20261024_add_consignment_stage2` (tabel `ConsignorPayment`; CHECK `ConsignorPayment_jumlahBayar_check`). Data lama otomatis bernilai `tipe = MILIK_SENDIRI` lewat `DEFAULT` kolom, sehingga migration aman dijalankan pada database yang sudah berisi data.

---

## 5. Desain API & Kontrak Endpoint

### 5.1 API Conventions
- Base path: `/api/v1`
- Format: JSON, `Content-Type: application/json` (kecuali endpoint upload gambar yang menggunakan `multipart/form-data` khusus untuk request-nya; response tetap JSON).
- Autentikasi: header `Authorization: Bearer <access_token>` untuk seluruh endpoint kecuali `/auth/login` dan `/auth/refresh-token`.
- Format response sukses:
```json
{
  "success": true,
  "data": { },
  "message": "Optional human-readable message"
}
```
- Format response gagal (lihat detail Bagian 5.9 & 7):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Harga jual harus lebih dari 0",
    "details": [ { "field": "hargaJual", "issue": "must be > 0" } ]
  }
}
```
- Nilai uang (harga, total, kembalian, sisa saldo, omzet, profit) dikirim sebagai **string desimal** dengan 2 angka desimal, mis. `"75000.00"` — bukan `number`/float JS — untuk menghindari isu presisi pembulatan di sisi client. Konversi dilakukan terpusat lewat `utils/money.ts#decimalToString` dari `Prisma.Decimal`. Format tampilan Rupiah (BR-16) menjadi tanggung jawab frontend; backend mengirim nilai desimal mentah. Field uang yang memang nullable (`uangDiterima`, `kembalian`, `sisaSaldoUtang` pada transaksi LUNAS) dikirim sebagai `null`.
- Pagination: `?page=&limit=` untuk endpoint list (`GET /products`, `GET /transactions`, `GET /debts`), default `limit=20`.
- Health check: `GET /health` (di bawah base path, sehingga lengkapnya `/api/v1/health`) bersifat **publik** (tanpa autentikasi) dan dipakai load balancer/uptime monitor. Response: `{ success: true, data: { status: "ok", environment, timestamp }, message }`. Endpoint ini tidak memeriksa koneksi database secara aktif agar tidak menambah beban; kegagalan DB akan terlihat dari endpoint lain dan dari metrik log.

### 5.2 Authentication API
| Method | Endpoint | Deskripsi | Referensi |
|---|---|---|---|
| POST | `/auth/login` | Login dengan email & password, mengembalikan access token + set refresh token cookie | FR-01, FR-02 |
| POST | `/auth/refresh-token` | Menghasilkan access token baru dari refresh token cookie | FR-01 |
| POST | `/auth/logout` | Meng-invalidasi refresh token/session (revoke). **Wajib access token** yang valid, sebagaimana endpoint lain di luar login & refresh-token (5.1) | FR-04 |

### 5.3 Product API
| Method | Endpoint | Deskripsi | Referensi |
|---|---|---|---|
| GET | `/products` | List produk (filter: kategori, status, search nama, **`tipe`, `consignorId`**) | FR-06, FR-46 |
| GET | `/products/:id` | Detail satu produk (menyertakan `tipe` dan `consignor: { id, nama } \| null`) | FR-06, FR-46 |
| POST | `/products` | Tambah produk baru (tanpa foto; foto diunggah terpisah setelah produk dibuat). Menerima `tipe` (default `MILIK_SENDIRI`) dan `consignorId` | FR-07, FR-08, FR-46 |
| PUT | `/products/:id` | Ubah data produk (tidak memengaruhi transaksi lama). **Menolak perubahan `tipe`/`consignorId`** (`422`) | FR-09, FR-10, BR-17 |
| DELETE | `/products/:id` | Hard delete jika belum ada riwayat transaksi **maupun riwayat penerimaan/retur titipan**, selain itu ditolak dengan error `PRODUCT_HAS_TRANSACTION` | FR-11, FR-12, BR-12, BR-26 |
| PATCH | `/products/:id/status` | Mengubah status `AKTIF`/`NONAKTIF` (soft delete). Untuk produk `TITIPAN` berlaku BR-24 (hanya `NONAKTIF` bila stok 0; hanya `AKTIF` bila penitip `AKTIF`) | FR-12, BR-24 |
| PATCH | `/products/:id/stock-threshold` | Mengatur `stokMinimum` | FR-13 |
| POST | `/products/:id/photo` | Upload/ganti foto produk (`multipart/form-data`, field `photo`) — proses Multer → Sharp → R2 | Perluasan FR-07/FR-09 |
| DELETE | `/products/:id/photo` | Menghapus foto produk (object di R2 + kosongkan `fotoKey`/`fotoUrl`) | Perluasan FR-09 |

### 5.4 Stock API
| Method | Endpoint | Deskripsi | Referensi |
|---|---|---|---|
| GET | `/products/low-stock` | Daftar produk dengan stok ≤ `stokMinimum` | FR-14 |
| PATCH | `/products/:id/stock-adjustment` | Penyesuaian stok manual (mis. koreksi setelah stok opname), dengan alasan wajib diisi untuk audit | BR-04, FR-15 |

### 5.5 Transaction API
| Method | Endpoint | Deskripsi | Referensi |
|---|---|---|---|
| GET | `/transactions` | List riwayat transaksi (filter periode, status) | FR-24 |
| GET | `/transactions/:id` | Detail satu transaksi beserta item & riwayat pembayaran | FR-24 |
| POST | `/transactions` | Membuat transaksi baru; status Lunas/Utang diturunkan dari `uangDiterima` | FR-16–FR-23 |
| POST | `/transactions/:id/void` | Membatalkan transaksi (dalam batas waktu) | FR-25–FR-29 |

**Request body `POST /transactions`:**
```json
{
  "uangDiterima": 50000,
  "namaPembeli": "Ibu Siti",
  "noHpPembeli": "081234567890",
  "items": [{ "productId": "uuid", "jumlah": 2 }]
}
```

Aturan penurunan status pembayaran (diterapkan di `transaction.service.createTransaction` setelah total dihitung, semuanya dengan `Prisma.Decimal`):

| Kondisi | `statusPembayaran` | `kembalian` | `sisaSaldoUtang` | `namaPembeli` |
|---|---|---|---|---|
| `uangDiterima >= total` | `LUNAS` | `uangDiterima − total` | `null` | opsional |
| `uangDiterima < total` | `UTANG` | `null` | `total − uangDiterima` | **wajib** (BR-08) |

- `uangDiterima` adalah uang tunai yang diserahkan pembeli saat transaksi; nilainya disimpan apa adanya (termasuk kelebihan bayar) agar struk dapat menampilkan kembalian.
- Uang muka pada transaksi Utang disimpan pada kolom `Transaction.uangDiterima`/`sisaSaldoUtang`, **bukan** sebagai entri `PaymentHistory` pertama. Konsekuensi yang disengaja: transaksi Utang yang baru dibuat tetap dapat di-void dalam window 24 jam (BR-13), karena aturan "tidak boleh void jika sudah ada cicilan" hanya memeriksa `PaymentHistory`.
- Respons `POST/GET /transactions` menyertakan `uangDiterima` dan `kembalian` sebagai string desimal (atau `null`), konsisten dengan field uang lain (Bagian 5.1).

### 5.6 Debt API
| Method | Endpoint | Deskripsi | Referensi |
|---|---|---|---|
| GET | `/debts` | List transaksi berstatus Utang dengan sisa saldo > 0 | FR-37 |
| GET | `/debts/:transactionId/payments` | Riwayat cicilan satu transaksi | FR-31 |
| POST | `/debts/:transactionId/payments` | Mencatat pembayaran (penuh/cicilan) | FR-30–FR-34 |

### 5.7 Dashboard API
| Method | Endpoint | Deskripsi | Referensi |
|---|---|---|---|
| GET | `/dashboard/summary` | Omzet & profit periode berjalan, produk low-stock, total saldo utang, **total kewajiban penitip** | FR-43–FR-45, FR-49 |

Endpoint ini **tidak menerima query parameter**: "periode berjalan" didefinisikan tetap sebagai *hari ini* dan *bulan berjalan* menurut timezone `Asia/Jakarta`. Kebutuhan analisis rentang tanggal bebas dilayani oleh Report API (5.8).

**Field baru (revisi konsinyasi):** `totalKewajibanPenitip` — string desimal 2 digit berisi jumlah **saldo positif** seluruh penitip, termasuk yang `NONAKTIF`. Penitip yang saldonya negatif (kelebihan setor akibat void, BR-22) **tidak** mengurangi nilai ini, karena kewajiban bersifat per-penitip dan tidak saling hapus. Field lama (`hariIni`, `bulanBerjalan`, `produkLowStock`, `totalSaldoUtang`) tidak berubah.

### 5.8 Report API
| Method | Endpoint | Deskripsi | Referensi |
|---|---|---|---|
| GET | `/reports/sales?startDate=&endDate=` | Laporan omzet & profit per periode, **termasuk breakdown `perTipe`** | FR-35, FR-36, FR-39, FR-46 |
| GET | `/reports/debts?startDate=&endDate=` | Laporan utang per periode | FR-37 |
| GET | `/reports/product-trend?startDate=&endDate=` | Tren produk terlaris | FR-38 |
| GET | `/reports/consignment?startDate=&endDate=` | Laporan konsinyasi per penitip | FR-49 |
| GET | `/reports/sales/export?format=xlsx\|pdf&startDate=&endDate=` | Ekspor laporan penjualan | FR-40, FR-42 |
| GET | `/reports/debts/export?format=xlsx\|pdf&startDate=&endDate=` | Ekspor laporan utang | FR-41, FR-42 |

Nama parameter periode pada implementasi adalah **`startDate`/`endDate`** (format `YYYY-MM-DD`), bukan `start`/`end`. Ini mengikuti konvensi yang seragam dengan `GET /transactions` sehingga frontend memakai satu pola penamaan yang sama di semua endpoint berperiode.

**Perubahan `GET /reports/sales` (backward compatible).** Response mendapat field tambahan:

```json
"perTipe": {
  "MILIK_SENDIRI": { "omzet": "20000.00", "profit": "8000.00" },
  "TITIPAN":       { "omzet": "40000.00", "profit": "16000.00" }
}
```

Dihitung dari `DetailTransaction` (snapshot) yang di-join ke `Product.tipe`; hanya transaksi `AKTIF`. Total pada field lama (`omzet`, `profit`) tetap sama dengan jumlah kedua tipe, sehingga client lama tidak perlu berubah.

**`GET /reports/consignment` — struktur response:**
```json
{
  "success": true,
  "data": {
    "periode": { "start": "2026-10-01", "end": "2026-10-31" },
    "totalModalPeriode": "40000.00",
    "totalDisetorPeriode": "15000.00",
    "totalSaldoAkhir": "25000.00",
    "consignors": [
      {
        "consignorId": "uuid",
        "nama": "Ibu Sari",
        "status": "AKTIF",
        "terjualPeriode": "60000.00",
        "modalPeriode": "40000.00",
        "disetorPeriode": "15000.00",
        "saldoAkhir": "25000.00"
      }
    ]
  }
}
```

Definisi tiap kolom:
- `terjualPeriode` — omzet penjualan barang titipan penitip tersebut dalam periode (transaksi `AKTIF`).
- `modalPeriode` — kewajiban yang **timbul** dalam periode (`SUM(jumlah × hargaModalSnapshot)`).
- `disetorPeriode` — setoran yang **dicatat** dalam periode (`SUM(jumlahBayar)` berdasarkan `tanggalBayar`).
- `saldoAkhir` — saldo **all-time** (identik dengan `GET /consignors/:id/balance`), **bukan** saldo per akhir periode. Saldo per akhir periode tidak dapat dihitung tanpa snapshot harian; memilih all-time membuat laporan tetap dapat direkonsiliasi dengan endpoint saldo.

Semua penitip ditampilkan (termasuk `NONAKTIF` dan yang tidak punya transaksi di periode — barisnya bernilai `0.00`) agar saldo tidak "hilang" dari laporan.

**Ekspor laporan konsinyasi (belum diimplementasikan — saran, bukan komitmen).** `GET /reports/consignment/export?format=xlsx|pdf` **tidak** dibuat pada revisi ini. `export.service.ts` saat ini terikat kuat pada bentuk `SalesReportData`/`DebtsReportData` (template kolom & header spesifik per laporan), sehingga menambah laporan ketiga berarti menulis template baru — bukan reuse. Rekomendasi: kerjakan sebagai item terpisah, idealnya setelah `export.service.ts` direfaktor menjadi generik (mis. deskriptor kolom per laporan).

### 5.9 Error Response
Lihat format umum pada 5.1. Daftar `code` standar dijabarkan pada Bagian 7.1.

### 5.10 Consignment API
Seluruh endpoint memerlukan autentikasi (`auth.middleware`) dan validasi Zod (`validate(schema)`).

**Data penitip — prefix `/consignors`**

| Method | Endpoint | Deskripsi | Referensi |
|---|---|---|---|
| GET | `/consignors` | List penitip. Filter: `status`, `search` (nama), `punyaSaldo` (`true`/`false`), pagination `page`/`limit` | FR-46, BR-21 |
| GET | `/consignors/:id` | Detail penitip + `ringkasan` (`jumlahProdukTitipanAktif`, `totalStokTitipan`) | FR-46 |
| POST | `/consignors` | Tambah penitip `{ nama, noHp?, catatan? }` | FR-46 |
| PUT | `/consignors/:id` | Ubah data penitip `{ nama?, noHp?, catatan? }` | FR-46 |
| PATCH | `/consignors/:id/status` | Ubah status `AKTIF`/`NONAKTIF` sesuai BR-21 (menolak `422` + `details.products` bila masih ada stok) | FR-46, BR-21 |
| GET | `/consignors/:id/balance` | Saldo all-time `{ consignorId, totalTerjualModal, totalDisetor, saldo }` | FR-48, BR-20 |
| GET | `/consignors/:id/payments` | Riwayat setoran (pagination, urut `tanggalBayar` terbaru) | FR-48 |
| POST | `/consignors/:id/payments` | Catat setoran `{ jumlahBayar, catatan? }` → `201` | FR-48, BR-20, BR-23 |

Catatan `punyaSaldo`: filter ini ada karena saldo **diturunkan**, bukan kolom — tanpa filter, penitip `NONAKTIF` yang masih punya saldo mudah "hilang" dari daftar default. Implementasinya dua tahap (ambil id kandidat → hitung saldo → batasi `where.id IN (...)`) dan memakai arti **saldo ≠ 0** (termasuk saldo negatif akibat void, BR-22).

**Penerimaan, retur & pergerakan — prefix `/consignment`**

| Method | Endpoint | Deskripsi | Referensi |
|---|---|---|---|
| POST | `/consignment/receipts` | Terima titipan `{ productId, jumlah, catatan? }` → stok bertambah, `201` | FR-47, BR-19, BR-25 |
| POST | `/consignment/returns` | Retur ke penitip `{ productId, jumlah, catatan? }` → stok berkurang, `201` | FR-47, BR-19 |
| GET | `/consignment/movements` | Riwayat pergerakan. Filter: `consignorId`, `productId`, `tipe`, `startDate`, `endDate`, pagination | FR-47 |

**Contoh response `GET /consignors/:id/balance`:**
```json
{
  "success": true,
  "data": {
    "consignorId": "uuid",
    "totalTerjualModal": "20000.00",
    "totalDisetor": "12500.00",
    "saldo": "7500.00"
  }
}
```
Seluruh nilai uang berupa string desimal 2 digit (5.1), termasuk saat `saldo` bernilai negatif (mis. `"-20000.00"`).

**Contoh request `POST /consignors/:id/payments`:**
```json
{ "jumlahBayar": 12500, "catatan": "Setoran minggu ke-2" }
```
`jumlahBayar` harus `> 0` dengan maksimal 2 angka desimal (Zod, `400`); pelanggaran saldo ditolak `422 BUSINESS_RULE_VIOLATION` dengan pesan yang menyebut saldo saat ini.

---

## 6. Desain Keamanan

### 6.1 Authentication
- **JWT** dengan algoritma `HS256` sebagai strategi default, secret disimpan di environment variable (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`), tidak pernah di-hardcode.
- Access token: masa berlaku pendek (15 menit) — meminimalkan dampak jika token bocor.
- Refresh token: disimpan sebagai **httpOnly, secure, sameSite=strict cookie**, hash-nya disimpan di tabel `RefreshToken` agar dapat direvoke saat logout atau dicurigai bocor (FR-04).
- Strategi **session** (disimpan di tabel `Session` pada PostgreSQL) tersedia sebagai alternatif konfigurasi.

### 6.2 Password Security
- **bcrypt** dengan salt rounds ≥ 10 untuk hashing password (NFR-05).
- Password tidak pernah dikembalikan dalam response API mana pun (di-exclude eksplisit di setiap DTO).

### 6.3 Authorization
- MVP hanya memiliki satu role (`User`), sehingga otorisasi pada level backend cukup memastikan **request memiliki token/session valid** (authentication = authorization pada MVP ini). Struktur middleware (`requireRole()`) tetap disiapkan sebagai *hook* kosong agar mudah diperluas saat role Owner/Kasir ditambahkan pada fase berikutnya, tanpa perlu merombak seluruh routing.

### 6.4 Input Validation
- Seluruh `body`, `query`, dan `params` divalidasi dengan **Zod schema** sebelum mencapai controller/service, melalui middleware generik `validate(schema)`. Validasi mencerminkan business rule terukur: `hargaJual: z.number().positive()` (BR-03), `jumlah: z.number().int().positive()` (BR-05), dsb. Zod juga memvalidasi environment variables saat startup (3.1).
- Untuk file upload, validasi berlapis:
  1. **Multer `fileFilter`** — menolak file dengan MIME type di luar whitelist sebelum masuk memory.
  2. **Multer `limits.fileSize`** — menolak file yang melebihi batas ukuran sebelum diproses Sharp.
  3. **Validasi ulang di `media.service`** menggunakan Sharp `metadata()` untuk memastikan file benar-benar gambar valid (bukan sekadar file dengan ekstensi/MIME type dipalsukan) — mitigasi terhadap file berbahaya yang menyamar sebagai gambar.

### 6.5 CORS
- **cors** dikonfigurasi dengan whitelist origin eksplisit (bukan wildcard `*`) sesuai domain frontend produksi, dibaca dari environment variable `ALLOWED_ORIGINS`.
- `credentials: true` diaktifkan agar cookie refresh token/session dapat dikirim antar origin frontend-backend saat diperlukan.

### 6.6 Rate Limiting
- **express-rate-limit** diterapkan secara global (mis. 100 request/menit per IP) dan lebih ketat khusus pada `/auth/login` (mis. 5 percobaan/menit per IP) untuk mitigasi brute-force, serta pada `/products/:id/photo` (mis. 10 upload/menit per user) untuk mencegah penyalahgunaan kuota storage/bandwidth R2.
- Response saat limit tercapai menggunakan format error standar (5.1) dengan `code: "RATE_LIMIT_EXCEEDED"` dan HTTP status `429`.

### 6.7 SQL Injection / Data Protection
- Prisma menggunakan **parameterized query** secara default sehingga terlindungi dari SQL injection selama query raw (`$queryRaw`) dihindari kecuali benar-benar perlu (mis. row locking pada 4.6), dan jika digunakan, wajib memakai tagged template Prisma (`Prisma.sql`), bukan string concatenation.
- **helmet** mengaktifkan header keamanan standar (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, dsb.) untuk mitigasi kelas serangan umum.
- Data sensitif (password hash, refresh token, kredensial R2) tidak pernah di-log oleh Pino — dikonfigurasi `redact` path tertentu pada logger (3.1).
- Kredensial R2 (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) hanya berada di server, tidak pernah dikirim ke client; client hanya menerima `fotoUrl` publik hasil akhir. Bucket R2 dikonfigurasi public-read hanya untuk path yang dipublikasikan; operasi tulis/hapus hanya bisa dilakukan lewat backend dengan kredensial rahasia.
- Object key gambar dibuat dari UUID yang digenerate server (bukan dari nama file asli yang diunggah pengguna) untuk mencegah *path traversal* atau penimpaan file lain lewat nama file yang direkayasa.

---

## 7. Desain Error Handling & Resiliensi

### 7.1 Error Classification
| Kelas Error | `code` | HTTP Status |
|---|---|---|
| Validasi input gagal | `VALIDATION_ERROR` | 400 |
| Autentikasi gagal/token tidak valid | `UNAUTHORIZED` | 401 |
| Token/session valid tapi tidak berhak (reserved utk fase role berikutnya) | `FORBIDDEN` | 403 |
| Resource tidak ditemukan | `NOT_FOUND` | 404 |
| Pelanggaran business rule | `BUSINESS_RULE_VIOLATION` | 422 |
| Produk yang sudah punya riwayat transaksi tidak dapat dihapus (khusus `DELETE /products/:id`) | `PRODUCT_HAS_TRANSACTION` | 422 |
| Tipe file tidak didukung | `INVALID_FILE_TYPE` | 415 |
| Ukuran file melebihi batas | `FILE_TOO_LARGE` | 413 |
| Gagal mengunggah/menghapus file di object storage | `STORAGE_ERROR` | 502 |
| Rate limit terlampaui | `RATE_LIMIT_EXCEEDED` | 429 |
| Error database/tak terduga | `INTERNAL_SERVER_ERROR` | 500 |

### 7.2 HTTP Status Code
Seluruh controller **tidak boleh** melempar HTTP status langsung — status ditentukan oleh `errorHandler` berdasarkan jenis error yang dilempar dari service (mis. `class BusinessRuleError extends AppError`). Ini menjaga konsistensi lintas endpoint.

### 7.3 Validation Error
- Dihasilkan otomatis oleh middleware `validate(schema)` saat parsing Zod gagal; response memuat `details` berisi daftar field & pesan spesifik (format 5.1), agar frontend dapat menyorot field yang salah.
- Error dari Multer (mis. `MulterError` dengan `code: 'LIMIT_FILE_SIZE'`) ditangkap secara eksplisit di `errorHandler` dan dipetakan ke `FILE_TOO_LARGE`/`INVALID_FILE_TYPE` agar format response tetap konsisten dengan error lainnya. Pemetaan lengkapnya:

| Kondisi | `code` | HTTP Status |
|---|---|---|
| `fileFilter` menolak MIME (bukan `image/jpeg`/`png`/`webp`) → `InvalidFileTypeError` dari `upload.middleware` | `INVALID_FILE_TYPE` | 415 |
| `MulterError: LIMIT_FILE_SIZE` (melebihi `MAX_UPLOAD_SIZE_MB`) | `FILE_TOO_LARGE` | 413 |
| `MulterError: LIMIT_UNEXPECTED_FILE` / `LIMIT_FILE_COUNT` (field/jumlah file tidak sesuai) | `INVALID_FILE_TYPE` | 415 |
| `MulterError` lainnya (mis. `LIMIT_PART_COUNT`) | `VALIDATION_ERROR` | 400 |
- Referensi contoh: AC-01 (harga jual ≤ 0), AC-05 (nama/no HP kosong saat Utang).

### 7.4 Business Rule Error
- Dilempar dari **Service layer** (bukan Controller) sebagai instance khusus, mis. `StockExceededError`, `DebtOverpaymentError`, `VoidWindowExpiredError`, `ProductHasTransactionError`.
- Semua turunan `BusinessRuleError` memakai HTTP status `422`. Secara default `code`-nya `BUSINESS_RULE_VIOLATION`; `ProductHasTransactionError` mempersempit `code` menjadi `PRODUCT_HAS_TRANSACTION` (lihat 5.3 & 7.1) agar frontend dapat menampilkan pesan khusus untuk kasus hapus produk.

| Error | `code` | BR/FR terkait | AC terkait |
|---|---|---|---|
| `StockExceededError` | `BUSINESS_RULE_VIOLATION` | BR-05 | AC-04 |
| `MissingDebtorInfoError` | `BUSINESS_RULE_VIOLATION` | BR-08 | AC-05 |
| `VoidWindowExpiredError` | `BUSINESS_RULE_VIOLATION` | BR-13 | AC-08 |
| `DebtOverpaymentError` | `BUSINESS_RULE_VIOLATION` | BR-14 | AC-12 |
| `ProductHasTransactionError` | `PRODUCT_HAS_TRANSACTION` | BR-12, BR-26 | AC-02 |
| `ProductNotConsignmentError` | `BUSINESS_RULE_VIOLATION` | BR-19, BR-25 | AC-22 |
| `ConsignorInactiveError` | `BUSINESS_RULE_VIOLATION` | BR-23 | AC-25 |
| `ConsignorHasStockError` | `BUSINESS_RULE_VIOLATION` | BR-21 | AC-24 |
| `ProductHasStockError` | `BUSINESS_RULE_VIOLATION` | BR-24 | AC-24 |
| `ConsignorOverpaymentError` | `BUSINESS_RULE_VIOLATION` | BR-20 | AC-23 |

**Catatan konsinyasi (BR-17–BR-26).** Seluruh error di atas adalah turunan `BusinessRuleError` sehingga berstatus HTTP `422` dengan `code` default `BUSINESS_RULE_VIOLATION`; tidak ada `code` baru yang dipersempit (berbeda dari `ProductHasTransactionError`) agar frontend cukup membedakan lewat pesan dan `details`. `ConsignorHasStockError` menyertakan `details.products = [{ id, nama, stok }]` agar UI dapat menampilkan daftar produk yang masih berstok.

Aturan bisnis konsinyasi yang **tidak** punya error khusus (dilempar sebagai `BusinessRuleError` generik dengan pesan eksplisit): perubahan `tipe`/`consignorId` (BR-17), `hargaJual < hargaModal` pada produk titipan (BR-18), penerimaan ke produk nonaktif (BR-25), dan `jumlahBayar ≤ 0` di service (BR-20; Zod sudah menangkap lebih dulu untuk request HTTP).

### 7.5 Database Error
- Error dari Prisma (mis. `PrismaClientKnownRequestError` untuk unique constraint violation) ditangkap di `errorHandler`, dipetakan ke pesan yang aman ditampilkan ke user (tidak membocorkan detail query/skema), dan tetap dicatat lengkap di log Pino (level `error`) untuk keperluan debugging.

### 7.6 Transaction Failure / Rollback
- Seluruh operasi multi-tabel (Bagian 4.6) menggunakan Prisma interactive transaction. Jika terjadi error di tengah proses (mis. stok berubah antara pengecekan dan penulisan karena request paralel), seluruh perubahan di-**rollback otomatis** oleh Prisma dan error yang jelas dikembalikan ke client (mis. `StockExceededError` bukan error generik 500).
- Untuk skenario concurrent write pada saldo utang (dua pembayaran hampir bersamaan), digunakan pengecekan ulang saldo **di dalam** transaction (bukan hanya sebelum transaction dimulai) untuk mencegah *lost update*.
- Untuk modul Media, karena R2 dan PostgreSQL adalah dua sistem terpisah yang tidak dapat digabung dalam satu ACID transaction, kegagalan ditangani dengan pola **best-effort compensating action**: jika upload ke R2 gagal, tidak ada perubahan di database (dikembalikan sebagai `STORAGE_ERROR`); jika upload sukses tapi update database gagal, sistem mencatat log `error` berisi object key yang menjadi *orphan*, direkomendasikan job pembersihan berkala (mis. cron harian) yang menghapus object di R2 berumur > 24 jam yang tidak memiliki referensi `fotoKey` di tabel `Product` manapun.

---

## 8. Desain Pengujian

### 8.1 Testing Strategy
Pendekatan **testing pyramid**: unit test (porsi terbesar) → integration test → API/end-to-end test (porsi lebih kecil, fokus pada alur kritis). Test runner: **Jest** dengan `ts-jest` untuk mendukung TypeScript.

### 8.2 Unit Test
- Target: Service layer (business logic murni), karena di sinilah seluruh BR diimplementasikan.
- Contoh cakupan: perhitungan total transaksi (BR-07), validasi stok cukup (BR-05), perhitungan saldo setelah cicilan (BR-14), penentuan status soft/hard delete produk (BR-12).
- Dependency (Prisma) di-mock agar unit test tidak menyentuh database sungguhan.
- `media.service` diuji dengan **mock `S3Client`** (mis. `aws-sdk-client-mock`) agar unit test tidak benar-benar mengunggah file ke R2; fokus pengujian: Sharp dipanggil dengan parameter resize/kompresi yang benar, object key dibentuk sesuai pola yang ditentukan, dan urutan operasi pada 4.6/7.6 diikuti dengan benar termasuk pada skenario gagal di tengah proses.

> **Catatan implementasi (keputusan konservatif).** Pada repo saat ini unit test service (`transaction.service.test.ts`, `debt.service.test.ts`, `product.service.test.ts`) berjalan terhadap **database test sungguhan**, bukan Prisma yang di-mock. Alasannya: seluruh BR melibatkan `prisma.$transaction`, row lock, dan constraint DB — mem-mock Prisma justru menghapus bagian yang paling berisiko, dan test menjadi tidak membuktikan atomicity. Biaya yang diterima: unit test membutuhkan PostgreSQL aktif (lihat `tests/helpers/testUser.ts` + `jest.config.ts` `maxWorkers: 1`). Untuk `media.service`, `aws-sdk-client-mock` **belum terpasang** sehingga unit test dengan mock `S3Client` belum ada; `media.test.ts` saat ini menguji seluruh jalur validasi yang berhenti sebelum menyentuh R2 plus otorisasi. Menambahkan mock S3 tetap direkomendasikan (tercatat sebagai Open Question di `backend/docs/AUDIT.md` §9).

### 8.3 Integration Test
- Target: Service + Repository + database, menggunakan database PostgreSQL **test** terpisah (di-reset setiap run, mis. via `prisma migrate reset` pada environment `test`).
- Fokus pada skenario yang melibatkan atomicity (4.6): membuat transaksi memotong stok dengan benar, void mengembalikan stok dengan benar, dua pembayaran cicilan berurutan menghasilkan saldo akhir yang benar.
- Untuk modul Media, integration test menggunakan bucket R2 **staging/test** terpisah, atau emulator S3-compatible lokal (mis. MinIO) agar pengujian tidak bergantung pada koneksi internet/kuota R2 production.

### 8.4 API Test
- Menggunakan **Supertest** di atas Jest untuk menguji endpoint end-to-end (request HTTP asli ke Express app), termasuk middleware (auth, validasi, rate limit).
- Contoh: memastikan `POST /transactions` tanpa token mengembalikan 401; `POST /products` dengan `hargaJual: 0` mengembalikan 400 dengan `code: VALIDATION_ERROR`; `POST /products/:id/photo` menolak file `.pdf` dengan `415 INVALID_FILE_TYPE` dan menolak file di atas batas ukuran dengan `413 FILE_TOO_LARGE`.

### 8.5 Traceability ke Acceptance Criteria
Setiap skenario integration/API test **wajib** mereferensikan ID AC dari SRS Bagian 9 pada nama test-nya, contoh:
```ts
describe('AC-04: transaksi menolak jumlah melebihi stok', () => {
  it('should return 422 BUSINESS_RULE_VIOLATION when qty > stock', async () => { ... });
});
```
Untuk skenario upload foto produk dan penyesuaian stok manual, SRS v1.1 kini memuat **AC-18** (upload foto) dan **AC-19** (penyesuaian stok manual). Test yang sudah ada masih memakai label eksplisit, mis. `describe('Perluasan FR-07: upload foto produk')`; label tersebut dapat diselaraskan ke `AC-18`/`AC-19` tanpa mengubah perilaku test. Daftar lengkap pemetaan test ↔ AC dikelola pada Bagian 10 (Traceability Matrix).

Pola yang sama dipakai untuk **fitur konsinyasi**: SRS v1.1 sudah memuat **AC-20–AC-26** (satu per kelompok aturan konsinyasi), sementara test yang ada masih memakai label BR langsung, mis. `describe('BR-A: tipe produk dan consignorId')`, `describe('Saldo penitip (BR-D)')`, `describe('BR-F: void transaksi setelah setoran')`. Pemetaan AC ↔ BR untuk konsinyasi:

| AC (SRS v1.1) | Cakupan | BR |
|---|---|---|
| AC-20 | Pendaftaran penitip & produk titipan, tipe/penitip immutable | BR-17 |
| AC-21 | Harga jual produk titipan ≥ harga setor | BR-18 |
| AC-22 | Penerimaan & retur barang titipan | BR-19 |
| AC-23 | Saldo penitip & validasi setoran | BR-20 |
| AC-24 | Penonaktifan penitip & produk titipan | BR-21, BR-24 |
| AC-25 | Void setelah setoran & setoran pada penitip nonaktif | BR-22, BR-23 |
| AC-26 | Laporan konsinyasi & total kewajiban penitip | BR-21, BR-22 |

Karena perilaku tidak berubah, penyelarasan nama test ke ID AC dapat dikerjakan kapan saja sebagai perubahan label saja (tidak memengaruhi hasil test). Sampai saat itu, traceability tetap terjaga pada level BR/FR (`backend/docs/TRACEABILITY.md` §6A).

---

## 9. Deployment & Environment

### 9.1 Environment
Tiga environment: `development`, `test`, `production`, dibedakan lewat `NODE_ENV` dan file `.env` terpisah per environment (tidak pernah di-commit ke repository — lihat `.gitignore`). Build TypeScript (`tsc`) menghasilkan folder `dist/` yang dijalankan di production (`node dist/server.js`), sementara development memakai `ts-node-dev` untuk live-reload tanpa build manual berulang.

### 9.2 Environment Variables
| Variable | Deskripsi |
|---|---|
| `NODE_ENV` | `development` \| `test` \| `production` |
| `PORT` | Port HTTP server |
| `DATABASE_URL` | Connection string PostgreSQL (dipakai Prisma) |
| `AUTH_STRATEGY` | `jwt` (default) atau `session` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Secret signing token (jika `AUTH_STRATEGY=jwt`) |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Mis. `15m` / `7d` |
| `ALLOWED_ORIGINS` | Daftar origin frontend yang diizinkan CORS (comma-separated) |
| `BCRYPT_SALT_ROUNDS` | Mis. `10` (dipakai bersama oleh `auth.service`, `prisma/seed.ts`, dan `scripts/reset-password.ts`) |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | Konfigurasi express-rate-limit global (default `60000` / `100`) |
| `LOG_LEVEL` | Level Pino: `fatal`\|`error`\|`warn`\|`info`\|`debug`\|`trace`\|`silent`; default `debug` di development dan `info` di production |
| `R2_ACCOUNT_ID` | Account ID Cloudflare untuk endpoint R2 |
| `R2_ACCESS_KEY_ID` | Access key R2 (API token S3-compatible) |
| `R2_SECRET_ACCESS_KEY` | Secret key R2 |
| `R2_BUCKET_NAME` | Nama bucket tempat foto produk disimpan |
| `R2_PUBLIC_URL` | Base URL publik (custom domain/`r2.dev`) untuk mengakses object, dipakai membentuk `fotoUrl` |
| `MAX_UPLOAD_SIZE_MB` | Batas ukuran file upload (default `5`) |

Seluruh variabel di atas divalidasi dengan Zod saat startup (3.1) — aplikasi tidak akan berjalan jika ada yang hilang/tidak valid, untuk mencegah kesalahan konfigurasi lolos ke production secara diam-diam.

**Catatan `AUTH_STRATEGY=session`:** strategi session **tidak** memakai `express-session` maupun cookie bertanda tangan, sehingga tidak memerlukan `SESSION_SECRET`. Backend membuat ID sesi acak opaque, menyimpannya di tabel `Session`, dan mengirimkannya lewat cookie httpOnly `sid`; verifikasi dilakukan dengan lookup ke tabel tersebut (lihat 3.2). Contoh lengkap seluruh variabel tersedia pada `backend/.env.example`.

Versi Node.js dikunci pada `backend/.nvmrc` (Node 22) dan `engines` di `package.json` (`>=20.0.0`).

### 9.3 Database Deployment
- PostgreSQL dijalankan sebagai managed service (mis. Supabase/Neon/RDS) atau instance terpisah dari backend, agar data persisten dan dapat di-backup independen (NFR-07).
- Migration dijalankan via `prisma migrate deploy` sebagai bagian dari proses deploy (bukan `migrate dev`, yang hanya untuk lokal).
- Backup otomatis harian (NFR-07) dikonfigurasi pada level managed database service.

### 9.4 Backend Deployment
Backend dijalankan sebagai proses Node.js langsung di server (VPS/VM). Alur deployment:
1. Server menyiapkan Node.js versi yang sama dengan yang dipakai saat development (dikunci lewat field `engines` di `package.json` dan file `.nvmrc`, agar versi tidak meleset saat setup ulang server).
2. `git pull` (atau tarik artifact hasil CI) ke server.
3. `npm ci` — install dependency persis sesuai `package-lock.json`.
4. `npm run build` — menjalankan `tsc`, menghasilkan folder `dist/`.
5. `npm run migrate:deploy` — menjalankan `prisma migrate deploy`.
6. Proses dijalankan dengan **PM2** melalui `pm2 start dist/server.js --name kendis-market-api` — PM2 menyediakan auto-restart jika proses crash, log management, dan reload tanpa downtime (`pm2 reload`) saat ada deployment baru.
7. **Nginx** dipasang di depan sebagai reverse proxy, menangani TLS termination (HTTPS) dan meneruskan request ke proses Node.js yang didengarkan PM2 di port internal (mis. `localhost:3000`).

Karena tidak menggunakan container, environment server (versi Node, versi OS, library sistem yang dibutuhkan Sharp) perlu disiapkan konsisten antara server development/staging/production — dibantu `.nvmrc` dan dokumentasi setup server pada README proyek.

### 9.5 Production Configuration
- `helmet`, `cors` dengan whitelist ketat, `NODE_ENV=production` (menonaktifkan pesan error verbose/stack trace ke client — hanya log internal via Pino yang lengkap).
- Pino dikonfigurasi output JSON (bukan pretty-print) agar mudah diproses log aggregator (mis. Grafana Loki/ELK).
- Graceful shutdown: menutup koneksi Prisma (`prisma.$disconnect()`) saat menerima sinyal `SIGTERM`/`SIGINT` (diteruskan oleh PM2 saat `pm2 reload`/`pm2 stop`), agar request yang sedang berjalan (termasuk DB transaction) tidak terputus paksa.
- Bucket R2 dikonfigurasi dengan **lifecycle rule** (opsional) untuk membersihkan object yang tidak lagi direferensikan setelah periode tertentu, mendukung strategi pembersihan orphan file pada 7.6.

---

## 10. Traceability Matrix SDD ↔ SRS

| SRS FR/BR/AC | Modul Backend | Endpoint | Test Terkait |
|---|---|---|---|
| FR-01–FR-05, NFR-05, NFR-06 | Authentication (3.2) | `/auth/*` (5.2) | API: `auth.test.ts` (login, refresh, logout wajib token, brute-force 429, health publik); env: `env.test.ts` |
| FR-06–FR-15, BR-03, BR-04, BR-12, BR-15 | Product & Stock (3.4, 3.5) | `/products/*` (5.3, 5.4) | Unit: `product.service.test.ts`; API: `product.test.ts` (AC-01, AC-02, AC-03, AC-19, BR-04, BR-12) |
| Perluasan FR-07/FR-09 (field `foto_url`, SRS 7.2) | Media & Image Upload (3.6) | `POST/DELETE /products/:id/photo` (5.3) | API: `media.test.ts` (AC-18: 401/400/404/415, Sharp menolak berkas corrupt); unit test dengan mock S3 masih belum ada (lihat 8.2) |
| FR-16–FR-24, BR-05–BR-10 | Transaction (3.7) | `POST /transactions` (5.5) | Unit: `transaction.service.test.ts`; API: `transaction.test.ts` (AC-04, AC-05, AC-05a, AC-05b, AC-06, FR-20) |
| FR-25–FR-29, BR-13 | Transaction — Void (3.7) | `POST /transactions/:id/void` (5.5) | Unit: `transaction.service.test.ts` (AC-07, AC-08); API: AC-09 lewat `report.test.ts` |
| FR-30–FR-34, BR-14 | Debt/Installment (3.8) | `/debts/*` (5.6) | Unit: `debt.service.test.ts`; API: `debt.test.ts` (AC-10, AC-11, AC-12) |
| FR-43–FR-45, FR-49 | Dashboard (3.9) | `/dashboard/summary` (5.7) | API: `dashboard.test.ts` (AC-17, uang string, low-stock, total utang) |
| FR-35–FR-42, BR-11, BR-16 | Report & Trend (3.10) | `/reports/*` (5.8) | API: `report.test.ts` (AC-13–AC-16, ekspor xlsx/pdf) |
| FR-46, BR-17, BR-18, BR-21, BR-23, BR-24, BR-26 | Konsinyasi — data penitip & produk titipan (3.14) | `/consignors/*` (5.10), `POST/PUT/PATCH/DELETE /products/*` (5.3) | Unit: `consignment.service.test.ts` (BR-A/B/E/G/H/J + snapshot); API: `consignment.test.ts` (AC-20, AC-21, AC-24); Integration: `constraints.test.ts` (CHECK `Product_tipe_consignor_check`) |
| FR-47, BR-19, BR-25 | Konsinyasi — penerimaan & retur (3.14) | `/consignment/receipts`, `/consignment/returns`, `/consignment/movements` (5.10) | Unit: `consignment.service.test.ts` (BR-C/BR-I); API: `consignment.test.ts` (AC-22); Integration: `constraints.test.ts` (CHECK `ConsignmentMovement_jumlah_check`) |
| FR-48, BR-20, BR-22 | Konsinyasi — saldo & setoran (3.14) | `/consignors/:id/balance`, `/consignors/:id/payments` (5.10) | Unit: `consignment.balance.test.ts` (saldo, penolakan setoran, concurrency, BR-F void, filter `punyaSaldo`); API: `consignment.test.ts` (AC-23, AC-25); Integration: `constraints.test.ts` (CHECK `ConsignorPayment_jumlahBayar_check`) |
| FR-49 | Konsinyasi — laporan & dashboard (3.14) | `/reports/consignment` (5.8), `/dashboard/summary` (5.7) | Unit: `consignment.balance.test.ts` (konsistensi laporan ↔ saldo, `totalKewajibanPenitip`); API: `consignment.test.ts` (AC-26) |
| NFR-01, NFR-02 | Semua modul, termasuk optimasi gambar (3.6) yang menekan waktu muat katalog | — | Performance test |
| NFR-03, NFR-04 | Arsitektur (2.1) | — | — |
| NFR-08, NFR-09 | Frontend concern | — | — |

> Pemetaan lengkap per-FR/BR/AC ke file test dikelola di `backend/docs/TRACEABILITY.md`; ringkasan hasil ada di `backend/docs/AUDIT.md`.

---

## 11. Keputusan Desain & Alternatif

### 11.1 Single User Role
**Keputusan:** Backend hanya mengenal satu role (`User`) pada MVP, tanpa tabel `Role`/`Permission` terpisah.
**Alternatif dipertimbangkan:** Membangun sistem role/permission granular sejak awal (RBAC penuh).
**Alasan:** BR-01 dan skala penggunaan (satu toko) tidak membutuhkan kompleksitas RBAC saat ini; menambahkannya sekarang berisiko over-engineering dan memperlambat MVP. Struktur middleware (`requireRole()`, 6.3) disiapkan sebagai titik ekstensi agar migrasi ke multi-role di fase berikutnya tidak memerlukan perombakan arsitektur.

### 11.2 Soft Delete Product
**Keputusan:** Produk dengan riwayat transaksi tidak pernah di-`DELETE` dari database, hanya diubah `status = NONAKTIF`. Foto produk di R2 untuk produk yang di-soft-delete juga tidak dihapus, mengikuti prinsip yang sama — hanya dihapus jika produk benar-benar di-hard-delete.
**Alternatif dipertimbangkan:** Hard delete dengan `ON DELETE SET NULL` pada foreign key `DetailTransaction.productId`.
**Alasan:** BR-12 & BR-10 mensyaratkan riwayat transaksi tetap utuh dan dapat ditelusuri; `SET NULL` akan menghilangkan referensi produk asal meski snapshot nama/harga tetap ada, sehingga soft delete dipilih agar relasi tetap valid untuk kebutuhan audit di masa depan.

### 11.3 Transaction Void
**Keputusan:** Void mengubah status menjadi `DIBATALKAN` (bukan `DELETE`), dan hanya diizinkan dalam **24 jam** setelah transaksi dibuat (rolling window), dihitung di server dari `createdAt` (lihat 11.10).
**Alternatif dipertimbangkan:** Mengizinkan edit langsung pada transaksi yang sudah tersimpan.
**Alasan:** BR-13 secara eksplisit melarang data transaksi hilang dari riwayat; mengizinkan edit langsung berisiko merusak akurasi laporan historis (BR-10) dan mempersulit audit. Void dengan status eksplisit menjaga integritas data sekaligus tetap memberi jalan koreksi kesalahan input.

### 11.4 Price Snapshot
**Keputusan:** `DetailTransaction` menyimpan `namaProdukSnapshot`, `hargaJualSnapshot`, `hargaModalSnapshot` — duplikasi data dari `Product`.
**Alternatif dipertimbangkan:** Hanya menyimpan `productId` dan mengambil harga dari tabel `Product` saat menampilkan laporan.
**Alasan:** BR-10 secara eksplisit mensyaratkan perubahan harga tidak boleh memengaruhi transaksi lama. Tanpa snapshot, laporan historis akan berubah setiap kali harga produk diperbarui — bertentangan langsung dengan business rule ini. Duplikasi data diterima sebagai trade-off yang disengaja demi akurasi historis.

### 11.5 Debt Installment
**Keputusan:** Cicilan dicatat sebagai baris terpisah pada tabel `PaymentHistory` (append-only), bukan hanya field `sisaSaldoUtang` yang diupdate tanpa jejak.
**Alternatif dipertimbangkan:** Hanya menyimpan satu angka saldo yang di-update tiap pembayaran, tanpa riwayat detail.
**Alasan:** FR-31 dan BR-14 mensyaratkan setiap pembayaran dapat ditelusuri (tanggal, jumlah) — bukan hanya saldo akhir. Model append-only juga memudahkan audit jika terjadi perselisihan jumlah yang sudah dibayar pembeli.

### 11.6 Keputusan Teknologi
| Area | Pilihan | Alasan |
|---|---|---|
| Bahasa | TypeScript | Type safety end-to-end (2.5) mengurangi bug pada boundary antar layer dan antar tim (frontend-backend) yang mengonsumsi tipe DTO yang sama; sangat membantu pada domain dengan banyak field numerik/desimal (harga, stok, saldo) di mana kesalahan tipe berisiko tinggi secara bisnis. |
| Auth | **JWT (default)**, dengan **Session** sebagai strategi alternatif | JWT tetap stateless dan sederhana untuk skala satu toko; opsi session (disimpan di PostgreSQL, bukan Redis, agar tidak menambah infrastruktur) disediakan sebagai *fallback* jika kebutuhan revocation instan menjadi prioritas di kemudian hari. |
| ORM | Prisma | Type-safety pada schema, migration tooling bawaan yang matang, dan sintaks query yang ringkas mempercepat development; tipe hasil query di-generate otomatis, selaras dengan TypeScript. |
| Validasi | Zod | `z.infer<>` menghasilkan tipe statis langsung dari schema validasi, menghindari duplikasi definisi tipe; dipakai juga untuk validasi environment variable (3.1), tidak hanya request body. |
| Logging | Pino | Performa tinggi (logging asinkron) dan output JSON terstruktur cocok untuk kebutuhan observability produksi. |
| Password hashing | bcrypt | Pilihan yang matang dan teruji untuk skala aplikasi ini. |
| File upload handling | **Multer** (memory storage, bukan disk storage) | Memory storage dipilih agar file tidak pernah menyentuh disk backend sama sekali sebelum diteruskan ke Sharp lalu ke R2 — mengurangi permukaan serangan dan menyederhanakan deployment karena tidak ada file sementara yang perlu dibersihkan/di-secure di server. |
| Image processing | **Sharp** | Diminta eksplisit untuk optimasi ukuran gambar; performanya (berbasis `libvips`) jauh lebih cepat dari alternatif seperti Jimp, dan mendukung konversi ke WebP yang signifikan menekan ukuran file dibanding JPEG/PNG asli. |
| Object storage | **Cloudflare R2**, diakses via **AWS SDK for S3** (`@aws-sdk/client-s3`) | R2 kompatibel dengan protokol S3 sehingga dapat memakai SDK yang sudah matang dan banyak dipakai tanpa perlu SDK proprietary; R2 juga tidak mengenakan biaya *egress* untuk transfer keluar, relevan untuk katalog produk bergambar yang sering diakses dari sisi client. Alternatif yang dipertimbangkan: menyimpan file langsung di disk server (ditolak — tidak scalable, hilang saat server di-redeploy/restart) atau AWS S3 asli (secara teknis migrasi antar keduanya mudah karena API yang sama, R2 dipilih terutama karena biaya egress yang lebih rendah). |
| Deployment | Proses Node.js langsung, dikelola **PM2** (tanpa container) | Untuk skala MVP satu toko dengan satu backend service, kompleksitas containerization belum sepadan dengan manfaatnya. PM2 memberi auto-restart saat crash dan reload tanpa downtime — kebutuhan operasional paling mendasar — tanpa overhead mengelola image/container. Trade-off yang diterima: konsistensi environment antar server kini bergantung pada setup manual yang konsisten (dibantu `.nvmrc`), dan penambahan instance/scaling ke banyak server perlu disiapkan manual. |

### 11.7 Pemrosesan Gambar Sebelum Upload
**Keputusan:** Optimasi gambar (Sharp) dilakukan di server, sebelum file diunggah ke R2 — bukan mengunggah file asli lalu mengoptimasi belakangan (mis. lewat fitur transformasi gambar on-the-fly dari Cloudflare).
**Alternatif dipertimbangkan:** Mengandalkan fitur transformasi gambar on-the-fly dari Cloudflare (jika tersedia pada paket yang dipakai) yang memproses gambar saat diakses, bukan saat diunggah.
**Alasan:** Memproses di server saat upload memberi kontrol penuh atas ukuran file yang benar-benar tersimpan (menghemat kuota storage R2 sejak awal, bukan hanya menghemat bandwidth saat diakses), tidak bergantung pada fitur tambahan berbayar dari Cloudflare, dan hasil akhirnya konsisten terlepas dari perubahan kebijakan/paket Cloudflare di masa depan.

### 11.8 Format Output Gambar: WebP
**Keputusan:** Seluruh foto produk dikonversi ke format **WebP** setelah diproses Sharp, terlepas dari format asli yang diunggah pengguna (JPEG/PNG).
**Alternatif dipertimbangkan:** Mempertahankan format asli file yang diunggah pengguna.
**Alasan:** WebP secara konsisten menghasilkan ukuran file lebih kecil dibanding JPEG/PNG pada kualitas visual yang setara, langsung mendukung tujuan optimasi ukuran gambar serta NFR-01 (waktu muat halaman katalog produk pada koneksi mobile). Dukungan WebP sudah luas pada browser modern (selaras NFR-08).

### 11.9 Status Pembayaran Diturunkan dari Uang Diterima
**Keputusan:** Client **tidak** lagi mengirim `statusPembayaran`; client mengirim `uangDiterima` (uang tunai yang diserahkan pembeli) dan backend menurunkan `statusPembayaran`, `kembalian`, serta `sisaSaldoUtang` dari perbandingan dengan `total` (lihat 5.5).
**Alternatif dipertimbangkan:**
1. Tetap meminta client memilih `LUNAS`/`UTANG` secara eksplisit (desain awal SRS FR-20).
2. Menyimpan uang muka transaksi Utang sebagai entri `PaymentHistory` pertama.
3. Menurunkan status dari `uangDiterima` dan menyimpan uang muka pada kolom `Transaction` (**dipilih**).
**Alasan:** Pada praktik kasir, status lunas/utang bukan input terpisah melainkan konsekuensi dari uang yang diterima; menurunkannya menghilangkan kemungkinan data tidak konsisten (mis. status LUNAS dengan uang diterima kurang dari total). Opsi 2 ditolak karena akan mengunci transaksi dari void dalam window 24 jam (BR-13 menolak void bila sudah ada `PaymentHistory`), padahal koreksi salah input tetap dibutuhkan. Konsekuensi yang diterima: `uangDiterima`/`kembalian` bersifat nullable di DB demi data historis, dan UI tetap perlu menampilkan kedua nilai tersebut agar kasir dapat menyerahkan kembalian.

### 11.10 Batas Waktu Void: 24 Jam Rolling Window (Revisi 2026-10-24)
**Keputusan:** Batas waktu void (BR-13) adalah **24 jam sejak `createdAt`**, bukan "hari kalender yang sama". Implementasi: konstanta `VOID_WINDOW_HOURS = 24` di `transaction.service.ts` + helper `isWithinHoursWindow(target, reference, hours)` di `utils/date.ts` (selisih epoch, inklusif pada batas 24 jam).
**Alternatif dipertimbangkan:**
1. Hari kalender yang sama dalam zona `Asia/Jakarta` (`isSameCalendarDay`, implementasi sebelumnya).
2. Rolling window 24 jam dari `createdAt` (**dipilih**).
**Alasan:** Aturan "hari yang sama" menciptakan batas yang tidak seragam bagi kasir — transaksi pukul 23.59 hanya punya waktu koreksi ±1 menit, sedangkan transaksi pukul 00.01 punya hampir 24 jam. Rolling window 24 jam memberi jendela koreksi yang adil dan dapat diprediksi, serta mudah dikomunikasikan ke pengguna ("dapat dibatalkan maksimal 24 jam setelah transaksi"). Perhitungan memakai selisih epoch sehingga tidak terpengaruh zona waktu maupun pergantian hari; nilai `reference` yang lebih awal dari `createdAt` (waktu server mundur) ditolak.
**Dampak:** Pesan error `VoidWindowExpiredError` menjadi "maksimal 24 jam setelah transaksi dibuat"; test `transaction.service.test.ts` dan `transaction.test.ts` memverifikasi batas 24 jam (termasuk kasus 23 jam masih boleh, 25 jam ditolak). SRS v1.1 sudah menyelaraskan FR-25/BR-13/AC-07/AC-08 ke batas 24 jam, sehingga requirement, desain, dan implementasi identik.

### 11.11 Produk Titipan Memakai Tabel `Product` yang Sama
**Keputusan:** Barang titipan **tidak** dibuat sebagai tabel/entity terpisah. Ia baris `Product` biasa yang dibedakan oleh `tipe = TITIPAN` + `consignorId`, sehingga alur kasir, transaksi, void, dan stok **tidak dipisah** sama sekali.
**Alternatif dipertimbangkan:**
1. Tabel terpisah (`ConsignmentItem`) dengan alur transaksi sendiri.
2. Tabel `Product` yang sama dengan diskriminator `tipe` (**dipilih**).
**Alasan:** Tujuan bisnisnya adalah "menjual barang titipan lewat kasir seperti produk biasa". Memisahkan tabel memaksa menduplikasi seluruh alur transaksi/void/laporan/dashboard dan berisiko menghasilkan dua sumber kebenaran untuk stok dan omzet. Dengan satu tabel, `DetailTransaction` tetap menjadi satu-satunya sumber penjualan, snapshot harga tetap bekerja, dan laba produk titipan otomatis benar karena `hargaModalSnapshot` sudah ada. Trade-off yang diterima: `consignorId` harus **nullable** (produk milik sendiri tidak punya penitip), sehingga integritas relasi tipe↔penitip ditegakkan lewat CHECK constraint (4.4), bukan NOT NULL.

### 11.12 Kewajiban Penitip Diturunkan, Bukan Disimpan
**Keputusan:** Kewajiban ke penitip **tidak** punya tabel akrual/kolom saldo. Nilainya selalu diturunkan dari `SUM(d.jumlah × d.hargaModalSnapshot)` pada `DetailTransaction` milik produk penitip tersebut dengan `Transaction.statusTransaksi = 'AKTIF'`, dikurangi `SUM(ConsignorPayment.jumlahBayar)`.
**Alternatif dipertimbangkan:**
1. Tabel `ConsignorLedger` berisi baris akrual per penjualan, lalu saldo di-`UPDATE` setiap transaksi/void.
2. Kolom `Consignor.saldo` yang dipelihara secara imperatif.
3. Derivasi saat baca dari data sumber (**dipilih**).
**Alasan:** Kewajiban adalah fungsi langsung dari penjualan dan setoran; menyimpannya berarti menciptakan state turunan yang harus disinkronkan pada setiap kejadian (create transaksi, void, setoran) — empat jalur tulis yang semuanya bisa gagal/terlewat dan menghasilkan saldo yang menyimpang dari kenyataan. Dengan derivasi, **void otomatis mengoreksi kewajiban** tanpa kode tambahan (BR-22), dan tidak ada kemungkinan saldo "hantu" hasil bug rekonsiliasi. Biaya yang diterima: setiap pembacaan saldo menjalankan satu agregasi join; pada skala UMKM (ribuan baris) ini terukur dan ditopang index yang ada (4.5). Bila kelak volumenya naik, tabel ringkasan dapat ditambahkan sebagai cache — keputusan itu sengaja **tidak** diambil sekarang agar tidak mendahului kebutuhan.
**Konsekuensi terkait:** `ConsignorPayment.saldoSetelahBayar` disimpan sebagai **snapshot audit** (mencatat saldo saat setoran dicatat), bukan sumber kebenaran. Bila transaksi di-void setelah setoran, snapshot itu menjadi basi dan saldo aktual boleh negatif — keduanya konsisten dengan BR-22.

### 11.13 Status Dua Level & Saldo Independen dari Status
**Keputusan:** Status ada di **dua level terpisah** — `Product.status` (per produk) dan `Consignor.status` (per penitip) — dan **saldo/kewajiban tidak bergantung pada status keduanya**: saldo dihitung dari semua transaksi `AKTIF` milik penitip, apa pun status produk maupun penitipnya.
**Alternatif dipertimbangkan:**
1. Satu status yang diturunkan (penitip nonaktif otomatis membuat semua produknya nonaktif).
2. Dua status independen dengan saldo tetap dihitung tanpa filter status (**dipilih**).
**Alasan:** Skenario nyata membutuhkan keduanya terpisah: penitip bisa berhenti menitip (nonaktif) sementara beberapa produknya sudah tidak dijual, tetapi kewajiban atas penjualan lalu tetap harus dibayar. Menghitung saldo dengan filter status akan menghapus kewajiban historis hanya karena status berubah — kesalahan akuntansi. Konsekuensi yang diterima: UI harus menampilkan saldo penitip nonaktif, dan muncul kebutuhan filter `punyaSaldo` pada daftar penitip (5.10) agar penitip nonaktif bersaldo tidak "hilang".

### 11.14 `hargaModal` = Harga Setor untuk Produk Titipan
**Keputusan:** Untuk produk `TITIPAN`, `Product.hargaModal` bermakna **harga setor per unit ke penitip** — bukan harga beli dari pemasok. `DetailTransaction.hargaModalSnapshot` menyimpan nilai ini saat transaksi dibuat.
**Alternatif dipertimbangkan:**
1. Kolom baru `hargaSetor` khusus produk titipan, dan `hargaModal` tetap bermakna modal toko.
2. Memakai ulang `hargaModal` dengan makna berbeda menurut `tipe` (**dipilih**).
**Alasan:** Menambah kolom baru berarti menduplikasi field uang di semua jalur produk, snapshot, dan laporan, tanpa manfaat nyata: bagi toko, "modal" sebuah barang titipan **adalah** harga yang harus dibayar ke penitip. Dengan pemakaian ulang, rumus laba (`hargaJualSnapshot − hargaModalSnapshot`) dan laporan `perTipe` bekerja apa adanya, dan kewajiban penitip dapat dihitung dari kolom snapshot yang sudah ada. Trade-off yang diterima: makna `hargaModal` bergantung pada `tipe`, sehingga dokumentasi dan UI wajib memberi label "Harga setor" untuk produk titipan agar tidak disalahartikan.

### 11.15 Batch/FIFO Ditolak
**Keputusan:** Tidak ada konsep batch, lot, atau FIFO. Barang yang sama dari dua sumber/harga setor berbeda dicatat sebagai **dua baris `Product` terpisah**.
**Alternatif dipertimbangkan:**
1. Satu produk dengan riwayat harga setor berlapis (batch/FIFO) dan modal terjual dihitung per lapisan.
2. Satu produk per kombinasi sumber + harga setor (**dipilih**).
**Alasan:** Batch/FIFO menuntut entitas lot, alokasi pemotongan stok per lapisan, dan penentuan modal yang keluar per penjualan — kompleksitas besar untuk skenario UMKM di mana penitip yang sama biasanya menitipkan dengan harga setor yang stabil. Memisahkan baris `Product` membuat modal per penjualan **selalu eksak** karena setiap baris hanya punya satu harga setor, tanpa algoritma alokasi. Konsekuensi yang diterima: katalog bisa memuat beberapa baris dengan nama sama (dibedakan kategori/penitip/harga), dan owner perlu menonaktifkan produk lama secara manual saat harga setor berubah.

### 11.16 Penyelarasan SRS/PRD & Cakupan Ekspor Konsinyasi
**Keputusan:** SDD ini menjadi acuan implementasi fitur konsinyasi. Business rule baru dinomori **BR-17–BR-26** dan FR baru **FR-46–FR-49** sebagai penomoran lanjutan agar tidak bentrok dengan ID yang sudah dipakai SRS v1.0 — dan penomoran itu dipertahankan permanen pada SRS v1.1.
**Alasan & tindak lanjut:**
- SRS v1.0 hanya memuat FR-01–FR-45, BR-01–BR-16, dan AC-01–AC-17. Agar ID tidak bentrok, seluruh aturan konsinyasi dipetakan ke nomor lanjutan (lihat tabel pemetaan di 3.14 dan matriks di Bagian 10).
- **SRS sudah diselaraskan pada v1.1 (2026-10-24):** FR-46–FR-49 (§4.9), BR-17–BR-26 (§5), entity `Consignor`/`ConsignmentMovement`/`ConsignorPayment` + `Product.tipe`/`consignorId` (§7.2, §7.6–7.8), AC-18–AC-19 (foto produk & penyesuaian stok manual), dan AC-20–AC-26 (konsinyasi, §9.7–§9.8). Dengan begitu label test dapat memakai ID AC resmi seperti konvensi 8.5.
- **PRD sudah diselaraskan pada Revisi 4 (2026-10-24):** modul konsinyasi dipindahkan dari *Future Development* ke MVP, ditambah BR-17–BR-26, US-14–US-17, Flow 8–11, dan acceptance criteria tingkat produk; penanganan barang rusak/hilang/kedaluwarsa, koreksi/pembatalan setoran, serta batch/FIFO ditegaskan tetap di luar scope.
- Ekspor laporan konsinyasi (`/reports/consignment/export`) **belum** dibuat karena pola `export.service.ts` yang ada tidak dapat dipakai ulang tanpa menulis template baru (lihat 5.8). Ini dicatat sebagai *saran* (Future Development di PRD), bukan bagian dari penyelesaian fitur.

---

## Lampiran

### A. Struktur Folder Backend
```
kendis-market-backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── config/
│   │   ├── env.ts
│   │   ├── db.ts
│   │   ├── logger.ts
│   │   └── storage.ts            → konfigurasi S3Client untuk Cloudflare R2
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   ├── validate.middleware.ts
│   │   ├── rateLimiter.middleware.ts
│   │   ├── upload.middleware.ts  → konfigurasi Multer
│   │   └── errorHandler.middleware.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.schema.ts
│   │   ├── product/
│   │   │   ├── product.routes.ts
│   │   │   ├── product.controller.ts
│   │   │   ├── product.service.ts
│   │   │   └── product.schema.ts
│   │   ├── media/
│   │   │   ├── media.routes.ts
│   │   │   ├── media.controller.ts
│   │   │   ├── media.service.ts
│   │   │   └── media.schema.ts
│   │   ├── transaction/
│   │   ├── debt/
│   │   ├── consignment/
│   │   │   ├── consignment.routes.ts     → dua router: /consignors & /consignment
│   │   │   ├── consignment.controller.ts
│   │   │   ├── consignment.service.ts    → penitip, receipt/retur, saldo, setoran, laporan
│   │   │   └── consignment.schema.ts
│   │   ├── dashboard/
│   │   └── report/
│   ├── repositories/
│   │   └── storage.repository.ts   → wrapper S3Client (IObjectStorage)
│   ├── types/
│   │   ├── express.d.ts          (augmentasi Request: req.user)
│   │   └── dto.ts
│   ├── utils/
│   │   ├── response.ts
│   │   ├── money.ts
│   │   ├── date.ts
│   │   ├── asyncHandler.ts
│   │   ├── errors.ts
│   │   └── objectKey.ts
│   ├── app.ts
│   └── server.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── api/
├── dist/                          (hasil build tsc, di-generate, tidak di-commit)
├── .env.example
├── .nvmrc                          (mengunci versi Node.js di server)
├── tsconfig.json
├── ecosystem.config.js             (konfigurasi PM2: nama proses, env, jumlah instance)
└── package.json
```

### B. Dependency
**Dependency inti:**
| Package | Fungsi |
|---|---|
| `express` | Web framework / routing |
| `typescript` | Bahasa pengembangan (dev dependency, dikompilasi ke JS) |
| `zod` | Validasi schema (request & environment variable) |
| `@prisma/client`, `prisma` | ORM & migration untuk PostgreSQL |
| `jsonwebtoken` | JWT (strategi auth default) |
| `bcrypt` | Hashing password |
| `multer` | Menerima file upload (`multipart/form-data`) |
| `sharp` | Resize, kompresi, konversi format gambar |
| `@aws-sdk/client-s3` | Klien S3-compatible untuk komunikasi dengan Cloudflare R2 |
| `pino`, `pino-http` | Logging terstruktur |
| `cors` | Kontrol akses lintas origin |
| `helmet` | HTTP security header |
| `express-rate-limit` | Rate limiting |
| `dotenv` | Memuat environment variable dari file `.env` |

**Dependency pendukung:**
| Package | Fungsi |
|---|---|
| `@types/express`, `@types/multer`, `@types/bcrypt`, `@types/jsonwebtoken`, `@types/cors` | Definisi tipe TypeScript untuk masing-masing library |
| `ts-node-dev` | Live-reload saat development tanpa build manual berulang |
| `exceljs` | Ekspor laporan ke Excel |
| `pdfkit` | Ekspor laporan ke PDF |
| `date-fns` | Manipulasi tanggal (rentang laporan, cutoff void) |
| `uuid` (+ `@types/uuid`) | Generate UUID untuk primary key & object key R2 |
| `compression` | Kompresi response HTTP (gzip) |
| `aws-sdk-client-mock` (dev, **belum terpasang**) | Mock `S3Client` pada unit test — direkomendasikan ditambahkan agar `media.service` dapat diuji tanpa jaringan (lihat catatan §8.2) |
| `pm2` | Process manager di server production: auto-restart, log management, reload tanpa downtime |
| `jest`, `ts-jest`, `supertest`, `eslint`, `prettier` (dev) | Testing & konsistensi gaya kode |

### C. Ringkasan Endpoint
```
Health
  GET    /api/v1/health

Auth
  POST   /api/v1/auth/login
  POST   /api/v1/auth/refresh-token
  POST   /api/v1/auth/logout

Product
  GET    /api/v1/products
  GET    /api/v1/products/:id
  POST   /api/v1/products
  PUT    /api/v1/products/:id
  DELETE /api/v1/products/:id
  PATCH  /api/v1/products/:id/status
  PATCH  /api/v1/products/:id/stock-threshold
  GET    /api/v1/products/low-stock
  PATCH  /api/v1/products/:id/stock-adjustment
  POST   /api/v1/products/:id/photo
  DELETE /api/v1/products/:id/photo

Transaction
  GET    /api/v1/transactions
  GET    /api/v1/transactions/:id
  POST   /api/v1/transactions
  POST   /api/v1/transactions/:id/void

Debt
  GET    /api/v1/debts
  GET    /api/v1/debts/:transactionId/payments
  POST   /api/v1/debts/:transactionId/payments

Consignor (konsinyasi)
  GET    /api/v1/consignors
  GET    /api/v1/consignors/:id
  POST   /api/v1/consignors
  PUT    /api/v1/consignors/:id
  PATCH  /api/v1/consignors/:id/status
  GET    /api/v1/consignors/:id/balance
  GET    /api/v1/consignors/:id/payments
  POST   /api/v1/consignors/:id/payments

Consignment (konsinyasi)
  POST   /api/v1/consignment/receipts
  POST   /api/v1/consignment/returns
  GET    /api/v1/consignment/movements

Dashboard
  GET    /api/v1/dashboard/summary

Report
  GET    /api/v1/reports/sales
  GET    /api/v1/reports/debts
  GET    /api/v1/reports/product-trend
  GET    /api/v1/reports/consignment
  GET    /api/v1/reports/sales/export
  GET    /api/v1/reports/debts/export
```

Catatan: `/reports/consignment/export` **belum tersedia** — lihat 5.8 dan 11.16.

---

*Dokumen ini merupakan acuan desain teknis backend Kendi's Market, diturunkan dari SRS Kendi's Market v1.1 dan PRD Kendi's Market — Revisi 4. Setiap perubahan pada dokumen acuan tersebut sebaiknya direfleksikan kembali pada SDD ini, khususnya pada Bagian 10 (Traceability Matrix).*
