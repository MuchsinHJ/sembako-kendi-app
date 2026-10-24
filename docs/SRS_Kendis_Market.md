# Software Requirements Specification (SRS)
## Kendi's Market — Sistem Pengelolaan Penjualan UMKM

**Versi:** 1.1
**Diturunkan dari:** PRD Kendi's Market (Revisi 4)
**Platform:** Mobile Web

> **Catatan revisi 1.1 (2026-10-24).** Dokumen ini diselaraskan dengan **SDD Backend v1.1** yang menambahkan modul **Konsinyasi (Penitipan Barang)** ke ruang lingkup MVP. Perubahan: konsinyasi dipindahkan dari *Future Development* ke MVP (§1.2, §1.3), functional requirement baru **FR-46–FR-49** (§4.9), business rule baru **BR-17–BR-26** (§5), tiga entity baru pada §7, serta acceptance criteria **AC-18–AC-19** (foto produk & penyesuaian stok manual) dan **AC-20–AC-26** (konsinyasi) pada §9.7–§9.8. Seluruh nomor FR/BR/AC sengaja dilanjutkan dari nomor terakhir v1.0 agar tidak bentrok dengan ID yang sudah dipakai. Penanganan barang titipan rusak/hilang/kedaluwarsa serta koreksi/pembatalan setoran tetap berada di luar cakupan MVP.

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
- Penitipan barang pihak ketiga (konsinyasi): data penitip, produk titipan, penerimaan/retur barang, kewajiban & setoran ke penitip
- Laporan penjualan, laporan utang, laporan konsinyasi, dan tren produk
- Dashboard ringkasan omzet, profit, dan total kewajiban penitip

Dokumen ini mencakup seluruh fitur **MVP** sebagaimana didefinisikan dalam PRD. Fitur yang berstatus *Future Development* pada PRD (pemantauan kedaluwarsa, penanganan barang titipan rusak/hilang, koreksi/pembatalan setoran penitip, pemisahan role Owner/Kasir) **tidak** dicakup dalam SRS ini dan akan didokumentasikan terpisah pada fase berikutnya. Ekspor laporan (FR-40–FR-42) tetap didokumentasikan sebagai *Feature Development* sesuai keputusan PRD.

### 1.3 Ringkasan Asumsi & Batasan MVP
- Sistem digunakan oleh **satu toko/satu akun utama** (belum mendukung multi-cabang).
- Sistem menggunakan **satu role pengguna** (User) — belum ada pemisahan hak akses Owner/Kasir.
- Metode pembayaran yang didukung hanya **tunai**; integrasi pembayaran digital (QRIS/e-wallet) berada di luar cakupan MVP.
- **Konsinyasi (produk titipan pihak ketiga) termasuk cakupan MVP.** Barang titipan dimodelkan sebagai produk biasa bertipe `TITIPAN` yang terhubung ke satu penitip — bukan modul kasir terpisah.
- **Pemantauan tanggal kedaluwarsa** serta **penanganan barang titipan rusak/hilang (write-off)** berada di luar cakupan MVP — didorong ke Future Development.
- Penitip diperlakukan sebagai **data referensi**, bukan pengguna sistem: penitip tidak memiliki akun/login dan tidak mengakses aplikasi.
- Setoran ke penitip bersifat **append-only**; koreksi/pembatalan setoran yang salah input belum tersedia pada MVP (Future Development).
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

