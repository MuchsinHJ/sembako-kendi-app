# Kendi's Market Backend API

Backend REST API untuk sistem pengelolaan penjualan UMKM "Kendi's Market".

**Tech Stack:** Node.js + TypeScript + Express + Prisma ORM + PostgreSQL + Cloudflare R2 + JWT

---

## Prasyarat

Sebelum menjalankan aplikasi, pastikan sistem Anda memiliki:

- **Node.js** >= 20.0.0 (lihat `.nvmrc`)
- **PostgreSQL** >= 14
- **npm** atau **yarn**
- **Cloudflare R2 bucket** (untuk penyimpanan foto produk)
- **Sharp dependencies** (untuk image processing):
  - Linux: `libvips-dev`
  - macOS: `brew install vips`
  - Windows: otomatis ter-install via npm

---

## Setup Lokal

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd sembako-kendi-app/backend
npm install
```

### 2. Konfigurasi Environment Variables

Buat file `.env` di root folder backend:

```env
# ─── Server ─────────────────────────────────────────────────────────────────
NODE_ENV=development
PORT=3000

# ─── Database ───────────────────────────────────────────────────────────────
DATABASE_URL="postgresql://user:password@localhost:5432/kendis_market?schema=public"

# ─── JWT Authentication ─────────────────────────────────────────────────────
JWT_ACCESS_SECRET=<generate-random-string-min-32-chars>
JWT_REFRESH_SECRET=<generate-random-string-min-32-chars>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ─── CORS ───────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# ─── Cloudflare R2 ──────────────────────────────────────────────────────────
R2_ACCOUNT_ID=<your-cloudflare-account-id>
R2_ACCESS_KEY_ID=<your-r2-access-key>
R2_SECRET_ACCESS_KEY=<your-r2-secret-key>
R2_BUCKET_NAME=kendis-market-photos
R2_PUBLIC_URL=https://<your-bucket>.r2.dev

# ─── Upload Configuration ───────────────────────────────────────────────────
MAX_UPLOAD_SIZE_MB=5
```

**Cara generate secrets:**
```bash
openssl rand -base64 32
```

### 3. Setup Database

```bash
npm run migrate:dev
npm run seed  # optional: data awal untuk testing
```

### 4. Jalankan Development Server

```bash
npm run dev
```

Server berjalan di `http://localhost:3000`

---

## Testing

```bash
# Semua tests
npm run test

# Unit tests saja
npm run test:unit

# API tests saja
npm run test:api

# Dengan coverage
npm run test -- --coverage
```

**Target coverage:** >= 80% pada service layer

---

## Build & Production Deployment

### Build Production

```bash
npm run build
```

### Deployment dengan PM2 (7 Langkah)

#### 1. Pull Latest Code
```bash
git pull origin main
```

#### 2. Install Dependencies
```bash
npm ci
```

#### 3. Build Production
```bash
npm run build
```

#### 4. Jalankan Database Migration
```bash
npm run migrate:deploy
```

#### 5. Start/Reload PM2

**First deployment:**
```bash
pm2 start ecosystem.config.js
```

**Subsequent deployments:**
```bash
pm2 reload ecosystem.config.js
```

#### 6. Verifikasi
```bash
pm2 status
pm2 logs kendis-market-api --lines 50
```

#### 7. Setup Nginx Reverse Proxy

Lihat contoh konfigurasi di bawah.

---

## Konfigurasi Nginx

File `/etc/nginx/sites-available/kendis-market-api`:

```nginx
server {
    listen 80;
    server_name api.kendismarket.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

**Aktifkan:**
```bash
sudo ln -s /etc/nginx/sites-available/kendis-market-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Setup SSL:**
```bash
sudo certbot --nginx -d api.kendismarket.com
```

---

## Cron Jobs & Maintenance

### Cleanup Orphan Photos

```cron
# crontab -e
0 2 * * * cd /path/to/backend && node dist/scripts/cleanup-orphan-photos.js >> logs/cleanup.log 2>&1
```

### Database Backup

Script `scripts/backup-db.sh`:

```bash
#!/bin/bash
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/kendis-market"
DB_NAME="kendis_market"

mkdir -p $BACKUP_DIR
pg_dump -U postgres $DB_NAME | gzip > $BACKUP_DIR/kendis_market_$DATE.sql.gz

# Hapus backup > 7 hari
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

```cron
# crontab -e
0 1 * * * /path/to/scripts/backup-db.sh >> /var/log/kendis-backup.log 2>&1
```

---

## Environment Variables Reference

| Variable | Required | Default | Deskripsi |
|----------|----------|---------|-----------|
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `3000` | Server port |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | **Yes** | — | JWT access token secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | **Yes** | — | JWT refresh token secret (min 32 chars) |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` | Access token expiry |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token expiry |
| `ALLOWED_ORIGINS` | No | `*` | CORS allowed origins (comma-separated) |
| `R2_ACCOUNT_ID` | **Yes** | — | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | **Yes** | — | R2 access key |
| `R2_SECRET_ACCESS_KEY` | **Yes** | — | R2 secret key |
| `R2_BUCKET_NAME` | **Yes** | — | R2 bucket name |
| `R2_PUBLIC_URL` | **Yes** | — | R2 public URL |
| `MAX_UPLOAD_SIZE_MB` | No | `5` | Max file upload size (MB) |

---

## Troubleshooting

### `Cannot find module 'sharp'`
```bash
npm rebuild sharp
```

### `Connection to database failed`
1. Pastikan PostgreSQL running
2. Cek `DATABASE_URL` benar
3. Create database: `createdb kendis_market`

### PM2 app "errored"
```bash
pm2 logs kendis-market-api --err --lines 50
```

---

## License

ISC
