# 03 — Peta Layar, Alur, dan State

Dokumen ini memetakan setiap layar di `ui-kendi.pen` ke halaman front-end, beserta state wajib dan aturan bisnis yang mengikat tampilannya. Referensi ID PRD/SRS/SDD dicantumkan supaya front-end tidak perlu membaca ulang tiga dokumen besar.

Sumber: `ui-kendi.pen`, PRD Revisi 4, SRS v1.1, SDD Backend v1.1.

---

## 1. Peta navigasi

```
Login
  └─ Beranda
       ├─ Katalog Produk ─────────── Detail Produk
       │                                ├─ Edit Produk (Subflow)
       │                                ├─ Sesuaikan Stok (Subflow)
       │                                ├─ Terima Titipan (Subflow, produk titipan)
       │                                └─ Retur ke Penitip (Subflow, produk titipan)
       ├─ Kartu Laporan ───────────── Laporan Penjualan
       │                                └─ Laporan Konsinyasi
       ├─ Kartu Penitip & Kewajiban ─ Daftar Penitip
       │                                └─ Detail Penitip
       │                                     ├─ Catat Setoran (Subflow)
       │                                     ├─ Riwayat Setoran (di halaman yang sama)
       │                                     └─ Lihat Produk Titipan
       │                                          └─ Riwayat Pergerakan Titipan
       └─ Peringatan Stok Menipis ──── Detail Produk
Transaksi (FAB tengah)
  └─ Subflow Transaksi: Keranjang / Utang / Konfirmasi / Berhasil
Utang (tab)
  └─ Catat Pembayaran (Subflow)
Riwayat (tab)
  └─ Detail Transaksi / Konfirmasi Pembatalan / Rentang Tanggal
```

**Laporan dan Penitip tidak pernah muncul di bottom nav.** Keduanya masuk dari Beranda saja.

---

## 2. Daftar layar & state wajib

### `Screen / Login`

- Field: identitas + kata sandi. **Satu alur login sederhana, tanpa pemilihan role, tanpa registrasi** (FR-01, FR-02).
- State: `Screen / Login - Kredensial Salah` — pesan error jelas, menyebut kredensial tidak cocok.
- Bantuan: "Lupa kata sandi? Hubungi pengelola usaha Anda."
- Tidak ada link ke mana pun selain masuk.

### `Screen / Beranda`

Menampilkan **empat angka yang tidak boleh digabung**:

| Elemen | Node canvas | Sumber data |
|---|---|---|
| Omzet Hari Ini | `Kartu Omzet` | `GET /dashboard/summary`, periode "hari ini" |
| Estimasi Profit | `Kartu Profit` | sama |
| Total Utang Aktif | `Kartu Saldo Utang` | sama |
| Penitip & Kewajiban | `Kartu Penitip & Kewajiban` | `SUM` saldo **positif** seluruh penitip termasuk nonaktif |

- **Omzet ≠ Profit.** Dua hal berbeda, dua kartu berbeda, label eksplisit ("Omzet Hari Ini" vs "Estimasi Profit").
- **Utang pembeli ≠ Kewajiban penitip.** Dua kewajiban ke pihak berbeda. Jangan satu angka gabungan.
- **Total Kewajiban Penitip hanya menjumlahkan saldo positif.** Saldo negatif satu penitip **tidak mengurangi** total (SRS IR-13, SDD §5.7, BR-22).
- `Peringatan Stok Menipis`: produk dengan sisa stok ≤ `stokMinimum`. Daftar nama + sisa. Tidak ada filter tanggal di layar ini.
- `Kartu Laporan` dan `Kartu Penitip & Kewajiban` adalah tautan, bukan kartu informasi.
- State: ada/ tidak ada peringatan stok.

### `Screen / Katalog Produk`

- Header: eyebrow "KATALOG", judul "Produk", jumlah produk.
- `Input Pencarian` + `Filter Kategori` (chip: Semua / Milik Sendiri / Titipan) + `Filter Status` (segmented: Semua / Aktif / Nonaktif).
- Baris produk menampilkan: thumb, nama, kategori + tipe, harga jual, badge status, sisa stok, chevron.
- **Filter penitip tidak ada di katalog** — keputusan desain yang sudah disetujui pengguna.
- `Tombol Tambah Produk` (primer, pill, ikon `+`).
- State: `Subflow / Empty State Katalog`, `Subflow / Empty State Pencarian`.
- Produk berstatus Nonaktif tetap tampil (label jelas), bukan disembunyikan.

### `Screen / Detail Produk`

