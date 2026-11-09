# 02 — Spesifikasi Komponen

Semua ukuran di dokumen ini **diambil langsung dari node canvas** `ui-kendi.pen`, bukan dikira-kira. Nama node canvas dicantumkan supaya front-end bisa mencocokkan satu per satu.

Sumber: `ui-kendi.pen`, `Components`, `Component / Bottom Nav`, `Component / Sidebar Nav`, `Component / Badge *`.

---

## 1. Bottom Navigation (Mobile)

**Node canvas:** `Component / Bottom Nav` (`zsT3e`)
**Ukuran:** `390 × 88`, `fill: surface`, `border-top: 1px solid line`
**Layout:** absolut — 4 item sejajar + 1 item Transaksi yang terangkat.

### Item biasa (Beranda, Produk, Utang, Riwayat)

```
width: 64px
height: 48px
padding: 4px
border-radius: 14px
layout: vertical, gap: 4px
justify-content: center, align-items: center
```

Isi:
- Ikon Lucide `22 × 22`
- Label `10.5px`, weight `normal` (nonaktif) / `600` (aktif)

### Item Transaksi (FAB tengah)

```
width: 64px
height: 75px
offset-y: -12px   ← naik di atas bar
```

Isi dua lapis:
1. `Lingkaran Transaksi` — `54 × 54`, `border-radius: 999`, `fill: primary`, ikon `+` warna `bg` di tengah.
2. `Pil Transaksi` — `56 × 21`, `border-radius: 999`, `fill: bg`, label "Transaksi" `primary` weight `600` di bawah lingkaran.

### State aktif vs nonaktif

| | Aktif | Nonaktif |
|---|---|---|
| Background item | `bg` (menggelap tipis) | transparan |
| Warna ikon | `primary` | `accent` |
| Warna label | `primary`, weight `600` | `primary-soft`, weight `normal` |

### Aturan

- **Tepat 5 item**, urut: **Beranda, Produk, Transaksi, Utang, Riwayat**. Jangan tambah item keenam.
- **Laporan dan Penitip tidak ada di bottom nav** — keduanya masuk dari Beranda.
- Item Transaksi **selalu tampak sebagai aksi utama** walaupun sedang tidak aktif (lingkaran gelap tetap).
- `padding-bottom` konten layar minimal `16px` + tinggi nav `88px` supaya item terakhir tidak tertutup.

---

## 2. Sidebar Navigation (Desktop / Tablet)

**Node canvas:** `Component / Sidebar Nav` (`IUYM5`)
**Ukuran:** `232 × 720`, `fill: surface`, `border-right: 1px solid line`
**Padding:** `28px 16px`, `layout: vertical`, `gap: 8px`

### Struktur

```
Brand Sidebar
  Nama Aplikasi  "KENDI'S MARKET"  11px / 700 / letterSpacing 1.2 / fill primary
  Keterangan     "Kelola toko lebih mudah"  12px / 400 / fill muted
Menu Sidebar (gap 6px)
  Item Sidebar Beranda
  Item Sidebar Produk
  Item Sidebar Transaksi
  Item Sidebar Utang
  Item Sidebar Riwayat
```

### Item sidebar

```
width: fill_container
height: 48px
border-radius: 12px
padding: 0 14px
gap: 12px
align-items: center
```

Isi: ikon Lucide `20 × 20` + label `13px` weight `500`, keduanya `fill: primary-soft`.

### State aktif

Item aktif memakai `fill: bg` (bukan `primary`) supaya tetap kalma dan konsisten dengan bahasa warna canvas. Ikon dan label menjadi `primary`.

### Aturan

- Sidebar **menggantikan** bottom nav pada breakpoint lebar. Jangan render keduanya sekaligus.
- Item tetap **5** seperti bottom nav: Beranda, Produk, Transaksi, Utang, Riwayat.
- Transaksi tetap memakai ikon `circle-plus`, bukan pill terangkat — di sidebar ia item biasa yang diberi penanda aktif.

---

## 3. Badge Status

Tiga varian, semuanya pill `border-radius: 999`, `gap: 5px`, `padding: 5px 11px`, `align-items: center`.

### `Component / Badge Lunas` (`tmlnl`)

```
fill: success-soft (#D8E6C9)
Dot: 5 × 5 ellipse, fill primary-soft
Label: 11px / 600 / primary-soft
```

### `Component / Badge Utang` (`ZCJgD`)

```
fill: warning-soft (#F3E1D2)
Dot: 5 × 5 ellipse, fill warning
Label: 11px / 600 / warning
```

### `Component / Badge Neutral` (`RBeuj`)

```
fill: muted-soft (#E6EBDF)
Dot: 5 × 5 ellipse, fill muted
Label: 11px / 600 / muted
```

