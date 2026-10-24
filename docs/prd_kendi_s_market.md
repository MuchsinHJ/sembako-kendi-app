# PRD Kendi's Market
**Product Requirements Document | Versi MVP – Revisi 4 (Penyelarasan dengan SDD Backend v1.1)**

*Catatan revisi: bagian yang ditandai **[BARU/REVISI]** adalah penambahan/perbaikan dari draft sebelumnya berdasarkan review PM. Bagian bertanda **[REVISI 4]** merupakan penyelarasan dengan SDD Backend v1.1 — terutama pemindahan modul konsinyasi ke ruang lingkup MVP.*

> **Ringkasan Revisi 4 (Oktober 2026).** Modul **Konsinyasi (Penitipan Barang)** dipindahkan dari *Future Development* ke **MVP** setelah SDD Backend v1.1 menyelesaikan desain dan implementasinya. Requirement baru dinomori lanjut — **FR-46–FR-49**, **BR-17–BR-26**, dan **US-14–US-17** — agar tidak bentrok dengan penomoran Revisi 2/3; acceptance criteria rincinya ada di SRS v1.1 (**AC-20–AC-26**, §9.8), sementara ringkasan tingkat produk ditambahkan di §14. Penanganan barang titipan rusak/hilang/kedaluwarsa, koreksi/pembatalan setoran, serta penilaian stok batch/FIFO tetap berada di Future Development.

---

## 1. Product Overview
* **Nama produk:** Kendi's Market
* **Platform:** Mobile Web (website yang dioptimalkan untuk penggunaan melalui smartphone dan tetap responsive pada tablet/desktop).
* **Deskripsi:** Sistem digital berbasis web untuk membantu UMKM mengelola produk, stok, transaksi penjualan, piutang/utang pembeli, dan laporan penjualan secara lebih terstruktur.
* **Tujuan:** Menyediakan sistem pencatatan dan pengelolaan penjualan yang lebih cepat, terstruktur, dan mudah digunakan melalui smartphone, sehingga pemilik usaha dapat memantau kondisi penjualan dan stok dengan lebih baik.
* **Latar belakang:** Berdasarkan kondisi yang disampaikan client, pencatatan transaksi masih dilakukan secara manual. Pemilik juga terkadang kesulitan mengingat harga produk, memperkirakan stok, serta mengetahui secara pasti omzet dan keuntungan usaha. Perubahan harga, transaksi utang, produk kedaluwarsa, dan penitipan barang dari pihak ketiga juga belum terdokumentasi secara terstruktur.

## 2. Problem Statement
* Pencatatan transaksi masih dilakukan secara manual.
* Pemilik belum dapat mengetahui omzet dan keuntungan secara cepat dan akurat.
* Jumlah stok produk masih sering diperkirakan secara manual.
* Pemilik terkadang lupa harga jual produk.
* Belum tersedia informasi yang terstruktur mengenai produk yang paling sering dibeli atau ditanyakan.
* Terdapat proses penitipan produk dari pihak ketiga yang belum terdokumentasi secara khusus dalam sistem.
* **[REVISI 4]** Kewajiban toko kepada penitip (harga setor barang yang sudah terjual) tidak pernah tercatat, sehingga sering terjadi selisih atau setoran yang terlupa ketika penitip menagih.
* Kerugian akibat produk kedaluwarsa belum dapat dihitung secara terstruktur.
* Tanggal kedaluwarsa produk belum dipantau secara sistematis.
* Harga produk dapat berubah sehingga pencatatan harga perlu diperbarui dengan mudah.
* Pencatatan utang pembeli masih dilakukan secara manual.
* **[BARU/REVISI]** Kesalahan input transaksi (salah produk/jumlah) tidak dapat dikoreksi tanpa mekanisme resmi, berisiko merusak akurasi stok dan laporan.
* **[BARU/REVISI]** Pembeli sering melunasi utang secara bertahap (cicilan), bukan sekaligus, sehingga status "Lunas/Utang" biner belum mencerminkan kondisi nyata.

