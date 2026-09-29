/**
 * config/env.ts
 * Memuat & memvalidasi environment variables menggunakan Zod.
 * Ekspor objek `env` yang fully-typed — dipakai seluruh modul.
 * Aplikasi gagal start dengan pesan jelas jika ada variabel penting yang hilang/salah tipe.
 */

import { z } from 'zod';
import 'dotenv/config';

// ─── Schema validasi ─────────────────────────────────────────────────────────

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL wajib diisi'),

  // Auth
  AUTH_STRATEGY: z.enum(['jwt', 'session']).default('jwt'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET minimal 16 karakter').optional(),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET minimal 16 karakter').optional(),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Session (opsional — hanya jika AUTH_STRATEGY=session)
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET minimal 16 karakter').optional(),

  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),

  // Upload
  MAX_UPLOAD_SIZE_MB: z.coerce.number().positive().default(5),

  // Cloudflare R2 (opsional di development — wajib di production)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),
});

// ─── Validasi & business rule tambahan ───────────────────────────────────────

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  console.error(`\n❌ Environment variables tidak valid:\n${issues}\n`);
  process.exit(1);
}

const env = parsed.data;

// Validasi lintas-field: JWT secrets wajib ada jika AUTH_STRATEGY=jwt
if (env.AUTH_STRATEGY === 'jwt') {
  const missing: string[] = [];
  if (!env.JWT_ACCESS_SECRET) missing.push('JWT_ACCESS_SECRET');
  if (!env.JWT_REFRESH_SECRET) missing.push('JWT_REFRESH_SECRET');
  if (missing.length > 0) {
    console.error(
      `\n❌ AUTH_STRATEGY=jwt membutuhkan: ${missing.join(', ')}\n`,
    );
    process.exit(1);
  }
}

// Validasi lintas-field: SESSION_SECRET wajib ada jika AUTH_STRATEGY=session
if (env.AUTH_STRATEGY === 'session' && !env.SESSION_SECRET) {
  console.error('\n❌ AUTH_STRATEGY=session membutuhkan SESSION_SECRET\n');
  process.exit(1);
}

// ─── Export ──────────────────────────────────────────────────────────────────

export const config = {
  NODE_ENV: env.NODE_ENV,
  PORT: env.PORT,
  IS_PRODUCTION: env.NODE_ENV === "production",
  DATABASE_URL: env.DATABASE_URL,
  AUTH_STRATEGY: env.AUTH_STRATEGY,
  JWT_ACCESS_SECRET: env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: env.JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN: env.JWT_REFRESH_EXPIRES_IN,
  SESSION_SECRET: env.SESSION_SECRET,
  ALLOWED_ORIGINS: env.ALLOWED_ORIGINS,
  MAX_UPLOAD_SIZE_BYTES: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
  R2_ACCOUNT_ID: env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: env.R2_BUCKET_NAME,
  R2_PUBLIC_URL: env.R2_PUBLIC_URL,
} as const;

export type Config = typeof config;
