/**
 * modules/media/media.controller.ts
 * Controller untuk upload/delete foto produk.
 */

import type { Request, Response } from 'express';
import multer from 'multer';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/response.js';
import { ValidationError } from '../../utils/errors.js';
import { config } from '../../config/env.js';
import * as mediaService from './media.service.js';

// ─── Multer Configuration ─────────────────────────────────────────────────────

const MAX_SIZE_BYTES = config.MAX_UPLOAD_SIZE_BYTES;

// File filter: MIME type check
const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError('Format file tidak didukung. Gunakan JPEG, PNG, atau WebP.', [
      { field: 'photo', issue: 'Unsupported MIME type' },
    ]));
  }
};

// Multer instance: memory storage only (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_SIZE_BYTES,
  },
  fileFilter,
});

// Export middleware untuk routing
export const uploadMiddleware = upload.single('photo');

// ─── Upload Photo ─────────────────────────────────────────────────────────────

export const uploadPhoto = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };

  // Check if file exists in request
  if (!req.file) {
    throw new ValidationError('File foto wajib disertakan.', [
      { field: 'photo', issue: 'File is required' },
    ]);
  }

  // Process upload via service
  const result = await mediaService.uploadProductPhoto(
    id,
    req.file.buffer,
    req.file.mimetype,
  );

  sendSuccess(res, 200, result, 'Foto produk berhasil diupload.');
});

// ─── Delete Photo ─────────────────────────────────────────────────────────────

export const deletePhoto = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };

  await mediaService.deleteProductPhoto(id);

  sendSuccess(res, 200, { message: 'Foto produk berhasil dihapus.' });
});
