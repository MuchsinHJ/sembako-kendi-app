# 05 — Inventaris Canvas & Panduan Implementasi

Dokumen ini memetakan seluruh node di `ui-kendi.pen` ke struktur front-end, supaya developer tahu node mana yang menjadi acuan tiap halaman dan mana yang sudah usang.

Sumber: `ui-kendi.pen` (pembacaan langsung via MCP, 2026-11-01).

---

## 1. Ringkasan isi canvas

| Grup | Jumlah frame | Status |
|---|---|---|
| `Screen / ...` | 10 layar utama mobile | **Acuan utama front-end** |
| `Subflow / ...` | dialog & state mobile | **Acuan utama front-end** |
| `Tablet / ...` | 19 frame (10 layar + 7 modal + 2 login) | **Acuan tampilan tablet** |
| `Desktop / ...` | 18 frame (10 layar + 6 modal + 2 login) | **Acuan tampilan desktop** |
| `Grup 1..7` | 7 frame pengelompokan alur | Kerangka presentasi, bukan acuan render |
| `Component / ...` | komponen reusable | **Acuan komponen front-end** |
| `Overview`, `Components` | 2 papan | Dokumentasi |

Frame tablet & desktop telah dibangun ulang dan lengkap. Detail layout responsif ada di `06-layout-tablet-desktop.md`.

---

## 2. Layar utama (`Screen /`)

| Nama canvas | Ukuran | Halaman front-end |
|---|---|---|
| `Screen / Login` | 390 × 844 | `/login` |
| `Screen / Beranda` | 390 × 844 | `/` (dashboard) |
| `Screen / Katalog Produk` | 390 × 844 | `/produk` |
| `Screen / Transaksi` | 390 × 844 | `/transaksi` |
| `Screen / Riwayat Transaksi` | 390 × 844 | `/riwayat` |
| `Screen / Utang` | 390 × 844 | `/utang` |
| `Screen / Detail Produk` | 390 × 844 | `/produk/:id` |
| `Screen / Daftar Penitip` | 390 × 844 | `/penitip` |
| `Screen / Detail Penitip` | 390 × 844 | `/penitip/:id` |

---

## 3. Subflow (`Subflow /`)

### Autentikasi
- `Subflow / Login - Kredensial Salah`

### Produk & Stok
- `Subflow / Tambah Produk`
- `Subflow / Edit Produk`
- `Subflow / Empty State Katalog`
- `Subflow / Empty State Pencarian`
- `Subflow / Tambah Produk (Keyboard Terbuka)`
- `Subflow / Detail Produk - Nonaktif`
- `Subflow / Detail Produk - Titipan`
- `Subflow / Konfirmasi Nonaktifkan Produk`
- `Subflow / Produk Berhasil Dinonaktifkan`
- `Subflow / Sesuaikan Stok - Tambah`
- `Subflow / Sesuaikan Stok - Kurangi`
- `Subflow / Sesuaikan Stok - Alasan Lainnya`

### Transaksi (POS)
- `Subflow / Transaksi - Keranjang`
- `Subflow / Transaksi - Utang`
- `Subflow / Konfirmasi Transaksi`
- `Subflow / Konfirmasi Transaksi - Lunas`
- `Subflow / Transaksi Berhasil - Lunas`
- `Subflow / Transaksi Berhasil - Utang`

### Riwayat & Void
- `Subflow / Detail Transaksi - Lunas`
- `Subflow / Detail Transaksi - Utang`
- `Subflow / Konfirmasi Pembatalan`
- `Subflow / Detail Transaksi - Dibatalkan`
- `Subflow / Detail Transaksi - Lewat Batas Waktu`
- `Subflow / Detail Transaksi - Lunas Cicilan`
- `Subflow / Rentang Tanggal`
- `Subflow / Riwayat - Rentang Kosong`
- `Subflow / Rentang Tanggal - Tidak Valid`

### Utang & Cicilan
- `Subflow / Utang - Kosong`
- `Subflow / Catat Pembayaran`
- `Subflow / Catat Pembayaran - Melebihi Saldo`
- `Subflow / Konfirmasi Pembayaran`
- `Subflow / Pembayaran Berhasil - Masih Utang`
- `Subflow / Pembayaran Berhasil - Lunas`
- `Subflow / Utang Pelanggan - Detail Transaksi`
- `Subflow / Utang Pelanggan - Detail Transaksi - Dapat Dibatalkan`

