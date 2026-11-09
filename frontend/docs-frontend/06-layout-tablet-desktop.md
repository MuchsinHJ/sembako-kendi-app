# 06 — Layout Tablet & Desktop

Dokumen ini adalah acuan tampilan **responsif** (Tablet 1024 × 768 dan Desktop 1440 × 900) di `ui-kendi.pen`. Melengkapi `01`–`05` yang berfokus mobile. Token, komponen dasar, dan aturan bisnis **tetap mengikuti `01`, `02`, `04`** — dokumen ini hanya mengatur *layout per breakpoint* dan perbedaannya dari mobile.

Sumber: `ui-kendi.pen` (pembacaan via MCP, 2026-11-09), `PROMPT_DESIGN_TABLET_DEKSTOP.MD`.

---

## 1. Breakpoint

| Breakpoint | Ukuran frame | Prefix canvas | Navigasi |
|---|---|---|---|
| Mobile | 390 × 844 | `Screen /` | Bottom Nav (`zsT3e`) |
| Tablet | 1024 × 768 (landscape) | `Tablet /` | Sidebar Tablet (`BJljd`) |
| Desktop | 1440 × 900 | `Desktop /` | Sidebar Desktop (`cbbLL`) |

- **Satu navigasi per breakpoint.** Sidebar dan Bottom Nav **tidak pernah tampil bersamaan**.
- Tidak ada frame `Responsive /` atau `Mockup /`. Semua pakai prefix di atas, dikelompokkan dalam grup "Tablet" dan "Desktop", jarak antar frame ≥ 80px.

---

## 2. Manfaatkan ruang, jangan meregangkan

Prinsip utama: bukan mobile yang dilebarkan, tapi tata letak yang memakai lebar ekstra untuk kolom dan panel.

| Aspek | Tablet | Desktop |
|---|---|---|
| Padding konten (atas-kanan-bawah-kiri) | `18px 24px 22px 24px` | `24px 36px 30px 36px` |
| Gap antar section | `14px` | `18px` |
| Gap antar kartu dalam grid | `14px` | `18px` |
| Lebar maksimum konten | penuh (dikurangi sidebar) | penuh, panel utama dibagi kolom |

- **Konten dibatasi lewernya** oleh pembagian kolom, bukan lebar kartu tunggal yang melebar penuh.
- **Tanpa shadow** di seluruh breakpoint. Struktur pakai border `1px line-soft`.
- Angka terpenting (Omzet, Estimasi Profit, Total Utang, Kewajiban Penitip) paling besar dan paling kontras.

---

## 3. Sidebar (menggantikan Bottom Nav)

Dua *master component*:

| Master | ID | Lebar | Pola item |
|---|---|---|---|
| `Component / Sidebar Tablet` | `BJljd` | `96px`, tinggi penuh `768` | **Vertikal** — ikon di atas, label kecil di bawah (pola seperti item bottom nav) |
| `Component / Sidebar Desktop` | `cbbLL` | `248px`, tinggi penuh `900` | **Horizontal** — ikon kiri, label kanan |

Keduanya di-*instance* sebagai `ref` di tiap layar tablet/desktop (19 tablet, 18 desktop).

### Isi menu — **tepat 7 item**, urutan tetap

1. Beranda (`house`)
2. Produk (`package`)
3. Transaksi (`circle-plus`)
4. Utang (`wallet`)
5. Riwayat (`history`)
6. **Laporan** (`chart-column`)
7. **Penitip** (`user`)

> **Perubahan penting dari versi lama (5 item):** Laporan dan Penitip **kini menjadi item sidebar langsung** pada tablet & desktop, bukan lagi diakses dari kartu di Beranda. Kartu pintasan Laporan/Penitip di Beranda tablet/desktop **sudah dihapus**. Pada **mobile**, Laporan & Penitip tetap diakses dari Beranda (bottom nav tetap 5 item) — lihat catatan di §7.

### Ukuran item

