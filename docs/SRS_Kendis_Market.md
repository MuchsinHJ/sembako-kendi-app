# Software Requirements Specification (SRS)
## Kendi's Market — Sistem Pengelolaan Penjualan UMKM

**Versi:** 1.0
**Diturunkan dari:** PRD Kendi's Market
**Platform:** Mobile Web

---

## 1. Pendahuluan

### 1.1 Tujuan Dokumen
Dokumen ini menjabarkan kebutuhan perangkat lunak (functional, non-functional, data, dan interface) untuk sistem **Kendi's Market** secara teknis, sebagai turunan langsung dari PRD yang telah disepakati. SRS ini ditujukan sebagai acuan bagi tim pengembang (developer, QA) dalam merancang, membangun, dan menguji sistem, serta sebagai dasar pembuatan test case.

### 1.2 Ruang Lingkup
Sistem yang dibangun adalah aplikasi **mobile web** untuk membantu pelaku UMKM mengelola:
- Data produk dan stok
- Transaksi penjualan (tunai/lunas dan utang)
- Pembatalan/koreksi transaksi (void)
- Pelunasan utang secara bertahap (cicilan)
- Laporan penjualan, laporan utang, dan tren produk
- Dashboard ringkasan omzet dan profit

Dokumen ini mencakup seluruh fitur **MVP** sebagaimana didefinisikan dalam PRD. Fitur yang berstatus *Future Development* pada PRD (pemantauan kedaluwarsa, modul konsinyasi, pemisahan role Owner/Kasir, Ekspor laporan) **tidak** dicakup dalam SRS ini dan akan didokumentasikan terpisah pada fase berikutnya.

### 1.3 Ringkasan Asumsi & Batasan MVP
- Sistem digunakan oleh **satu toko/satu akun utama** (belum mendukung multi-cabang).
- Sistem menggunakan **satu role pengguna** (User) — belum ada pemisahan hak akses Owner/Kasir.
- Metode pembayaran yang didukung hanya **tunai**; integrasi pembayaran digital (QRIS/e-wallet) berada di luar cakupan MVP.
- **Konsinyasi (produk titipan pihak ketiga)** dan **pemantauan tanggal kedaluwarsa** berada di luar cakupan MVP — didorong ke Future Development.
- Sistem mengasumsikan koneksi internet tersedia saat transaksi disimpan; kebutuhan mode offline-first belum termasuk MVP dan akan dievaluasi terpisah.
- Client menyediakan perangkat (smartphone) dan koneksi internet untuk operasional harian.

---

## 2. Gambaran Umum Sistem

### 2.1 Deskripsi Produk
Kendi's Market adalah sistem digital berbasis web yang membantu UMKM mencatat transaksi penjualan, mengelola stok dan harga produk, mencatat serta melunasi utang pembeli, dan menghasilkan laporan penjualan/profit secara terstruktur — menggantikan pencatatan manual yang selama ini dilakukan pemilik usaha.

### 2.2 Platform
- **Mobile web**, dioptimalkan untuk penggunaan melalui browser smartphone (Android/iOS), tetap *responsive* saat diakses melalui tablet atau desktop.
- Tidak memerlukan instalasi aplikasi native.

### 2.3 Konteks Masalah yang Diselesaikan
Sebelum sistem ini dibangun, pemilik usaha mencatat transaksi secara manual, sering lupa harga jual produk, memperkirakan stok tanpa data pasti, tidak memiliki gambaran omzet/profit yang akurat, dan mencatat utang pembeli secara manual sehingga rawan kesalahan atau kehilangan data. Sistem ini menyediakan satu platform terpusat untuk seluruh proses tersebut, termasuk kemampuan mengoreksi kesalahan transaksi (void) dan mencatat pelunasan utang secara bertahap — dua kebutuhan yang teridentifikasi sebagai gap penting pada tahap review PRD.

---

## 3. Pengguna dan Hak Akses

### 3.1 Role Pengguna
Pada MVP, sistem hanya memiliki **satu role: `User`**. Setiap pengguna disarankan memiliki akun login sendiri agar aktivitas transaksi dapat ditelusuri (audit trail), meskipun hak akses seluruh akun `User` identik.