### Laporan
- `Subflow / Laporan Penjualan`
- `Subflow / Ekspor Laporan Penjualan`
- `Subflow / Ekspor Laporan Utang`

### Konsinyasi (Penitip)
- `Subflow / Detail Penitip - Saldo Negatif`
- `Subflow / Catat Setoran`
- `Subflow / Catat Setoran - Melebihi Saldo`
- `Subflow / Terima Titipan`
- `Subflow / Retur ke Penitip`
- `Subflow / Riwayat Pergerakan Titipan`
- `Subflow / Laporan Konsinyasi`
- `Subflow / Konfirmasi Nonaktifkan Penitip`
- `Subflow / Produk Titipan Penitip`

---

## 4. Komponen reusable

| Nama canvas | ID | Ukuran | Komponen front-end |
|---|---|---|---|
| `Component / Bottom Nav` | `zsT3e` | 390 × 88 | `<BottomNav>` (mobile) |
| `Component / Badge Lunas` | `tmlnl` | pill | `<Badge variant="lunas">` |
| `Component / Badge Utang` | `ZCJgD` | pill | `<Badge variant="utang">` |
| `Component / Badge Neutral` | `RBeuj` | pill | `<Badge variant="netral">` |
| `Component / Sidebar Tablet` | `BJljd` | 96 × 768 | `<SidebarNav variant="tablet">` — **7 item, vertikal** |
| `Component / Sidebar Desktop` | `cbbLL` | 248 × 900 | `<SidebarNav variant="desktop">` — **7 item, horizontal** |

### Catatan

- `Component / Badge Lunas` juga dipakai untuk status **Aktif** dengan label diganti. Tidak perlu komponen terpisah.
- `Component / Sidebar Tablet` dan `Component / Sidebar Desktop` adalah **dua master** yang di-*instance* sebagai `ref` di seluruh layar tablet/desktop. State aktif di-*override* per instance lewat `descendants` (item aktif `primary`, ikon & label `bg`; item lain `surface`/`accent`/`primary-soft`). Hanya **satu** item aktif per layar.
- `Component / Sidebar Nav` (`IUYM5`, versi lama 5 item) **sudah tergantikan** oleh dua master di atas dan tidak lagi ada di canvas. Jangan merujuknya.
- Satu komponen `<SidebarNav>` front-end cukup untuk kedua breakpoint — bedakan lewat prop `variant` (tablet = vertikal 96px, desktop = horizontal 248px). Menu & state aktif identik.

---

## 5. Struktur file front-end yang disarankan

Struktur ini mengikuti pembagian dokumen, bukan framework tertentu. Sesuaikan dengan stack proyek.

```
src/
  theme/
    tokens.css            ← seluruh token dari 01-design-token.md §1
    typography.css        ← skala & aturan tipografi
  components/
    BottomNav.tsx
    SidebarNav.tsx
    Badge.tsx             ← 3 varian
    Button.tsx            ← 4 varian
    TextField.tsx
    SearchField.tsx
    ChipFilter.tsx
    SegmentedFilter.tsx
    Card.tsx              ← metrik, daftar, gelap, peringatan
    ScreenHeader.tsx      ← Pola A & Pola B
    CartBar.tsx
    Rupiah.tsx            ← formatter + tabular-nums
  screens/
    Login.tsx
    Dashboard.tsx
    KatalogProduk.tsx
    DetailProduk.tsx
    Transaksi.tsx
    RiwayatTransaksi.tsx
    Utang.tsx
    DaftarPenitip.tsx
    DetailPenitip.tsx
    LaporanPenjualan.tsx
    LaporanKonsinyasi.tsx
  flows/
    TambahProduk.tsx
    EditProduk.tsx
    SesuaikanStok.tsx
    CatatPembayaran.tsx
    CatatSetoran.tsx
    TerimaTitipan.tsx
    ReturPenitip.tsx
    KonfirmasiVoid.tsx
    EksporLaporan.tsx
  lib/
    rupiah.ts
    voidWindow.ts         ← hitung sisa jam jendela 24 jam
    saldoPenitip.ts       ← hitung saldo dari riwayat
```