## 3. Product Goals
* Mempermudah pencatatan transaksi dengan status pembayaran Lunas atau Utang.
* Membantu pengguna memantau produk, stok, harga jual, dan data yang diperlukan untuk perhitungan keuntungan.
* Menyediakan riwayat transaksi yang dapat ditelusuri kembali.
* Menyediakan dashboard dan laporan penjualan yang menampilkan omzet dan estimasi profit berdasarkan data transaksi.
* Menyediakan informasi tren penjualan produk berdasarkan data transaksi agar pengguna dapat mengetahui produk yang paling sering terjual.
* Menyediakan fondasi data yang dapat dikembangkan untuk pemantauan kedaluwarsa pada tahap berikutnya.
* **[BARU/REVISI]** Memastikan kesalahan transaksi dapat dikoreksi (void/retur) tanpa merusak integritas laporan dan stok.
* **[BARU/REVISI]** Mendukung pencatatan pelunasan utang secara bertahap agar saldo utang pembeli akurat.
* **[REVISI 4]** Mencatat barang titipan pihak ketiga dan kewajiban toko kepada penitip secara akurat, sehingga setoran dapat dipertanggungjawabkan tanpa pencatatan terpisah.

## 4. Target Users

| User | Kebutuhan utama | Aktivitas utama |
| :--- | :--- | :--- |
| Pengguna UMKM | Mengelola operasional penjualan melalui satu sistem yang sederhana. | Mengelola produk dan stok, membuat transaksi, mencatat utang, melihat riwayat, dashboard, dan laporan. |

*Catatan role:* Untuk MVP, sistem menggunakan satu role pengguna (User) untuk menjaga proses login tetap sederhana sesuai kebutuhan client. Setiap pengguna tetap disarankan memiliki akun sendiri agar aktivitas transaksi dapat ditelusuri. Pemisahan role Owner/Kasir dapat ditambahkan pada tahap pengembangan berikutnya apabila kebutuhan hak akses meningkat.

## 5. User Roles dan Permissions

| Fitur | User | Catatan MVP |
| :--- | :---: | :--- |
| Login | ✓ | Satu alur login sederhana. |
| Melihat produk | ✓ | Termasuk informasi kategori, harga, stok, dan foto jika tersedia. |
| Menambah produk | ✓ | Data minimal: nama, kategori, harga jual, harga modal, stok. |
| Mengubah produk | ✓ | Harga dan data produk dapat diperbarui. |
| Menghapus produk | ✓ | Produk yang sudah memiliki riwayat transaksi tidak dapat dihapus permanen — hanya dapat dinonaktifkan (soft delete) agar riwayat transaksi tidak rusak. Produk tanpa riwayat transaksi dapat dihapus permanen. |
| Mengelola stok | ✓ | Penyesuaian stok dapat dilakukan sesuai aturan bisnis; sistem menampilkan peringatan saat stok mencapai ambang batas minimum. |
| Membuat transaksi | ✓ | Status Lunas/Utang diturunkan dari uang yang diterima; kembalian dan sisa utang dihitung otomatis. |
| Membatalkan/mengoreksi transaksi | ✓ | Hanya dapat dilakukan dalam **24 jam** setelah transaksi disimpan; stok dikembalikan dan status transaksi ditandai "Dibatalkan", bukan dihapus dari riwayat. |
| Mencatat pelunasan utang | ✓ | Mendukung pelunasan penuh maupun bertahap (cicilan); setiap pembayaran tercatat sebagai riwayat pada transaksi utang terkait. |
| Melihat riwayat transaksi | ✓ | Dapat ditelusuri berdasarkan periode dan informasi transaksi, termasuk transaksi yang dibatalkan. |
| Melihat laporan | ✓ | Dashboard/laporan penjualan dan tren produk. |
| Melihat laporan utang | ✓ | Menampilkan transaksi dan saldo utang yang belum diselesaikan, termasuk riwayat cicilan. |
| Mengelola data penitip **[REVISI 4]** | ✓ | Tambah, ubah, lihat daftar/detail, dan aktif/nonaktif penitip. Penitip bukan pengguna sistem — tidak memiliki akun/login. |
| Mengelola produk titipan **[REVISI 4]** | ✓ | Membuat produk bertipe titipan yang terhubung ke penitip; tipe dan penitip tidak dapat diubah setelah produk dibuat. |
| Mencatat penerimaan & retur titipan **[REVISI 4]** | ✓ | Menambah stok saat barang dititipkan dan mengurangi stok saat dikembalikan ke penitip, dengan riwayat pergerakan. |
| Melihat saldo & mencatat setoran ke penitip **[REVISI 4]** | ✓ | Saldo kewajiban dihitung otomatis dari penjualan barang titipan; setoran dicatat sebagai riwayat dan tidak dapat diubah/dihapus pada MVP. |
| Melihat laporan konsinyasi **[REVISI 4]** | ✓ | Laporan per penitip untuk periode terpilih, beserta total kewajiban penitip pada dashboard. |
| Mengekspor laporan | ✓ | Ekspor laporan penjualan dan laporan utang ke format Excel/PDF untuk kebutuhan arsip atau pajak. |
| Mengelola akun pengguna lain | — | Belum termasuk MVP; role masih tunggal. |

