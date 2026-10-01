/**
 * modules/auth/auth.controller.ts
 * HTTP handlers untuk auth endpoints.
 */

import type { Request, Response } from 'express';
import { config } from '../../config/env.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/response.js';
import { UnauthorizedError } from '../../utils/errors.js';
import * as authService from './auth.service.js';
import type { LoginInput } from './auth.schema.js';

// ─── POST /auth/login ─────────────────────────────────────────────────────────

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as LoginInput;
  const result = await authService.loginService(input);

  // Set refresh token / session ID sebagai httpOnly cookie
  if (config.AUTH_STRATEGY === 'jwt') {
    res.cookie('refreshToken', result.refreshToken!, {
      httpOnly: true,
      secure: config.IS_PRODUCTION, // HTTPS only di production
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
    });
  } else {
    res.cookie('sid', result.accessToken, {
      httpOnly: true,
      secure: config.IS_PRODUCTION,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  sendSuccess(res, 200, {
    accessToken: config.AUTH_STRATEGY === 'jwt' ? result.accessToken : undefined,
    user: result.user,
  }, 'Login berhasil');
});

// ─── POST /auth/refresh-token ─────────────────────────────────────────────────

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const tokenOrSessionId = 
    config.AUTH_STRATEGY === 'jwt'
      ? req.cookies.refreshToken as string | undefined
      : req.cookies.sid as string | undefined;

  if (!tokenOrSessionId) {
    throw new UnauthorizedError('Refresh token atau session tidak ditemukan.');
  }

  const result = await authService.refreshTokenService(tokenOrSessionId);

  // Set cookie baru untuk rotasi (JWT) atau perpanjangan (Session)
  if (config.AUTH_STRATEGY === 'jwt' && result.refreshToken) {
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: config.IS_PRODUCTION,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  } else if (config.AUTH_STRATEGY === 'session') {
    res.cookie('sid', result.accessToken, {
      httpOnly: true,
      secure: config.IS_PRODUCTION,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  sendSuccess(res, 200, {
    accessToken: config.AUTH_STRATEGY === 'jwt' ? result.accessToken : undefined,
  }, 'Token berhasil diperbarui');
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const tokenOrSessionId = 
    config.AUTH_STRATEGY === 'jwt'
      ? req.cookies.refreshToken as string | undefined
      : req.cookies.sid as string | undefined;

  if (!tokenOrSessionId) {
    throw new UnauthorizedError('Refresh token atau session tidak ditemukan.');
  }

  await authService.logoutService(tokenOrSessionId);

  // Hapus cookie
  if (config.AUTH_STRATEGY === 'jwt') {
    res.clearCookie('refreshToken');
  } else {
    res.clearCookie('sid');
  }

  sendSuccess(res, 200, null, 'Logout berhasil');
});