### 3.2 Tabel Permission per Fitur

| Fitur | User | Catatan |
|---|:---:|---|
| Login / logout | ✓ | Autentikasi sederhana (username/email + password) |
| Melihat daftar produk | ✓ | Termasuk kategori, harga, stok |
| Menambah produk | ✓ | Field minimal: nama, kategori, harga jual, harga modal, stok |
| Mengubah produk | ✓ | Termasuk perubahan harga (tidak memengaruhi transaksi lama) |
| Menghapus produk | ✓ (bersyarat) | Hanya produk tanpa riwayat transaksi; produk dengan riwayat hanya dapat di-nonaktifkan (soft delete) |
| Mengatur ambang batas stok minimum | ✓ | Per produk |
| Membuat transaksi (Lunas/Utang) | ✓ | — |
| Membatalkan/void transaksi | ✓ (bersyarat) | Hanya dalam batas waktu yang ditentukan (mis. hari yang sama) |
| Mencatat pelunasan utang (penuh/cicilan) | ✓ | — |
| Melihat riwayat transaksi | ✓ | Termasuk transaksi berstatus "Dibatalkan" |
| Melihat dashboard & laporan | ✓ | Omzet, profit, tren produk |
| Melihat laporan utang | ✓ | Termasuk riwayat cicilan |

---

## 4. Functional Requirements

Setiap FR memuat referensi ke User Story (US) dan Business Rule (BR) terkait pada PRD.

### 4.1 Modul Auth

| ID | Requirement | Referensi PRD |
|---|---|---|
| FR-01 | Sistem harus menyediakan form login dengan input username/email dan password. | US-01 |
| FR-02 | Sistem harus memvalidasi kredensial pengguna dan menolak akses jika salah, disertai pesan error yang jelas. | US-01 |
| FR-03 | Sistem harus menyimpan password dalam bentuk terenkripsi (hash), tidak dalam teks biasa. | NFR Keamanan |
| FR-04 | Sistem harus menyediakan mekanisme logout yang mengakhiri sesi pengguna. | US-01 |
| FR-05 | Sistem harus menyediakan mekanisme reset password minimal melalui admin/developer pada tahap MVP. | NFR Keamanan |

### 4.2 Modul Produk & Stok

| ID | Requirement | Referensi PRD |
|---|---|---|
| FR-06 | Sistem harus menampilkan daftar produk beserta nama, kategori, harga jual, dan stok saat ini. | US-02 |
| FR-07 | Sistem harus memungkinkan pengguna menambahkan produk baru dengan field minimal: nama, kategori, harga jual, harga modal, stok awal. | US-03, BR-03 |
| FR-08 | Sistem harus menolak penyimpanan produk apabila harga jual ≤ 0. | BR-03 |
| FR-09 | Sistem harus memungkinkan pengguna mengubah data produk, termasuk harga jual dan harga modal. | US-03 |
| FR-10 | Perubahan harga produk tidak boleh mengubah nilai historis pada transaksi yang sudah tersimpan sebelumnya. | BR-10 |
| FR-11 | Sistem harus memungkinkan penghapusan permanen hanya untuk produk yang belum pernah digunakan dalam transaksi apa pun. | BR-12 |
| FR-12 | Sistem harus menonaktifkan (soft delete), bukan menghapus permanen, produk yang sudah memiliki riwayat transaksi. Produk nonaktif tidak muncul pada daftar pilihan transaksi baru, namun tetap tampil pada riwayat transaksi lama. | BR-12 |
| FR-13 | Sistem harus memungkinkan pengguna mengatur ambang batas stok minimum per produk. | BR-15 |
| FR-14 | Sistem harus menampilkan peringatan pada dashboard untuk setiap produk yang stoknya berada pada atau di bawah ambang batas minimum. | BR-15 |
| FR-15 | Sistem harus menolak stok menjadi bernilai negatif melalui penyesuaian manual maupun transaksi. | BR-04 |

### 4.3 Modul Transaksi