Kebutuhan lain yang muncul dari praktik nyata toko adalah **penitipan barang pihak ketiga**: barang milik orang lain dititipkan untuk dijual, lalu pemilik toko menyetor hasil penjualannya kepada penitip. Sebelumnya proses ini hanya dicatat di buku terpisah sehingga kewajiban toko terhadap penitip sering tidak akurat. SRS revisi ini memasukkannya ke MVP sebagai produk bertipe `TITIPAN` yang terhubung ke data penitip, dengan kewajiban yang dihitung otomatis dari transaksi penjualan.

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
| Membuat transaksi (Lunas/Utang) | ✓ | Status pembayaran diturunkan dari uang diterima vs total |
| Membatalkan/void transaksi | ✓ (bersyarat) | Hanya dalam batas waktu yang ditentukan (mis. hari yang sama) |
| Mencatat pelunasan utang (penuh/cicilan) | ✓ | — |
| Melihat riwayat transaksi | ✓ | Termasuk transaksi berstatus "Dibatalkan" |
| Melihat dashboard & laporan | ✓ | Omzet, profit, tren produk |
| Melihat laporan utang | ✓ | Termasuk riwayat cicilan |
| Mengelola data penitip | ✓ | Tambah, ubah, lihat daftar/detail, aktif/nonaktif (FR-46) |
| Mengelola produk titipan | ✓ | Membuat produk bertipe `TITIPAN` yang terhubung ke penitip; tipe & penitip tidak dapat diubah setelah dibuat (FR-46, BR-17) |
| Mencatat penerimaan & retur titipan | ✓ | Menambah/mengurangi stok dengan jejak pergerakan (FR-47) |
| Melihat saldo & mencatat setoran ke penitip | ✓ | Setoran bersifat append-only; tidak ada edit/hapus (FR-48) |
| Melihat laporan konsinyasi | ✓ | Per penitip untuk periode yang dipilih (FR-49) |

Catatan: **penitip bukan pengguna sistem**. Data penitip hanyalah referensi yang dikelola `User`; penitip tidak memiliki akun, password, maupun hak akses apa pun.

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

> **Revisi konsinyasi.** Produk kini memiliki atribut `tipe` (`MILIK_SENDIRI` / `TITIPAN`) dan `consignorId` (opsional). Kedua atribut tersebut **tidak dapat diubah** setelah produk dibuat (BR-17), sehingga perubahan data produk (FR-09) tidak mencakup perpindahan tipe maupun penitip. Untuk produk `TITIPAN`, `hargaModal` bermakna **harga setor per unit kepada penitip**, sehingga rumus profit pada FR-36 tetap berlaku tanpa perubahan. Pengelolaan produk titipan diatur pada FR-46.

### 4.3 Modul Transaksi

| ID | Requirement | Referensi PRD |
|---|---|---|
| FR-16 | Sistem harus memungkinkan pengguna memilih satu atau lebih produk beserta jumlah dalam satu transaksi. | US-04, BR-06 |
| FR-17 | Sistem harus menolak input jumlah produk yang ≤ 0 atau melebihi stok yang tersedia. | BR-05 |
| FR-18 | Sistem harus menghitung total transaksi sebagai penjumlahan (harga jual × jumlah) dari setiap item. | BR-07 |
| FR-19 | Sistem harus menampilkan format nilai uang dalam Rupiah (Rp) dengan pemisah ribuan. | BR-16 |
| FR-20 | Sistem harus mencatat uang tunai yang diterima dari pembeli (`uangDiterima`) dan **menurunkan status pembayaran secara otomatis**: jika `uangDiterima >= total` maka status **Lunas** dan sistem menghitung kembalian (`uangDiterima − total`); jika `uangDiterima < total` maka status **Utang** dan sistem menghitung sisa saldo (`total − uangDiterima`). | US-04, BR-08 |
| FR-21 | Jika `uangDiterima < total` (transaksi Utang), sistem harus mewajibkan input nama pembeli (nomor HP opsional) sebelum transaksi dapat disimpan. | BR-08 |
| FR-22 | Sistem harus mengurangi stok produk secara otomatis segera setelah transaksi berhasil disimpan, baik untuk status Lunas maupun Utang. | BR-09 |
| FR-23 | Sistem harus menyimpan harga jual dan harga modal **pada saat transaksi terjadi** (snapshot), terlepas dari perubahan harga produk di kemudian hari. | BR-10 |
| FR-24 | Sistem harus mencatat setiap transaksi ke dalam riwayat transaksi yang dapat ditelusuri kembali berdasarkan tanggal/periode. | US-05 |

### 4.4 Modul Void / Pembatalan Transaksi

| ID | Requirement | Referensi PRD |
|---|---|---|
| FR-25 | Sistem harus memungkinkan pengguna membatalkan (void) transaksi yang sudah tersimpan, selama masih dalam batas **24 jam** sejak transaksi dibuat (rolling window, dihitung server). | US-10, BR-13 |
| FR-26 | Sistem harus menolak pembatalan transaksi yang telah melewati batas **24 jam** tersebut, disertai pesan penjelasan. | BR-13 |
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