### Aturan

- **Badge Lunas juga dipakai ulang untuk status Aktif** — cukup ganti teks label menjadi "Aktif". Tidak perlu komponen baru.
- **Dot selalu ada.** Badge tidak boleh hanya teks berwarna.
- **Ukuran minimum target sentuh** badge `24px` tinggi (padding `5px` + label `11px` + dot). Badge sendiri bukan target sentuh utama; ia anak dari kartu yang bisa diklik.

---

## 4. Tombol

Empat varian. Semuanya `border-radius: 999`.

### Primer

```
height: 46–52px (input utama 50px, aksi kartu 48px)
fill: primary
color: bg
font-size: 13.5–14px, weight 600
gap: 7px (ikon + teks)
```

Contoh: `Tombol Tambah Produk`, `Tombol Simpan Produk`, `Tombol Catat Setoran`, `Tombol Edit Produk`, `Tombol Masuk`.

### Sekunder

```
height: 46–48px
fill: surface
border: 1px solid line
color: primary
font-size: 13–14px, weight 600
```

Contoh: `Tombol Sesuaikan Stok`, `Tombol Lihat Produk Titipan`, `Tombol Ekspor Utang`, `Tombol Batal`.

### Merusak (destructive)

```
height: 48px
fill: surface
border: 1px solid danger
color: danger
ikon: danger
```

Contoh: `Tombol Nonaktifkan Produk`, `Tombol Nonaktifkan Penitip`.

**Wajib** punya dialog konfirmasi sebelum eksekusi (`Subflow / Konfirmasi Nonaktifkan Produk`, `Subflow / Konfirmasi Nonaktifkan Penitip`).

### Ikon bundar (icon button)

```
44 × 44px
border-radius: 999
fill: surface
border: 1px solid line
ikon 18px, fill primary
```

Contoh: `Tombol Kembali`, `Tombol Logout`.

### Aturan

- **Satu tombol primer per layar** (atau per blok aksi kalau layarnya punya dua blok yang jelas terpisah).
- Tombol primer **selalu punya label teks**. Ikon saja tidak cukup.
- Lebar penuh (`width: fill_container`) untuk aksi utama di badan layar; lebar otomatis untuk aksi di header.
- **State disabled** tidak boleh menghilangkan label. Turunkan kontras border, bukan menghapus teks.

---

## 5. Input & Field

### Input pencarian

**Node canvas:** `Input Pencarian` (`h0J6OH`, `h5aGbk`, `IWwr2`)

```
width: fill_container
height: 44px
fill: surface
border-radius: 12px
border: 1px solid line
padding: 0 12px
gap: 8px
align-items: center
```

Isi: ikon `search` `16px` `fill: muted` + placeholder `12.5px` `fill: muted`.

### Field form

```
layout: vertical, gap: 6px
Label: 12–13px / 500 / primary-soft
Input: height 46–52px, fill surface, border 1px line, radius 12px, padding 0 12px
Teks input: 14px
Error: 12px / 500 / danger, di bawah input
```

### Chip filter

```
height: 38–44px
border-radius: 999
padding: 0 16px
justify-content: center, align-items: center
```

| State | Isi |
|---|---|
| Aktif | `fill: primary`, label `12px / 600 / bg` |
| Nonaktif | `fill: surface`, `border: 1px line`, label `12px / 500 / primary-soft` |

### Segmented control (Filter Status)

**Node canvas:** `Filter Status` (`HkBsP`)

```
container: height 52px, fill surface-muted, radius 14px, padding 4px, gap 4px
segmen aktif: fill surface, border 1px line-soft, radius 11px
segmen nonaktif: tanpa fill, tanpa border
```

### Aturan

- **Placeholder menunjukkan contoh format**, bukan instruksi. "Cari nama atau kategori produk" — bukan "Masukkan kata kunci di sini".
- **Setiap input punya label terlihat.** Placeholder bukan pengganti label.
- **Input di mobile minimal `16px` font** supaya iOS Safari tidak zoom otomatis.
- Chip filter bisa digeser horizontal kalau jumlahnya melebihi lebar layar, dengan item terakhir terpotong sebagian sebagai petunjuk ada isi lanjutan.

---

## 6. Kartu

### Kartu metrik (Beranda)

**Node canvas:** `Kartu Profit` (`B2Ll2`), `Kartu Saldo Utang` (`ax7nB`)

```
width: fill_container
border-radius: 16px
padding: 14px
layout: vertical, gap: 3px
```

Isi:
- Label `12.5px / 500 / muted` (kartu profit) atau `primary-soft` (kartu utang)
- Nominal `20px / 700 / primary`
- Catatan `12px / 400 / muted`

