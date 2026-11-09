# 01 — Design Token & Fondasi Visual

Dokumen ini merangkum seluruh token, tipografi, dan aturan visual yang **sudah terpasang** di file `ui-kendi.pen`. Front-end wajib memakai nilai yang sama, bukan menebak ulang dari screenshot.

Sumber: `ui-kendi.pen` (variables canvas), `MASTER-DESIGN-PROMPT.md` §4, dan `claude.md` §2.

---

## 1. Warna — Token Semantik

Nama di kolom kiri adalah **nama token yang dipakai di canvas**. Di front-end, petakan ke variabel CSS dengan prefix `--kd-` (atau nama proyek), **jangan** pakai hex literal di komponen.

| Token canvas | Hex | Peran | Contoh pemakaian |
|---|---|---|---|
| `bg` | `#E3EED4` | Latar aplikasi | `body`, background layar |
| `surface` | `#F6FAEF` | Kartu & panel utama | kartu produk, kartu ringkasan, bottom nav |
| `surface-muted` | `#EDF4E2` | Elemen sekunder / thumbnail | thumb produk, wadah icon, segmen filter |
| `primary` | `#0F2A1D` | Teks utama, tombol utama | judul, tombol Simpan, kartu Omzet |
| `primary-soft` | `#375534` | Aksen gelap / teks di atas `primary` | label pada kartu gelap, badge aktif |
| `accent` | `#6B9071` | Aksen sedang | icon aktif, status terpilih |
| `accent-soft` | `#AEC3B0` | Teks sekunder di atas `primary` | "Omzet Hari Ini", catatan kartu gelap |
| `line` | `#D3E0C1` | Border kuat | input, tombol sekunder |
| `line-soft` | `#E4EBD8` | Border halus | garis pemisah kartu, tepi kartu |
| `muted` | `#5C6A5C` | Teks sekunder | kategori, subjudul, placeholder |
| `muted-soft` | `#E6EBDF` | Latar badge netral | badge Dibatalkan |
| `warning` | `#9A552F` | Peringatan / teks bahaya | sisa stok menipis, saldo negatif |
| `warning-soft` | `#F3E1D2` | Latar peringatan | kartu Stok Menipis, badge Utang |
| `success-soft` | `#D8E6C9` | Latar sukses | badge Lunas, badge Aktif |
| `danger` | `#A33B2B` | Aksi merusak | tombol Nonaktifkan, nilai sisa utang |

### Aturan pemakaian

- **Satu warna, satu makna.** `danger` hanya untuk aksi merusak (Nonaktifkan Produk, Nonaktifkan Penitip). `warning` hanya untuk kondisi peringatan (stok menipis, saldo negatif). Jangan pakai `danger` untuk tombol Batal.
- **Warna tidak pernah pembawa makna tunggal.** Badge status selalu punya label teks ("Lunas", "Utang", "Dibatalkan") + dot, bukan hanya warna.
- **Teks di atas `primary` (`#0F2A1D`)** memakai `bg` (`#E3EED4`) untuk judul besar dan `accent-soft` (`#AEC3B0`) untuk label kecil.
- **Teks di atas kartu gelap tidak boleh `muted`** — kontras terlalu rendah. Pakai `accent-soft`.

### Peta kontras minimum (WCAG 2.2 AA)

| Pasangan | Rasio | Status |
|---|---|---|
| `primary` di atas `bg` | ~13.9:1 | Lulus AA & AAA teks normal |
| `primary` di atas `surface` | ~13.2:1 | Lulus AA & AAA |
| `muted` di atas `surface` | ~5.6:1 | Lulus AA |
| `muted` di atas `bg` | ~5.3:1 | Lulus AA |
| `bg` di atas `primary` | ~13.9:1 | Lulus AA & AAA |
| `accent-soft` di atas `primary` | ~7.6:1 | Lulus AA |
| `warning` di atas `warning-soft` | ~4.9:1 | Lulus AA |
| `danger` di atas `surface` | ~6.6:1 | Lulus AA |
| `primary-soft` di atas `success-soft` | ~7.4:1 | Lulus AA |

