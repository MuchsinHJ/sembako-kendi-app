/**
 * repositories/storage.repository.ts
 * Implementasi R2ObjectStorage untuk Cloudflare R2 via AWS SDK S3.
 * Fase 6: menggantikan FakeObjectStorage dari Fase 5.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import type { IObjectStorage } from '../modules/product/storage.interface.js';
import { StorageError } from '../utils/errors.js';
import { config } from '../config/env.js';
import pino from 'pino';

const logger = pino();

export class R2ObjectStorage implements IObjectStorage {
  private client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    // R2 endpoint format: https://<account-id>.r2.cloudflarestorage.com
    const endpoint = `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

    this.client = new S3Client({
      region: 'auto', // R2 doesn't use AWS regions
      endpoint,
      credentials: {
        accessKeyId: config.R2_ACCESS_KEY_ID!,
        secretAccessKey: config.R2_SECRET_ACCESS_KEY!,
      },
    });

    this.bucketName = config.R2_BUCKET_NAME!;
    this.publicUrl = config.R2_PUBLIC_URL!; // e.g., https://cdn.example.com
  }

  /**
   * Upload file buffer ke R2.
   * @throws StorageError jika upload gagal
   */
  async uploadImage(key: string, buffer: Buffer, contentType: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await this.client.send(command);

      // Return public URL
      const url = `${this.publicUrl}/${key}`;
      logger.info({ key, url }, 'Image uploaded to R2');
      return url;
    } catch (error) {
      logger.error({ error, key }, 'Failed to upload image to R2');
      throw new StorageError('Gagal upload file ke storage. Coba lagi nanti.');
    }
  }

  /**
   * Hapus file dari R2.
   * @throws StorageError jika delete gagal
   */
  async deleteImage(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.client.send(command);
      logger.info({ key }, 'Image deleted from R2');
    } catch (error) {
      logger.error({ error, key }, 'Failed to delete image from R2');
      throw new StorageError('Gagal hapus file dari storage.');
    }
  }

  /**
   * Generate signed URL untuk akses private (tidak dipakai di fase ini).
   * R2 public bucket bisa langsung pakai URL public.
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // Untuk fase ini, kita pakai public URL langsung
    return `${this.publicUrl}/${key}`;
  }
}