| ID | Requirement | Referensi PRD |
|---|---|---|
| FR-16 | Sistem harus memungkinkan pengguna memilih satu atau lebih produk beserta jumlah dalam satu transaksi. | US-04, BR-06 |
| FR-17 | Sistem harus menolak input jumlah produk yang ≤ 0 atau melebihi stok yang tersedia. | BR-05 |
| FR-18 | Sistem harus menghitung total transaksi sebagai penjumlahan (harga jual × jumlah) dari setiap item. | BR-07 |
| FR-19 | Sistem harus menampilkan format nilai uang dalam Rupiah (Rp) dengan pemisah ribuan. | BR-16 |
| FR-20 | Sistem harus memungkinkan pengguna memilih status pembayaran transaksi: **Lunas** atau **Utang**. | US-04, BR-08 |
| FR-21 | Jika status transaksi Utang, sistem harus mewajibkan input nama dan nomor HP (opsional) pembeli sebelum transaksi dapat disimpan. | BR-08 |
| FR-22 | Sistem harus mengurangi stok produk secara otomatis segera setelah transaksi berhasil disimpan, baik untuk status Lunas maupun Utang. | BR-09 |
| FR-23 | Sistem harus menyimpan harga jual dan harga modal **pada saat transaksi terjadi** (snapshot), terlepas dari perubahan harga produk di kemudian hari. | BR-10 |
| FR-24 | Sistem harus mencatat setiap transaksi ke dalam riwayat transaksi yang dapat ditelusuri kembali berdasarkan tanggal/periode. | US-05 |

### 4.4 Modul Void / Pembatalan Transaksi

| ID | Requirement | Referensi PRD |
|---|---|---|
| FR-25 | Sistem harus memungkinkan pengguna membatalkan (void) transaksi yang sudah tersimpan, selama masih dalam batas waktu yang ditentukan (mis. hari yang sama dengan transaksi dibuat). | US-10, BR-13 |
| FR-26 | Sistem harus menolak pembatalan transaksi yang telah melewati batas waktu yang ditentukan, disertai pesan penjelasan. | BR-13 |
| FR-27 | Saat transaksi dibatalkan, sistem harus mengembalikan stok setiap item transaksi ke jumlah semula secara otomatis. | BR-13 |
| FR-28 | Sistem harus mengubah status transaksi yang dibatalkan menjadi **"Dibatalkan"**, tanpa menghapus data transaksi dari riwayat. | BR-13 |
| FR-29 | Transaksi berstatus "Dibatalkan" harus tetap dapat ditelusuri pada riwayat transaksi, namun dikecualikan dari perhitungan omzet dan profit pada laporan. | BR-13 |

### 4.5 Modul Pelunasan Cicilan (Utang)

| ID | Requirement | Referensi PRD |
|---|---|---|
| FR-30 | Sistem harus memungkinkan pengguna mencatat pembayaran terhadap transaksi berstatus Utang, baik secara penuh maupun sebagian (cicilan). | US-11, BR-14 |
| FR-31 | Setiap pembayaran yang dicatat harus tersimpan sebagai entri riwayat pelunasan yang terhubung ke transaksi utang terkait (tanggal, jumlah dibayar). | BR-14 |
| FR-32 | Sistem harus menghitung dan menampilkan sisa saldo utang setelah setiap pembayaran dicatat. | BR-14 |
| FR-33 | Sistem harus menolak input pembayaran yang melebihi sisa saldo utang yang berlaku. | BR-14 |
| FR-34 | Sistem harus secara otomatis mengubah status transaksi menjadi **"Lunas"** ketika saldo utang mencapai 0. | BR-14 |

### 4.6 Modul Laporan

| ID | Requirement | Referensi PRD |
|---|---|---|
| FR-35 | Sistem harus menampilkan laporan penjualan (omzet dan estimasi profit) berdasarkan rentang periode yang dipilih pengguna. | US-06 |
| FR-36 | Estimasi profit harus dihitung dari selisih harga jual dan harga modal yang tersimpan pada saat masing-masing transaksi terjadi. | BR-11 |
| FR-37 | Sistem harus menampilkan laporan utang yang memuat transaksi Utang beserta sisa saldo dan riwayat cicilan yang belum lunas. | US-07, BR-14 |
| FR-38 | Sistem harus menampilkan tren produk berupa minimal 5 produk dengan jumlah penjualan tertinggi pada periode yang dipilih. | US-08 |
| FR-39 | Laporan dan perhitungan omzet/profit harus mengecualikan transaksi berstatus "Dibatalkan". | BR-13 |