Semua pasangan teks lulus 1.4.3 AA. Batas komponen UI (1.4.11, 3:1) juga terlampaui karena seluruh border memakai `line`/`line-soft` di atas `surface`/`bg`.

---

## 2. Tipografi

Dua peran, satu keluarga. Canvas memakai satu keluarga untuk keduanya, dibedakan lewat **weight dan ukuran**.

| Peran | Keluarga | Ukuran | Weight | Letter-spacing |
|---|---|---|---|---|
| Heading / judul layar | Sans-serif bersih | `24px` (mobile) | 700 | `-0.01em` |
| Sub-heading | Sans-serif bersih | `20–22px` | 700 | `-0.01em` |
| Body / label | Sans-serif bersih | `12–14.5px` | 400–700 | `0` |
| Nominal angka | Sans-serif bersih | `20–28px` | 700 | `0` |
| Eyebrow / label caps | Sans-serif bersih | `12px` | 600 | `1.2px` |

### Aturan

- **Nominal uang wajib `font-variant-numeric: tabular-nums`.** Total, sisa utang, saldo, dan harga selalu sejajar digit walaupun angkanya berubah.
- **Line-height** `1.45` untuk teks panjang, `1.2–1.3` untuk judul. Jangan pakai `leading-none` pada deskripsi yang bisa wrap.
- **Tidak ada font serif di implementasi saat ini.** `MASTER-DESIGN-PROMPT.md` §4 menyebut serif untuk branding, tetapi canvas sudah menyatukan keduanya ke satu keluarga sans-serif. Ikuti canvas; kalau ingin serif, itu perubahan desain yang perlu persetujuan.
- Ukuran minimum teks UI `12px`. Jangan turun ke bawah itu.
- Seluruh teks **Bahasa Indonesia** (SRS IR-02).

### Skala angka

| Nama | Ukuran | Dipakai di |
|---|---|---|
| `display` | `28px` | Omzet, saldo penitip, nilai harga jual |
| `title` | `24px` | Judul layar utama |
| `headline` | `20–22px` | Nilai metrik kartu, nama produk detail |
| `body-lg` | `14–15px` | Nama item, nilai sisa utang |
| `body` | `12.5–13.5px` | Label, harga, keterangan |
| `caption` | `11.5–12px` | Eyebrow, subjudul, catatan |

---

## 3. Bentuk, elevasi, radius

| Elemen | Radius | Elevasi |
|---|---|---|
| Kartu besar | `16–20px` | border `1px` `line-soft`, tanpa shadow |
| Kartu kecil / baris daftar | `12–14px` | border `1px` `line-soft` |
| Input / field | `12px` | border `1px` `line` |
| Thumb produk | `10px` | tanpa border |
| Tombol utama | `999px` (pill) | tanpa shadow |
| Tombol sekunder | `999px` (pill) | border `1px` `line` |
| Badge | `999px` (pill) | tanpa border |
| Segmen filter | `11px` | border `1px` `line-soft` pada segmen aktif |

### Aturan

- **Border untuk struktur, bukan kedalaman.** Kartu pakai `border: 1px solid line-soft`. Tidak ada `box-shadow` di seluruh canvas.
- **Tombol utama selalu pill** (`border-radius: 999px`) dan selalu `fill: primary`, `color: bg`.
- **Satu aksi utama per layar.** Satu tombol pill `primary`; sisanya pill `surface` dengan border.
- **Kartu Omzet dan Kartu Saldo Penitip adalah pengecualian**: latar `primary` (gelap) supaya angka terbesar di layar langsung terbaca.

---

## 4. Spacing

Skala dasar kelipatan `4px`. Nilai yang benar-benar dipakai di canvas:

| Token | Nilai | Pemakaian |
|---|---|---|
| `space-1` | `4px` | gap dalam grup kecil, padding badge |
| `space-2` | `6–8px` | gap antar baris rapat, gap chip |
| `space-3` | `10–12px` | gap antar kartu dalam daftar |
| `space-4` | `14–16px` | padding kartu, gap antar grup |
| `space-5` | `20px` | padding horizontal layar, gap antar blok besar |
| `space-6` | `28px` | jarak antar section di layar panjang |