## 6. Features & Scope

### MVP
* Authentication / login sederhana.
* Dashboard penjualan: ringkasan transaksi, omzet, estimasi profit, dan informasi penting lainnya.
* Katalog dan manajemen produk (CRUD), termasuk kategori, harga jual, harga modal, stok, dan foto produk bila diperlukan.
* Pengkategorian produk.
* Manajemen stok.
* Transaksi penjualan dengan pencatatan uang diterima; status Lunas/Utang, kembalian, dan sisa utang dihitung otomatis.
* Riwayat transaksi.
* Laporan penjualan berdasarkan periode.
* Laporan utang pembeli.
* Analisis/sorting tren produk berdasarkan data penjualan.
* **[BARU/REVISI]** Pembatalan/koreksi transaksi (void) dengan pengembalian stok otomatis.
* **[BARU/REVISI]** Pencatatan pelunasan utang bertahap (cicilan) per transaksi.
* **[BARU/REVISI]** Peringatan stok menipis (low-stock alert) berdasarkan ambang batas yang dapat diatur per produk.
* **[REVISI 4]** **Modul konsinyasi (penitipan barang pihak ketiga)** — dipindahkan dari Future Development ke MVP: data penitip, produk titipan, penerimaan/retur barang, kewajiban & setoran ke penitip, laporan konsinyasi, dan total kewajiban penitip pada dashboard.
  * Data penitip (tambah/ubah/lihat/aktif-nonaktif) dan produk titipan yang terhubung ke penitip — **FR-46**, BR-17, BR-18.
  * Penerimaan barang titipan dan retur ke penitip beserta riwayat pergerakan — **FR-47**, BR-19, BR-25.
  * Saldo kewajiban per penitip, pencatatan setoran, dan riwayat setoran — **FR-48**, BR-20, BR-22, BR-23.
  * Laporan konsinyasi per penitip dan total kewajiban penitip pada dashboard — **FR-49**, BR-21.

### Future Development
* Pemantauan dan indikator produk yang mendekati atau sudah kedaluwarsa.
* Laporan kerugian akibat produk kedaluwarsa.
* **[REVISI 4]** Penanganan barang titipan yang **rusak, hilang, atau kedaluwarsa** (write-off beserta perhitungan kerugiannya).
* **[REVISI 4]** **Koreksi/pembatalan setoran** kepada penitip (setoran pada MVP bersifat append-only).
* **[REVISI 4]** Penilaian stok dengan batch/FIFO dan pemantauan masa simpan per batch.
* Pemisahan role dan hak akses Owner/Kasir apabila jumlah pengguna dan kebutuhan kontrol meningkat.
* **[BARU/REVISI]** Ekspor laporan penjualan dan laporan utang ke Excel/PDF.
* **[REVISI 4]** Ekspor laporan konsinyasi ke Excel/PDF.

### Out of Scope
* Marketplace / penjualan lintas toko.
* Layanan pengiriman barang.
* Integrasi akuntansi lengkap di luar kebutuhan pencatatan penjualan dan profit pada MVP.
* **[BARU/REVISI]** Integrasi pembayaran digital (QRIS/e-wallet) — MVP mengasumsikan pembayaran tunai; dapat dipertimbangkan pada tahap berikutnya.

## 7. User Stories

