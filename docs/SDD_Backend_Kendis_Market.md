# Software Design Document (SDD) — Backend
## Kendi's Market

**Versi:** 1.0
**Diturunkan dari:** SRS Kendi's Market v1.0, PRD Kendi's Market — Revisi 2
**Komponen:** Backend Service (REST API)
**Tech Stack:** Node.js, Express, TypeScript, Zod, Prisma, PostgreSQL, JWT/Session, bcrypt, Sharp, Multer, AWS SDK for S3 (Cloudflare R2), Pino, CORS, express-rate-limit, dotenv

---

## 1. Pendahuluan

### 1.1 Tujuan Dokumen
Dokumen ini menjabarkan **desain teknis backend** sistem Kendi's Market: arsitektur, struktur modul, desain database, kontrak API, desain keamanan, error handling, strategi pengujian, dan rencana deployment. SDD ini menjadi acuan implementasi bagi developer backend agar seluruh functional requirement (FR) dan business rule (BR) pada SRS terealisasi secara konsisten pada level kode dan database.

### 1.2 Ruang Lingkup
Dokumen ini mencakup **sisi backend (server-side)** saja: REST API, business logic, akses database, autentikasi, keamanan, serta penyimpanan dan optimasi file gambar produk. Desain frontend/UI tidak dibahas di sini (lihat SRS bagian 8 — Interface Requirements). Ruang lingkup teknis meliputi seluruh modul MVP: Auth, User, Produk & Stok, Media/Upload Gambar, Transaksi, Void, Pelunasan Cicilan, Dashboard, Laporan, dan Ekspor.

### 1.3 Acuan Dokumen
| Dokumen | Keterangan |
|---|---|
| PRD Kendi's Market — Revisi 2 | Kebutuhan bisnis, business rules (BR-01–BR-16), metrik sukses |
| SRS Kendi's Market v1.0 | Functional requirements (FR-01–FR-45), NFR, data requirements (termasuk field `foto_url` pada entity Produk, Bagian 7.2), acceptance criteria |

Setiap desain pada dokumen ini mereferensikan ID FR/BR/AC yang relevan dari SRS agar traceable (lihat Bagian 10).

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

### 1.5 Scope MVP & Out of Scope
**Termasuk (MVP):**
- Auth (login, logout, refresh token / session)
- CRUD Produk & Kategori, manajemen stok, ambang batas stok minimum
- Upload & optimasi foto produk (Multer + Sharp + Cloudflare R2)
- Transaksi (Lunas/Utang), Void transaksi
- Pelunasan utang bertahap (cicilan)
- Dashboard ringkasan
- Laporan penjualan, laporan utang, tren produk
- Ekspor laporan ke Excel/PDF

**Di luar scope (mengikuti PRD Future Development):**
- Multi-role/hak akses (Owner/Kasir)
- Modul konsinyasi (produk titipan pihak ketiga)
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
| **Repository (Prisma Client)** | Akses data ke PostgreSQL | `repositories/product.repository.ts` |
| **Model (Prisma Schema)** | Definisi struktur tabel & relasi | `prisma/schema.prisma` |

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
 ├── middlewares/      → auth, validate, rateLimiter, errorHandler, requestLogger, upload (Multer)
 ├── modules/
 │    ├── auth/
 │    ├── user/
 │    ├── product/
 │    ├── stock/
 │    ├── media/        → image processing & R2 client wrapper
 │    ├── transaction/
 │    ├── debt/
 │    ├── dashboard/
 │    └── report/
 ├── types/            → shared TypeScript types/interfaces (DTO, Express Request augmentation)
 ├── utils/            → response helper, money formatter, date helper
 └── app.ts / server.ts
```
Setiap module (mis. `product/`) berisi: `*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `*.schema.ts` — memudahkan navigasi dan pengujian per-modul.

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

**Struktur:** `media.routes.ts` (di-mount di bawah `/products/:id/photo`), `media.controller.ts`, `media.service.ts` (business logic optimasi + storage), `storage.repository.ts` (wrapper tipis di atas `S3Client`, mengimplementasikan interface `IObjectStorage` — lihat 2.5), `media.schema.ts` (validasi tambahan di luar yang sudah ditangani Multer).