### 4.7 Modul Ekspor (Feature Development)

| ID | Requirement | Referensi PRD |
|---|---|---|
| FR-40 | Sistem harus memungkinkan pengguna mengekspor laporan penjualan ke format **Excel (.xlsx)** dan **PDF**. | US-13 |
| FR-41 | Sistem harus memungkinkan pengguna mengekspor laporan utang (termasuk riwayat cicilan) ke format **Excel (.xlsx)** dan **PDF**. | US-13 |
| FR-42 | File hasil ekspor harus memuat rentang periode yang dipilih dan tanggal/waktu file dibuat. | US-13 |

### 4.8 Modul Dashboard

| ID | Requirement | Referensi PRD |
|---|---|---|
| FR-43 | Dashboard harus menampilkan ringkasan omzet dan estimasi profit periode berjalan (mis. hari ini/bulan berjalan) saat pengguna login. | US-06 |
| FR-44 | Dashboard harus menampilkan daftar produk dengan stok pada atau di bawah ambang batas minimum. | BR-15 |
| FR-45 | Dashboard harus menampilkan ringkasan total saldo utang yang belum lunas dari seluruh pembeli. | US-07 |

---

## 5. Business Rules

Aturan berikut berlaku lintas fitur dan wajib ditegakkan oleh sistem di seluruh modul terkait, sesuai definisi pada PRD.

| ID | Aturan |
|---|---|
| BR-01 | MVP menggunakan satu role `User`. Setiap pengguna sebaiknya memiliki akun sendiri agar aktivitas transaksi dapat ditelusuri. |
| BR-02 | Nama produk dan data identifikasi produk harus jelas; kode/SKU produk harus unik apabila digunakan. |
| BR-03 | Harga jual produk harus lebih besar dari 0. |
| BR-04 | Stok produk tidak boleh menjadi negatif, baik melalui transaksi maupun penyesuaian manual. |
| BR-05 | Jumlah produk pada transaksi harus > 0 dan tidak boleh melebihi stok yang tersedia saat transaksi dibuat. |
| BR-06 | Satu transaksi dapat terdiri dari satu atau lebih produk. |
| BR-07 | Total transaksi = jumlah dari (harga jual × jumlah) setiap item transaksi. |
| BR-08 | Transaksi Utang wajib menyimpan nama dan nomor HP pembeli beserta sisa saldo yang belum dibayar. |
| BR-09 | Stok berkurang segera setelah transaksi berhasil disimpan, untuk status Lunas maupun Utang. |
| BR-10 | Perubahan harga produk tidak memengaruhi nilai historis pada transaksi yang sudah terjadi (snapshot harga per transaksi). |
| BR-11 | Perhitungan profit = nilai penjualan − harga modal yang tercatat pada saat transaksi. |
| BR-12 | Produk dengan riwayat transaksi tidak dapat dihapus permanen — hanya dapat dinonaktifkan (soft delete). Produk tanpa riwayat transaksi dapat dihapus permanen. |
| BR-13 | Transaksi hanya dapat dibatalkan dalam batas waktu tertentu setelah disimpan. Pembatalan mengembalikan stok dan mengubah status menjadi "Dibatalkan" tanpa menghapus data dari riwayat. |
| BR-14 | Transaksi Utang dapat dilunasi penuh atau bertahap. Setiap pembayaran tercatat sebagai riwayat pada transaksi terkait; status otomatis menjadi Lunas saat saldo mencapai 0. |
| BR-15 | Setiap produk dapat memiliki ambang batas stok minimum (dapat diubah per produk); sistem menampilkan peringatan saat stok mencapai atau berada di bawah ambang batas tersebut. |
| BR-16 | Seluruh nilai uang ditampilkan dalam format Rupiah (Rp) dengan pemisah ribuan, tanpa desimal. |

---

## 6. Non-Functional Requirements

### 6.1 Kinerja
- **NFR-01**: Waktu muat halaman utama (dashboard, katalog produk, form transaksi) harus di bawah 2 detik pada koneksi internet mobile standar (3G/4G).
- **NFR-02**: Sistem harus mampu menangani minimal 200 transaksi per hari untuk satu toko tanpa penurunan performa yang terasa oleh pengguna.