| ID | Sebagai | Saya ingin | Sehingga |
| :--- | :--- | :--- | :--- |
| US-01 | Pengguna | login ke sistem melalui satu proses yang sederhana | dapat mengakses data usaha sesuai akun saya. |
| US-02 | Pengguna | melihat daftar produk beserta harga dan stok | dapat mengetahui barang yang tersedia tanpa mengandalkan catatan manual. |
| US-03 | Pengguna | menambah dan mengubah data produk | data produk dan harga dapat diperbarui ketika kondisi usaha berubah. |
| US-04 | Pengguna | melakukan transaksi penjualan dengan mencatat uang yang diterima dari pembeli, sehingga status Lunas atau Utang tercatat otomatis | semua penjualan dapat tercatat dengan jelas tanpa salah pilih status. |
| US-05 | Pengguna | melihat riwayat transaksi | dapat menelusuri transaksi yang telah dilakukan. |
| US-06 | Pengguna | melihat laporan penjualan | dapat mengetahui omzet dan estimasi profit berdasarkan periode. |
| US-07 | Pengguna | melihat daftar utang pembeli | dapat mengetahui transaksi yang belum lunas. |
| US-08 | Pengguna | melihat tren produk | dapat mengetahui produk yang paling sering terjual pada periode tertentu. |
| US-09 | Pengguna | menggunakan sistem melalui smartphone | dapat melakukan operasional toko dengan cepat di perangkat mobile. |
| US-10 **[BARU/REVISI]** | Pengguna | membatalkan transaksi yang salah input | stok dan laporan tetap akurat tanpa harus menghapus riwayat. |
| US-11 **[BARU/REVISI]** | Pengguna | mencatat pembayaran cicilan dari pembeli yang berutang | saldo utang pembeli selalu menunjukkan angka yang benar. |
| US-12 **[BARU/REVISI]** | Pengguna | mendapat peringatan saat stok produk menipis | dapat melakukan restock sebelum produk benar-benar habis. |
| US-13 **[BARU/REVISI]** | Pengguna | mengekspor laporan penjualan/utang ke Excel atau PDF | dapat menyimpan atau menyerahkan laporan untuk kebutuhan administrasi/pajak. |
| US-14 **[REVISI 4]** | Pengguna | mengelola data penitip dan menandai produk mana yang merupakan barang titipan | dapat membedakan barang milik sendiri dan barang milik pihak lain dengan jelas. |
| US-15 **[REVISI 4]** | Pengguna | mencatat penerimaan barang titipan dan retur ke penitip | jumlah stok barang titipan selalu sesuai dengan yang benar-benar ada di toko. |
| US-16 **[REVISI 4]** | Pengguna | melihat berapa kewajiban saya kepada setiap penitip dan mencatat setorannya | dapat membayar penitip dengan angka yang benar dan tidak ada setoran yang terlupa atau terlewat. |
| US-17 **[REVISI 4]** | Pengguna | melihat laporan konsinyasi per penitip dan total kewajiban penitip di dashboard | dapat memantau kewajiban secara keseluruhan tanpa menghitung manual. |

## 8. User Flow
* **Flow 1 – Login:** Buka aplikasi → Login → Dashboard.
* **Flow 2 – Kelola Produk:** Dashboard → Produk → Tambah/Ubah produk → Simpan → Daftar produk diperbarui.
* **Flow 3 – Transaksi Lunas:** Dashboard → Transaksi → Pilih produk → Masukkan jumlah → Sistem hitung total → Masukkan uang yang diterima (≥ total) → Sistem menampilkan kembalian → Simpan transaksi → Stok berkurang → Transaksi tercatat sebagai Lunas.
* **Flow 4 – Transaksi Utang:** Dashboard → Transaksi → Pilih produk → Masukkan jumlah → Sistem hitung total → Masukkan uang yang diterima (< total) → Catat identitas pembeli (nama wajib, no. HP opsional) → Sistem menampilkan sisa utang → Simpan transaksi → Stok berkurang → Utang tercatat.
* **Flow 5 – Laporan:** Dashboard → Laporan → Pilih periode → Sistem menampilkan omzet, estimasi profit, transaksi, utang, dan tren produk → (opsional) Ekspor ke Excel/PDF.
* **Flow 6 – Pembatalan Transaksi [BARU/REVISI]:** Riwayat transaksi → Pilih transaksi → Batalkan transaksi → Konfirmasi → Stok dikembalikan → Status transaksi menjadi "Dibatalkan".
* **Flow 7 – Pelunasan Utang Bertahap [BARU/REVISI]:** Laporan Utang → Pilih pembeli/transaksi → Catat jumlah pembayaran → Simpan → Saldo utang berkurang → Status otomatis menjadi "Lunas" jika saldo mencapai 0.
* **Flow 8 – Kelola Penitip & Produk Titipan [REVISI 4]:** Dashboard → Penitip → Tambah penitip → Simpan → Produk → Tambah produk → Pilih tipe "Titipan" → Pilih penitip → Isi harga jual dan harga setor (harga jual ≥ harga setor) → Simpan → Produk titipan muncul di katalog dengan penanda tipe.
* **Flow 9 – Terima & Retur Barang Titipan [REVISI 4]:** Penitip/Produk titipan → "Terima Titipan" → Masukkan jumlah barang yang dititipkan → Simpan → Stok bertambah dan pergerakan tercatat. Untuk pengembalian: Produk titipan → "Retur ke Penitip" → Masukkan jumlah → Simpan → Stok berkurang (ditolak bila melebihi stok) dan pergerakan tercatat.
* **Flow 10 – Setoran ke Penitip [REVISI 4]:** Penitip → Lihat saldo kewajiban → "Catat Setoran" → Masukkan nominal (≤ saldo) → Simpan → Saldo berkurang dan setoran tercatat pada riwayat → Dashboard ikut memperbarui Total Kewajiban Penitip.
* **Flow 11 – Laporan Konsinyasi [REVISI 4]:** Dashboard → Laporan → Pilih tab Konsinyasi → Pilih periode → Sistem menampilkan baris per penitip (terjual, modal periode, disetor periode, saldo akhir) beserta total periode.

