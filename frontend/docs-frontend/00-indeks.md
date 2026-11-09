# 00 — Indeks Dokumen Front-End

Dokumen di folder `docs-frontend/` adalah turunan langsung dari canvas `ui-kendi.pen` dan dokumen acuan bisnis. Front-end memakai dokumen ini sebagai satu-satunya acuan tampilan.

**Dokumen desain perangkat lunak front-end:** [`SDD_Frontend_Kendis_Market.md`](SDD_Frontend_Kendis_Market.md) — arsitektur, tech stack (React + TypeScript, Vite, Tailwind, Zod, TanStack Query + native `fetch()`, Vitest + RTL, ESLint), struktur folder, kontrak tipe/Zod, layer data & invalidasi, testing, urutan implementasi. Mulai dari sini untuk keputusan teknis kode.

**Dibuat:** 2026-11-01
**Diperbarui:** 2026-11-09 — menambah dokumen `06` (layout tablet/desktop), memperbarui status canvas & sidebar.
**Sumber:** `ui-kendi.pen`, `MASTER-DESIGN-PROMPT.md`, `PROMPT_DESIGN_TABLET_DEKSTOP.MD`, `docs/prd_kendi_s_market.md` (PRD Revisi 4), `docs/SRS_Kendis_Market.md` (SRS v1.1), `docs/SDD_Backend_Kendis_Market.md` (SDD Backend v1.1).

---

## Isi

| # | Dokumen | Isi | Baca kalau |
|---|---|---|---|
| 01 | [Design Token & Fondasi Visual](01-design-token.md) | 15 token warna + peta kontras terukur, tipografi, radius, spacing, ikon, format Rupiah, bahasa | Mau bikin komponen apa pun |
| 02 | [Spesifikasi Komponen](02-spesifikasi-komponen.md) | Bottom Nav, Sidebar, Badge, 4 varian tombol, input, chip, segmented, 4 jenis kartu, 2 pola header, Bar Keranjang — semua ukuran dari node canvas | Mau bikin atau review komponen |
| 03 | [Peta Layar, Alur, dan State](03-peta-layar-dan-alur.md) | Peta navigasi lengkap, 9 layar utama + 46 subflow, aturan yang mengikat tiap layar | Mau bikin halaman atau routing |
| 04 | [Interaksi & Aturan Bisnis UI](04-interaksi-dan-aturan-bisnis.md) | Status Lunas/Utang otomatis, void 24 jam, cicilan, saldo penitip, validasi, pesan error, empty state, daftar hal yang dilarang | Mau bikin logika atau pesan |
| 05 | [Inventaris Canvas & Implementasi](05-inventaris-canvas-dan-implementasi.md) | Pemetaan node canvas → komponen, struktur file, 4 fungsi inti + kodenya, urutan implementasi | Mau mulai coding |
| 06 | [Layout Tablet & Desktop](06-layout-tablet-desktop.md) | Breakpoint, sidebar 7 item, grid multi-kolom, modal tengah, perbedaan dari mobile | Mau bikin tampilan tablet/desktop |

---

## Aturan utama yang berlaku di seluruh dokumen

1. **Bahasa Indonesia** untuk semua teks (SRS IR-02).
2. **Rupiah tanpa desimal**, pemisah ribuan titik: `Rp15.000`, `Rp1.250.000`.
3. **Nominal angka wajib `tabular-nums`** supaya tidak bergeser.
4. **Tidak ada shadow.** Struktur pakai border `1px line-soft`.
5. **Satu aksi primer per blok**, selalu pill `999px`.
6. **Status selalu punya label teks**, tidak hanya warna.
7. **Target sentuh minimum `44 × 44px`**; input utama `46–56px`.
8. **Warna tidak boleh pembawa makna tunggal.**
9. **Tidak ada fitur di luar MVP** — daftar lengkapnya di `04-interaksi-dan-aturan-bisnis.md` §9.
10. **Acuan tampilan mobile** adalah set `Screen /` dan `Subflow /` di canvas.

---

## Status canvas

- **Mobile (390 × 844):** lengkap, 10 layar (`Screen /`) + subflow (`Subflow /`) + komponen dasar.
- **Tablet (1024 × 768):** lengkap, 19 frame (`Tablet / ...`) — 10 layar utama + 7 modal + 2 state login.
- **Desktop (1440 × 900):** lengkap, 18 frame (`Desktop / ...`) — 10 layar utama + 6 modal + 2 state login. *(Desktop belum punya `Modal Konfirmasi Nonaktifkan Penitip`; buat mengikuti pola Tablet bila diperlukan.)*
- **Navigasi:** `Component / Bottom Nav` (`zsT3e`) untuk mobile; `Component / Sidebar Tablet` (`BJljd`, 96px) dan `Component / Sidebar Desktop` (`cbbLL`, 248px) untuk tablet/desktop — keduanya **7 item** (Laporan & Penitip kini di sidebar, bukan kartu Beranda). `Component / Sidebar Nav` (`IUYM5`, versi lama 5 item) **sudah tidak dipakai / sudah tergantikan**.
- Detail layout responsif: `06-layout-tablet-desktop.md`.

---

## Keputusan yang sudah dikunci (2026-11-09)

1. **Halaman Utang: per transaksi, bukan per pembeli.** SDD Backend tidak punya entity pembeli; `GET /debts` kembali per transaksi. **Tidak ada agregasi per pembeli di sisi klien** — jangan dibangun. Detail: SDD Front-end §15.1.
2. **Font heading: sans-serif.** Satu keluarga sans-serif untuk heading + body, ikut canvas. Tidak ada serif di kode. Detail: SDD Front-end §15.2.

**Sesi/token** sudah diatur SDD Backend (§3.2, §11.6 — JWT default, access token 15 menit, refresh token di httpOnly cookie). Implementasi frontend di SDD Front-end §5.2b dan §15.3.

---

## Cara memakai dokumen ini

**Untuk developer front-end:**
Baca `01` → `02` → lalu dokumen layar yang sedang dikerjakan di `03`. Logika dan pesan selalu cek `04`. Fungsi inti sudah ada kodenya di `05` §6.

**Untuk reviewer:**
Cek tabel kontras di `01` §1, ukuran komponen di `02`, dan daftar larangan di `04` §9. Ketiga tabel itu yang paling sering dilanggar.

**Ketika ada pertentangan:**
Urutan yang berlaku: PRD/SRS/SDD → `ui-kendi.pen` → dokumen di folder ini. Dokumen ini tidak boleh mengubah aturan bisnis; kalau ada ketidaksesuaian, laporkan ke pengguna, jangan perbaiki sendiri.