### 6.2 Keandalan & Konektivitas
- **NFR-03**: Sistem mengasumsikan koneksi internet tersedia saat transaksi disimpan; kebutuhan mode penyimpanan sementara (offline-first/queue) dievaluasi terpisah pada fase berikutnya.
- **NFR-04**: Data transaksi dan produk harus disimpan di server (bukan hanya di perangkat pengguna), sehingga tidak hilang jika perangkat rusak/hilang.

### 6.3 Keamanan & Backup Data
- **NFR-05**: Password pengguna harus disimpan dalam bentuk terenkripsi (hash).
- **NFR-06**: Sistem harus menyediakan mekanisme reset password, minimal melalui admin/developer pada tahap MVP.
- **NFR-07**: Data harus di-backup secara berkala (minimal harian).

### 6.4 Kompatibilitas
- **NFR-08**: Sistem harus mendukung browser modern pada Android dan iOS (Chrome, Safari) versi dua tahun terakhir.
- **NFR-09**: Bahasa antarmuka sistem adalah Bahasa Indonesia.

---

## 7. Data Requirements

### 7.1 Entity: `User`
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID / Integer (PK) | Identitas unik pengguna |
| nama | String | Nama pengguna |
| email / username | String (unique) | Digunakan untuk login |
| password_hash | String | Password terenkripsi |
| created_at | Timestamp | Waktu akun dibuat |

### 7.2 Entity: `Produk`
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID / Integer (PK) | Identitas unik produk |
| nama | String | Nama produk |
| kategori | String | Kategori produk |
| harga_jual | Decimal | Harga jual saat ini (BR-03: > 0) |
| harga_modal | Decimal | Harga modal saat ini |
| stok | Integer | Stok saat ini (BR-04: ≥ 0) |
| stok_minimum | Integer | Ambang batas peringatan stok (BR-15) |
| status | Enum (`aktif`, `nonaktif`) | Untuk mekanisme soft delete (BR-12) |
| foto_url | String (opsional) | Foto produk |
| created_at / updated_at | Timestamp | Audit waktu |

### 7.3 Entity: `Transaksi`
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID / Integer (PK) | Identitas unik transaksi |
| tanggal | Timestamp | Waktu transaksi dibuat |
| total | Decimal | Total nilai transaksi (BR-07) |
| status_pembayaran | Enum (`lunas`, `utang`) | BR-08 |
| status_transaksi | Enum (`aktif`, `dibatalkan`) | BR-13 |
| nama_pembeli | String (nullable, wajib jika utang) | BR-08 |
| no_hp_pembeli | String (nullable, wajib jika utang) | BR-08 |
| sisa_saldo_utang | Decimal (nullable) | Diperbarui setiap pelunasan (BR-14) |
| dibuat_oleh (user_id) | FK → User | Audit trail |
| dibatalkan_pada | Timestamp (nullable) | Diisi saat void (BR-13) |

### 7.4 Entity: `Detail_Transaksi`
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID / Integer (PK) | Identitas unik baris item |
| transaksi_id | FK → Transaksi | Relasi ke transaksi induk |
| produk_id | FK → Produk | Relasi ke produk yang dijual |
| nama_produk_snapshot | String | Snapshot nama produk saat transaksi (BR-10) |
| harga_jual_snapshot | Decimal | Snapshot harga jual saat transaksi (BR-10) |
| harga_modal_snapshot | Decimal | Snapshot harga modal saat transaksi (BR-10, BR-11) |
| jumlah | Integer | Jumlah unit terjual (BR-05: > 0) |
| subtotal | Decimal | harga_jual_snapshot × jumlah |

### 7.5 Entity: `Riwayat_Pembayaran_Utang`
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID / Integer (PK) | Identitas unik entri pembayaran |
| transaksi_id | FK → Transaksi | Transaksi utang terkait |
| tanggal_bayar | Timestamp | Waktu pembayaran dicatat |
| jumlah_bayar | Decimal | Nominal yang dibayarkan (BR-14) |
| saldo_setelah_bayar | Decimal | Sisa saldo setelah pembayaran ini |
| dicatat_oleh (user_id) | FK → User | Audit trail |

