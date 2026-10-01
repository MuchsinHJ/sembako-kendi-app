/**
 * modules/product/storage.interface.ts
 * Interface untuk object storage operations (R2).
 * Fase 5: fake/no-op implementation
 * Fase 6: implementasi asli dengan @aws-sdk/client-s3
 */

export interface IObjectStorage {
  /**
   * Upload object ke storage
   * @returns object key yang berhasil di-upload
   */
  putObject(key: string, buffer: Buffer, contentType: string): Promise<string>;

  /**
   * Hapus object dari storage
   */
  deleteObject(key: string): Promise<void>;
}

/**
 * Fake implementation untuk Fase 5
 * Tidak melakukan operasi storage asli, hanya log
 */
export class FakeObjectStorage implements IObjectStorage {
  async putObject(key: string, _buffer: Buffer, _contentType: string): Promise<string> {
    console.log(`[FakeStorage] Would upload to key: ${key}`);
    return key;
  }

  async deleteObject(key: string): Promise<void> {
    console.log(`[FakeStorage] Would delete key: ${key}`);
  }
}
