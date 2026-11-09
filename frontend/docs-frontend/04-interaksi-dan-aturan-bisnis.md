# 04 — Spesifikasi Interaksi & Aturan Bisnis UI

Dokumen ini mengunci perilaku UI untuk setiap aturan bisnis yang terlihat di layar. Front-end memakai ini sebagai acuan state, validasi, dan pesan. Referensi ID PRD/SRS/SDD dicantumkan.

Sumber: PRD Revisi 4, SRS v1.1, SDD Backend v1.1, `ui-kendi.pen`.

---

## 1. Transaksi (POS)

### Status Lunas/Utang — diturunkan, tidak dipilih

**Aturan:** PRD BR-08, SRS FR-20.

```
uangDiterima >= total   →  Lunas
uangDiterima <  total   →  Utang
```

- UI **tidak menyediakan** pilihan/toggle status.
- Field `Uang Diterima` adalah satu-satunya penentu.
- Saat status menjadi Utang, **field Nama Pembeli wajib muncul** di langkah konfirmasi.
- Sisa = `total - uangDiterima`, disimpan sebagai saldo utang transaksi.
- Tidak ada metode pembayaran lain. QRIS/e-wallet di luar MVP.

### Void 24 jam — rolling window

**Aturan:** PRD BR-13, SRS FR-25, SDD §11.10/11.3.

- Jendela = **24 jam sejak transaksi dibuat**, dihitung dari **waktu server**.
- **Bukan** hari kalender. Transaksi pukul 23.50 tetap bisa di-void sampai pukul 23.50 besok.
- Di dalam jendela: tampilkan `Tombol Batalkan Transaksi`.
- Di luar jendela: **sembunyikan tombol**, tampilkan penjelasan dalam **satuan jam** — misal "Batas pembatalan 24 jam telah lewat 3 jam lalu" (SRS IR-06).
- **Transaksi Utang yang baru dibuat tetap boleh di-void** — uang muka bukan entri `PaymentHistory` (SDD §5.5).
- Void yang menyebabkan saldo penitip negatif **tetap diizinkan** (BR-22).

### Efek void

**Aturan:** SRS FR-29, FR-39.

| Data | Setelah void |
|---|---|
| Omzet | Transaksi **dikecualikan** |
| Profit | Transaksi **dikecualikan** |
| Saldo utang berjalan | Transaksi **dikecualikan** |
| Label transaksi | Berubah menjadi **"Dibatalkan"** |
| Saldo tersimpan | **Tetap ada** sebagai jejak audit |

- Transaksi batal **tidak bisa** dicicil lagi.
- Void memulihkan stok produk sebagai efek samping.
- Produk titipan: void memulihkan stok titipan dan mengurangi kewajiban penitip sesuai perhitungan saldo.

---

## 2. Utang & Cicilan

### Daftar utang — per transaksi

**Aturan:** SDD tidak punya entity pembeli.

- `namaPembeli` adalah `String?` bebas.
- `GET /debts` mengembalikan **baris per transaksi**.
- **Keputusan (2026-11-09): daftar utang tampil per transaksi.** **Tidak ada agregasi per pembeli di sisi klien** — jangan dibangun. Cicilan tetap beroperasi per transaksi.
- Lihat SDD Front-end §15.1.

### Cicilan

**Aturan:** BR-14, AC-12.

```
nominal <= 0              →  tolak, pesan "Nominal cicilan harus lebih dari Rp0"
nominal > saldo           →  tolak, pesan "Nominal cicilan melebihi sisa utang"
0 < nominal <= saldo      →  terima
```

- Setelah pembayaran, saldo transaksi berkurang otomatis.
- Label berubah menjadi **"Lunas"** saat saldo tepat `Rp0`.
- Transaksi lunas tetap tampil di riwayat, tidak hilang dari daftar utang yang sudah selesai.
- Cicilan tercatat append-only.

### Ekspor laporan utang

**Aturan:** FR-41, FR-42, IR-07, IR-08, IR-09.

- Format **Excel (.xlsx)** dan **PDF**.
- **Menyertakan riwayat cicilan**.
- File memuat rentang periode dan tanggal pembuatan.
- Nama file: `laporan-utang_2026-09-01_2026-09-30.xlsx`
- Kolom Excel mengikuti isi laporan di layar.

---

## 3. Produk & Stok

### Nonaktifkan, bukan Hapus

**Aturan:** BR-12, BR-26.

| Kondisi | Aksi yang tersedia |
|---|---|
| Produk milik sendiri, ada riwayat transaksi | **Nonaktifkan** saja |
| Produk milik sendiri, tanpa riwayat | Hapus permanen boleh |
| Produk titipan, ada riwayat transaksi **atau** riwayat penerimaan/retur | **Nonaktifkan** saja |
| Produk titipan, tanpa riwayat apa pun | Hapus permanen boleh |

