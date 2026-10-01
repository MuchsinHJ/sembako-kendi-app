/**
 * tests/unit/errorHandler.test.ts
 * Unit test untuk errorHandler (SDD Fase 3 test requirement).
 * Membuktikan tiap kelas error menghasilkan code + HTTP status yang benar.
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { createRequest, createResponse } from 'node-mocks-http';
import { errorHandler } from '../../src/middlewares/errorHandler.js';
import {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BusinessRuleError,
  InvalidFileTypeError,
  FileTooLargeError,
  StorageError,
  StockExceededError,
  MissingDebtorInfoError,
  VoidWindowExpiredError,
  DebtOverpaymentError,
  ProductHasTransactionError,
} from '../../src/utils/errors.js';
import { ZodError, z } from 'zod';
import { Prisma } from '@prisma/client';
import multer from 'multer';

// Helper: panggil errorHandler dan kembalikan JSON data + status
const callErrorHandler = (err: unknown) => {
  const req = createRequest({ id: 'test-req-id' });
  const res = createResponse();
  const next = jest.fn();
  errorHandler(err, req, res, next);
  return {
    status: res.statusCode,
    body: res._getJSONData() as {
      success: boolean;
      error?: { code: string; message: string; details?: unknown };
    },
  };
};

describe('errorHandler', () => {
  // ─── AppError subclasses ──────────────────────────────────────────────────

  describe('AppError hierarchy → correct code & status', () => {
    test('ValidationError → 400 VALIDATION_ERROR', () => {
      const { status, body } = callErrorHandler(
        new ValidationError('Input salah', [{ field: 'nama', issue: 'wajib' }]),
      );
      expect(status).toBe(400);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
      expect(body.error?.details).toEqual([{ field: 'nama', issue: 'wajib' }]);
    });

    test('UnauthorizedError → 401 UNAUTHORIZED', () => {
      const { status, body } = callErrorHandler(new UnauthorizedError('Token tidak valid.'));
      expect(status).toBe(401);
      expect(body.error?.code).toBe('UNAUTHORIZED');
    });

    test('ForbiddenError → 403 FORBIDDEN', () => {
      const { status, body } = callErrorHandler(new ForbiddenError('Akses ditolak.'));
      expect(status).toBe(403);
      expect(body.error?.code).toBe('FORBIDDEN');
    });

    test('NotFoundError → 404 NOT_FOUND', () => {
      const { status, body } = callErrorHandler(new NotFoundError('Tidak ditemukan.'));
      expect(status).toBe(404);
      expect(body.error?.code).toBe('NOT_FOUND');
    });

    test('BusinessRuleError → 422 BUSINESS_RULE_VIOLATION', () => {
      const { status, body } = callErrorHandler(new BusinessRuleError('Pelanggaran aturan.'));
      expect(status).toBe(422);
      expect(body.error?.code).toBe('BUSINESS_RULE_VIOLATION');
    });

    test('InvalidFileTypeError → 415 INVALID_FILE_TYPE', () => {
      const { status, body } = callErrorHandler(new InvalidFileTypeError('Tipe tidak didukung.'));
      expect(status).toBe(415);
      expect(body.error?.code).toBe('INVALID_FILE_TYPE');
    });

    test('FileTooLargeError → 413 FILE_TOO_LARGE', () => {
      const { status, body } = callErrorHandler(new FileTooLargeError('File terlalu besar.'));
      expect(status).toBe(413);
      expect(body.error?.code).toBe('FILE_TOO_LARGE');
    });

    test('StorageError → 502 STORAGE_ERROR', () => {
      const { status, body } = callErrorHandler(new StorageError('R2 tidak merespons.'));
      expect(status).toBe(502);
      expect(body.error?.code).toBe('STORAGE_ERROR');
    });
  });

  // ─── Business Rule specific (SDD §7.4) ───────────────────────────────────

  describe('Business Rule specific errors → 422 BUSINESS_RULE_VIOLATION', () => {
    test.each([
      ['StockExceededError',        new StockExceededError()],
      ['MissingDebtorInfoError',    new MissingDebtorInfoError()],
      ['VoidWindowExpiredError',    new VoidWindowExpiredError()],
      ['DebtOverpaymentError',      new DebtOverpaymentError()],
      ['ProductHasTransactionError',new ProductHasTransactionError()],
    ])('%s → 422', (_name, err) => {
      const { status, body } = callErrorHandler(err);
      expect(status).toBe(422);
      expect(body.error?.code).toBe('BUSINESS_RULE_VIOLATION');
    });
  });

  // ─── ZodError ─────────────────────────────────────────────────────────────

  test('ZodError → 400 VALIDATION_ERROR dengan details', () => {
    const schema = z.object({ nama: z.string().min(1) });
    const result = schema.safeParse({ nama: '' });
    expect(result.success).toBe(false);
    const { status, body } = callErrorHandler((result as { error: ZodError }).error);
    expect(status).toBe(400);
    expect(body.error?.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(body.error?.details)).toBe(true);
  });

  // ─── PrismaClientKnownRequestError ───────────────────────────────────────

  test('Prisma P2002 → 409 CONFLICT', () => {
    const prismaErr = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint',
      { code: 'P2002', clientVersion: '5.x', meta: {} },
    );
    const { status, body } = callErrorHandler(prismaErr);
    expect(status).toBe(409);
    expect(body.error?.code).toBe('CONFLICT');
  });

  test('Prisma P2025 → 404 NOT_FOUND', () => {
    const prismaErr = new Prisma.PrismaClientKnownRequestError(
      'Record not found',
      { code: 'P2025', clientVersion: '5.x', meta: {} },
    );
    const { status, body } = callErrorHandler(prismaErr);
    expect(status).toBe(404);
    expect(body.error?.code).toBe('NOT_FOUND');
  });

  // ─── MulterError ──────────────────────────────────────────────────────────

  test('MulterError LIMIT_FILE_SIZE → 413 FILE_TOO_LARGE', () => {
    const multerErr = new multer.MulterError('LIMIT_FILE_SIZE');
    const { status, body } = callErrorHandler(multerErr);
    expect(status).toBe(413);
    expect(body.error?.code).toBe('FILE_TOO_LARGE');
  });

  test('MulterError other → 400 VALIDATION_ERROR', () => {
    const multerErr = new multer.MulterError('LIMIT_FILE_COUNT');
    const { status, body } = callErrorHandler(multerErr);
    expect(status).toBe(400);
    expect(body.error?.code).toBe('VALIDATION_ERROR');
  });

  // ─── Unknown error ────────────────────────────────────────────────────────

  test('Unknown error → 500 INTERNAL_SERVER_ERROR', () => {
    const { status, body } = callErrorHandler(new Error('Boom!'));
    expect(status).toBe(500);
    expect(body.error?.code).toBe('INTERNAL_SERVER_ERROR');
    // Stack trace TIDAK ada di response
    expect(JSON.stringify(body)).not.toContain('at errorHandler');
  });

  test('success: false selalu ada di error response', () => {
    const { body } = callErrorHandler(new NotFoundError('x'));
    expect(body.success).toBe(false);
  });
});