### 4.9 Modul Konsinyasi (Penitipan Barang)

Modul ini menangani seluruh siklus barang titipan pihak ketiga. Barang titipan **bukan** entitas terpisah: ia produk biasa ber-`tipe = TITIPAN` dengan `consignorId` terisi, sehingga alur transaksi, void, dan stok tidak berubah.

| ID | Requirement | Referensi PRD |
|---|---|---|
| FR-46 | Sistem harus memungkinkan pengguna mengelola data penitip (tambah, ubah, lihat daftar/detail, aktif/nonaktif) dan membuat produk titipan yang terhubung ke penitip, termasuk memfilter katalog produk berdasarkan tipe dan penitip. | US-14, BR-17 |
| FR-47 | Sistem harus memungkinkan pengguna mencatat penerimaan barang titipan (menambah stok) dan retur ke penitip (mengurangi stok), serta melihat riwayat pergerakan penerimaan/retur tersebut. | US-15, BR-19, BR-25 |
| FR-48 | Sistem harus menampilkan kewajiban/saldo per penitip, memungkinkan pengguna mencatat setoran kepada penitip, dan menampilkan riwayat setoran tersebut. | US-16, BR-20, BR-22, BR-23 |
| FR-49 | Sistem harus menampilkan laporan konsinyasi per penitip untuk periode yang dipilih, serta menampilkan total kewajiban penitip pada dashboard. | US-17, BR-21 |

