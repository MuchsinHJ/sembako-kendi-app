/**
 * modules/auth/auth.service.ts
 * Business logic autentikasi: login, refresh, logout.
 * Mendukung 2 strategi: JWT (default) dan Session (berdasarkan AUTH_STRATEGY).
 */

import bcrypt from 'bcrypt';
import jwt, { type Secret } from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/db.js';
import { config } from '../../config/env.js';
import { UnauthorizedError, NotFoundError } from '../../utils/errors.js';
import type { LoginInput } from './auth.schema.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoginResponse {
  accessToken: string;
  refreshToken?: string; // hanya untuk JWT
  user: {
    id: string;
    email: string;
    nama: string;
  };
}

interface RefreshResponse {
  accessToken: string;
  refreshToken?: string; // rotasi untuk JWT
}

// ─── JWT Strategy ─────────────────────────────────────────────────────────────

const generateAccessToken = (userId: string, email: string, nama: string): string => {
  if (!config.JWT_ACCESS_SECRET) {
    throw new Error('JWT_ACCESS_SECRET tidak dikonfigurasi');
  }
  return jwt.sign(
    { userId, email, nama },
    config.JWT_ACCESS_SECRET as Secret,
    { expiresIn: config.JWT_ACCESS_EXPIRES_IN } as jwt.SignOptions,
  );
};

const generateRefreshToken = (): string => {
  // Token acak 32 byte, hex-encoded
  return crypto.randomBytes(32).toString('hex');
};

const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const calculateRefreshTokenExpiry = (): Date => {
  // Parse JWT_REFRESH_EXPIRES_IN (mis. "7d") menjadi milliseconds
  const expiresIn = config.JWT_REFRESH_EXPIRES_IN;
  const match = expiresIn.match(/^(\d+)([dhms])$/);
  if (!match) throw new Error(`Invalid JWT_REFRESH_EXPIRES_IN: ${expiresIn}`);
  
  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;
  
  let ms = 0;
  switch (unit) {
    case 'd': ms = value * 24 * 60 * 60 * 1000; break;
    case 'h': ms = value * 60 * 60 * 1000; break;
    case 'm': ms = value * 60 * 1000; break;
    case 's': ms = value * 1000; break;
  }
  
  return new Date(Date.now() + ms);
};

// ─── Session Strategy ─────────────────────────────────────────────────────────

const generateSessionId = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

const calculateSessionExpiry = (): Date => {
  // Session berlaku 7 hari (sama dengan refresh token)
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
};

// ─── Service Functions ────────────────────────────────────────────────────────

export const loginService = async (
  input: LoginInput,
): Promise<LoginResponse> => {
  const { email, password } = input;

  // 1. Cari user berdasarkan email
  const user = await prisma.user.findUnique({ where: { email } });
  
  // 2. Verifikasi password — JANGAN beda pesan antara "user tidak ada" dan "password salah"
  if (!user) {
    throw new UnauthorizedError('Email atau password salah.');
  }
  
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Email atau password salah.');
  }

  // 3. Generate token/session berdasarkan strategi
  const accessToken = generateAccessToken(user.id, user.email, user.nama);
  
  if (config.AUTH_STRATEGY === 'jwt') {
    // JWT: buat refresh token, hash, simpan ke DB
    const refreshToken = generateRefreshToken();
    const tokenHash = hashToken(refreshToken);
    const expiresAt = calculateRefreshTokenExpiry();
    
    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });
    
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        nama: user.nama,
      },
    };
  } else {
    // Session: buat session ID, simpan ke DB
    const sessionId = generateSessionId();
    const expiresAt = calculateSessionExpiry();
    
    await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        expiresAt,
      },
    });
    
    return {
      accessToken: sessionId, // session ID dikirim sebagai "accessToken"
      user: {
        id: user.id,
        email: user.email,
        nama: user.nama,
      },
    };
  }
};

export const refreshTokenService = async (
  refreshTokenOrSessionId: string,
): Promise<RefreshResponse> => {
  if (config.AUTH_STRATEGY === 'jwt') {
    // JWT: verifikasi refresh token, rotasi
    const tokenHash = hashToken(refreshTokenOrSessionId);
    
    const existingToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    
    if (!existingToken) {
      throw new UnauthorizedError('Refresh token tidak valid.');
    }
    
    if (existingToken.revokedAt) {
      throw new UnauthorizedError('Refresh token telah direvoke.');
    }
    
    if (existingToken.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token telah kedaluwarsa.');
    }
    
    // Rotasi: hapus token lama, buat token baru
    await prisma.refreshToken.delete({ where: { id: existingToken.id } });
    
    const newRefreshToken = generateRefreshToken();
    const newTokenHash = hashToken(newRefreshToken);
    const expiresAt = calculateRefreshTokenExpiry();
    
    await prisma.refreshToken.create({
      data: {
        tokenHash: newTokenHash,
        userId: existingToken.userId,
        expiresAt,
      },
    });
    
    const newAccessToken = generateAccessToken(
      existingToken.user.id,
      existingToken.user.email,
      existingToken.user.nama,
    );
    
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  } else {
    // Session: verifikasi session ID, perpanjang expiry
    const session = await prisma.session.findUnique({
      where: { id: refreshTokenOrSessionId },
      include: { user: true },
    });
    
    if (!session) {
      throw new UnauthorizedError('Session tidak valid.');
    }
    
    if (session.expiresAt < new Date()) {
      throw new UnauthorizedError('Session telah kedaluwarsa.');
    }
    
    // Perpanjang session
    const newExpiresAt = calculateSessionExpiry();
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: newExpiresAt },
    });
    
    return {
      accessToken: session.id, // session ID tetap sama
    };
  }
};

export const logoutService = async (
  refreshTokenOrSessionId: string,
): Promise<void> => {
  if (config.AUTH_STRATEGY === 'jwt') {
    // JWT: revoke refresh token dengan set revokedAt
    const tokenHash = hashToken(refreshTokenOrSessionId);
    
    const token = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    
    if (!token) {
      throw new NotFoundError('Refresh token tidak ditemukan.');
    }
    
    await prisma.refreshToken.update({
      where: { id: token.id },
      data: { revokedAt: new Date() },
    });
  } else {
    // Session: hapus session dari DB
    await prisma.session.delete({
      where: { id: refreshTokenOrSessionId },
    });
  }
};

// ─── Helper untuk auth.middleware ─────────────────────────────────────────────

export const verifyAccessToken = (token: string) => {
  if (!config.JWT_ACCESS_SECRET) {
    throw new Error('JWT_ACCESS_SECRET tidak dikonfigurasi');
  }
  try {
    return jwt.verify(token, config.JWT_ACCESS_SECRET) as {
      userId: string;
      email: string;
      nama: string;
    };
  } catch (err) {
    throw new UnauthorizedError('Access token tidak valid atau kedaluwarsa.');
  }
};

export const verifySession = async (sessionId: string) => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });
  
  if (!session) {
    throw new UnauthorizedError('Session tidak valid.');
  }
  
  if (session.expiresAt < new Date()) {
    throw new UnauthorizedError('Session telah kedaluwarsa.');
  }
  
  return {
    userId: session.user.id,
    email: session.user.email,
    nama: session.user.nama,
  };
};