| | Tablet | Desktop |
|---|---|---|
| Layout | vertical, `gap:4`, `padding:[12,6]`, center/center | horizontal, `gap:11`, `padding:[0,16]`, `align-items:center` |
| Tinggi | auto (± `64px` dengan padding) | `44px` (Transaksi `46px`) |
| Radius | `12px` | `12px` |
| Ikon | `18 × 18` | `18 × 18` |
| Label | `13px` | `13px` |

### State aktif (konsisten, berlaku semua item **termasuk Transaksi**)

| State | Item (background) | Ikon | Label |
|---|---|---|---|
| Aktif | `primary` (gelap) | `bg` | `bg` |
| Nonaktif | `surface` | `accent` | `primary-soft` |

- **Transaksi diperlakukan sebagai item nav biasa** — radius `12px`, mengikuti state aktif. Ia **bukan** FAB/pill terangkat seperti di mobile.
- Hanya **satu** item aktif per layar.
- Pemetaan layar → item aktif: Beranda→Beranda, Katalog/Detail Produk→Produk, Transaksi(POS)→Transaksi, Utang→Utang, Riwayat→Riwayat, Laporan Penjualan & Konsinyasi→Laporan, Penitip & Detail Penitip→Penitip.

### Blok bawah (menempel ke dasar sidebar)

- Pemisah `1px line-soft`.
- **Tablet:** avatar inisial `34×34` (`accent-soft`, radius `999`, teks "KD") + tombol Keluar `44×44` (`surface-muted`, ikon `log-out` `15px`).
- **Desktop:** avatar `34×34` + info teks ("Kendi" `12.5/600`, "Pemilik usaha" `10.5/normal muted`) + tombol Keluar `40px` (`surface-muted`, radius `999`).

---

## 4. Header halaman

Di area konten, tiap layar punya header: eyebrow + judul di kiri; aksi utama layar di kanan.

- Eyebrow: `12px/600`, `letter-spacing 1.2px`, kapital — "KATALOG", "TRANSAKSI", "UTANG", "KONSINYASI".
- Judul layar: `28px/700` (desktop), `24px/700` (tablet).
- Aksi header kanan (mis. "Tambah Produk") = tombol primer pill.
- Desktop boleh menaruh input pencarian global di header (lebar ±360px).
- Layar detail pakai **Tombol Kembali** `44×44` (radius `999`) + breadcrumb teks ("Produk / Beras Premium 5 kg").

---

## 5. Spesifikasi per layar

### 5.1 Katalog Produk (grid kartu bergambar)

| | Tablet | Desktop |
|---|---|---|
| Kolom grid | 3 | 4 |
| Gap grid | `14px` | `18px` |

- Kartu: `surface`, border `1px line-soft`, radius `16px`, overflow hidden.
- Atas: area gambar placeholder (blok `surface-muted` + ikon Lucide besar per kategori: `wheat`, `egg`, `milk`, `cooking-pot`, `cup-soda`, `soup`, `package`). Badge status pojok kiri-atas; badge "Titipan" pojok kanan-atas bila titipan.
- Bawah (`padding 14px`): nama `14.5px/600` (maks 2 baris), kategori `12px muted`, harga `18px/700 tabular-nums`, baris stok "Sisa 24".
- Stok menipis (sisa ≤ `stokMinimum`): teks stok `warning` + ikon `triangle-alert` — bukan warna saja.
- Produk Nonaktif: gambar diredam (opacity `0.55`), badge "Nonaktif" tetap terbaca. Tetap tampil.
- Toolbar: Input Pencarian + Filter Kategori (chip Semua/Milik Sendiri/Titipan) + Filter Status (segmented Semua/Aktif/Nonaktif) + toggle Grid/Daftar (`layout-grid`/`list`, Grid aktif).
- Ringkasan atas toolbar: "24 produk · 3 stok menipis · 6 titipan".
- **Tetap TIDAK ada filter penitip di katalog.**

### 5.2 Beranda

