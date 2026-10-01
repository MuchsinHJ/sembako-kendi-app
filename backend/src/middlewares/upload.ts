/**
 * middlewares/upload.ts
 * Multer dengan memory storage, fileFilter MIME, dan limits ukuran (SDD §6.4, §3.6).
 *
 * Catatan:
 * - Multer hanya memakai memory storage (buffer) — tidak ada file di disk.
 * - Validasi MIME berlapis dilakukan di media.service (Fase 6) menggunakan sharp.
 * - Batas ukuran dibaca dari config.MAX_UPLOAD_SIZE_BYTES.
 */

import multer from 'multer';
import type { FileFilterCallback } from 'multer';
import type { Request } from 'express';
import { config } from '../config/env.js';
import { InvalidFileTypeError } from '../utils/errors.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new InvalidFileTypeError(
        `Tipe file tidak didukung: ${file.mimetype}. Gunakan JPEG, PNG, atau WebP.`,
      ),
    );
  }
};

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: config.MAX_UPLOAD_SIZE_BYTES,
    files: 1, // hanya satu file per request
  },
});
