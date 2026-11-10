/**
 * Fungsi murni turunan konsinyasi (SDD §3.14, §11.12, SRS IR-13, BR-22).
 * Backend tetap otoritatif; di sini dipakai untuk umpan balik instan.
 */

export interface MovementItem {
  jumlah: number;
  hargaModalSnapshot: string | number;
  status: 'AKTIF' | 'DIBATALKAN';
}

/** Saldo penitip = Σ(jumlah × hargaModalSnapshot) transaksi AKTIF − setoran. Boleh negatif. */
export function hitungSaldoPenitip(
  transaksi: MovementItem[],
  setoran: number
): number {
  const kewajiban = transaksi
    .filter((t) => t.status === 'AKTIF')
    .reduce((sum, t) => sum + t.jumlah * Number(t.hargaModalSnapshot), 0);
  return kewajiban - setoran;
}

/** Total kewajiban penitip = hanya saldo POSITIF; penitip nonaktif tetap dihitung. */
export function totalKewajibanPenitip(saldoList: number[]): number {
  return saldoList.filter((s) => s > 0).reduce((sum, s) => sum + s, 0);
}