**Ketentuan turunan yang mengikat implementasi:**
- **Kewajiban penitip bersifat turunan (derived), bukan kolom tersimpan.** Nilainya dihitung sebagai `SUM(jumlah × hargaModalSnapshot)` dari detail transaksi berstatus aktif milik produk penitip tersebut, dikurangi `SUM(jumlahBayar)` dari setoran yang telah dicatat. Konsekuensinya, void transaksi otomatis mengoreksi kewajiban tanpa logika tambahan (BR-22), dan saldo dapat bernilai **negatif** bila penitip sudah disetor melebihi kewajiban.
- **Kewajiban timbul saat barang terjual**, terlepas dari status pembayaran pembeli (Lunas maupun Utang), karena toko telah mengakui penjualan tersebut.
- **Penerimaan dan retur bersifat append-only** dan mencatat `stokSebelum`/`stokSesudah` sebagai jejak audit; `consignorId` pada catatan pergerakan diambil dari produk, bukan dari input pengguna.
- **Setoran ke penitip bersifat append-only** — tidak ada endpoint ubah/hapus pada MVP. Setoran tetap diizinkan untuk penitip berstatus nonaktif (BR-23).
- Laporan konsinyasi menampilkan **saldo akhir all-time**, bukan saldo per akhir periode, agar dapat direkonsiliasi dengan endpoint saldo penitip.
- Status penitip (`AKTIF`/`NONAKTIF`) dan status produk (`AKTIF`/`NONAKTIF`) adalah dua level terpisah; saldo tidak bergantung pada keduanya.
- Penanganan barang titipan **rusak/hilang/kedaluwarsa** dan **koreksi/pembatalan setoran** tidak termasuk MVP.

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
| BR-08 | Status pembayaran transaksi ditentukan dari uang tunai yang diterima (`uangDiterima`) dibandingkan dengan total transaksi. Jika `uangDiterima >= total` → Lunas (kelebihan dicatat sebagai kembalian); jika `uangDiterima < total` → Utang, wajib menyimpan nama pembeli (nomor HP opsional) beserta sisa saldo yang belum dibayar. |
| BR-09 | Stok berkurang segera setelah transaksi berhasil disimpan, untuk status Lunas maupun Utang. |
| BR-10 | Perubahan harga produk tidak memengaruhi nilai historis pada transaksi yang sudah terjadi (snapshot harga per transaksi). |
| BR-11 | Perhitungan profit = nilai penjualan − harga modal yang tercatat pada saat transaksi. |
| BR-12 | Produk dengan riwayat transaksi tidak dapat dihapus permanen — hanya dapat dinonaktifkan (soft delete). Produk tanpa riwayat transaksi dapat dihapus permanen. |
| BR-13 | Transaksi hanya dapat dibatalkan dalam **24 jam** sejak transaksi dibuat (rolling window). Pembatalan mengembalikan stok dan mengubah status menjadi "Dibatalkan" tanpa menghapus data dari riwayat. |
| BR-14 | Transaksi Utang dapat dilunasi penuh atau bertahap. Setiap pembayaran tercatat sebagai riwayat pada transaksi terkait; status otomatis menjadi Lunas saat saldo mencapai 0. |
| BR-15 | Setiap produk dapat memiliki ambang batas stok minimum (dapat diubah per produk); sistem menampilkan peringatan saat stok mencapai atau berada di bawah ambang batas tersebut. |
| BR-16 | Seluruh nilai uang ditampilkan dalam format Rupiah (Rp) dengan pemisah ribuan, tanpa desimal. |
| BR-17 | Produk bertipe `TITIPAN` wajib memiliki `consignorId`; produk bertipe `MILIK_SENDIRI` wajib memiliki `consignorId` kosong (`null`). Atribut `tipe` dan `consignorId` **tidak dapat diubah** setelah produk dibuat. |
| BR-18 | Pada produk `TITIPAN`, harga jual harus **≥ harga modal (harga setor)**. Pelanggaran ditolak sebagai pelanggaran business rule (HTTP 422). |
| BR-19 | Penerimaan titipan menambah stok; retur mengurangi stok dan tidak boleh melebihi stok yang tersedia saat itu (BR-04 tetap berlaku). Keduanya dicatat secara append-only beserta stok sebelum dan sesudah. |
| BR-20 | Setoran kepada penitip harus > 0 dan **tidak boleh melebihi saldo kewajiban saat itu**; bila saldo ≤ 0, setoran apa pun ditolak. Pengecekan dilakukan ulang di dalam transaksi database dengan penguncian baris penitip agar dua setoran paralel tidak sama-sama lolos. |
| BR-21 | Penitip tidak pernah dihapus. Penonaktifan penitip hanya diizinkan bila **semua** produk titipannya berstok 0; produk yang masih aktif dengan stok 0 otomatis ikut dinonaktifkan. Saldo kewajiban tidak harus 0 saat penitip dinonaktifkan. Bila masih ada produk berstok > 0, penonaktifan ditolak disertai daftar produk penghalang. Mengaktifkan kembali penitip diizinkan kapan saja, namun produknya tidak ikut aktif otomatis. |
| BR-22 | Void transaksi tetap diizinkan walau menyebabkan saldo penitip menjadi **negatif** (penitip sudah menerima setoran melebihi kewajiban). Saldo negatif ditampilkan apa adanya dan tidak memblokir void; setoran baru ditolak sampai saldo kembali > 0. |
| BR-23 | Penitip berstatus `NONAKTIF` tidak dapat dipakai untuk membuat produk titipan baru, menerima titipan baru, atau mengaktifkan kembali produk titipannya. **Setoran kepada penitip tersebut tetap diizinkan.** |
| BR-24 | Produk `TITIPAN` hanya dapat dinonaktifkan bila stoknya = 0, dan hanya dapat diaktifkan bila penitipnya berstatus `AKTIF`. Aturan ini tidak berlaku bagi produk `MILIK_SENDIRI`. |
| BR-25 | Penerimaan titipan hanya dapat dilakukan untuk produk `TITIPAN` berstatus `AKTIF` yang dimiliki penitip berstatus `AKTIF`. |
| BR-26 | Produk titipan yang sudah memiliki riwayat transaksi **atau** riwayat penerimaan/retur tidak dapat dihapus permanen (BR-12 tetap berlaku). |