- `Tombol Kembali` + judul + subjudul (nama produk).
- `Foto Produk` (placeholder `140px`, ikon `package` `48px`).
- `Blok Identitas`: nama `22px / 700` + baris meta (kategori, tipe, penitip untuk titipan).
- `Kartu Harga Jual`: label + nominal `28px / 700`.
- `Kartu Rincian Produk`: harga modal, stok saat ini, stok minimum — dengan pemisah `line-soft`.
- Aksi: `Tombol Edit Produk` (primer), `Tombol Sesuaikan Stok` (sekunder), `Tombol Nonaktifkan Produk` (destructive, border `danger`).
- **Produk titipan** menambah `Tombol Terima Titipan` dan `Tombol Retur ke Penitip` (SRS IR-11).
- **Tidak ada field stok yang bisa diedit langsung di sini.** Stok hanya berubah lewat transaksi, void, atau `Sesuaikan Stok` (SDD §3.5, §5.4).
- State: `Subflow / Detail Produk - Nonaktif`, `Subflow / Detail Produk - Titipan`.

### `Screen / Transaksi` (POS)

- `Area Daftar` (tinggi `620px`): header "Transaksi Baru", input pencarian, chip kategori, label daftar "Produk aktif · 3 produk", daftar produk tinggi `56px` per baris.
- `Bar Keranjang` sticky: ringkasan + `Tombol Buka Keranjang`.
- **Status Lunas/Utang tidak dipilih manual.** Diturunkan dari `uangDiterima` vs total (PRD BR-08, SRS FR-20).
- Subflow: `Transaksi - Keranjang`, `Transaksi - Utang`, `Konfirmasi Transaksi`, `Konfirmasi Transaksi - Lunas`, `Transaksi Berhasil - Lunas`, `Transaksi Berhasil - Utang`.
- **Tidak ada metode pembayaran lain** — QRIS/e-wallet di luar MVP.
- Target: satu transaksi selesai < 30 detik (PRD success metric, SRS IR-03). Semua target sentuh besar.

### `Screen / Riwayat Transaksi`

- Header + `Rentang Tanggal` (`52px`, ikon kalender) + `Filter Status Pembayaran` (segmented) + daftar transaksi (area scroll `466px`).
- `Tombol Batalkan Transaksi` hanya muncul **dalam 24 jam sejak transaksi dibuat**, rolling window berdasarkan **waktu server** — bukan hari kalender (PRD BR-13, SRS FR-25, SDD §11.10/11.3).
- **Di luar 24 jam tombol disembunyikan**, dengan penjelasan dalam **satuan jam** (SRS IR-06).
- Label "Dibatalkan" untuk transaksi void.
- **Transaksi batal tidak dihitung** dalam omzet, profit, maupun saldo utang berjalan (SRS FR-29, FR-39). Saldo tersimpan tetap ada sebagai jejak audit.
- **Transaksi Utang yang baru dibuat tetap boleh di-void** — uang muka bukan entri `PaymentHistory` (SDD §5.5).
- State: `Riwayat - Rentang Kosong`, `Rentang Tanggal - Tidak Valid`, `Detail Transaksi - Lewat Batas Waktu`, `Detail Transaksi - Dibatalkan`, `Detail Transaksi - Lunas Cicilan`.

### `Screen / Utang`

- Header "Utang Pelanggan" + subjudul "3 transaksi belum lunas".
- `Kartu Ringkasan Utang`: total saldo aktif.
- Daftar per **transaksi** (bukan per pembeli): nama pembeli, ID transaksi + waktu, badge Utang, sisa utang (`danger`).
- `Tombol Ekspor Laporan Utang` (sekunder, ikon `download`).
- **SDD tidak punya entity pembeli** — `namaPembeli` adalah `String?` bebas dan `GET /debts` mengembalikan baris per transaksi. **Keputusan (2026-11-09): tampilkan per transaksi, tanpa agregasi per pembeli di sisi klien.** Lihat SDD Front-end §15.1.
- Subflow: `Utang - Kosong`, `Catat Pembayaran`, `Catat Pembayaran - Melebihi Saldo`, `Konfirmasi Pembayaran`, `Pembayaran Berhasil - Masih Utang`, `Pembayaran Berhasil - Lunas`, `Utang Pelanggan - Detail Transaksi`, `Utang Pelanggan - Detail Transaksi - Dapat Dibatalkan`.
- Cicilan: nominal > 0 dan ≤ saldo (BR-14, AC-12). Label berubah "Lunas" saat saldo `Rp0`.

### `Screen / Daftar Penitip`

- Header dengan `Tombol Kembali`, eyebrow "KONSINYASI", judul "Penitip", subjudul "3 penitip · 2 produk titipan aktif".
- `Input Cari Penitip` + chip filter: Semua / Punya saldo / Aktif.
- Kartu penitip: nama, no. HP, badge status, jumlah produk titipan aktif, saldo.
- **Filter "Punya saldo" mencakup saldo ≠ 0, termasuk negatif.**
- **Penitip tidak pernah dihapus.** Hanya dinonaktifkan.

### `Screen / Detail Penitip`

