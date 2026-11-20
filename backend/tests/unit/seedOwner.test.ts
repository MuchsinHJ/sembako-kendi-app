/**
 * tests/unit/seedOwner.test.ts
 * Aturan pemilihan akun pemilik untuk prisma/seed.ts (fungsi murni, tanpa DB).
 */
import {
  DEV_DEFAULT_OWNER,
  resolveSeedOwner,
  SeedConfigError,
} from '../../src/config/seedOwner.js';

const STRONG = 'pemilik-toko-2026!';

describe('resolveSeedOwner', () => {
  it('development tanpa env → akun bawaan', () => {
    const owner = resolveSeedOwner({ NODE_ENV: 'development' });
    expect(owner).toEqual({ ...DEV_DEFAULT_OWNER, usingDevDefaults: true });
  });

  it('test tanpa env → akun bawaan', () => {
    expect(resolveSeedOwner({ NODE_ENV: 'test' }).usingDevDefaults).toBe(true);
  });

  it('development dengan env → memakai nilai env, bukan akun bawaan', () => {
    const owner = resolveSeedOwner({
      NODE_ENV: 'development',
      SEED_OWNER_EMAIL: ' budi@toko.id ',
      SEED_OWNER_PASSWORD: 'rahasia-banget',
      SEED_OWNER_NAMA: 'Pak Budi',
    });
    expect(owner).toEqual({
      email: 'budi@toko.id',
      nama: 'Pak Budi',
      password: 'rahasia-banget',
      usingDevDefaults: false,
    });
  });

  it('development: hanya salah satu env diisi → ditolak', () => {
    expect(() => resolveSeedOwner({ NODE_ENV: 'development', SEED_OWNER_EMAIL: 'a@b.id' })).toThrow(SeedConfigError);
    expect(() => resolveSeedOwner({ NODE_ENV: 'development', SEED_OWNER_PASSWORD: 'rahasia-banget' })).toThrow(
      SeedConfigError,
    );
  });

  it('production tanpa env → ditolak (tidak jatuh ke akun bawaan)', () => {
    expect(() => resolveSeedOwner({ NODE_ENV: 'production' })).toThrow(/SEED_OWNER_EMAIL wajib diisi/);
    expect(() => resolveSeedOwner({ NODE_ENV: 'production' })).toThrow(/SEED_OWNER_PASSWORD wajib diisi/);
  });

  it('production: password < 12 karakter ditolak', () => {
    expect(() =>
      resolveSeedOwner({ NODE_ENV: 'production', SEED_OWNER_EMAIL: 'a@b.id', SEED_OWNER_PASSWORD: 'pendek123' }),
    ).toThrow(/minimal 12 karakter/);
  });

  it('production: password bawaan development ditolak', () => {
    expect(() =>
      resolveSeedOwner({ NODE_ENV: 'production', SEED_OWNER_EMAIL: 'a@b.id', SEED_OWNER_PASSWORD: 'password123' }),
    ).toThrow(SeedConfigError);
  });

  it('email tidak valid ditolak', () => {
    expect(() =>
      resolveSeedOwner({ NODE_ENV: 'production', SEED_OWNER_EMAIL: 'bukan-email', SEED_OWNER_PASSWORD: STRONG }),
    ).toThrow(/bukan email yang valid/);
  });

  it('production valid → nama default "Pemilik Toko"', () => {
    const owner = resolveSeedOwner({ NODE_ENV: 'production', SEED_OWNER_EMAIL: 'budi@toko.id', SEED_OWNER_PASSWORD: STRONG });
    expect(owner).toEqual({ email: 'budi@toko.id', nama: 'Pemilik Toko', password: STRONG, usingDevDefaults: false });
  });

  it('pesan error tidak membocorkan password', () => {
    try {
      resolveSeedOwner({ NODE_ENV: 'production', SEED_OWNER_EMAIL: 'x', SEED_OWNER_PASSWORD: 'rahasia-pendek' });
      throw new Error('seharusnya melempar');
    } catch (e) {
      expect(String((e as Error).message)).not.toContain('rahasia-pendek');
    }
  });
});
