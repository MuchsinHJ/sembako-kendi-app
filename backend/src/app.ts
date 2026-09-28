/**
 * app.ts
 * Konfigurasi Express application (tanpa `listen`).
 * Dipisah dari server.ts agar bisa diimpor langsung oleh Supertest saat API testing.
 *
 * Arsitektur layer (SDD §2.2):
 *   helmet → cors → rate-limit global → pino-http → body parsers
 *   → /api/v1 router (health + modul-modul lain)
 *   → 404 handler → global error handler
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import pinoHttp from 'pino-http';
// `pino-http` is CJS; under nodenext moduleResolution the callable factory
// lives on `.default` — using the namespace directly has no call signatures.
const createPinoHttp = pinoHttp.default ?? pinoHttp;

import { env } from './config/env.js';
import { logger } from './config/logger.js';

// ─── Buat aplikasi Express ────────────────────────────────────────────────────

const app = express();

// ─── Security headers (helmet) ───────────────────────────────────────────────
app.use(helmet());

// ─── CORS — whitelist dari env ────────────────────────────────────────────────
const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      // Izinkan request tanpa origin (curl, Postman, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin "${origin}" tidak diizinkan`));
    },
    credentials: true,
  }),
);

// ─── Rate limit global (SDD §6.6) ────────────────────────────────────────────
app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 menit
    max: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Terlalu banyak request. Coba lagi nanti.' },
    },
  }),
);

// ─── Request logging (pino-http) ──────────────────────────────────────────────
app.use(
  createPinoHttp({
    logger,
    // Jangan log request ke /health agar tidak bising
    autoLogging: {
      ignore: (req) => req.url === '/api/v1/health',
    },
  }),
);

// ─── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Routes ──────────────────────────────────────────────────────────────────

// Health check — tidak butuh auth, dipakai load balancer / uptime monitor
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
    message: "Kendi's Market API is running",
  });
});

// TODO: mount modul-modul lain di sini
// app.use('/api/v1/auth', authRouter);
// app.use('/api/v1/products', productRouter);
// ...

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Endpoint tidak ditemukan.' },
  });
});

// ─── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan pada server.' },
  });
});

export default app;
