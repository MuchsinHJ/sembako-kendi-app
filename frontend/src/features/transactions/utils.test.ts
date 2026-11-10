import { describe, expect, it } from 'vitest';
import { derivasiStatusPembayaran, hitungSisaVoid, VOID_WINDOW_HOURS } from './utils';

describe('derivasiStatusPembayaran (BR-08)', () => {
  it('uangDiterima >= total → LUNAS', () => {
    expect(derivasiStatusPembayaran(75000, 75000)).toBe('LUNAS');
    expect(derivasiStatusPembayaran(75000, 100000)).toBe('LUNAS');
  });

  it('uangDiterima < total → UTANG', () => {
    expect(derivasiStatusPembayaran(75000, 50000)).toBe('UTANG');
    expect(derivasiStatusPembayaran(75000, 0)).toBe('UTANG');
  });
});

describe('hitungSisaVoid (BR-13)', () => {
  const now = new Date('2026-11-10T12:00:00.000Z');

  it('masih dalam 24 jam → true', () => {
    const createdAt = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1 jam lalu
    expect(hitungSisaVoid(createdAt.toISOString(), now)).toBe(true);
  });

  it('tepat 24 jam → true (inklusif)', () => {
    const createdAt = new Date(now.getTime() - VOID_WINDOW_HOURS * 60 * 60 * 1000);
    expect(hitungSisaVoid(createdAt, now)).toBe(true);
  });

  it('lewat 24 jam → false', () => {
    const createdAt = new Date(now.getTime() - (VOID_WINDOW_HOURS + 1) * 60 * 60 * 1000);
    expect(hitungSisaVoid(createdAt, now)).toBe(false);
  });

  it('createdAt di masa depan → false', () => {
    const createdAt = new Date(now.getTime() + 60 * 60 * 1000);
    expect(hitungSisaVoid(createdAt, now)).toBe(false);
  });
});