- **Baris metrik atas** — 4 kartu angka, **tidak digabung**:
  - Tablet: `2 × 2`, tiap baris `102px`, gap `16`.
  - Desktop: 4 kolom sejajar, baris `132px`, gap `18`.
  - Isi: Omzet Hari Ini (kartu gelap `primary`), Estimasi Profit, Total Utang Aktif (`warning-soft`), Penitip & Kewajiban.
- Teks di dalam kartu metrik **vertikal-center** (`justify-content:center`), label/nilai/keterangan berkelompok rapi — bukan `space-between`.
- **Baris bawah, dua kolom (±60/40):** Kiri = Peringatan Stok Menipis (kartu produk mini bergambar). Kanan = ringkasan "Transaksi terakhir".
- Desktop boleh ada sapaan header ("Selamat siang, Kendi") + tanggal.
- Jangan tambah grafik tren/target penjualan di luar data `03`.

### 5.3 Transaksi (POS) — dua panel

| Panel | Isi | Tablet | Desktop |
|---|---|---|---|
| Kiri (±62%) | pencarian, chip kategori, grid kartu produk aktif + tombol `+` `44×44` | grid 2 kolom | grid 3 kolom |
| Kanan (`surface`, border-left `1px line-soft`, tinggi penuh) | Keranjang **selalu tampil** | lebar `350px`, gap `11` | lebar `400px`, gap `12` |

- Isi keranjang: daftar item (nama, stepper −/jumlah/+, subtotal) → pemisah → total → field **Uang Diterima** (`52px`) → **Baris Hasil Kembalian** → tombol primer penuh **Selesaikan Transaksi** (`54px`).
- Tiga elemen akhir ini **harus berjarak** — panel memakai `gap` vertikal (desktop `12px`, tablet `11px`), jangan kosong/0.
- Status Lunas/Utang **diturunkan** dari `uangDiterima` vs total. Saat Utang, field **Nama Pembeli** wajib muncul.
- Tombol Selesaikan nonaktif saat keranjang kosong, label tetap terbaca.
- State: keranjang kosong, berisi (lunas), berisi (utang), dialog "Transaksi Berhasil".

### 5.4 Riwayat Transaksi

Master-detail: daftar di kiri (±42%), detail terpilih di kanan.
- Toolbar: Rentang Tanggal + segmented Filter Status Pembayaran.
- `Tombol Batalkan Transaksi` hanya muncul dalam **24 jam rolling** berdasarkan waktu server; di luar itu disembunyikan + penjelasan dalam **satuan jam**. Transaksi batal berlabel "Dibatalkan".

### 5.5 Utang

Master-detail / tabel + panel samping.
- Kartu Ringkasan Utang (total saldo aktif) + tombol sekunder "Ekspor Laporan Utang".
- Daftar **per transaksi** (bukan per pembeli): nama pembeli, ID + waktu, badge Utang, sisa utang `danger`.
- Panel kanan: detail + form "Catat Pembayaran".

### 5.6 Detail Produk

Dua kolom: kiri foto besar (placeholder 1:1 / 4:3), kanan identitas + Kartu Harga Jual + Kartu Rincian + aksi.
- Aksi: Edit (primer), Sesuaikan Stok (sekunder), Nonaktifkan Produk (destruktif).
- Produk titipan menambah **Terima Titipan** dan **Retur ke Penitip**.
- Tidak ada input stok langsung.

### 5.7 Daftar Penitip & Detail Penitip

- Daftar: grid kartu — 3 kolom (desktop) / 2 kolom (tablet): inisial dalam lingkaran, nama, no. HP, badge status, jumlah produk titipan aktif, saldo.
- Filter: Semua / Punya saldo (termasuk negatif) / Aktif.
- Detail: kiri Kartu Saldo Penitip (gelap) + Rincian Saldo + tombol Catat Setoran; kanan Riwayat Setoran (append-only, sampaikan di UI) + Lihat Produk Titipan.
- **Saldo negatif ditampilkan apa adanya** + penanda peringatan, **tidak** jadi `Rp0`; **Catat Setoran dinonaktifkan**. Buat state ini.