## 9. Business Rules

| ID | Aturan Bisnis |
| :--- | :--- |
| BR-01 | MVP menggunakan satu role User. Setiap pengguna sebaiknya memiliki akun sendiri agar aktivitas transaksi dapat ditelusuri. |
| BR-02 | Nama produk dan data identifikasi produk harus jelas; kode/SKU produk harus unik apabila sistem menggunakan kode produk. |
| BR-03 | Harga jual harus lebih besar dari 0. Harga modal dicatat apabila laporan profit digunakan. |
| BR-04 | Stok tidak boleh menjadi negatif. |
| BR-05 | Jumlah produk pada transaksi harus lebih besar dari 0 dan tidak boleh melebihi stok yang tersedia. |
| BR-06 | Satu transaksi dapat berisi satu atau lebih produk. |
| BR-07 | Total transaksi merupakan penjumlahan harga jual dikalikan jumlah setiap item transaksi. |
| BR-08 | Status pembayaran transaksi ditentukan otomatis dari uang tunai yang diterima pembeli dibandingkan dengan total transaksi. Jika uang diterima ≥ total, transaksi berstatus Lunas dan kelebihannya dicatat sebagai kembalian. Jika uang diterima < total, transaksi berstatus Utang, wajib menyimpan nama pembeli (nomor HP opsional), beserta sisa saldo yang belum dibayar. |
| BR-09 | Stok berkurang ketika transaksi berhasil disimpan, baik transaksi Lunas maupun Utang. |
| BR-10 | Perubahan harga produk tidak boleh mengubah nilai historis pada transaksi yang sudah terjadi; harga pada saat transaksi perlu tersimpan pada detail transaksi. |
| BR-11 | Perhitungan profit menggunakan nilai penjualan dikurangi harga modal yang tercatat pada saat transaksi. |
| BR-12 **[BARU/REVISI]** | Produk yang sudah memiliki riwayat transaksi tidak dapat dihapus permanen, hanya dapat dinonaktifkan (soft delete). Produk yang belum pernah dipakai dalam transaksi dapat dihapus permanen. |
| BR-13 **[BARU/REVISI]** | Transaksi hanya dapat dibatalkan dalam jangka waktu **24 jam** sejak transaksi disimpan. Pembatalan mengembalikan stok sesuai item transaksi dan mengubah status transaksi menjadi "Dibatalkan"; data transaksi asli tetap tersimpan pada riwayat, tidak dihapus. |
| BR-14 **[BARU/REVISI]** | Transaksi berstatus Utang dapat dilunasi secara penuh atau bertahap. Setiap pembayaran dicatat sebagai riwayat pelunasan pada transaksi terkait. Status transaksi otomatis berubah menjadi Lunas ketika saldo utang mencapai 0. |
| BR-15 **[BARU/REVISI]** | Setiap produk dapat memiliki ambang batas stok minimum (default dapat ditentukan sistem, dapat diubah per produk). Sistem menampilkan peringatan pada dashboard ketika stok produk berada pada atau di bawah ambang batas tersebut. |
| BR-16 **[BARU/REVISI]** | Seluruh nilai uang ditampilkan dalam format Rupiah (Rp) dengan pemisah ribuan, tanpa desimal, sesuai kebiasaan pencatatan UMKM. |
| BR-17 **[REVISI 4]** | Produk bertipe **titipan** wajib memiliki penitip; produk **milik sendiri** tidak boleh memiliki penitip. Tipe produk dan penitip yang terhubung **tidak dapat diubah** setelah produk dibuat. |
| BR-18 **[REVISI 4]** | Untuk produk titipan, **harga jual harus lebih besar atau sama dengan harga setor** kepada penitip. Harga setor dicatat sebagai harga modal produk tersebut, sehingga perhitungan profit tetap berlaku. |
| BR-19 **[REVISI 4]** | Penerimaan barang titipan menambah stok; retur ke penitip mengurangi stok dan tidak boleh melebihi stok yang tersedia. Keduanya dicatat sebagai riwayat pergerakan yang tidak dapat diubah (append-only). |
| BR-20 **[REVISI 4]** | Setoran kepada penitip harus lebih besar dari 0 dan **tidak boleh melebihi saldo kewajiban saat itu**. Bila saldo ≤ 0, setoran ditolak. Sistem menghitung ulang saldo saat setoran disimpan agar dua setoran yang hampir bersamaan tidak membuat saldo negatif. |
| BR-21 **[REVISI 4]** | Penitip tidak pernah dihapus dari sistem. Penonaktifan penitip hanya diizinkan bila **semua** produk titipannya sudah berstok 0; bila masih ada stok, penonaktifan ditolak disertai daftar produk penghalang. Saldo kewajiban tidak harus 0 untuk menonaktifkan penitip. |
| BR-22 **[REVISI 4]** | Void transaksi tetap diizinkan walau menyebabkan saldo penitip menjadi **negatif** (penitip sudah menerima setoran melebihi kewajiban). Saldo negatif ditampilkan apa adanya; setoran baru ditolak sampai saldo kembali positif. |
| BR-23 **[REVISI 4]** | Penitip berstatus nonaktif tidak dapat dipakai untuk membuat produk titipan baru, menerima titipan, atau mengaktifkan kembali produknya. **Setoran kepada penitip tersebut tetap diizinkan** karena kewajiban tetap harus dibayar. |
| BR-24 **[REVISI 4]** | Produk titipan hanya dapat dinonaktifkan bila stoknya 0, dan hanya dapat diaktifkan kembali bila penitipnya aktif. Aturan ini tidak berlaku bagi produk milik sendiri. |
| BR-25 **[REVISI 4]** | Penerimaan barang titipan hanya untuk produk titipan yang aktif dan milik penitip yang aktif. Retur tidak mensyaratkan keduanya aktif, karena retur justru dipakai untuk mengosongkan stok sebelum produk/penitip dinonaktifkan. |
| BR-26 **[REVISI 4]** | Produk titipan yang sudah memiliki riwayat transaksi **atau** riwayat penerimaan/retur tidak dapat dihapus permanen; hanya dapat dinonaktifkan (sejalan dengan BR-12). |

