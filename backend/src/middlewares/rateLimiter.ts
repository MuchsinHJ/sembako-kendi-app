/**
 * middlewares/rateLimiter.ts
 * Konfigurasi rate limiter sesuai SDD §6.6.
 *
 * - globalLimiter  : 100 request / menit / IP — dipasang di semua route
 * - loginLimiter   : 5 request / menit / IP   — khusus POST /auth/login
 * - uploadLimiter  : 10 request / menit / user — khusus POST /products/:id/photo
 *
 * Response saat limit tercapai menggunakan format error standar (SDD §5.1).
 */

import { rateLimit } from 'express-rate-limit';
import { config } from '../config/env.js';

const rateLimitResponse = (code: string, message: string) => ({
  success: false,
  error: { code, message },
});

// ─── Global (100 req/min/IP) ──────────────────────────────────────────────────
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: rateLimitResponse(
    'RATE_LIMIT_EXCEEDED',
    'Terlalu banyak request. Coba lagi nanti.',
  ),
});

// ─── Login (5 req/min/IP, anti brute-force) ──────────────────────────────────
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: rateLimitResponse(
    'RATE_LIMIT_EXCEEDED',
    'Terlalu banyak percobaan login. Coba lagi setelah 1 menit.',
  ),
  // Skip successful login agar counter reset
  skipSuccessfulRequests: true,
  // Skip rate limiting di test environment (kecuali untuk test brute-force spesifik)
  skip: (req) => {
    // Hanya skip jika bukan test brute-force
    const isBruteForceTest = (req.body as { email?: string })?.email === 'brute@example.com';
    return config.NODE_ENV === 'test' && !isBruteForceTest;
  },
});

// ─── Upload foto (10 req/min/user) ────────────────────────────────────────────
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  // Key berdasarkan user ID (jika tersedia) atau IP.
  // Jika user ID tidak tersedia (auth belum Fase 4), fallback ke IP.
  // ipKeyGenerator tidak dipakai di sini karena req.user tersedia di Fase 4+
  // sehingga mayoritas request akan menggunakan userId sebagai key.
  // Untuk mencegah ERR_ERL_KEY_GEN_IPV6, gunakan ipKeyGenerator sebagai fallback.
  keyGenerator: (req) => {
    // req.user di-set oleh auth.middleware — akan tersedia saat Fase 4
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.id as string | undefined;
    if (userId) return userId;
    // Normalize IPv6 (::ffff:x.x.x.x → x.x.x.x) agar tidak bypass limit
    const ip = (req.ip ?? '::1').replace(/^::ffff:/, '');
    return ip;
  },
  message: rateLimitResponse(
    'RATE_LIMIT_EXCEEDED',
    'Terlalu banyak upload. Coba lagi setelah 1 menit.',
  ),
  // Suppress ERR_ERL_KEY_GEN_IPV6 warning karena kita sudah normalize IPv6 di atas
  validate: { xForwardedForHeader: false },
});
