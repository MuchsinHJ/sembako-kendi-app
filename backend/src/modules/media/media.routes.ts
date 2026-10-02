/**
 * modules/media/media.routes.ts
 * Routes untuk upload/delete foto produk.
 * Rate limit: 10 uploads per menit per user.
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import * as mediaController from './media.controller.js';
import * as mediaSchema from './media.schema.js';

const router = Router();

// Rate limiter: 10 uploads per menit per user
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Terlalu banyak upload. Coba lagi nanti.' } },
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP with IPv6 normalization
    if (req.user?.id) return req.user.id;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return ip === '::1' ? '127.0.0.1' : ip;
  },
});

// Semua route memerlukan autentikasi
router.use(authenticate);

// POST /products/:id/photo - Upload foto produk
router.post(
  '/:id/photo',
  uploadLimiter,
  validate(mediaSchema.uploadPhotoSchema),
  mediaController.uploadMiddleware, // Multer middleware
  mediaController.uploadPhoto,
);

// DELETE /products/:id/photo - Hapus foto produk
router.delete(
  '/:id/photo',
  validate(mediaSchema.deletePhotoSchema),
  mediaController.deletePhoto,
);

export default router;