> **Pemetaan.** BR-17–BR-26 diturunkan dari label BR-A…BR-J pada spesifikasi fitur `backend/PROMPT_Fitur_Penitipan_Barang.md` (BR-A→BR-17 … BR-J→BR-26), dan dipakai konsisten pada SRS §5 serta SDD §3.14.

## 10. Non-Functional Requirements [BARU/REVISI]

**Kinerja**
* Waktu muat halaman utama (dashboard, katalog produk, form transaksi) ditargetkan di bawah 3 detik pada koneksi internet mobile standar (3G/4G).
* Sistem ditargetkan mampu menangani minimal 200 transaksi per hari untuk satu toko tanpa penurunan performa yang terasa oleh pengguna.

**Keandalan & Konektivitas**
* Sistem mengasumsikan koneksi internet tersedia saat transaksi disimpan. Perlu ditentukan bersama client apakah dibutuhkan mode penyimpanan sementara (offline-first/queue) untuk area dengan koneksi tidak stabil — direkomendasikan minimal untuk fase berikutnya jika kondisi toko sering mengalami gangguan internet.
* Data transaksi dan produk disimpan di server (bukan hanya di perangkat), sehingga tidak hilang jika perangkat pengguna rusak/hilang.

**Keamanan & Backup Data**
* Password pengguna disimpan terenkripsi (hash), tidak dalam bentuk teks biasa.
* Tersedia mekanisme reset password sederhana (mis. melalui admin/developer pada tahap MVP, atau email/WhatsApp verifikasi jika sudah tersedia).
* Data di-backup secara berkala (minimal harian) untuk mencegah kehilangan data akibat kegagalan sistem.