> **Pemetaan dari spesifikasi fitur.** Label BR-A…BR-J pada `backend/PROMPT_Fitur_Penitipan_Barang.md` dipetakan berurutan: BR-A→BR-17, BR-B→BR-18, BR-C→BR-19, BR-D→BR-20, BR-E→BR-21, BR-F→BR-22, BR-G→BR-23, BR-H→BR-24, BR-I→BR-25, BR-J→BR-26. Pemetaan yang sama dipakai pada SDD §3.14 dan label test.

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
| harga_modal | Decimal | Harga modal saat ini; untuk produk `titipan` bermakna **harga setor per unit ke penitip** (BR-18: harga jual ≥ harga modal) |
| stok | Integer | Stok saat ini (BR-04: ≥ 0) |
| stok_minimum | Integer | Ambang batas peringatan stok (BR-15) |
| status | Enum (`aktif`, `nonaktif`) | Untuk mekanisme soft delete (BR-12, BR-24) |
| tipe | Enum (`milik_sendiri`, `titipan`) | Default `milik_sendiri`; **tidak dapat diubah** setelah dibuat (BR-17) |
| consignor_id | FK → Consignor (nullable) | Wajib diisi bila `tipe = titipan`, wajib `null` bila `milik_sendiri`; **tidak dapat diubah** setelah dibuat (BR-17) |
| foto_url | String (opsional) | Foto produk |
| created_at / updated_at | Timestamp | Audit waktu |

### 7.3 Entity: `Transaksi`
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID / Integer (PK) | Identitas unik transaksi |
| tanggal | Timestamp | Waktu transaksi dibuat |
| total | Decimal | Total nilai transaksi (BR-07) |
| uang_diterima | Decimal (nullable untuk data historis; wajib diisi untuk transaksi baru) | Uang tunai yang diserahkan pembeli (FR-20, BR-08) |
| kembalian | Decimal (nullable) | `uang_diterima − total` bila Lunas; `null` bila Utang (FR-20) |
| status_pembayaran | Enum (`lunas`, `utang`) | Diturunkan otomatis dari `uang_diterima` vs `total` (FR-20, BR-08) |
| status_transaksi | Enum (`aktif`, `dibatalkan`) | BR-13 |
| nama_pembeli | String (nullable, wajib jika utang) | BR-08 |
| no_hp_pembeli | String (nullable, opsional jika utang) | BR-08 |
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

### 7.6 Entity: `Consignor` (Penitip)
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID (PK) | Identitas unik penitip |
| nama | String | Nama penitip atau nama usaha penitip |
| no_hp | String (opsional) | Kontak penitip |
| catatan | String (opsional) | Catatan bebas (mis. alamat, kesepakatan bagi hasil) |
| status | Enum (`aktif`, `nonaktif`) | Penonaktifan menggantikan penghapusan (BR-21) |
| created_at / updated_at | Timestamp | Audit waktu |

Catatan: penitip **bukan** pengguna sistem dan tidak memiliki kredensial login. Tidak ada operasi hapus permanen pada entity ini (BR-21).

### 7.7 Entity: `ConsignmentMovement` (Pergerakan Barang Titipan)
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID (PK) | Identitas unik catatan pergerakan |
| consignor_id | FK → Consignor | **Diambil dari produk**, bukan input pengguna |
| product_id | FK → Produk | Produk titipan yang bergerak |
| tipe | Enum (`terima`, `retur`) | Arah pergerakan: menambah atau mengurangi stok (BR-19) |
| jumlah | Integer | Jumlah unit yang bergerak; selalu > 0, arah ditentukan `tipe` (BR-19) |
| stok_sebelum | Integer | Stok produk sebelum pergerakan (jejak audit) |
| stok_sesudah | Integer | Stok produk sesudah pergerakan; tidak boleh negatif (BR-04) |
| catatan | String (opsional) | Keterangan tambahan |
| dicatat_oleh (user_id) | FK → User | Audit trail |
| created_at | Timestamp | Waktu pergerakan dicatat |

Entity ini bersifat **append-only**: tidak ada operasi ubah maupun hapus.

### 7.8 Entity: `ConsignorPayment` (Setoran ke Penitip)
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID (PK) | Identitas unik entri setoran |
| consignor_id | FK → Consignor | Penitip penerima setoran |
| tanggal_bayar | Timestamp | Waktu setoran dicatat |
| jumlah_bayar | Decimal | Nominal setoran; > 0 dan ≤ saldo saat itu (BR-20) |
| saldo_setelah_bayar | Decimal | **Snapshot audit** saldo setelah setoran ini; saldo aktual selalu dihitung ulang dari sumber (BR-22) |
| catatan | String (opsional) | Keterangan tambahan |
| dicatat_oleh (user_id) | FK → User | Audit trail |
| created_at | Timestamp | Audit waktu |