---

## 6. Fungsi inti yang wajib ditulis terpusah

Jangan sebarluaskan logika ini di komponen.

### `formatRupiah(value: number): string`

```ts
// Pola: Rp15.000 | Rp1.250.000 | -Rp24.000
export function formatRupiah(value: number): string {
  const neg = value < 0;
  const abs = Math.abs(Math.round(value));
  const grouped = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${neg ? '-' : ''}Rp${grouped}`;
}
```

Tanpa desimal. Tanpa spasi setelah `Rp`.

### `voidSisaJam(createdAtServer: string, nowServer: Date): number`

```ts
// Jendela 24 jam rolling berdasarkan waktu server (SDD §11.10/11.3)
export function voidSisaJam(createdAtServer: string, nowServer: Date): number {
  const created = new Date(createdAtServer).getTime();
  return (created + 24 * 60 * 60 * 1000 - nowServer.getTime()) / 3600000;
}
```

Nilai > 0 → tombol tampil. Nilai ≤ 0 → tombol disembunyikan, tampilkan penjelasan dalam satuan jam (SRS IR-06).

### `hitungSaldoPenitip(transaksi, setoran): number`

```ts
// SDD §3.14, §11.12 — saldo diturunkan, bukan kolom tersimpan
export function hitungSaldoPenitip(
  transaksi: Array<{ jumlah: number; hargaModalSnapshot: number; status: 'aktif' | 'dibatalkan' }>,
  setoran: number
): number {
  const kewajiban = transaksi
    .filter((t) => t.status === 'aktif')
    .reduce((sum, t) => sum + t.jumlah * t.hargaModalSnapshot, 0);
  return kewajiban - setoran;
}
```

Transaksi `dibatalkan` dikecualikan. Saldo bisa negatif dan **tidak boleh di-clamp**.

### `totalKewajibanPenitip(saldoList: number[]): number`

```ts
// SRS IR-13, SDD §5.7, BR-22 — hanya saldo positif
export function totalKewajibanPenitip(saldoList: number[]): number {
  return saldoList.filter((s) => s > 0).reduce((sum, s) => sum + s, 0);
}
```

Saldo negatif **tidak mengurangi** total. Penitip nonaktif tetap dihitung.

---

## 7. Urutan implementasi yang disarankan

1. **`theme/tokens.css`** — seluruh token §1 `01-design-token.md`.
2. **`lib/rupiah.ts`** + satu test sederhana (format & negatif).
3. **Komponen dasar**: `Button`, `Badge`, `TextField`, `SearchField`, `Card`.
4. **`BottomNav`** — 5 item, Transaksi terangkat.
5. **Layar tanpa state kompleks**: `Login`, `Katalog Produk`, `Detail Produk`.
6. **Layar dengan derivasi**: `Transaksi` (status Lunas/Utang otomatis), `Utang` (cicilan), `Riwayat` (void 24 jam).
7. **Modul konsinyasi**: `Daftar Penitip`, `Detail Penitip`, `Catat Setoran`, `Terima/Retur Titipan`.
8. **Laporan**: `Laporan Penjualan`, `Laporan Konsinyasi`, ekspor.
9. **Responsif** — ikuti `06-layout-tablet-desktop.md`: bangun `<SidebarNav variant="tablet|desktop">`, lalu layout multi-kolom per layar (Katalog grid, POS dua panel, Beranda metrik + dua zona, Riwayat/Utang master-detail, modal tengah).

---

## 8. Keputusan yang sudah dikunci (2026-11-09)

1. **Halaman Utang: per transaksi, bukan per pembeli.** SDD tidak punya entity pembeli; `namaPembeli` bebas; `GET /debts` kembali per transaksi. **Tidak ada agregasi per pembeli di sisi klien** — halaman Utang menampilkan baris per transaksi. Lihat SDD Front-end §15.1.
2. **Font heading: sans-serif.** Canvas memakai satu keluarga sans-serif untuk heading dan body; keputusan mempertahankannya. Tidak ada font serif di kode. Lihat SDD Front-end §15.2.

Sesi/token diatur SDD Backend (§3.2, §11.6): JWT default, access token 15 menit di memori, refresh token di httpOnly cookie. Lihat SDD Front-end §5.2b.