**Relasi utama:**
`User (1) — (N) Transaksi`
`Transaksi (1) — (N) Detail_Transaksi (N) — (1) Produk`
`Transaksi (1) — (N) Riwayat_Pembayaran_Utang` (khusus transaksi berstatus Utang)

---

## 8. Interface Requirements

### 8.1 Antarmuka Pengguna (UI)
- **IR-01**: Seluruh antarmuka dirancang **mobile-first**, dioptimalkan untuk layar smartphone, dan tetap *responsive* pada tablet/desktop.
- **IR-02**: Seluruh teks, label, dan pesan sistem menggunakan **Bahasa Indonesia**.
- **IR-03**: Form transaksi harus memungkinkan pemilihan produk dan input jumlah dengan jumlah tap/klik minimum (mendukung target penyelesaian transaksi < 30 detik pada metrik sukses PRD).
- **IR-04**: Nilai uang pada seluruh layar ditampilkan dalam format Rupiah (Rp) dengan pemisah ribuan (BR-16).
- **IR-05**: Dashboard menampilkan indikator visual (mis. badge/warna) untuk produk dengan stok di bawah ambang batas minimum.
- **IR-06**: Tombol pembatalan transaksi (void) hanya ditampilkan pada transaksi yang masih memenuhi syarat batas waktu pembatalan (BR-13); di luar itu, tombol disembunyikan atau dinonaktifkan dengan keterangan.

### 8.2 Format Output Ekspor (Feature Development)
- **IR-07**: File ekspor Excel (.xlsx) harus memuat kolom-kolom sesuai isi laporan pada layar (tanggal, produk/pembeli, nominal, status).
- **IR-08**: File ekspor PDF harus menampilkan laporan dalam tata letak siap cetak, termasuk judul laporan, rentang periode, dan tanggal pembuatan file.
- **IR-09**: Nama file ekspor harus memuat jenis laporan dan rentang periode (mis. `laporan-penjualan_2026-09-01_2026-09-30.xlsx`).

---

## 9. Acceptance Criteria (Given–When–Then)

### 9.1 Modul Produk & Stok
**AC-01**
Given pengguna sudah login,
When pengguna menambahkan produk baru dengan harga jual 0 atau kurang,
Then sistem menolak penyimpanan dan menampilkan pesan error yang menjelaskan bahwa harga jual harus lebih dari 0. *(FR-08, BR-03)*

**AC-02**
Given produk "Gula 1kg" sudah pernah digunakan dalam transaksi,
When pengguna mencoba menghapus produk tersebut,
Then sistem menolak penghapusan permanen dan hanya mengizinkan status produk diubah menjadi nonaktif. *(FR-11, FR-12, BR-12)*

**AC-03**
Given stok produk "Minyak Goreng" bernilai 5 dan ambang batas minimum diatur ke 5,
When stok produk mencapai nilai 5,
Then dashboard menampilkan peringatan stok menipis untuk produk tersebut. *(FR-14, BR-15)*

### 9.2 Modul Transaksi
**AC-04**
Given stok produk "Beras 5kg" tersisa 3 unit,
When pengguna membuat transaksi dengan jumlah 5 unit produk tersebut,
Then sistem menolak transaksi dan menampilkan pesan bahwa jumlah melebihi stok tersedia. *(FR-17, BR-05)*

**AC-05**
Given pengguna memilih status pembayaran "Utang" pada form transaksi,
When pengguna mencoba menyimpan transaksi tanpa mengisi nama dan nomor HP pembeli,
Then sistem menolak penyimpanan dan menandai field nama/nomor HP sebagai wajib diisi. *(FR-21, BR-08)*

**AC-06**
Given transaksi berhasil disimpan dengan status Lunas,
When sistem menyimpan transaksi,
Then stok setiap produk pada transaksi berkurang sesuai jumlah yang terjual, dan harga jual/harga modal produk pada saat itu tersimpan sebagai snapshot pada detail transaksi. *(FR-22, FR-23, BR-09, BR-10)*

