# Postman Collection & Environment - Kendi's Market API

File-file Postman untuk testing API Backend Kendi's Market berdasarkan SDD v1.0.

## 📁 File yang Tersedia

1. **Kendis_Market_API.postman_collection.json**
   - Collection lengkap dengan 35+ endpoint
   - Terorganisir dalam 6 folder utama: Auth, Product, Transaction, Debt, Dashboard, Report
   - Includes test scripts untuk auto-save token dan ID

2. **Kendis_Market_Development.postman_environment.json**
   - Environment untuk development/local testing
   - Base URL: `http://localhost:3000`
   - Pre-filled dengan kredensial default

3. **Kendis_Market_Production.postman_environment.json**
   - Environment untuk production
   - Base URL: `https://api.kendismarket.com` (sesuaikan dengan URL production Anda)
   - Kredensial kosong untuk keamanan

## 🚀 Cara Import ke Postman

### Import Collection

1. Buka Postman
2. Klik tombol **Import** di pojok kiri atas
3. Pilih tab **File**
4. Drag & drop atau browse file `Kendis_Market_API.postman_collection.json`
5. Klik **Import**

### Import Environment

1. Klik icon ⚙️ (Settings) di pojok kanan atas
2. Pilih tab **Environments**
3. Klik **Import**
4. Pilih file environment:
   - `Kendis_Market_Development.postman_environment.json` untuk development
   - `Kendis_Market_Production.postman_environment.json` untuk production
5. Klik **Import**

### Aktivasi Environment

1. Di dropdown environment (pojok kanan atas), pilih environment yang ingin digunakan
2. Environment aktif akan ditandai dengan checkmark

## 📋 Struktur Collection

### 1. **Auth** (3 endpoints)
- `POST` Login - Auto-save access token
- `POST` Refresh Token - Auto-update access token
- `POST` Logout

### 2. **Product** (10 endpoints)
- `GET` Get All Products (with filters & pagination)
- `GET` Get Product by ID
- `POST` Create Product - Auto-save product ID
- `PUT` Update Product
- `DELETE` Delete Product
- `PATCH` Update Product Status (soft delete)
- `PATCH` Update Stock Threshold
- `GET` Get Low Stock Products
- `PATCH` Stock Adjustment
- `POST` Upload Product Photo (multipart/form-data)
- `DELETE` Delete Product Photo

### 3. **Transaction** (5 endpoints)
- `GET` Get All Transactions (with filters)
- `GET` Get Transaction by ID
- `POST` Create Transaction (Lunas) - Auto-save transaction ID
- `POST` Create Transaction (Utang) - Auto-save transaction ID
- `POST` Void Transaction

### 4. **Debt** (3 endpoints)
- `GET` Get All Debts
- `GET` Get Debt Payment History
- `POST` Add Debt Payment

### 5. **Dashboard** (1 endpoint)
- `GET` Get Dashboard Summary

### 6. **Report** (8 endpoints)
- `GET` Get Sales Report
- `GET` Get Debt Report
- `GET` Get Product Trend Report
- `GET` Export Sales Report (Excel)
- `GET` Export Sales Report (PDF)
- `GET` Export Debt Report (Excel)
- `GET` Export Debt Report (PDF)

## 🔑 Environment Variables

### Variables yang Perlu Dikonfigurasi

| Variable | Deskripsi | Auto-filled? |
|----------|-----------|--------------|
| `base_url` | Base URL API (localhost atau production) | ✓ |
| `access_token` | JWT access token | ✓ (via Login) |
| `user_email` | Email untuk login | Manual |
| `user_password` | Password untuk login | Manual |
| `product_id` | ID produk untuk testing | ✓ (via Create Product) |
| `transaction_id` | ID transaksi untuk testing | ✓ (via Create Transaction) |

### Auto-Save Features

Collection ini dilengkapi dengan **test scripts** yang otomatis menyimpan nilai penting ke environment:

1. **Login** → Auto-save `access_token`
2. **Create Product** → Auto-save `product_id`
3. **Create Transaction** → Auto-save `transaction_id`
4. **Refresh Token** → Auto-update `access_token`

## 🧪 Testing Workflow

### Workflow Standar untuk Testing

1. **Setup Authentication**
   ```
   Auth → Login
   ```
   Token akan otomatis tersimpan di environment

2. **Test Product Module**
   ```
   Product → Create Product (ID tersimpan otomatis)
   Product → Get All Products
   Product → Get Product by ID
   Product → Upload Product Photo (pilih file gambar)
   Product → Update Product
   Product → Update Product Status
   ```

3. **Test Transaction Module**
   ```
   Transaction → Create Transaction (Lunas)
   Transaction → Get All Transactions
   Transaction → Create Transaction (Utang)
   Transaction → Void Transaction
   ```

4. **Test Debt Module**
   ```
   Debt → Get All Debts
   Debt → Add Debt Payment
   Debt → Get Debt Payment History
   ```

5. **Test Dashboard & Reports**
   ```
   Dashboard → Get Dashboard Summary
   Report → Get Sales Report
   Report → Export Sales Report (Excel)
   ```

## 📝 Catatan Penting

### Authentication
- Semua endpoint (kecuali Login & Refresh Token) memerlukan Bearer Token
- Token otomatis diambil dari variable `{{access_token}}`
- Jika mendapat response 401, jalankan Login ulang

### File Upload
- Endpoint `POST /products/:id/photo` menggunakan `multipart/form-data`
- Field name: `photo`
- Supported formats: JPEG, PNG, WebP
- Max size: 5MB (default)

### Response Format
Semua response mengikuti format standar:

**Success:**
```json
{
  "success": true,
  "data": { },
  "message": "Optional message"
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": []
  }
}
```

### Validasi Business Rules

Collection ini sudah include request body yang sesuai dengan business rules:
- **BR-03**: hargaJual > 0
- **BR-04**: stok >= 0
- **BR-05**: jumlah > 0, stok mencukupi
- **BR-08**: namaPembeli & noHpPembeli wajib untuk transaksi Utang
- **BR-13**: Void dalam batas waktu
- **BR-14**: jumlahBayar <= sisaSaldoUtang

## 🔧 Kustomisasi

### Mengubah Base URL
Edit variable `base_url` di environment:
- Development: `http://localhost:3000`
- Production: `https://api.kendismarket.com`

### Menambah Custom Variables
1. Buka Environment settings
2. Klik **Add** untuk menambah variable baru
3. Set **Initial Value** dan **Current Value**

### Mengedit Test Scripts
Setiap request dapat memiliki test script untuk automasi:
1. Pilih request
2. Tab **Tests**
3. Edit script JavaScript

## 📚 Referensi

- **SDD**: Software Design Document Backend Kendi's Market v1.0
- **Base Path**: `/api/v1`
- **Tech Stack**: Node.js, Express, TypeScript, PostgreSQL, Prisma, JWT
- **Storage**: Cloudflare R2 untuk foto produk

## 🆘 Troubleshooting

### 401 Unauthorized
- Pastikan sudah login
- Check apakah `access_token` tersimpan di environment
- Token expired? Gunakan **Refresh Token** atau login ulang

### 404 Not Found
- Check apakah base_url sudah benar
- Pastikan backend server sudah running
- Verify endpoint path

### 413 File Too Large
- File gambar melebihi 5MB
- Compress atau resize gambar terlebih dahulu

### 422 Business Rule Violation
- Check request body sesuai dengan business rules
- Lihat `error.details` untuk informasi spesifik

## 📞 Support

Untuk pertanyaan atau issue terkait API, lihat:
- SDD Backend Kendi's Market (dokumentasi lengkap)
- README.md proyek backend
- Kode sumber: `/backend/src/modules/`

---

**Version**: 1.0  
**Last Updated**: 2026-10-02  
**Compatible with**: Backend Kendi's Market v1.0
