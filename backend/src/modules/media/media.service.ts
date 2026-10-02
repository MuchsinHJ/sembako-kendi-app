/**
 * modules/media/media.service.ts
 * Service untuk upload/delete foto produk dengan Sharp image processing.
 * SDD 4.6: URUTAN OPERASI - upload R2 → update DB → hapus old foto.
 */

import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { prisma } from '../../config/db.js';
import type { IObjectStorage } from '../product/storage.interface.js';
import { R2ObjectStorage } from '../../repositories/storage.repository.js';
import { NotFoundError, ValidationError, StorageError } from '../../utils/errors.js';
import pino from 'pino';

const logger = pino();

// Singleton storage instance
const storage: IObjectStorage = new R2ObjectStorage();

// Constants
const MAX_WIDTH = 1000;
const QUALITY = 80;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Upload foto produk dengan processing Sharp.
 * SDD 4.6: Upload ke R2 dulu, baru update DB, terakhir hapus foto lama.
 */
export const uploadProductPhoto = async (
  productId: string,
  fileBuffer: Buffer,
  mimetype: string,
): Promise<{ fotoUrl: string; fotoKey: string }> => {
  // 1. Verifikasi produk exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, fotoKey: true },
  });

  if (!product) {
    throw new NotFoundError('Produk tidak ditemukan.');
  }

  // 2. Validasi MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
    throw new ValidationError('Format file tidak didukung. Gunakan JPEG, PNG, atau WebP.', [
      { field: 'photo', issue: 'Invalid MIME type' },
    ]);
  }

  // 3. Verifikasi file adalah gambar valid dengan Sharp
  let metadata;
  try {
    metadata = await sharp(fileBuffer).metadata();
  } catch (error) {
    logger.warn({ error }, 'File gagal dibaca oleh Sharp');
    throw new ValidationError('File bukan gambar valid atau corrupt.', [
      { field: 'photo', issue: 'Cannot read image metadata' },
    ]);
  }

  // 4. Process image: resize + optimize + convert to WebP
  let processedBuffer: Buffer;
  try {
    const sharpInstance = sharp(fileBuffer);

    // Resize jika width > MAX_WIDTH, jaga aspect ratio, no upscale
    if (metadata.width && metadata.width > MAX_WIDTH) {
      sharpInstance.resize(MAX_WIDTH, null, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert to WebP dengan quality 80
    processedBuffer = await sharpInstance.webp({ quality: QUALITY }).toBuffer();
  } catch (error) {
    logger.error({ error }, 'Sharp processing failed');
    throw new StorageError('Gagal memproses gambar.');
  }

  // 5. Generate object key: products/{productId}/{uuid}.webp
  const uuid = randomUUID();
  const key = `products/${productId}/${uuid}.webp`;

  // 6. Upload ke R2 (throw StorageError jika gagal)
  const fotoUrl = await storage.uploadImage(key, processedBuffer, 'image/webp');

  // 7. Update DB dengan fotoKey & fotoUrl baru
  const oldFotoKey = product.fotoKey;
  try {
    await prisma.product.update({
      where: { id: productId },
      data: {
        fotoKey: key,
        fotoUrl,
      },
    });
  } catch (error) {
    // DB update gagal setelah upload R2 → ORPHAN PHOTO
    logger.error(
      { error, orphanKey: key, productId },
      'DB update failed after R2 upload. Orphan photo created.',
    );
    // JANGAN hapus foto yang baru diupload (akan di-cleanup oleh script nanti)
    throw new StorageError('Gagal menyimpan foto ke database.');
  }

  // 8. Hapus foto lama dari R2 (jika ada)
  if (oldFotoKey) {
    try {
      await storage.deleteImage(oldFotoKey);
    } catch (error) {
      // Log error tapi tidak throw - foto baru sudah tersimpan
      logger.warn({ error, key: oldFotoKey }, 'Failed to delete old photo from R2');
    }
  }

  return { fotoUrl, fotoKey: key };
};

/**
 * Hapus foto produk.
 */
export const deleteProductPhoto = async (productId: string): Promise<void> => {
  // 1. Verifikasi produk & foto exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, fotoKey: true },
  });

  if (!product) {
    throw new NotFoundError('Produk tidak ditemukan.');
  }

  if (!product.fotoKey) {
    throw new ValidationError('Produk tidak memiliki foto.', [
      { field: 'photo', issue: 'No photo to delete' },
    ]);
  }

  // 2. Hapus dari R2
  await storage.deleteImage(product.fotoKey);

  // 3. Update DB (set fotoKey & fotoUrl = null)
  await prisma.product.update({
    where: { id: productId },
    data: {
      fotoKey: null,
      fotoUrl: null,
    },
  });
};

/**
 * Helper untuk hapus foto saat hard delete produk (dipanggil dari product.service).
 * Tidak throw error jika foto gagal dihapus dari R2.
 */
export const deletePhotoOnProductDelete = async (fotoKey: string | null): Promise<void> => {
  if (!fotoKey) return;

  try {
    await storage.deleteImage(fotoKey);
  } catch (error) {
    // Log tapi tidak throw - produk sudah dihapus dari DB
    logger.warn({ error, key: fotoKey }, 'Failed to delete photo during product deletion');
  }
};