- `Kartu Saldo Penitip` (gelap): saldo kewajiban `28px / 700` + catatan "Nilai barang terjual dikurangi setoran. Dihitung dari seluruh riwayat."
- **Saldo diturunkan, bukan kolom tersimpan**: `SUM(jumlah × hargaModalSnapshot)` transaksi AKTIF milik produk penitip − seluruh setoran (SDD §3.14, §11.12).
- `Rincian Saldo Penitip`: modal terjual, pemisah, total disetor.
- `Tombol Catat Setoran` (primer).
- `Blok Riwayat Setoran`: daftar setoran, **append-only** — tidak ada edit/hapus di MVP. Sampaikan ini di UI.
- `Tombol Lihat Produk Titipan (n)` (sekunder).
- `Tombol Nonaktifkan Penitip` (destructive).
- State: `Detail Penitip - Saldo Negatif` — saldo negatif **ditampilkan apa adanya** dengan penanda peringatan, tidak di-clamp ke `Rp0`. `Tombol Catat Setoran` **dinonaktifkan sampai saldo kembali positif** (BR-22, SRS IR-12).
- Setoran tetap diizinkan untuk penitip **nonaktif** (BR-23).
- Penonaktifan ditolak bila masih ada produk titipan berstok, disertai daftar produk penghalang (BR-21, AC-24).

### `Subflow / Sesuaikan Stok`

Tiga state: `Tambah`, `Kurangi`, `Alasan Lainnya`.

- Menampilkan stok saat ini + **pratinjau stok setelah disimpan**.
- Pilihan Tambah/Kurangi, stepper jumlah.
- **Alasan wajib diisi untuk audit** (SDD §5.4, AC-19): chip alasan + opsi **Lainnya** yang membuka field teks bebas.
- Penyesuaian yang membuat stok negatif **ditolak** (BR-04).
- `Stok minimum` tetap bisa diubah (BR-15), tapi **bukan dari form produk**.

### `Subflow / Catat Setoran`

- Nominal > 0 dan ≤ saldo (BR-20).
- State: `Catat Setoran - Melebihi Saldo`.
- Riwayat setoran **append-only**.

### `Subflow / Terima Titipan` / `Retur ke Penitip`

- Daftar produk titipan penitip, input jumlah, konfirmasi.
- Riwayat pergerakan tampil di `Subflow / Riwayat Pergerakan Titipan`, diakses lewat **Daftar Produk Titipan → pilih produk → Riwayat Pergerakan**.

### `Subflow / Laporan Penjualan`

- Filter tanggal (`startDate` / `endDate`).
- Visualisasi/daftar 5 produk terlaris.
- Rincian omzet/profit per **tipe** produk (`perTipe` — SDD §5.8) sebagai detail sekunder.
- **Profit = harga jual − harga modal snapshot saat transaksi** (BR-11).
- **Transaksi dibatalkan dikecualikan** (FR-39).
- `Subflow / Ekspor Laporan Penjualan`: Excel (.xlsx) dan PDF, pilihan periode.

### `Subflow / Laporan Konsinyasi`

- Baris per penitip: terjual, modal/kewajiban periode, disetor periode, **saldo akhir**.
- **Saldo akhir wajib diberi keterangan all-time**, bukan saldo per akhir periode (SRS IR-14).
- **Semua penitip tampil**, termasuk nonaktif dan yang tidak punya transaksi (nilai `0`).
- **Tidak ada tombol ekspor** pada laporan ini — endpoint belum diimplementasikan (SDD §5.8).

---

## 3. Aturan yang melintasi semua layar

1. **Tidak ada penghapusan permanen** untuk produk dengan riwayat transaksi (BR-12) atau produk titipan dengan riwayat transaksi **atau** riwayat penerimaan/retur (BR-26). Selalu "Nonaktifkan".
2. **Void hanya dalam 24 jam rolling** berdasarkan waktu server.
3. **Status Lunas/Utang selalu diturunkan**, tidak dipilih manual.
4. **Saldo penitip tidak pernah di-clamp.** Negatif ditampilkan apa adanya.
5. **Setoran penitip append-only.**
6. **Seluruh teks Bahasa Indonesia.**
7. **Nominal Rupiah** tanpa desimal, pemisah ribuan titik.
8. **Target sentuh minimum `44 × 44px`**; input utama `46–56px`.
9. **Tidak ada fitur Future Development** — QRIS/e-wallet, pemantauan kedaluwarsa, batch/FIFO, pemisahan role, ekspor konsinyasi.

---

## 4. Catatan duplikasi canvas

Canvas `ui-kendi.pen` saat ini menyimpan beberapa set mockup dengan konvensi nama berbeda:

- `Screen / ...` dan `Subflow / ...` — **set utama mobile** (390 × 844).
- `Grup 1..7` — kerangka pengelompokan alur.
- `Overview`, `Components` — papan komponen.

Frame responsif tablet dan desktop **sudah dihapus seluruhnya** atas permintaan pengguna, dan akan dibangun ulang setelah dokumen layout tablet/desktop tersedia.

Front-end **wajib** memakai set `Screen /` dan `Subflow /` sebagai acuan tampilan mobile.