Referensi: memperluas FR-07 (tambah produk) dan FR-09 (ubah produk) pada SRS, khususnya field `foto_url` pada entity Produk (SRS 7.2).

### 3.7 Transaction
- Modul inti sistem. Menangani pembuatan transaksi (Lunas/Utang) dan void.
- Seluruh operasi tulis (create, void) dibungkus `prisma.$transaction()` untuk menjamin konsistensi stok, detail transaksi, dan saldo utang (BR-09, BR-13).
- Aturan batas waktu void (BR-13) dihitung di service layer berdasarkan `createdAt` transaksi dibandingkan waktu server saat ini (bukan waktu client, untuk mencegah manipulasi).
- Referensi: FR-16–FR-29.

### 3.8 Debt / Installment
- Menangani pencatatan pembayaran cicilan terhadap transaksi Utang (`PaymentHistory`).
- Validasi: jumlah bayar tidak boleh melebihi sisa saldo (BR-14, FR-33); dilakukan dalam DB transaction bersama update `sisaSaldoUtang` dan `statusPembayaran` pada tabel Transaksi agar tidak terjadi race condition saat dua pembayaran dicatat hampir bersamaan (lihat 4.6).
- Referensi: FR-30–FR-34.

### 3.9 Dashboard
- Endpoint agregasi read-only yang menggabungkan data dari Product, Transaction, dan Debt untuk satu response ringkas (menghindari client melakukan banyak request terpisah — selaras NFR-01 target waktu muat).
- Referensi: FR-43–FR-45.

### 3.10 Report & Trend
- Query agregasi berbasis rentang tanggal (`GROUP BY`, `SUM`) untuk omzet, profit, dan tren produk terlaris.
- Ekspor Excel menggunakan **ExcelJS**, ekspor PDF menggunakan **PDFKit** (lihat Lampiran B).
- Referensi: FR-35–FR-42.

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
- `utils/date.ts` — perhitungan rentang waktu (mis. cutoff void BR-13) menggunakan **date-fns** agar konsisten timezone (Asia/Jakarta).
- `utils/asyncHandler.ts` — wrapper agar error di fungsi `async` controller otomatis diteruskan ke `errorHandler` tanpa perlu `try/catch` berulang.
- `utils/objectKey.ts` — helper pembuatan object key R2 yang konsisten dan aman (sanitasi nama file, penambahan UUID agar tidak collision).

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
  hargaJual     Decimal  @db.Decimal(12, 2)
  hargaModal    Decimal  @db.Decimal(12, 2)
  stok          Int      @default(0)
  stokMinimum   Int      @default(0)
  status        ProductStatus @default(AKTIF)
  fotoKey       String?  // object key di Cloudflare R2, mis. "products/{id}/{uuid}.webp"
  fotoUrl       String?  // URL publik hasil upload, dikirim ke frontend
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  detailTransaksi DetailTransaction[]

  @@index([status])
  @@index([kategori])
}

enum ProductStatus {
  AKTIF
  NONAKTIF
}

