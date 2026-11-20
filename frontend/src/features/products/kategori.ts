/**
 * Kategori produk adalah teks bebas (Prisma `String`, tanpa enum), jadi
 * "Snack", "snack", dan " Snack " adalah nilai berbeda bagi DB.
 * Kunci kanonik menyatukannya; label memakai penulisan pertama yang muncul
 * supaya kapitalisasi bawaan user tidak dipaksa berubah.
 */

/** Kunci pencocokan: trim, rapikan spasi ganda, huruf kecil. */
export function kunciKategori(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Normalisasi untuk disimpan (trim + rapikan spasi) tanpa mengubah kapitalisasi. */
export function rapikanKategori(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/**
 * Title Case label filter — "snack", "SNACK", "snack enak" → "Snack", "Snack Enak".
 * Huruf setelah tanda hubung/apostrof juga kapital ("coca-cola" → "Coca-Cola").
 */
export function judulkanKategori(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(^|[\s\-(''/])([a-z])/g, (_, s, c) => s + c.toUpperCase());
}

export interface OpsiKategori {
  /** Kunci kanonik — dipakai sebagai nilai filter & `key` React. */
  key: string;
  /** Label tampil — Title Case ("snack" → "Snack"). */
  label: string;
}

/** Daftar kategori unik (case-insensitive), label Title Case, urut alfabetis. */
export function daftarKategori(values: string[]): OpsiKategori[] {
  const seen = new Map<string, string>();
  for (const raw of values) {
    const key = kunciKategori(raw);
    if (!key || seen.has(key)) continue;
    seen.set(key, judulkanKategori(raw));
  }
  return [...seen]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'id'));
}

/** "Sembako · Milik Sendiri" / "Minuman · Titipan Bu Ratna" (pen baris Katalog). */
export function labelKategoriTipe(product: {
  kategori: string;
  tipe: 'MILIK_SENDIRI' | 'TITIPAN';
  consignor?: { nama: string } | null;
}): string {
  const tipe =
    product.tipe === 'TITIPAN'
      ? product.consignor?.nama
        ? `Titipan ${product.consignor.nama}`
        : 'Titipan'
      : 'Milik Sendiri';
  return `${product.kategori} · ${tipe}`;
}

/** Gabungkan daftar opsi kategori tanpa duplikasi, diurutkan alfabetis. */
export function gabungKategori(...lists: OpsiKategori[][]): OpsiKategori[] {
  const seen = new Map<string, string>();
  for (const list of lists) {
    for (const item of list) {
      if (!item.key || seen.has(item.key)) continue;
      seen.set(item.key, item.label);
    }
  }
  return [...seen]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'id'));
}
