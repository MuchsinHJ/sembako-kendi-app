/**
 * middlewares/errorHandler.ts
 * Middleware error terpusat (SDD §3.12, §7).
 *
 * Menangani:
 *  - AppError dan seluruh turunannya           → code & status dari class
 *  - ZodError                                  → VALIDATION_ERROR 400
 *  - PrismaClientKnownRequestError             → dipetakan sesuai kode Prisma
 *  - MulterError                               → FILE_TOO_LARGE / INVALID_FILE_TYPE
 *  - Error R2/S3 (STORAGE_ERROR)              → 502
 *  - Error tak terduga                         → INTERNAL_SERVER_ERROR 500
 *
 * Stack trace TIDAK pernah bocor ke client di production.
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { AppError, ValidationError } from '../utils/errors.js';
import { sendError } from '../utils/response.js';
import { logger } from '../config/logger.js';

// ─── Helper: petakan kode Prisma ke pesan yang aman ditampilkan ───────────────
const handlePrismaError = (
  err: Prisma.PrismaClientKnownRequestError,
): { status: number; code: string; message: string } => {
  switch (err.code) {
    case 'P2002': // Unique constraint
      return {
        status: 409,
        code: 'CONFLICT',
        message: 'Data sudah ada (unique constraint).',
      };
    case 'P2025': // Record not found
      return {
        status: 404,
        code: 'NOT_FOUND',
        message: 'Data yang dimaksud tidak ditemukan.',
      };
    case 'P2003': // Foreign key constraint
      return {
        status: 422,
        code: 'BUSINESS_RULE_VIOLATION',
        message: 'Operasi melanggar constraint referensial database.',
      };
    default:
      return {
        status: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Terjadi kesalahan database.',
      };
  }
};

// ─── Error Handler ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // 1. AppError (dan semua turunannya: ValidationError, NotFoundError, dsb.)
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, reqId: req.id }, `AppError 5xx: ${err.message}`);
    } else {
      logger.warn({ code: err.code, message: err.message }, 'AppError 4xx');
    }

    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  // 2. ZodError (dari validasi manual di luar middleware validate())
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({
      field: i.path.join('.'),
      issue: i.message,
    }));
    logger.warn({ details }, 'ZodError');
    sendError(res, 400, 'VALIDATION_ERROR', 'Validasi input gagal.', details);
    return;
  }

  // 3. PrismaClientKnownRequestError
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = handlePrismaError(err);
    logger.warn(
      { prismaCode: err.code, meta: err.meta },
      `Prisma known error: ${err.code}`,
    );
    sendError(res, mapped.status, mapped.code, mapped.message);
    return;
  }

  // 4. PrismaClientValidationError (query mal-formed)
  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.error({ err }, 'PrismaClientValidationError');
    sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Terjadi kesalahan database.');
    return;
  }

  // 5. MulterError
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      sendError(res, 413, 'FILE_TOO_LARGE', 'Ukuran file melebihi batas yang diizinkan.');
      return;
    }
    // Field / file count exceeded dll
    sendError(res, 400, 'VALIDATION_ERROR', `Upload error: ${err.message}`);
    return;
  }

  // 6. Error R2/S3 (dikenali dari name atau message)
  if (err instanceof Error && (err.name === 'S3ServiceException' || err.name === 'NoSuchKey')) {
    logger.error({ err }, 'S3/R2 storage error');
    sendError(res, 502, 'STORAGE_ERROR', 'Gagal berkomunikasi dengan object storage.');
    return;
  }

  // 7. Error tak terduga — log penuh, response aman
  const unknownErr = err instanceof Error ? err : new Error(String(err));
  logger.error({ err: unknownErr, reqId: req.id }, 'Unhandled error');
  sendError(
    res,
    500,
    'INTERNAL_SERVER_ERROR',
    'Terjadi kesalahan pada server.',
  );
};
