import { describe, expect, it } from 'vitest';
import { daftarKategori, gabungKategori, judulkanKategori, kunciKategori, rapikanKategori } from './kategori';

describe('kategori produk', () => {
  it('dedup case-insensitive + label Title Case', () => {
    expect(daftarKategori(['snack', 'SNACK', ' Snack ', 'minuman ringan'])).toEqual([
      { key: 'minuman ringan', label: 'Minuman Ringan' },
      { key: 'snack', label: 'Snack' },
    ]);
  });

  it('gabungKategori menyatukan daftar kategori tanpa duplikasi', () => {
    const list1 = [{ key: 'sembako', label: 'Sembako' }, { key: 'snack', label: 'Snack' }];
    const list2 = [{ key: 'snack', label: 'Snack' }, { key: 'minuman', label: 'Minuman' }];
    expect(gabungKategori(list1, list2)).toEqual([
      { key: 'minuman', label: 'Minuman' },
      { key: 'sembako', label: 'Sembako' },
      { key: 'snack', label: 'Snack' },
    ]);
  });

  it('title case: kapital di awal kata, setelah tanda hubung, tanpa mengubah angka', () => {
    expect(judulkanKategori('snack')).toBe('Snack');
    expect(judulkanKategori('SNACK')).toBe('Snack');
    expect(judulkanKategori('makanan ringan')).toBe('Makanan Ringan');
    expect(judulkanKategori('coca-cola')).toBe('Coca-Cola');
    expect(judulkanKategori('sembako 5 kg')).toBe('Sembako 5 Kg');
  });

  it('normalisasi konsisten untuk penyimpanan dan filter', () => {
    expect(rapikanKategori('  Makanan   Ringan  ')).toBe('Makanan Ringan');
    expect(kunciKategori(' Makanan   RINGAN ')).toBe('makanan ringan');
    expect(kunciKategori('Snack')).toBe(kunciKategori('snack'));
  });
});