model Transaction {
  id                 String   @id @default(uuid())
  tanggal            DateTime @default(now())
  total              Decimal  @db.Decimal(12, 2)
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
```

### 4.3 Relasi
- `User (1) — (N) Transaction` — satu user dapat membuat banyak transaksi (audit trail, BR-01).
- `Transaction (1) — (N) DetailTransaction` — satu transaksi berisi satu atau lebih item (BR-06).
- `DetailTransaction (N) — (1) Product` — setiap detail merujuk produk asal, namun menyimpan snapshot nilai independen (BR-10).
- `Transaction (1) — (N) PaymentHistory` — khusus transaksi berstatus Utang; riwayat cicilan (BR-14).
- `User (1) — (N) RefreshToken` — mendukung multi-sesi & revocation saat logout.
- `User (1) — (N) Session` — relevan hanya jika strategi auth = session.

### 4.4 Constraint
| Constraint | Diterapkan di | Referensi |
|---|---|---|
| `hargaJual > 0` | Aplikasi (Zod) + `CHECK` constraint DB | BR-03 |
| `stok >= 0` | Aplikasi (Zod/service) + `CHECK` constraint DB | BR-04 |
| `jumlah > 0` pada `DetailTransaction` | Aplikasi (Zod) + `CHECK` constraint DB | BR-05 |
| `email` unik pada `User` | `@unique` Prisma | FR-01 |
| `namaPembeli`/`noHpPembeli` wajib jika `statusPembayaran = UTANG` | Validasi service layer (tidak feasible sebagai DB constraint sederhana) | BR-08 |
| `jumlahBayar <= sisaSaldoUtang` saat insert | Validasi service layer dalam DB transaction | BR-14 |
| Produk dengan `DetailTransaction` terkait tidak dapat di-`DELETE`, hanya `UPDATE status = NONAKTIF` | Service layer (cek relasi sebelum delete) | BR-12 |
| Tipe file foto produk harus salah satu dari `jpeg/png/webp` | Multer `fileFilter` + validasi ulang di `media.service` | Perluasan FR-07/FR-09 |
| Ukuran file upload ≤ `MAX_UPLOAD_SIZE_MB` (default 5MB) | Multer `limits.fileSize` | Perluasan FR-07/FR-09, NFR-01 |
| Object R2 lama dihapus saat foto diganti/produk dihapus | `media.service` (dijalankan setelah update DB berhasil, lihat 7.6) | Kebersihan storage |

Prisma migration menyertakan `CHECK` constraint tambahan via raw SQL (`ALTER TABLE ... ADD CONSTRAINT`) untuk aturan yang bisa ditegakkan di level DB, sebagai lapisan pertahanan kedua selain validasi aplikasi (defense in depth).

### 4.5 Index
- `Product(status)`, `Product(kategori)` — mempercepat filter katalog aktif per kategori.
- `Transaction(statusTransaksi)`, `Transaction(statusPembayaran)`, `Transaction(tanggal)` — mempercepat query laporan per periode & status (FR-35, FR-37, NFR-01).
- `DetailTransaction(transactionId)`, `DetailTransaction(productId)` — mempercepat join saat menampilkan detail transaksi dan tren produk (FR-38).
- `PaymentHistory(transactionId)` — mempercepat query riwayat cicilan per transaksi (FR-37).

### 4.6 Transaction / Atomicity
Operasi berikut **wajib** dibungkus `prisma.$transaction([...])` atau interactive transaction (`prisma.$transaction(async (tx) => {...})`):

| Operasi | Langkah yang harus atomik |
|---|---|
| Membuat transaksi baru | Insert `Transaction` + insert N `DetailTransaction` + update stok tiap `Product` (decrement) |
| Void transaksi | Update `Transaction.statusTransaksi = DIBATALKAN` + update stok tiap `Product` (increment kembali) |
| Mencatat pelunasan | Insert `PaymentHistory` + update `Transaction.sisaSaldoUtang` + kemungkinan update `Transaction.statusPembayaran = LUNAS` |

Untuk kasus pelunasan, digunakan **row-level locking** (`SELECT ... FOR UPDATE` via `tx.$queryRaw` atau pengecekan ulang saldo di dalam transaction) untuk mencegah dua request pembayaran simultan menyebabkan saldo menjadi negatif (race condition) — lihat juga Bagian 7.6.

Untuk modul Media, karena operasi melibatkan **dua sistem berbeda** (PostgreSQL dan R2, yang tidak bisa dibungkus dalam satu database transaction), urutan operasi dirancang agar tidak menyisakan state tidak konsisten:
1. Upload file baru ke R2 **terlebih dahulu** (belum menyentuh DB).
2. Jika upload sukses → update `Product.fotoKey`/`fotoUrl` di database.
3. Jika update DB sukses **dan** produk sebelumnya sudah punya foto lama → baru hapus object lama di R2.
4. Jika langkah manapun gagal, langkah berikutnya tidak dijalankan; jika upload sukses tapi update DB gagal, sistem mencatat log warning (object baru menjadi *orphan sementara*, dibersihkan lewat job berkala — lihat 7.6) — desain ini memprioritaskan **tidak pernah kehilangan foto yang sudah tersimpan**, dengan trade-off kemungkinan kecil object tak terpakai tertinggal di storage.

### 4.7 Migration & Seed
- Migration dikelola dengan `prisma migrate dev` (development) dan `prisma migrate deploy` (production/CI).
- Seed (`prisma/seed.ts`) menyediakan: 1 akun `User` awal (untuk MVP single-role), beberapa `Product` contoh, agar tim QA dapat langsung menguji tanpa setup manual.
- Setiap perubahan skema wajib disertai migration file baru (tidak pernah mengedit migration lama yang sudah di-apply ke lingkungan manapun).

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
- Nilai uang dikirim sebagai string/number desimal (bukan float JS murni) untuk menghindari isu presisi; format tampilan Rupiah (BR-16) menjadi tanggung jawab frontend, backend mengirim nilai numerik mentah.
- Pagination: `?page=&limit=` untuk endpoint list (`GET /products`, `GET /transactions`), default `limit=20`.

### 5.2 Authentication API
| Method | Endpoint | Deskripsi | Referensi |
|---|---|---|---|
| POST | `/auth/login` | Login dengan email & password, mengembalikan access token + set refresh token cookie | FR-01, FR-02 |
| POST | `/auth/refresh-token` | Menghasilkan access token baru dari refresh token cookie | FR-01 |
| POST | `/auth/logout` | Meng-invalidasi refresh token/session (revoke) | FR-04 |

### 5.3 Product API
| Method | Endpoint | Deskripsi | Referensi |
|---|---|---|---|
| GET | `/products` | List produk (filter: kategori, status, search nama) | FR-06 |
| GET | `/products/:id` | Detail satu produk | FR-06 |
| POST | `/products` | Tambah produk baru (tanpa foto; foto diunggah terpisah setelah produk dibuat) | FR-07, FR-08 |
| PUT | `/products/:id` | Ubah data produk (tidak memengaruhi transaksi lama) | FR-09, FR-10 |
| DELETE | `/products/:id` | Hard delete jika belum ada riwayat transaksi (turut menghapus foto di R2 jika ada), selain itu ditolak dengan error `PRODUCT_HAS_TRANSACTION` | FR-11, FR-12, BR-12 |
| PATCH | `/products/:id/status` | Mengubah status `AKTIF`/`NONAKTIF` (soft delete) | FR-12 |
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
| POST | `/transactions` | Membuat transaksi baru (Lunas/Utang) | FR-16–FR-23 |
| POST | `/transactions/:id/void` | Membatalkan transaksi (dalam batas waktu) | FR-25–FR-29 |

### 5.6 Debt API
| Method | Endpoint | Deskripsi | Referensi |
|---|---|---|---|
| GET | `/debts` | List transaksi berstatus Utang dengan sisa saldo > 0 | FR-37 |
| GET | `/debts/:transactionId/payments` | Riwayat cicilan satu transaksi | FR-31 |
| POST | `/debts/:transactionId/payments` | Mencatat pembayaran (penuh/cicilan) | FR-30–FR-34 |

### 5.7 Dashboard API
| Method | Endpoint | Deskripsi | Referensi |
|---|---|---|---|
| GET | `/dashboard/summary` | Omzet & profit periode berjalan, produk low-stock, total saldo utang | FR-43–FR-45 |

### 5.8 Report API
| Method | Endpoint | Deskripsi | Referensi |
|---|---|---|---|
| GET | `/reports/sales?start=&end=` | Laporan omzet & profit per periode | FR-35, FR-36, FR-39 |
| GET | `/reports/debts?start=&end=` | Laporan utang per periode | FR-37 |
| GET | `/reports/product-trend?start=&end=` | Tren produk terlaris | FR-38 |
| GET | `/reports/sales/export?format=xlsx\|pdf` | Ekspor laporan penjualan | FR-40, FR-42 |
| GET | `/reports/debts/export?format=xlsx\|pdf` | Ekspor laporan utang | FR-41, FR-42 |

### 5.9 Error Response
Lihat format umum pada 5.1. Daftar `code` standar dijabarkan pada Bagian 7.1.

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
| Tipe file tidak didukung | `INVALID_FILE_TYPE` | 415 |
| Ukuran file melebihi batas | `FILE_TOO_LARGE` | 413 |
| Gagal mengunggah/menghapus file di object storage | `STORAGE_ERROR` | 502 |
| Rate limit terlampaui | `RATE_LIMIT_EXCEEDED` | 429 |
| Error database/tak terduga | `INTERNAL_SERVER_ERROR` | 500 |

### 7.2 HTTP Status Code
Seluruh controller **tidak boleh** melempar HTTP status langsung — status ditentukan oleh `errorHandler` berdasarkan jenis error yang dilempar dari service (mis. `class BusinessRuleError extends AppError`). Ini menjaga konsistensi lintas endpoint.

### 7.3 Validation Error
- Dihasilkan otomatis oleh middleware `validate(schema)` saat parsing Zod gagal; response memuat `details` berisi daftar field & pesan spesifik (format 5.1), agar frontend dapat menyorot field yang salah.
- Error dari Multer (mis. `MulterError` dengan `code: 'LIMIT_FILE_SIZE'`) ditangkap secara eksplisit di `errorHandler` dan dipetakan ke `FILE_TOO_LARGE`/`INVALID_FILE_TYPE` agar format response tetap konsisten dengan error lainnya.
- Referensi contoh: AC-01 (harga jual ≤ 0), AC-05 (nama/no HP kosong saat Utang).

### 7.4 Business Rule Error
- Dilempar dari **Service layer** (bukan Controller) sebagai instance khusus, mis. `StockExceededError`, `DebtOverpaymentError`, `VoidWindowExpiredError`, `ProductHasTransactionError`.

| Error | BR/FR terkait | AC terkait |
|---|---|---|
| `StockExceededError` | BR-05 | AC-04 |
| `MissingDebtorInfoError` | BR-08 | AC-05 |
| `VoidWindowExpiredError` | BR-13 | AC-08 |
| `DebtOverpaymentError` | BR-14 | AC-12 |
| `ProductHasTransactionError` | BR-12 | AC-02 |

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
Untuk skenario upload foto produk (perluasan FR-07/FR-09 yang belum memiliki ID AC resmi di SRS), test diberi label eksplisit, mis. `describe('Perluasan FR-07: upload foto produk')`, dengan rekomendasi menambahkan AC baru (mis. `AC-18`) pada revisi SRS berikutnya agar traceability tetap penuh. Daftar lengkap pemetaan test ↔ AC dikelola pada Bagian 10 (Traceability Matrix).

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
| `SESSION_SECRET` | Secret cookie session (jika `AUTH_STRATEGY=session`) |
| `ALLOWED_ORIGINS` | Daftar origin frontend yang diizinkan CORS (comma-separated) |
| `BCRYPT_SALT_ROUNDS` | Mis. `10` |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | Konfigurasi express-rate-limit |
| `LOG_LEVEL` | Level Pino: `debug` (dev) / `info` (prod) |
| `R2_ACCOUNT_ID` | Account ID Cloudflare untuk endpoint R2 |
| `R2_ACCESS_KEY_ID` | Access key R2 (API token S3-compatible) |
| `R2_SECRET_ACCESS_KEY` | Secret key R2 |
| `R2_BUCKET_NAME` | Nama bucket tempat foto produk disimpan |
| `R2_PUBLIC_URL` | Base URL publik (custom domain/`r2.dev`) untuk mengakses object, dipakai membentuk `fotoUrl` |
| `MAX_UPLOAD_SIZE_MB` | Batas ukuran file upload (default `5`) |

Seluruh variabel di atas divalidasi dengan Zod saat startup (3.1) — aplikasi tidak akan berjalan jika ada yang hilang/tidak valid, untuk mencegah kesalahan konfigurasi lolos ke production secara diam-diam.

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
| FR-01–FR-05, NFR-05, NFR-06 | Authentication (3.2) | `/auth/*` (5.2) | Unit: auth.service; API: login flow |
| FR-06–FR-15, BR-03, BR-04, BR-12, BR-15 | Product & Stock (3.4, 3.5) | `/products/*` (5.3, 5.4) | Unit: product.service; API: AC-01, AC-02, AC-03 |
| Perluasan FR-07/FR-09 (field `foto_url`, SRS 7.2) | Media & Image Upload (3.6) | `POST/DELETE /products/:id/photo` (5.3) | Unit: media.service (mock S3); API: upload valid/invalid file — direkomendasikan ditambahkan sebagai AC-18 pada revisi SRS berikutnya |
| FR-16–FR-24, BR-05–BR-10 | Transaction (3.7) | `POST /transactions` (5.5) | Integration: AC-04, AC-05, AC-06 |
| FR-25–FR-29, BR-13 | Transaction — Void (3.7) | `POST /transactions/:id/void` (5.5) | Integration: AC-07, AC-08, AC-09 |
| FR-30–FR-34, BR-14 | Debt/Installment (3.8) | `/debts/*` (5.6) | Integration: AC-10, AC-11, AC-12 |
| FR-43–FR-45 | Dashboard (3.9) | `/dashboard/summary` (5.7) | API: AC-17 |
| FR-35–FR-42, BR-11, BR-16 | Report & Trend (3.10) | `/reports/*` (5.8) | API: AC-13–AC-16 |
| NFR-01, NFR-02 | Semua modul, termasuk optimasi gambar (3.6) yang menekan waktu muat katalog | — | Performance test |
| NFR-03, NFR-04 | Arsitektur (2.1) | — | — |
| NFR-08, NFR-09 | Frontend concern | — | — |

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
**Keputusan:** Void mengubah status menjadi `DIBATALKAN` (bukan `DELETE`), dan hanya diizinkan dalam batas waktu tertentu, dihitung di server.
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
│   │   │   ├── product.repository.ts
│   │   │   └── product.schema.ts
│   │   ├── media/
│   │   │   ├── media.controller.ts
│   │   │   ├── media.service.ts
│   │   │   ├── storage.repository.ts
│   │   │   └── media.schema.ts
│   │   ├── transaction/
│   │   ├── debt/
│   │   ├── dashboard/
│   │   └── report/
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
| `express-session` (+ store Prisma/PostgreSQL) | Strategi auth alternatif "session" |
| `bcrypt` | Hashing password |
| `multer` | Menerima file upload (`multipart/form-data`) |
| `sharp` | Resize, kompresi, konversi format gambar |
| `@aws-sdk/client-s3` | Klien S3-compatible untuk komunikasi dengan Cloudflare R2 |
| `pino`, `pino-http` | Logging terstruktur |
| `cors` | Kontrol akses lintas origin |
| `express-rate-limit` | Rate limiting |
| `dotenv` | Memuat environment variable dari file `.env` |

**Dependency pendukung:**
| Package | Fungsi |
|---|---|
| `@types/express`, `@types/multer`, `@types/bcrypt`, `@types/jsonwebtoken`, `@types/cors`, `@types/express-session` | Definisi tipe TypeScript untuk masing-masing library |
| `ts-node-dev` | Live-reload saat development tanpa build manual berulang |
| `exceljs` | Ekspor laporan ke Excel |
| `pdfkit` | Ekspor laporan ke PDF |
| `date-fns` | Manipulasi tanggal (rentang laporan, cutoff void) |
| `uuid` (+ `@types/uuid`) | Generate UUID untuk primary key & object key R2 |
| `compression` | Kompresi response HTTP (gzip) |
| `aws-sdk-client-mock` (dev) | Mock `S3Client` pada unit test |
| `pm2` | Process manager di server production: auto-restart, log management, reload tanpa downtime |
| `jest`, `ts-jest`, `supertest`, `eslint`, `prettier` (dev) | Testing & konsistensi gaya kode |

### C. Ringkasan Endpoint
```
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

Dashboard
  GET    /api/v1/dashboard/summary

Report
  GET    /api/v1/reports/sales
  GET    /api/v1/reports/debts
  GET    /api/v1/reports/product-trend
  GET    /api/v1/reports/sales/export
  GET    /api/v1/reports/debts/export
```

---

*Dokumen ini merupakan acuan desain teknis backend Kendi's Market, diturunkan dari SRS Kendi's Market v1.0 dan PRD Kendi's Market — Revisi 2. Setiap perubahan pada dokumen acuan tersebut sebaiknya direfleksikan kembali pada SDD ini, khususnya pada Bagian 10 (Traceability Matrix).*