- **Label di UI selalu "Nonaktifkan Produk"** — tidak pernah "Hapus Produk" untuk produk berriwayat.
- Dialog konfirmasi menyebutkan konsekuensinya, bukan "Are you sure?".
- Produk nonaktif tetap tampil di katalog dengan badge jelas.
- Referensi transaksi historis ke produk nonaktif **harus tetap utuh**.

### Sesuaikan Stok

**Aturan:** SDD §3.5, §5.4, AC-19, BR-04, BR-15.

- Form menampilkan: **stok saat ini** dan **pratinjau stok setelah disimpan**.
- Pilihan Tambah / Kurangi.
- Stepper jumlah.
- **Alasan wajib diisi** untuk audit: chip alasan + opsi **Lainnya** yang membuka field teks bebas.
- Penyesuaian yang membuat stok **negatif ditolak** (BR-04).
- **Stok tidak boleh diedit dari form produk.** Stok hanya berubah sebagai efek samping transaksi/void atau lewat alur Sesuaikan Stok.
- `Stok minimum` **tetap bisa diubah** dari form produk (BR-15).

### Tambah / Ubah Produk

**Aturan:** BR-17, BR-18, SRS IR-10, AC-20, AC-21.

Field minimal: nama, kategori, harga jual, harga modal, **stok awal (mode tambah saja)**, foto, stok minimum, status.

| Mode | Tipe produk + penitip |
|---|---|
| Tambah | **Wajib ada**, bisa dipilih |
| Ubah | **Read-only**, disertai keterangan tidak dapat diubah |

Produk titipan:
- `harga modal` berarti **harga setor**.
- `harga jual` wajib **≥ harga setor** (BR-18, AC-21). Validasi tolak kalau lebih kecil.
- Mode ubah: harga jual tetap tervalidasi ≥ harga setor.

---

## 4. Konsinyasi (Penitip)

### Saldo kewajiban — diturunkan

**Aturan:** SDD §3.14, §11.12.

```
saldo = SUM(jumlah × hargaModalSnapshot) untuk transaksi AKTIF milik produk penitip
        − seluruh setoran penitip tersebut
```

- **Bukan kolom tersimpan.** Dihitung dari riwayat.
- `hargaModalSnapshot` diambil saat transaksi, bukan harga modal produk saat ini.

### Total Kewajiban di Beranda

**Aturan:** SRS IR-13, SDD §5.7, BR-22.

```
Total Kewajiban Penitip = SUM(saldo positif seluruh penitip, termasuk nonaktif)
```

- Saldo **negatif tidak mengurangi** total.
- **Jangan di-clamp** ke `Rp0` per penitip — clamping hanya berlaku pada penjumlahan total.

### Saldo negatif

**Aturan:** BR-22, SRS IR-12.

- Ditampilkan **apa adanya** dengan penanda peringatan.
- `Tombol Catat Setoran` **dinonaktifkan sampai saldo kembali positif**.
- Jangan tampilkan sebagai `Rp0`.

### Catat Setoran

**Aturan:** BR-20, BR-23.

```
nominal <= 0       →  tolak
nominal > saldo    →  tolak, pesan "Nominal setoran melebihi saldo kewajiban"
0 < nominal <= saldo →  terima
```

- **Riwayat setoran append-only.** Tidak ada edit, tidak ada hapus di MVP. Sampaikan ini di UI.
- Setoran **tetap diizinkan untuk penitip nonaktif** (BR-23).

### Nonaktifkan Penitip

**Aturan:** BR-21, AC-24.

- Ditolak bila masih ada **produk titipan berstok**.
- Dialog menampilkan **daftar produk penghalang** — nama produk + sisa stok.
- Penitip **tidak pernah dihapus**.

### Terima Titipan / Retur ke Penitip

**Aturan:** BR-19, BR-25.

- Daftar produk titipan penitip, input jumlah, konfirmasi.
- Riwayat pergerakan tampil di halaman terpisah, diakses lewat **Produk Titipan → pilih produk → Riwayat Pergerakan**.
- Tidak ada penanganan barang rusak/hilang/kedaluwarsa di MVP.

---

## 5. Laporan

### Laporan Penjualan

**Aturan:** BR-11, FR-39, SDD §5.8.

- Filter `startDate` / `endDate`.
- 5 produk terlaris.
- Rincian omzet/profit per **tipe** produk (`perTipe`) sebagai detail sekunder.
- **Profit = harga jual − harga modal snapshot saat transaksi** (BR-11).
- **Transaksi dibatalkan dikecualikan** dari omzet dan profit (FR-39).
- Ekspor: Excel (.xlsx) + PDF, dengan pilihan periode.

### Laporan Konsinyasi

**Aturan:** SRS IR-14, SDD §5.8.