### 9.3 Modul Void
**AC-07**
Given sebuah transaksi dibuat pada hari yang sama dan belum melewati batas waktu pembatalan,
When pengguna memilih "Batalkan Transaksi" dan mengonfirmasi,
Then status transaksi berubah menjadi "Dibatalkan", stok setiap item pada transaksi tersebut dikembalikan ke jumlah semula, dan transaksi tetap muncul pada riwayat dengan status "Dibatalkan". *(FR-25, FR-27, FR-28, BR-13)*

**AC-08**
Given sebuah transaksi dibuat kemarin dan batas waktu pembatalan adalah hari yang sama,
When pengguna mencoba membatalkan transaksi tersebut hari ini,
Then sistem menolak pembatalan dan menampilkan pesan bahwa batas waktu pembatalan telah lewat. *(FR-26, BR-13)*

**AC-09**
Given terdapat transaksi berstatus "Dibatalkan" pada suatu periode,
When pengguna melihat laporan omzet untuk periode tersebut,
Then nilai transaksi yang dibatalkan tidak diikutsertakan dalam perhitungan omzet dan profit. *(FR-39, BR-13)*

### 9.4 Modul Pelunasan Cicilan
**AC-10**
Given transaksi Utang memiliki sisa saldo Rp100.000,
When pengguna mencatat pembayaran sebesar Rp40.000,
Then sisa saldo utang pada transaksi tersebut menjadi Rp60.000 dan status transaksi tetap "Utang", dengan entri pembayaran baru tercatat pada riwayat pelunasan. *(FR-30, FR-31, FR-32, BR-14)*

**AC-11**
Given transaksi Utang memiliki sisa saldo Rp60.000,
When pengguna mencatat pembayaran sebesar Rp60.000,
Then sisa saldo utang menjadi Rp0 dan status transaksi otomatis berubah menjadi "Lunas". *(FR-34, BR-14)*

**AC-12**
Given transaksi Utang memiliki sisa saldo Rp60.000,
When pengguna mencoba mencatat pembayaran sebesar Rp100.000,
Then sistem menolak input dan menampilkan pesan bahwa jumlah pembayaran melebihi sisa saldo utang. *(FR-33, BR-14)*

### 9.5 Modul Laporan & Ekspor (Feature Development)
**AC-13**
Given terdapat data transaksi aktif (bukan yang dibatalkan) pada rentang 1–30 September 2026,
When pengguna memilih rentang tanggal tersebut pada halaman laporan,
Then sistem menampilkan total omzet, estimasi profit, dan daftar transaksi yang sesuai dengan periode tersebut dalam waktu kurang dari 5 detik. *(FR-35, FR-36, FR-39)*

**AC-14**
Given pengguna berada pada halaman laporan utang,
When terdapat transaksi Utang dengan sisa saldo > 0,
Then transaksi tersebut ditampilkan pada daftar utang beserta riwayat cicilan yang sudah dibayarkan. *(FR-37)*

**AC-15**
Given pengguna berada pada halaman laporan penjualan periode tertentu,
When pengguna memilih opsi "Ekspor ke Excel" atau "Ekspor ke PDF",
Then sistem menghasilkan file dengan data sesuai laporan pada layar, mencantumkan rentang periode dan tanggal pembuatan file, serta file dapat diunduh oleh pengguna. *(FR-40, FR-42, IR-07, IR-08)*

**AC-16**
Given data transaksi pada periode tertentu tersedia,
When pengguna membuka halaman tren produk,
Then sistem menampilkan minimal 5 produk dengan jumlah unit terjual tertinggi pada periode tersebut, diurutkan dari yang tertinggi. *(FR-38)*

### 9.6 Modul Dashboard
**AC-17**
Given pengguna berhasil login,
When halaman dashboard dimuat,
Then sistem menampilkan ringkasan omzet dan estimasi profit periode berjalan, daftar produk dengan stok di bawah ambang batas minimum, dan total saldo utang yang belum lunas — seluruhnya dalam waktu kurang dari 3 detik pada koneksi mobile standar. *(FR-43, FR-44, FR-45, NFR-01)*

---

*Dokumen ini merupakan turunan teknis dari PRD Kendi's Market — Revisi 2 dan akan diperbarui apabila terdapat perubahan pada PRD acuan.*
