/**
 * Pemformatan uang (SDD FE §5.4 — versi DIPERBAIKI dari bug "RpRp").
 *
 * Kontrak:
 * - Backend kirim desimal string, contoh "75000.00".
 * - Rupiah TIDAK menampilkan desimal, membulatkan ke bawah (floor).
 * - `null` / `undefined` → "—" (kembalian tidak ada).
 * - Negatif → "-Rp24.000" (tanda minus di depan, tanpa spasi).
 */
export function formatRupiah(value) {
    if (value === null || value === undefined)
        return '—';
    const n = typeof value === 'string' ? Number(value) : value;
    if (!Number.isFinite(n))
        return '—';
    const isNegative = n < 0;
    const whole = Math.floor(Math.abs(n));
    const formatted = whole.toLocaleString('id-ID');
    return isNegative ? `-Rp${formatted}` : `Rp${formatted}`;
}
