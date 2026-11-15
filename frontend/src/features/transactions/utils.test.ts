import { describe, expect, it } from 'vitest';
import {
  derivasiStatusPembayaran,
  formatTanggalLengkap,
  hitungSisaVoid,
  judulTransaksi,
  ringkasanProdukTransaksi,
  VOID_WINDOW_HOURS,
} from './utils';
import type { Transaction, TransactionItem } from './types';

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

describe('penamaan header transaksi', () => {
  const item1 = { namaProdukSnapshot: 'Beras Ramos 5 kg' } as TransactionItem;
  const item2 = { namaProdukSnapshot: 'Kopi Sachet Robusta' } as TransactionItem;
  const item3 = { namaProdukSnapshot: 'Minyak Goreng 1 L' } as TransactionItem;

  it('ringkasanProdukTransaksi memformat 1, 2, atau >2 produk', () => {
    expect(ringkasanProdukTransaksi([])).toBe('Transaksi Penjualan');
    expect(ringkasanProdukTransaksi([item1])).toBe('Beras Ramos 5 kg');
    expect(ringkasanProdukTransaksi([item1, item2])).toBe('Beras Ramos 5 kg, Kopi Sachet Robusta');
    expect(ringkasanProdukTransaksi([item1, item2, item3])).toBe('Beras Ramos 5 kg, Kopi Sachet Robusta (+1 lainnya)');
  });

  it('judulTransaksi menggabungkan nama pembeli jika ada', () => {
    const trxDenganPembeli = {
      namaPembeli: 'Bu Sri',
      items: [item1, item2],
    } as Transaction;
    expect(judulTransaksi(trxDenganPembeli)).toBe('Bu Sri · Beras Ramos 5 kg, Kopi Sachet Robusta');

    const trxTanpaPembeli = {
      namaPembeli: null,
      items: [item1],
    } as Transaction;
    expect(judulTransaksi(trxTanpaPembeli)).toBe('Beras Ramos 5 kg');
  });

  it('formatTanggalLengkap menghasilkan format hari, tanggal dan jam', () => {
    const formatted = formatTanggalLengkap('2026-10-17T09:41:00.000Z');
    expect(formatted).toMatch(/17/);
    expect(formatted).toMatch(/2026/);
    expect(formatted).toMatch(/·/);
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
