/**
 * modules/product/storage.interface.ts
 * Interface untuk object storage operations (R2).
 * Fase 5: fake/no-op implementation
 * Fase 6: implementasi asli dengan @aws-sdk/client-s3
 */

export interface IObjectStorage {
  /**
   * Upload image ke storage
   * @returns public URL dari file yang di-upload
   */
  uploadImage(key: string, buffer: Buffer, contentType: string): Promise<string>;

  /**
   * Hapus image dari storage
   */
  deleteImage(key: string): Promise<void>;

  /**
   * Generate signed URL untuk akses file
   */
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
}

/**
 * Fake implementation untuk Fase 5 (tidak dipakai lagi di Fase 6)
 * Tidak melakukan operasi storage asli, hanya log
 */
export class FakeObjectStorage implements IObjectStorage {
  async uploadImage(key: string, _buffer: Buffer, _contentType: string): Promise<string> {
    console.log(`[FakeStorage] Would upload to key: ${key}`);
    return `https://fake-cdn.com/${key}`;
  }

  async deleteImage(key: string): Promise<void> {
    console.log(`[FakeStorage] Would delete key: ${key}`);
  }

  async getSignedUrl(key: string, _expiresIn?: number): Promise<string> {
    return `https://fake-cdn.com/${key}`;
  }
}
