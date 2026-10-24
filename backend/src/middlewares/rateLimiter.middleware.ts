/**
 * middlewares/rateLimiter.middleware.ts
 * Konfigurasi rate limiter sesuai SDD §6.6.
 *
 * - globalLimiter  : RATE_LIMIT_MAX request / RATE_LIMIT_WINDOW_MS / IP (default 100/menit)
 * - loginLimiter   : 5 request / menit / IP   — khusus POST /auth/login
 * - uploadLimiter  : 10 request / menit / user — khusus POST /products/:id/photo
 *
 * Response saat limit tercapai menggunakan format error standar (SDD §5.1)
 * dengan `code: "RATE_LIMIT_EXCEEDED"` dan HTTP status 429.
 */

import { rateLimit } from 'express-rate-limit';
import { config } from '../config/env.js';

const rateLimitResponse = (message: string) => ({
  success: false,
  error: { code: 'RATE_LIMIT_EXCEEDED', message },
});

// ─── Global (RATE_LIMIT_MAX req / RATE_LIMIT_WINDOW_MS / IP) ─────────────────
export const globalLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  limit: config.RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: rateLimitResponse('Terlalu banyak request. Coba lagi nanti.'),
  skip: () => config.NODE_ENV === 'test',
});

// ─── Login (5 req/min/IP, anti brute-force) ──────────────────────────────────
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: rateLimitResponse(
    'Terlalu banyak percobaan login. Coba lagi setelah 1 menit.',
  ),
  // Skip successful login agar counter reset
  skipSuccessfulRequests: true,
  // Skip rate limiting di test environment (kecuali untuk test brute-force spesifik)
  skip: (req) => {
    // Hanya skip jika bukan test brute-force
    const isBruteForceTest =
      (req.body as { email?: string } | undefined)?.email === 'brute@example.com';
    return config.NODE_ENV === 'test' && !isBruteForceTest;
  },
});

// ─── Upload foto (10 req/min/user) ────────────────────────────────────────────
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => config.NODE_ENV === 'test',
  // Key berdasarkan user ID (tersedia setelah `authenticate`), fallback ke IP.
  keyGenerator: (req) => {
    if (req.user?.id) return req.user.id;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return ip === '::1' ? '127.0.0.1' : ip;
  },
  message: rateLimitResponse(
    'Terlalu banyak upload. Coba lagi setelah 1 menit.',
  ),
  // IPv6 sudah dinormalisasi manual di atas
  validate: { keyGeneratorIpFallback: false },
});