### 5.8 Form & dialog → modal tengah

Bottom-sheet / layar penuh mobile diubah menjadi **modal tengah**:

```
lebar: 520–640px
radius: 20px
fill: surface
border: 1px line-soft
overlay: primary transparan
tanpa shadow
```

- Form Tambah/Edit Produk boleh dua kolom (kiri field, kanan unggah foto + preview).
- Pertahankan seluruh validasi & pesan error dari `04` §6.
- Modal yang dibuat: Tambah Produk, Sesuaikan Stok, Konfirmasi Nonaktifkan Produk, Catat Pembayaran, Catat Setoran, Konfirmasi Pembatalan. Layar lain mengikuti pola sama.
- Daftar modal di canvas: Tablet punya 7 modal, Desktop 6 (Desktop belum punya `Modal Konfirmasi Nonaktifkan Penitip` — buat mengikuti pola Tablet bila diperlukan).

### 5.9 Laporan Penjualan & Laporan Konsinyasi

- **Penjualan:** filter tanggal, daftar 5 produk terlaris (dengan thumb), rincian omzet/profit **per tipe** (`perTipe`), tombol ekspor Excel & PDF.
- **Konsinyasi:** tabel per penitip (terjual, kewajiban periode, disetor periode, saldo akhir **dengan keterangan all-time**). Semua penitip tampil termasuk nonaktif. **TIDAK ADA tombol ekspor.**
- Grafik hanya jika menyajikan data yang ada di `03`; warna dari token.

### 5.10 Login

Panel kiri `primary` (brand + tagline) + panel kanan `surface` (form identitas, kata sandi, tombol Masuk). Satu alur, tanpa role, tanpa registrasi. Teks bantuan: "Lupa kata sandi? Hubungi pengelola usaha Anda." Sertakan state kredensial salah.

---

## 6. Checklist sebelum melapor selesai

- [ ] Tidak ada shadow, tidak ada hex di luar token, tidak ada font serif.
- [ ] Sidebar tepat **7 item** (Beranda, Produk, Transaksi, Utang, Riwayat, Laporan, Penitip); tidak ada bottom nav di frame tablet/desktop.
- [ ] Transaksi di sidebar = item biasa (radius `12`, ikut state aktif), bukan FAB.
- [ ] Hanya **satu** item sidebar aktif per layar.
- [ ] Katalog & POS memakai kartu bergambar; ada produk titipan, nonaktif, dan stok menipis yang terlihat.
- [ ] Teks dalam kartu metrik vertikal-center, tidak `space-between`.
- [ ] Kontras teks ≥ 4.5:1; status selalu dot + label.
- [ ] Panel POS: Input Uang Diterima / Hasil Kembalian / Tombol Selesaikan berjarak (gap panel > 0).
- [ ] Tidak ada fitur terlarang di `04` §9 (QRIS/e-wallet, filter penitip di katalog, ekspor konsinyasi, role Owner/Kasir, registrasi, koreksi setoran, dst).
- [ ] Frame mobile (`Screen /`, `Subflow /`) tidak berubah.
- [ ] Nama frame konsisten: `Tablet / Nama Layar`, `Desktop / Nama Layar`.

---

## 7. Perbedaan mobile vs tablet/desktop (ringkas)

| Hal | Mobile | Tablet & Desktop |
|---|---|---|
| Navigasi | Bottom Nav 5 item, Transaksi = FAB terangkat | Sidebar 7 item, Transaksi = item biasa |
| Akses Laporan & Penitip | Dari kartu di Beranda | **Item sidebar langsung** |
| Layout | 1 kolom, layar penuh | Multi-kolom / master-detail |
| Dialog | Bottom-sheet / layar penuh | Modal tengah 520–640px |
| Filter katalog | chip | chip + segmented + toggle Grid/Daftar |
