/**
 * middlewares/auth.middleware.ts
 * Autentikasi dan otorisasi middleware.
 * Mendukung JWT dan Session strategy berdasarkan AUTH_STRATEGY.
 */

import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import * as authService from '../modules/auth/auth.service.js';

/**
 * Middleware untuk verifikasi token/session dan set req.user.
 * Melempar UnauthorizedError jika token/session tidak valid.
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (config.AUTH_STRATEGY === 'jwt') {
      // JWT: baca access token dari header Authorization
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Access token tidak ditemukan.');
      }

      const token = authHeader.substring(7); // hilangkan "Bearer "
      const payload = authService.verifyAccessToken(token);

      req.user = {
        id: payload.userId,
        email: payload.email,
        nama: payload.nama,
      };
    } else {
      // Session: baca session ID dari cookie
      const sessionId = req.cookies.sid as string | undefined;
      if (!sessionId) {
        throw new UnauthorizedError('Session tidak ditemukan.');
      }

      const payload = await authService.verifySession(sessionId);

      req.user = {
        id: payload.userId,
        email: payload.email,
        nama: payload.nama,
      };
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Hook otorisasi berdasarkan role.
 * MVP saat ini hanya punya satu role (User), sehingga hook ini
 * selalu lolos. Diperluas saat role Owner/Kasir ditambahkan (SDD §6.3).
 *
 * @param _roles - Daftar role yang diizinkan (tidak digunakan di MVP)
 */
export const requireRole = (..._roles: string[]) => {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    // MVP: semua authenticated user dianggap memiliki akses penuh
    // Fase berikutnya: cek req.user.role terhadap _roles
    next();
  };
};
