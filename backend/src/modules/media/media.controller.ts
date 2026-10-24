/**
 * modules/media/media.controller.ts
 * Controller untuk upload/delete foto produk.
 *
 * Konfigurasi Multer (memory storage, fileFilter MIME, limit ukuran) berada di
 * `middlewares/upload.middleware.ts` agar tidak ada duplikasi definisi upload.
 */

import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/response.js';
import { ValidationError } from '../../utils/errors.js';
import * as mediaService from './media.service.js';

// Re-export middleware upload agar routing cukup mengimpor dari controller.
export { uploadProductPhoto as uploadMiddleware } from '../../middlewares/upload.middleware.js';

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
