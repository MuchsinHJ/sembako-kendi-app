/**
 * config/seedOwner.ts
 * Menentukan akun pemilik yang dibuat oleh `prisma/seed.ts`.
 *
 * Aturan:
 * - Production: email & password WAJIB dari env (SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD),
 *   password minimal 12 karakter. Tidak ada nilai bawaan.
 * - Development/test: bila env tidak diisi, memakai akun bawaan `test@example.com`
 *   agar Postman & uji manual tetap jalan. Mengisi hanya salah satu env ditolak.
 *
 * Fungsi murni (tanpa akses DB/proses) supaya mudah diuji.
 */
import { z } from 'zod';

export const DEV_DEFAULT_OWNER = {
  email: 'test@example.com',
  nama: 'Test User',
  password: 'password123',
} as const;

export const MIN_PASSWORD_PRODUCTION = 12;
export const MIN_PASSWORD_DEVELOPMENT = 8;
const DEFAULT_OWNER_NAME = 'Pemilik Toko';

export interface SeedOwner {
  email: string;
  nama: string;
  password: string;
  /** true bila memakai akun bawaan development (password boleh dicetak ke log). */
  usingDevDefaults: boolean;
}

export class SeedConfigError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Konfigurasi seed tidak valid:\n${issues.map((i) => `  • ${i}`).join('\n')}`);
    this.name = 'SeedConfigError';
  }
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function resolveSeedOwner(env: Record<string, string | undefined>): SeedOwner {
  const isProduction = env.NODE_ENV === 'production';
  const email = clean(env.SEED_OWNER_EMAIL);
  // Password sengaja tidak di-trim: spasi di tepi bisa jadi bagian dari password.
  const password = env.SEED_OWNER_PASSWORD ? env.SEED_OWNER_PASSWORD : undefined;
  const nama = clean(env.SEED_OWNER_NAMA);

  if (!isProduction && !email && !password) {
    return { ...DEV_DEFAULT_OWNER, usingDevDefaults: true };
  }

  const issues: string[] = [];
  if (!email) issues.push('SEED_OWNER_EMAIL wajib diisi.');
  else if (!z.string().email().safeParse(email).success) issues.push('SEED_OWNER_EMAIL bukan email yang valid.');

  const minPassword = isProduction ? MIN_PASSWORD_PRODUCTION : MIN_PASSWORD_DEVELOPMENT;
  if (!password) issues.push('SEED_OWNER_PASSWORD wajib diisi.');
  else if (password.length < minPassword) issues.push(`SEED_OWNER_PASSWORD minimal ${minPassword} karakter.`);
  else if (isProduction && password === DEV_DEFAULT_OWNER.password) {
    issues.push('SEED_OWNER_PASSWORD tidak boleh memakai password bawaan development.');
  }

  if (issues.length > 0 || !email || !password) throw new SeedConfigError(issues);

  return { email, nama: nama ?? DEFAULT_OWNER_NAME, password, usingDevDefaults: false };
}