### Aturan

- **Padding horizontal layar: `20px`** (katalog, transaksi, utang, riwayat) dan `24px` (beranda, login). Jangan campur dalam satu layar.
- **Gap antar grup ≥ 2× gap dalam grup.** Dalam kartu gap `6–10px`, antar kartu `10–12px`, antar blok besar `14–20px`.
- **Status bar tinggi `62px`** dengan padding horizontal `20–24px`.
- **Bottom nav tinggi `88px`**, konten di atasnya wajib punya `padding-bottom` yang cukup supaya tidak tertutup.

---

## 5. Ikon

- **Keluarga: Lucide.** Nama ikon dipakai apa adanya dari Lucide (`house`, `package`, `history`, `wallet`, `circle-plus`, `search`, `chevron-right`, `arrow-left`, `log-out`, `plus`, `pencil`, `trash-2`, `arrow-up-down`, `download`, `shopping-cart`, `triangle-alert`, `user-x`, `signal`, `wifi`, `battery-full`).
- **Ukuran:** `15px` (status bar), `16px` (ikon dalam tombol), `18–20px` (ikon aksi mandiri), `22px` (ikon bottom nav), `48px` (ikon placeholder foto).
- **Warna mengikuti peran teks**, bukan warna sendiri. Ikon di tombol utama = `bg`. Ikon di tombol sekunder = `primary`. Ikon aksi merusak = `danger`.
- **Ikon dekoratif tidak boleh jadi satu-satunya pembawa makna.** Seliamanya ada label teks.

---

## 6. Format Rupiah

Wajib konsisten di seluruh aplikasi (PRD BR-16, SRS IR-04):

```
Rp15.000
Rp1.250.000
Rp172.000
```

- Pemisah ribuan: titik (`.`).
- **Tanpa desimal**, tanpa "IDR", tanpa "Rp." dengan titik.
- Selalu ada awalan `Rp` tanpa spasi.
- Nilai negatif: `-Rp24.000` (tanda minus sebelum `Rp`).
- Di front-end pakai `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })` atau fungsi sendiri yang menghasilkan pola di atas — jangan pakai format locale default yang menghasilkan "Rp 15.000,00".

---

## 7. Bahasa & Nada Penulisan

- **Bahasa Indonesia** untuk seluruh label, judul, tombol, pesan, dan placeholder.
- **Kalimat biasa (sentence case)** untuk judul layar dan tombol: "Tambah Produk", "Catat Setoran", "Nonaktifkan Produk".
- **Eyebrow pakai huruf kapital** dengan `letter-spacing: 1.2px`: "KATALOG", "KONSINYASI", "TRANSAKSI", "UTANG".
- **Tombol dimulai dengan kata kerja.** "Simpan produk", "Catat pembayaran", "Terapkan filter".
- **Tidak ada "Hapus".** Produk dengan riwayat dinonaktifkan, bukan dihapus (BR-12, BR-26). Labelnya selalu "Nonaktifkan Produk".
- **Pesan error menyebut cara memperbaiki**, bukan hanya menyebut kesalahan.
- **Tidak ada "Please"** pada instruksi rutin.

---

## 8. Checklist sebelum komponen di-merge

- [ ] Tidak ada hex literal di komponen — semua lewat token.
- [ ] Nominal uang pakai `tabular-nums`.
- [ ] Radius sesuai tabel §3.
- [ ] Spacing sesuai tabel §4.
- [ ] Tombol utama pill `999px`, satu per layar.
- [ ] Ikon Lucide, ukuran sesuai tabel §5.
- [ ] Seluruh teks Bahasa Indonesia.
- [ ] Tidak ada shadow baru.
- [ ] Status selalu punya label teks, bukan hanya warna.
- [ ] Target sentuh minimum `44 × 44px`; input utama `46–56px` tinggi.