**Kompatibilitas**
* Mendukung browser modern pada Android dan iOS (Chrome, Safari) versi dua tahun terakhir.
* Bahasa antarmuka: Bahasa Indonesia.

## 11. Assumptions & Constraints [BARU/REVISI]
* Pada fase MVP, sistem digunakan oleh satu toko/satu akun utama; belum mendukung banyak cabang.
* Pembayaran diasumsikan tunai; integrasi pembayaran digital belum termasuk MVP.
* Client menyediakan perangkat (smartphone) dan koneksi internet untuk operasional harian.
* Fitur konsinyasi masuk MVP pada Revisi 4, sementara **pemantauan kedaluwarsa** tetap didorong ke Future Development. Cakupan konsinyasi MVP dibatasi pada penitip, produk titipan, penerimaan/retur, saldo & setoran, dan laporan — **bukan** penanganan barang rusak/hilang, koreksi setoran, atau batch/FIFO.
* Penitip diperlakukan sebagai **data referensi**, bukan pengguna aplikasi: penitip tidak memiliki akun/login dan tidak mengakses sistem.
* Setoran ke penitip bersifat **append-only** pada MVP; kesalahan input setoran belum dapat dikoreksi dari aplikasi.

## 12. Risks [BARU/REVISI]

| Risiko | Dampak | Mitigasi |
| :--- | :--- | :--- |
| Koneksi internet tidak stabil di lokasi toko | Transaksi gagal tersimpan saat dibutuhkan | Evaluasi kebutuhan mode offline-first pada fase berikutnya; untuk MVP, pastikan pesan error jelas saat koneksi gagal. |
| Pengguna menolak beralih dari pencatatan manual | Adopsi rendah, data tidak lengkap | Desain alur transaksi sesingkat mungkin (sudah menjadi salah satu goal); lakukan pendampingan di awal penggunaan. |
| **[REVISI 4]** Kesalahan input setoran kepada penitip tidak dapat dikoreksi pada MVP | Saldo penitip bisa berbeda dari kesepakatan nyata | Jelaskan sejak awal bahwa setoran bersifat final pada MVP; sediakan catatan pada entri setoran; koreksi/pembatalan setoran dijadwalkan pada fase berikutnya. |
| **[REVISI 4]** Barang titipan rusak/hilang belum punya alur khusus | Kewajiban penitip bisa lebih tinggi dari nilai barang yang benar-benar laku | Retur manual tetap tersedia untuk mengeluarkan barang dari stok; penanganan write-off (rusak/hilang) masuk Future Development dan perlu disosialisasikan ke client. |
| Ekspektasi client terhadap fitur kedaluwarsa di MVP | Client kecewa karena fitur pain-point utama belum ada di rilis pertama | Komunikasikan eksplisit sejak awal bahwa pemantauan kedaluwarsa masih Future Development, sementara konsinyasi sudah masuk MVP pada Revisi 4. |

## 13. Success Metrics
*(Direvisi agar lebih terukur [BARU/REVISI])*
* 100% transaksi penjualan dicatat secara digital melalui sistem, tanpa pencatatan manual sebagai proses utama, dalam 2 minggu pertama penggunaan.
* Setiap transaksi (termasuk transaksi yang dibatalkan) memperbarui stok secara otomatis dan akurat 100% dari kasus.
* Pengguna dapat menghasilkan laporan omzet & estimasi profit untuk periode tertentu dalam waktu kurang dari 5 detik.
* Seluruh transaksi utang yang belum lunas dapat ditemukan melalui laporan utang, termasuk yang sudah dicicil sebagian.
* Dashboard tren produk menampilkan minimal 5 produk terlaris berdasarkan data historis.
* Pengguna (pemilik usaha) dapat menyelesaikan satu transaksi penjualan dari mulai pemilihan produk hingga simpan dalam waktu kurang dari 30 detik menggunakan smartphone.
* **[REVISI 4]** Saldo kewajiban setiap penitip dapat dilihat kapan saja dan selalu konsisten dengan riwayat penjualan barang titipan dikurangi setoran yang tercatat (0 selisih pada rekonsiliasi manual).
* **[REVISI 4]** Tidak ada setoran kepada penitip yang melebihi kewajiban berjalan (0 kasus saldo negatif selain akibat void transaksi).