`Kartu Profit`: `fill: surface`, `border: 1px line-soft`.
`Kartu Saldo Utang`: `fill: warning-soft`, **tanpa border**.

### Kartu daftar (baris produk / penitip / utang)

```
width: fill_container
border-radius: 14px
fill: surface
border: 1px solid line-soft
padding: 10–12px
gap: 8–10px
align-items: center
```

Baris produk di katalog tinggi `fit_content` (minimal setara thumb `52px`); baris produk di POS tetap `56px`.

### Kartu gelap (Omzet, Saldo Penitip)

```
border-radius: 18–20px
fill: primary
padding: 14–16px
layout: vertical, gap: 3–4px
```

Isi:
- Label `12px / 400 / accent-soft`
- Nominal `28px / 700 / bg`
- Catatan `11–12px / 400 / accent-soft`

### Kartu peringatan (Stok Menipis)

**Node canvas:** `Peringatan Stok Menipis` (`o6GwIx`)

```
fill: warning-soft
border-radius: 16px
padding: 14px 16px
layout: vertical, gap: 7px
```

Isi: kepala (ikon `triangle-alert` `15px` `warning` + judul `12.5px / 600` + spacer + jumlah), lalu baris produk (nama `14px`, sisa `12px / 600 / primary-soft`).

### Aturan

- **Kartu selalu punya satu sumber isi.** Jangan campur metrik keuangan dan aksi navigasi dalam satu kartu.
- **Pemisah dalam kartu** pakai `height: 1px; fill: line-soft`, bukan border pada baris.
- **Kartu yang bisa diklik** wajib punya `chevron-right` `16px` `fill: muted` atau `primary-soft` di ujung sebagai petunjuk navigasi.

---

## 7. Header Layar

Dua pola.

### Pola A — layar tab utama (Beranda, Katalog, Transaksi, Utang, Riwayat)

```
layout: vertical, gap: 3–4px
Eyebrow:      12px / 600 / primary-soft / letterSpacing 1.2  (opsional)
Judul Layar:  24px / 700 / primary
Baris info:   12px / 400 / muted
```

Beranda punya tambahan `Tombol Logout` `44 × 44` di kanan judul, plus `Tag Data Prototipe` (`fill: surface-muted`, `radius: 999`, `padding: 3px 8px`, label `12px / 600 / muted`).

### Pola B — layar detail (Detail Produk, Detail Penitip)

```
layout: horizontal, gap: 10px, align-items: center
Tombol Kembali: 44 × 44, radius 999, fill surface, border 1px line
Judul Header:   layout vertical, gap 1px
  Judul Layar:  22–24px / 700 / primary
  Sub Judul:    12px / 400 / muted
```

### Aturan

- **Layanan detail wajib punya Tombol Kembali.** Layar tab utama tidak.
- Eyebrow hanya di layar yang punya konteks grup: "KATALOG", "TRANSAKSI", "UTANG", "KONSINYASI".
- **Tag `[Data Contoh]`** boleh dipakai di prototype, tapi **wajib dihapus** di kode produksi.

---

## 8. Bar Keranjang (POS)

**Node canvas:** `Bar Keranjang` (`G49pEA`)

```
width: fill_container
fill: surface
border-top: 1px solid line-soft
padding: 12px 20px 14px 20px
justify-content: space-between
align-items: center
gap: 10px
```

Isi:
- `Ringkasan Keranjang`: label `12px / 400 / muted` + total `20px / 700 / primary`
- `Tombol Buka Keranjang`: tinggi `48px`, `radius: 999`, `fill: primary`, ikon `shopping-cart` `16px` `bg` + label "Keranjang" `14px / 600 / bg`

### Aturan

- Bar keranjang **sticky di bawah daftar produk**, di atas bottom nav.
- Total mengikuti `tabular-nums` supaya tidak bergeser saat item ditambah.
- Saat keranjang kosong, tombol dinonaktifkan dengan label tetap terbaca.

---

## 9. Checklist komponen

- [ ] Bottom nav tepat 5 item, Transaksi terangkat.
- [ ] Sidebar menggantikan bottom nav, bukan keduanya.
- [ ] Badge selalu punya dot + label teks.
- [ ] Tombol primer pill, satu per blok, selalu berlabel.
- [ ] Tombol merusak ber-border `danger` + dialog konfirmasi.
- [ ] Input punya label terlihat, font ≥ `16px` di mobile.
- [ ] Kartu memakai token tabel §1 dokumen `01-design-token.md`.
- [ ] Layar detail punya Tombol Kembali.
- [ ] Nominal uang `tabular-nums`.
- [ ] Target sentuh minimum `44 × 44px`.
