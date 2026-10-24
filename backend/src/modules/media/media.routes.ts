/**
 * modules/media/media.routes.ts
 * Routes untuk upload/delete foto produk.
 * Rate limit: 10 uploads per menit per user (lihat middlewares/rateLimiter.middleware.ts).
 */

import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { uploadLimiter } from '../../middlewares/rateLimiter.middleware.js';
import * as mediaController from './media.controller.js';
import * as mediaSchema from './media.schema.js';

const router = Router();

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