- Baris per penitip: terjual, modal/kewajiban periode, disetor periode, **saldo akhir**.
- **Saldo akhir wajib diberi keterangan all-time**, bukan saldo per akhir periode.
- **Semua penitip tampil**, termasuk nonaktif dan yang tidak punya transaksi (nilai `0`).
- **Tidak ada tombol ekspor** pada laporan ini.

### Ekspor

**Aturan:** FR-41, FR-42, IR-07, IR-08, IR-09.

| Laporan | Excel | PDF | Catatan |
|---|---|---|---|
| Penjualan | ✅ | ✅ | pilihan periode |
| Utang | ✅ | ✅ | sertakan riwayat cicilan |
| Konsinyasi | ❌ | ❌ | endpoint belum diimplementasikan |

- File memuat **rentang periode** dan **tanggal pembuatan**.
- Nama file: `laporan-penjualan_2026-09-01_2026-09-30.xlsx`
- Kolom Excel mengikuti isi laporan di layar.

---

## 6. Validasi & Pesan

Pesan ditulis sebagai **instruksi perbaikan**, bukan laporan kesalahan. Bahasa Indonesia, tanpa "Oops", tanpa tanda seru berlebih.

| Kondisi | Pesan |
|---|---|
| Login gagal | "Identitas atau kata sandi tidak cocok. Periksa kembali dan coba lagi." |
| Nama pembeli kosong saat utang | "Isi nama pembeli untuk mencatat transaksi utang." |
| Cicilan ≤ 0 | "Nominal cicilan harus lebih dari Rp0." |
| Cicilan > saldo | "Nominal cicilan melebihi sisa utang. Sisa utang transaksi ini Rp15.000." |
| Setoran ≤ 0 | "Nominal setoran harus lebih dari Rp0." |
| Setoran > saldo | "Nominal setoran melebihi saldo kewajiban. Saldo saat ini Rp96.000." |
| Harga jual < harga setor | "Harga jual produk titipan harus sama dengan atau lebih tinggi dari harga setor." |
| Alasan penyesuaian kosong | "Pilih atau tulis alasan penyesuaian stok." |
| Stok menjadi negatif | "Jumlah pengurangan melebihi stok saat ini. Stok tersisa 2." |
| Nonaktifkan penitip dengan stok | "Penitip masih memiliki produk berstok. Retur atau habiskan stok produk berikut terlebih dahulu: [daftar produk]." |
| Rentang tanggal tidak valid | "Tanggal akhir harus sama dengan atau setelah tanggal mulai." |
| Rentang kosong | "Tidak ada transaksi pada rentang 01/09/2026 – 30/09/2026." |

---

## 7. Empty State

Setiap daftar kosong menyebut **apa tempat ini** + **satu langkah lanjut**.

| Layar | Empty state |
|---|---|
| Katalog | "Belum ada produk" + tombol "Tambah Produk" |
| Katalog (tanpa hasil cari) | "Tidak ada produk untuk '[kata kunci]'" + aksi "Hapus pencarian" |
| Utang | "Tidak ada utang aktif" + "Semua transaksi sudah lunas." |
| Riwayat (rentang kosong) | "Tidak ada transaksi pada rentang [tanggal]" |
| Riwayat Setoran | "Belum ada setoran" + "Catat setoran pertama untuk penitip ini." |
| Riwayat Pergerakan | "Belum ada pergerakan barang" |

---

## 8. Aksesibilitas

**Aturan:** SRS IR-02, WCAG 2.2 AA.

- Seluruh teks **Bahasa Indonesia**.
- Kontras teks minimum 4.5:1 — sudah dipetakan di `01-design-token.md` §1.
- Batas komponen UI minimum 3:1.
- Target sentuh minimum `44 × 44px`; input utama `46–56px`.
- Status tidak boleh hanya warna — selalu ada label teks (badge Lunas/Utang/Dibatalkan).
- Setiap kontrol punya nama aksesibel. Tombol ikon punya `aria-label` yang menyebut aksi, bukan nama ikon.
- Fokus keyboard harus terlihat di seluruh aplikasi.
- Zoom teks 200% tidak boleh memotong konten atau kontrol.

---

## 9. Hal yang TIDAK boleh dibangun

Daftar ini eksplisit dari PRD/SRS/SDD. Jangan tambahkan ke kode maupun desain:

- QRIS / e-wallet sebagai metode pembayaran.
- Pemantauan kedaluwarsa & laporan kerugian kedaluwarsa.
- Penanganan barang titipan rusak / hilang / kedaluwarsa.
- Koreksi atau pembatalan setoran penitip.
- Batch / FIFO.
- Pemisahan role Owner / Kasir.
- Ekspor laporan konsinyasi.
- Registrasi akun dari aplikasi.
- Filter penitip di katalog produk.
