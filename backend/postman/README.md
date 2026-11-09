# Postman Collection & Environment — Kendi's Market API

File Postman untuk testing API Backend Kendi's Market berdasarkan **SDD v1.1**, **SRS v1.1**, dan **PRD Revisi 4**.

## 🚦 Status

**Seluruh endpoint MVP sudah diimplementasikan** — 45 request dalam 9 folder.

| Folder | Request | Keterangan |
|---|---|---|
| Health | 1 | Health check publik (tanpa auth) |
| Auth | 3 | Login, Refresh Token, Logout |
| Consignor | 8 | Data penitip + saldo + setoran |
| Product | 12 | CRUD, stok, foto, produk titipan |
| Consignment | 3 | Penerimaan, retur, riwayat movement |
| Transaction | 6 | Create (Lunas/Utang/Titipan), list, detail, void |
| Debt | 3 | List utang, riwayat cicilan, tambah pembayaran |
| Dashboard | 1 | Ringkasan (termasuk kewajiban penitip) |
| Report | 8 | Sales, debts, product trend, konsinyasi, ekspor |

## 📁 File

1. **`Kendis_Market_API.postman_collection.json`** — 45 request, 9 folder, dengan test script auto-save ID/token.
2. **`Kendis_Market_Development.postman_environment.json`** — `http://localhost:3000`, kredensial test `test@example.com` / `password123`.
3. **`Kendis_Market_Production.postman_environment.json`** — `https://api.kendismarket.com`, seluruh kredensial dikosongkan.

## 🚀 Import

1. Postman → **Import** → tab **File** → pilih `Kendis_Market_API.postman_collection.json`.
2. Import environment: ⚙️ → **Environments** → **Import** → pilih file development/production.
3. Pilih environment aktif di dropdown pojok kanan atas.

## 🔑 Environment Variables

| Variable | Deskripsi | Auto-filled? |
|---|---|---|
| `base_url` | Base URL API | ✓ |
| `access_token` | JWT access token | ✓ via Login / Refresh |
| `user_email` | Email login | Manual |
| `user_password` | Password login | Manual |
| `product_id` | ID produk milik toko | ✓ via Create Product |
| `transaction_id` | ID transaksi | ✓ via Create Transaction |
| `consignor_id` | ID penitip | ✓ via Create Consignor |
| `consignment_product_id` | ID produk titipan | ✓ via Create Consignment Product |
| `movement_id` | ID movement penerimaan/retur | ✓ via Create Receipt |
| `consignor_payment_id` | ID setoran ke penitip | ✓ via Add Consignor Payment |
| `consignor_saldo_setelah` | Saldo setelah setoran terakhir | ✓ via Add Consignor Payment |

### Auto-Save

1. **Login / Refresh Token** → `access_token`
2. **Create Product** → `product_id`
3. **Create Consignment Product** → `consignment_product_id`
4. **Create Consignor** → `consignor_id`
5. **Create Receipt** → `movement_id`
6. **Add Consignor Payment** → `consignor_payment_id`, `consignor_saldo_setelah`
7. **Create Transaction** → `transaction_id`

## 🧪 Alur Testing Konsinyasi

Urutan ini penting karena saldo bersifat *derived* dari penjualan dikurangi setoran.

```
1. Auth → Login
2. Consignor → Create Consignor          (consignor_id tersimpan)
3. Product   → Create Consignment Product (consignment_product_id tersimpan)
4. Consignment → Create Receipt (Terima Titipan)   → stok naik 20
5. Transaction → Create Transaction (Titipan)      → barang terjual, kewajiban timbul
6. Consignor → Get Consignor Balance      → saldo = modal barang terjual
7. Consignor → Add Consignor Payment      → saldo turun, saldoSetelahBayar tercatat
8. Report    → Get Consignment Report     → saldoAkhir konsisten dengan langkah 6
9. Dashboard → Get Dashboard Summary      → totalKewajibanPenitip ikut turun
10. Consignment → Create Return           → stok turun (uji juga retur melebihi stok → 422)
```

### Skenario negatif yang layak dicoba

| Skenario | Ekspektasi |
|---|---|
| Create Consignment Product tanpa `consignorId` | 400 `VALIDATION_ERROR` |
| Create Consignment Product dengan `hargaJual` < `hargaModal` | 422 `BUSINESS_RULE_VIOLATION` (BR-18) |
| Update Product mengubah `tipe`/`consignorId` | 422 (BR-17, immutable) |
| Nonaktifkan penitip yang masih berstok | 422 `CONSIGNOR_HAS_STOCK` + `details.products` |
| Setoran melebihi saldo | 422 `CONSIGNOR_OVERPAYMENT` |
| Setoran saat saldo ≤ 0 | 422 `CONSIGNOR_OVERPAYMENT` |
| Retur melebihi stok | 422 `BUSINESS_RULE_VIOLATION` |
| Terima titipan untuk produk MILIK_SENDIRI | 422 `PRODUCT_NOT_CONSIGNMENT` |
| Terima titipan dari penitip NONAKTIF | 422 `CONSIGNOR_INACTIVE` |
| Void transaksi > 24 jam | 422 (BR-13) |

