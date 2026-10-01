/**
 * utils/objectKey.ts
 * Helper pembuatan object key R2 yang konsisten dan aman (SDD §3.13, §6.7).
 *
 * Object key selalu menggunakan UUID yang digenerate server — BUKAN nama file
 * asli dari pengguna — untuk mencegah path traversal atau penimpaan file lain.
 * Format: products/{productId}/{uuid}.webp
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Buat object key untuk foto produk.
 * @param productId - ID produk (digunakan sebagai sub-folder)
 * @returns key seperti "products/clxxx.../a1b2c3d4-....webp"
 */
export const makeProductPhotoKey = (productId: string): string => {
  const uuid = uuidv4();
  return `products/${productId}/${uuid}.webp`;
};

/**
 * Ekstrak UUID dari object key (berguna saat cleanup / logging).
 * Mengembalikan null jika format tidak dikenali.
 */
export const extractUuidFromKey = (key: string): string | null => {
  const match = key.match(/([0-9a-f-]{36})\.webp$/i);
  return match ? (match[1] ?? null) : null;
};