Entity ini bersifat **append-only**; koreksi/pembatalan setoran belum tersedia pada MVP.

**Relasi utama:**
`User (1) — (N) Transaksi`
`Transaksi (1) — (N) Detail_Transaksi (N) — (1) Produk`
`Transaksi (1) — (N) Riwayat_Pembayaran_Utang` (khusus transaksi berstatus Utang)
`Consignor (1) — (N) Produk` (khusus produk bertipe `titipan`)
`Consignor (1) — (N) ConsignmentMovement` dan `Produk (1) — (N) ConsignmentMovement`
`Consignor (1) — (N) ConsignorPayment`
`User (1) — (N) ConsignmentMovement` dan `User (1) — (N) ConsignorPayment` (audit trail pencatat)

**Nilai kewajiban penitip tidak disimpan sebagai kolom.** Saldo penitip diturunkan dari `SUM(Detail_Transaksi.jumlah × harga_modal_snapshot)` pada transaksi berstatus aktif milik produk penitip tersebut, dikurangi `SUM(ConsignorPayment.jumlah_bayar)`. Lihat FR-48 dan BR-22.

---

## 8. Interface Requirements

### 8.1 Antarmuka Pengguna (UI)
- **IR-01**: Seluruh antarmuka dirancang **mobile-first**, dioptimalkan untuk layar smartphone, dan tetap *responsive* pada tablet/desktop.
- **IR-02**: Seluruh teks, label, dan pesan sistem menggunakan **Bahasa Indonesia**.
- **IR-03**: Form transaksi harus memungkinkan pemilihan produk dan input jumlah dengan jumlah tap/klik minimum (mendukung target penyelesaian transaksi < 30 detik pada metrik sukses PRD).
- **IR-04**: Nilai uang pada seluruh layar ditampilkan dalam format Rupiah (Rp) dengan pemisah ribuan (BR-16).
- **IR-05**: Dashboard menampilkan indikator visual (mis. badge/warna) untuk produk dengan stok di bawah ambang batas minimum.
- **IR-06**: Tombol pembatalan transaksi (void) hanya ditampilkan pada transaksi yang masih memenuhi syarat batas waktu pembatalan (BR-13); di luar itu, tombol disembunyikan atau dinonaktifkan dengan keterangan.
- **IR-10**: Form tambah/ubah produk harus memuat pilihan **tipe produk** (milik sendiri/titipan) dan, bila tipe titipan, pilihan **penitip**. Pada mode ubah, kedua field ditampilkan sebagai *read-only* disertai keterangan bahwa tipenya tidak dapat diubah (BR-17).
- **IR-11**: Halaman produk titipan harus menyediakan aksi cepat **Terima Titipan** dan **Retur ke Penitip**, serta menampilkan riwayat pergerakan barang titipan per produk/per penitip (FR-47).
- **IR-12**: Halaman penitip harus menampilkan **saldo kewajiban** saat ini secara menonjol, beserta aksi **Catat Setoran** dan daftar riwayat setoran (FR-48). Bila saldo bernilai negatif (BR-22), nilainya ditampilkan dengan penanda jelas (mis. warna peringatan) dan setoran baru dinonaktifkan sampai saldo kembali positif.
- **IR-13**: Dashboard menampilkan kartu **Total Kewajiban Penitip** di samping total saldo utang pembeli (FR-49).
- **IR-14**: Laporan konsinyasi menampilkan kolom per penitip (terjual, modal/kewajiban periode, disetor periode, saldo akhir) beserta total pada periode terpilih; saldo akhir diberi keterangan bahwa nilainya **all-time**, bukan saldo per akhir periode (FR-49).

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
Given total transaksi adalah Rp30.000 dan pengguna memasukkan uang diterima Rp10.000 (kurang dari total),
When pengguna mencoba menyimpan transaksi tanpa mengisi nama pembeli,
Then sistem menolak penyimpanan dan menandai field nama sebagai wajib diisi (nomor HP opsional). *(FR-20, FR-21, BR-08)*

**AC-05a**
Given total transaksi adalah Rp20.000 dan pengguna memasukkan uang diterima Rp50.000,
When transaksi disimpan,
Then sistem menetapkan status pembayaran **Lunas** dan menampilkan kembalian sebesar Rp30.000. *(FR-20, BR-08)*

