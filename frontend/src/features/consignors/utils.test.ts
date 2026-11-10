import { describe, expect, it } from 'vitest';
import { hitungSaldoPenitip, totalKewajibanPenitip } from './utils';

describe('hitungSaldoPenitip', () => {
  it('positif: kewajiban terjual − setoran', () => {
    const saldo = hitungSaldoPenitip(
      [
        { jumlah: 2, hargaModalSnapshot: '20000.00', status: 'AKTIF' },
        { jumlah: 1, hargaModalSnapshot: '15000.00', status: 'AKTIF' },
      ],
      25000
    );
    expect(saldo).toBe(30000);
  });

  it('transaksi dibatalkan dikecualikan', () => {
    const saldo = hitungSaldoPenitip(
      [
        { jumlah: 2, hargaModalSnapshot: '20000.00', status: 'AKTIF' },
        { jumlah: 5, hargaModalSnapshot: '20000.00', status: 'DIBATALKAN' },
      ],
      0
    );
    expect(saldo).toBe(40000);
  });

  it('boleh negatif — tidak di-clamp (BR-F)', () => {
    const saldo = hitungSaldoPenitip(
      [{ jumlah: 1, hargaModalSnapshot: '10000.00', status: 'AKTIF' }],
      25000
    );
    expect(saldo).toBe(-15000);
  });
});

describe('totalKewajibanPenitip', () => {
  it('hanya saldo positif dijumlahkan', () => {
    expect(totalKewajibanPenitip([10000, 25000, -40000])).toBe(35000);
  });

  it('semua negatif → 0', () => {
    expect(totalKewajibanPenitip([-10000, -5000])).toBe(0);
  });

  it('penitip nonaktif tetap dihitung (IR-13) — fungsi tidak memfilter status', () => {
    // Pemanggil memasukkan saldo semua penitip tanpa memandang status.
    expect(totalKewajibanPenitip([20000, 0])).toBe(20000);
  });
});