## 14. Acceptance Criteria Tingkat Produk
- [ ] Pengguna dapat login menggunakan alur autentikasi sederhana.
- [ ] Pengguna dapat melihat, menambah, mengubah, dan menghapus data produk sesuai aturan sistem.
- [ ] Data produk minimal dapat menyimpan nama, kategori, harga jual, harga modal, dan stok.
- [ ] Pengguna dapat membuat transaksi yang terdiri dari satu atau lebih produk.
- [ ] Sistem mendukung transaksi Lunas dan Utang, dengan status ditentukan otomatis dari uang yang diterima (termasuk perhitungan kembalian).
- [ ] Sistem menolak transaksi apabila jumlah barang melebihi stok yang tersedia.
- [ ] Stok berkurang otomatis setelah transaksi berhasil.
- [ ] Riwayat transaksi dapat ditampilkan kembali tanpa mengubah data historis harga transaksi.
- [ ] Laporan menampilkan omzet dan estimasi profit berdasarkan periode yang dipilih.
- [ ] Laporan utang menampilkan transaksi pembeli yang belum lunas.
- [ ] Informasi tren produk dapat ditampilkan dari data penjualan.
- [ ] Aplikasi dapat digunakan dengan nyaman pada smartphone dan tetap responsive pada layar yang lebih besar.
- [ ] **[BARU/REVISI]** Pengguna dapat membatalkan transaksi dalam batas waktu yang ditentukan, dan stok dikembalikan secara otomatis.
- [ ] **[BARU/REVISI]** Pengguna dapat mencatat pelunasan utang secara bertahap, dan saldo utang diperbarui secara akurat setiap kali pembayaran dicatat.
- [ ] **[BARU/REVISI]** Sistem menampilkan peringatan pada dashboard ketika stok produk mencapai ambang batas minimum.
- [ ] **[BARU/REVISI]** Pengguna dapat mengekspor laporan penjualan dan laporan utang ke format Excel atau PDF.
- [ ] **[BARU/REVISI]** Produk yang memiliki riwayat transaksi tidak dapat dihapus permanen dari sistem.
- [ ] **[REVISI 4]** Pengguna dapat mengelola data penitip dan membuat produk titipan yang terhubung ke penitip, dengan tipe dan penitip yang tidak dapat diubah setelah produk dibuat.
- [ ] **[REVISI 4]** Pengguna dapat mencatat penerimaan barang titipan (stok bertambah) dan retur ke penitip (stok berkurang, ditolak bila melebihi stok) beserta riwayat pergerakannya.
- [ ] **[REVISI 4]** Sistem menampilkan saldo kewajiban per penitip yang dihitung otomatis dari penjualan barang titipan dikurangi setoran, serta menolak setoran yang melebihi saldo.
- [ ] **[REVISI 4]** Laporan konsinyasi menampilkan data per penitip untuk periode terpilih, dan dashboard menampilkan total kewajiban penitip.
- [ ] **[REVISI 4]** Penitip yang masih memiliki barang titipan berstok tidak dapat dinonaktifkan, dan barang titipan yang sudah memiliki riwayat tidak dapat dihapus permanen.

## 15. Revision Log [BARU/REVISI]

| Versi | Tanggal | Perubahan |
| :--- | :--- | :--- |
| Draft awal | - | Versi PRD yang diserahkan untuk review. |
| Revisi 2 | September 2026 | Menambahkan: aturan void/pembatalan transaksi, pelunasan utang bertahap, low-stock alert, ekspor laporan, aturan soft delete produk, Non-Functional Requirements, Assumptions & Constraints, Risks, metrik sukses yang terukur, dan acceptance criteria tambahan. |
| Revisi 3 | Oktober 2026 | Status pembayaran Lunas/Utang tidak lagi dipilih manual: pengguna mencatat uang tunai yang diterima, sistem menurunkan status, menghitung kembalian, dan menghitung sisa utang (BR-08, US-04, Flow 3/4). |
| Revisi 4 (dokumen ini) | 24 Oktober 2026 | Penyelarasan dengan SDD Backend v1.1 dan SRS v1.1: **modul konsinyasi (penitipan barang) dipindahkan dari Future Development ke MVP** — data penitip, produk titipan, penerimaan/retur, saldo & setoran, laporan konsinyasi, total kewajiban penitip. Menambahkan BR-17–BR-26, US-14–US-17, Flow 8–11, acceptance criteria tingkat produk, serta metrik sukses baru. Menegaskan bahwa penanganan barang titipan rusak/hilang/kedaluwarsa, koreksi/pembatalan setoran, dan batch/FIFO tetap Future Development. |