**AC-05b**
Given total transaksi adalah Rp30.000 dan pengguna memasukkan uang diterima Rp10.000 serta nama pembeli,
When transaksi disimpan,
Then sistem menetapkan status pembayaran **Utang** dengan sisa saldo Rp20.000, dan stok produk tetap berkurang sesuai jumlah terjual (BR-09). *(FR-20, FR-22, BR-08)*

**AC-06**
Given transaksi berhasil disimpan dengan status Lunas,
When sistem menyimpan transaksi,
Then stok setiap produk pada transaksi berkurang sesuai jumlah yang terjual, dan harga jual/harga modal produk pada saat itu tersimpan sebagai snapshot pada detail transaksi. *(FR-22, FR-23, BR-09, BR-10)*

### 9.3 Modul Void
**AC-07**
Given sebuah transaksi dibuat kurang dari 24 jam yang lalu dan belum dibatalkan,
When pengguna memilih "Batalkan Transaksi" dan mengonfirmasi,
Then status transaksi berubah menjadi "Dibatalkan", stok setiap item pada transaksi tersebut dikembalikan ke jumlah semula, dan transaksi tetap muncul pada riwayat dengan status "Dibatalkan". *(FR-25, FR-27, FR-28, BR-13)*

**AC-08**
Given sebuah transaksi dibuat lebih dari 24 jam yang lalu,
When pengguna mencoba membatalkan transaksi tersebut,
Then sistem menolak pembatalan dan menampilkan pesan bahwa batas waktu pembatalan (24 jam) telah lewat. *(FR-26, BR-13)*

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

### 9.7 Modul Foto Produk & Penyesuaian Stok Manual *(revisi 1.1)*
Acceptance criteria berikut melengkapi perluasan FR-07/FR-09 (field `foto_url`) dan FR-15 (penyesuaian stok manual) yang sebelumnya belum memiliki ID AC resmi.

**AC-18**
Given pengguna sudah login dan sebuah produk sudah tersimpan,
When pengguna mengunggah berkas bertipe di luar daftar yang diizinkan sebagai foto produk, atau berkas yang MIME-nya gambar namun isinya bukan gambar valid,
Then sistem menolak unggahan dengan pesan yang jelas (HTTP 415 untuk tipe tidak didukung, HTTP 400 untuk isi berkas tidak valid) dan foto produk tidak berubah. *(Perluasan FR-07/FR-09)*

**AC-19**
Given stok produk "Gula 1kg" saat ini 10 unit,
When pengguna mencatat penyesuaian stok manual sebesar −12 unit,
Then sistem menolak penyesuaian tersebut dengan pesan bahwa stok tidak boleh menjadi negatif, dan stok tetap 10 unit. Selanjutnya,
Given pengguna mencatat penyesuaian stok sebesar +5 unit namun mengosongkan alasan penyesuaian,
Then sistem menolak permintaan sebagai kesalahan validasi karena alasan wajib diisi untuk audit. *(FR-15, BR-04)*

### 9.8 Modul Konsinyasi *(revisi 1.1)*

**AC-20** — Pendaftaran penitip dan produk titipan
Given pengguna sudah login,
When pengguna menambahkan produk bertipe `TITIPAN` tanpa memilih penitip, atau memilih tipe `MILIK_SENDIRI` namun mengisi penitip,
Then sistem menolak penyimpanan dengan pesan bahwa produk titipan wajib memiliki penitip dan produk milik sendiri tidak boleh memiliki penitip (BR-17). Selanjutnya,
Given produk titipan "Keripik Singkong" sudah tersimpan dan terhubung ke penitip "Ibu Sari",
When pengguna mencoba mengubah tipe produk tersebut menjadi `MILIK_SENDIRI` atau memindahkannya ke penitip lain,
Then sistem menolak perubahan tersebut dengan pesan bahwa tipe dan penitip tidak dapat diubah setelah produk dibuat. *(FR-46, BR-17)*