## 📋 Struktur per Folder

### Auth (3)
`POST` Login · `POST` Refresh Token · `POST` Logout

### Consignor (8)
`GET` List (filter `status`, `search`, `punyaSaldo`) · `GET` by ID · `POST` Create · `PUT` Update · `PATCH` Status · `GET` Balance · `GET` Payments · `POST` Payments

### Product (12)
`GET` List (filter `tipe`, `consignorId`) · `GET` by ID · `POST` Create (milik sendiri) · `POST` Create Consignment Product · `PUT` Update · `DELETE` · `PATCH` Status · `PATCH` Stock Threshold · `GET` Low Stock · `PATCH` Stock Adjustment · `POST` Upload Photo · `DELETE` Photo

### Consignment (3)
`POST` Receipts · `POST` Returns · `GET` Movements

### Transaction (6)
`GET` List · `GET` by ID · `POST` Create (Lunas) · `POST` Create (Utang) · `POST` Create (Titipan) · `POST` Void

### Debt (3)
`GET` List · `GET` Payment History · `POST` Add Payment

### Dashboard (1)
`GET` Summary

### Report (8)
`GET` Sales · `GET` Debts · `GET` Product Trend · `GET` Consignment · `GET` Sales/Export (xlsx) · `GET` Sales/Export (pdf) · `GET` Debts/Export (xlsx) · `GET` Debts/Export (pdf)

## 📝 Catatan

### Authentication
- Semua endpoint kecuali `Login`, `Refresh Token`, dan `Health` butuh Bearer Token dari `{{access_token}}`.
- 401 → jalankan Login ulang atau Refresh Token.

### Upload Foto
- `POST /products/:id/photo`, `multipart/form-data`, field `photo`.
- Format: JPEG/PNG/WebP (selain itu 415 `INVALID_FILE_TYPE`); isi corrupt → 400.
- Maks 5 MB; rate limit 10 upload/menit.

### Format Response
```json
{ "success": true, "data": { }, "message": "Optional" }
```
```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "...", "details": [] } }
```

### Konvensi Nilai Uang
- Semua nilai uang dikirim sebagai **string desimal 2 digit** (`"15000.00"`), bukan number.
- Saldo penitip boleh **negatif** (`"-20000.00"`) — artinya penitip sudah menerima setoran melebihi kewajiban toko.
- Input uang (`hargaJual`, `hargaModal`, `uangDiterima`, `jumlahBayar`) dikirim sebagai number/string sesuai schema masing-masing endpoint.

### Validasi Business Rules
- **BR-04**: stok tidak boleh negatif
- **BR-13**: void dalam 24 jam sejak transaksi dibuat
- **BR-14**: jumlahBayar ≤ sisaSaldoUtang
- **BR-17**: `tipe`/`consignorId` produk konsisten & immutable
- **BR-18**: harga jual titipan ≥ harga setor
- **BR-19/BR-E**: penitip hanya NONAKTIF bila stok titipan 0
- **BR-21**: penerimaan menambah stok, retur mengurangi dan tidak boleh melebihi stok
- **BR-22/BR-23**: setoran append-only, > 0, tidak melebihi saldo

## 🔧 Kustomisasi

- **Base URL**: ubah variable `base_url` di environment.
- **Menambah variabel**: Environment settings → **Add**.
- **Mengedit test script**: pilih request → tab **Tests**.

## 📚 Referensi

- **SDD**: `docs/SDD_Backend_Kendis_Market.md` v1.1
- **SRS**: `docs/SRS_Kendis_Market.md` v1.1 (§4.9 konsinyasi, §9.8 AC-20–AC-26)
- **PRD**: `docs/prd_kendi_s_market.md` Revisi 4
- **Base Path**: `/api/v1`
- **Tech Stack**: Node.js, Express, TypeScript, PostgreSQL, Prisma, JWT
- **Storage**: Cloudflare R2 untuk foto produk

## 🆘 Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| 401 Unauthorized | Belum login / token expired → Login atau Refresh Token |
| 404 Not Found | `base_url` salah atau server belum jalan |
| 413 File Too Large | Gambar > 5 MB → kompres dahulu |
| 415 INVALID_FILE_TYPE | Bukan JPEG/PNG/WebP |
| 422 BUSINESS_RULE_VIOLATION | Melanggar BR — cek `error.message` dan `error.details` |
| 429 Too Many Requests | Rate limit global/upload tercapai — tunggu window berikutnya |
| Saldo penitip 0 padahal ada penjualan | Pastikan transaksi berstatus AKTIF dan produknya `tipe=TITIPAN` dengan `consignorId` benar |

---

**Version**: 2.0
**Last Updated**: 2026-10-25
**Compatible with**: Backend Kendi's Market v1.1 (SDD v1.1 / SRS v1.1 / PRD Revisi 4)
