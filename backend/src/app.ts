/**
 * app.ts
 * Konfigurasi Express application (tanpa `listen`).
 * Dipisah dari server.ts agar bisa diimpor langsung oleh Supertest saat API testing.
 *
 * Urutan middleware sesuai SDD §2.3:
 *   rate-limit (global) → helmet → cors → compression → json → cookie-parser
 *   → pino-http (request logger) → /api/v1 routes → 404 → errorHandler
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
// pino-http CJS/ESM: factory ada di `.default` di bawah nodenext moduleResolution
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createPinoHttp = (pinoHttp as any).default ?? pinoHttp;

import { config } from './config/env.js';
import { logger } from './config/logger.js';
import { globalLimiter } from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorHandler.js';

// ─── Buat aplikasi Express ────────────────────────────────────────────────────

const app = express();

// ─── 1. Rate limit global (SDD §6.6) ─────────────────────────────────────────
// Dipasang paling awal agar menolak bot sebelum parsing body mahal.
app.use(globalLimiter);

// ─── 2. Security headers (SDD §6.7) ──────────────────────────────────────────
app.use(helmet());

// ─── 3. CORS — whitelist dari env (SDD §6.5) ─────────────────────────────────
const allowedOrigins = config.ALLOWED_ORIGINS.split(',').map((o) => o.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      // Izinkan request tanpa origin (curl, Postman, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin "${origin}" tidak diizinkan`));
    },
    credentials: true, // diperlukan agar cookie refresh token bisa dikirim
  }),
);

// ─── 4. Kompresi response (gzip/brotli) ──────────────────────────────────────
app.use(compression());

// ─── 5. Body parsers ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── 6. Cookie parser (diperlukan untuk refresh token httpOnly cookie) ────────
app.use(cookieParser());

// ─── 7. Request logger (pino-http, dengan request ID) ────────────────────────
app.use(
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  createPinoHttp({
    logger,
    // Jangan log request ke /health agar tidak bising di monitoring
    autoLogging: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ignore: (req: any) => (req.url as string) === '/api/v1/health',
    },
    // Tambahkan request ID ke setiap log line
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    genReqId: (req: any, res: any) => {
      const existing = req.id as string | undefined;
      if (existing) return existing;
      const id = crypto.randomUUID();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      res.setHeader('X-Request-Id', id);
      return id;
    },
  }),
);

// ─── 8. Routes ────────────────────────────────────────────────────────────────

// Health check — tidak butuh auth, dipakai load balancer / uptime monitor
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      environment: config.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
    message: "Kendi's Market API is running",
  });
});

// Auth routes (Fase 4)
import authRouter from './modules/auth/auth.routes.js';
app.use('/api/v1/auth', authRouter);

// Product routes (Fase 5)
import productRouter from './modules/product/product.routes.js';
app.use('/api/v1/products', productRouter);


// TODO (Fase 7): mount modul transaction
// app.use('/api/v1/transactions', authenticate, transactionRouter);

// TODO (Fase 8): mount modul debt
// app.use('/api/v1/debts', authenticate, debtRouter);

// TODO (Fase 9): mount modul dashboard & report
// app.use('/api/v1/dashboard', authenticate, dashboardRouter);
// app.use('/api/v1/reports', authenticate, reportRouter);

// ─── 9. 404 handler ───────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Endpoint tidak ditemukan.' },
  });
});

// ─── 10. Global error handler (HARUS 4 parameter) ────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  errorHandler(err, req, res, next);
});

export default app;