**AC-21** — Harga jual produk titipan
Given pengguna menambahkan produk titipan dengan harga setor kepada penitip Rp10.000 per unit,
When pengguna mengisi harga jual Rp9.000 atau lebih rendah dari harga setor,
Then sistem menolak penyimpanan dengan pesan bahwa harga jual produk titipan harus lebih besar atau sama dengan harga setor. *(FR-46, BR-18)*

**AC-22** — Penerimaan dan retur barang titipan
Given produk titipan "Keripik Singkong" memiliki stok 5 unit,
When pengguna mencatat penerimaan 10 unit,
Then stok produk menjadi 15 unit dan tercatat satu entri pergerakan bertipe "Terima" berisi jumlah, stok sebelum (5), dan stok sesudah (15) pada riwayat pergerakan. Selanjutnya,
Given stok produk tersebut 15 unit,
When pengguna mencatat retur 20 unit,
Then sistem menolak retur karena melebihi stok tersedia, dan stok tetap 15 unit. *(FR-47, BR-19)*

**AC-23** — Kewajiban penitip dan validasi setoran
Given penitip "Ibu Sari" belum pernah menjual barang titipannya sehingga saldonya Rp0,
When pengguna mencoba mencatat setoran sebesar Rp10.000,
Then sistem menolak setoran tersebut. Selanjutnya,
Given 3 unit barang titipan dengan harga setor Rp10.000 telah terjual sehingga saldo menjadi Rp30.000,
When pengguna mencatat setoran Rp40.000,
Then sistem menolak karena melebihi saldo, dan saldo tetap Rp30.000; ketika pengguna mencatat setoran Rp12.000, sistem menerimanya, saldo menjadi Rp18.000, dan entri setoran tersimpan pada riwayat setoran. *(FR-48, BR-20)*

**AC-24** — Penonaktifan penitip dan produk titipan
Given penitip "Ibu Sari" masih memiliki produk titipan dengan stok 4 unit,
When pengguna mencoba menonaktifkan penitip tersebut,
Then sistem menolak dan menampilkan daftar produk yang masih memiliki stok. Selanjutnya,
Given seluruh produk titipan penitip tersebut sudah berstok 0,
When pengguna menonaktifkan penitip tersebut,
Then status penitip berubah menjadi nonaktif tanpa menghapus data penitip maupun riwayatnya, dan produk titipannya yang masih aktif otomatis ikut nonaktif. *(FR-46, BR-21, BR-24)*

**AC-25** — Void setelah setoran dan setoran pada penitip nonaktif
Given penitip "Ibu Sari" telah menerima setoran penuh Rp20.000 atas 2 unit barang titipan yang terjual, sehingga saldonya Rp0,
When pengguna membatalkan (void) transaksi penjualan tersebut,
Then void tetap berhasil, saldo penitip menjadi **−Rp20.000** dan ditampilkan apa adanya, dan setoran baru ditolak sampai saldo kembali positif. Selanjutnya,
Given penitip tersebut berstatus nonaktif namun masih memiliki saldo Rp20.000,
When pengguna mencatat setoran Rp20.000,
Then sistem menerima setoran tersebut — setoran tetap diizinkan untuk penitip nonaktif. *(FR-48, BR-22, BR-23)*

**AC-26** — Laporan konsinyasi dan total kewajiban penitip
Given terdapat transaksi penjualan barang titipan dari dua penitip pada periode 1–31 Oktober 2026, salah satunya sudah menerima setoran sebagian,
When pengguna membuka laporan konsinyasi untuk periode tersebut,
Then sistem menampilkan baris per penitip berisi omzet terjual, modal/kewajiban yang timbul pada periode, setoran pada periode, dan saldo akhir all-time, beserta total periode — dan nilai saldo akhir setiap baris sama dengan saldo pada halaman detail penitip terkait. Selanjutnya,
When dashboard dimuat,
Then nilai "Total Kewajiban Penitip" sama dengan jumlah saldo **positif** seluruh penitip, termasuk penitip nonaktif, tanpa dikurangi saldo negatif penitip lain. *(FR-49, BR-21, BR-22)*

---

*Dokumen ini merupakan turunan teknis dari PRD Kendi's Market (Revisi 4) dan diselaraskan dengan SDD Backend v1.1. Dokumen akan diperbarui apabila terdapat perubahan pada PRD acuan atau SDD.*
