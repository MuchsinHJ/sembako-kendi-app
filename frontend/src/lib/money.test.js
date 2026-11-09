import { describe, expect, it } from 'vitest';
import { formatRupiah } from './money';
describe('formatRupiah', () => {
    it('format desimal string positif tanpa desimal', () => {
        expect(formatRupiah('75000.00')).toBe('Rp75.000');
    });
    it('format integer string', () => {
        expect(formatRupiah('12000')).toBe('Rp12.000');
    });
    it('format number positif', () => {
        expect(formatRupiah(1250000)).toBe('Rp1.250.000');
    });
    it('null → em dash', () => {
        expect(formatRupiah(null)).toBe('—');
    });
    it('undefined → em dash', () => {
        expect(formatRupiah(undefined)).toBe('—');
    });
    it('negatif pakai tanda minus tanpa spasi', () => {
        expect(formatRupiah('-24000.00')).toBe('-Rp24.000');
    });
    it('negatif number', () => {
        expect(formatRupiah(-24000)).toBe('-Rp24.000');
    });
    it('nol tetap Rp0', () => {
        expect(formatRupiah('0.00')).toBe('Rp0');
    });
    it('string tak valid → em dash', () => {
        expect(formatRupiah('abc')).toBe('—');
    });
    it('membulatkan desimal ke bawah', () => {
        expect(formatRupiah('1250.99')).toBe('Rp1.250');
    });
});
