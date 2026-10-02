/**
 * scripts/cleanup-orphan-photos.ts
 * Script untuk menghapus foto orphan di R2 yang tidak direferensikan oleh Product.
 * SDD 7.6: Hapus object berumur > 24 jam yang tidak ada di Product.fotoKey.
 * 
 * Usage: npx tsx scripts/cleanup-orphan-photos.ts
 */

import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '../src/config/db.js';
import { config } from '../src/config/env.js';
import pino from 'pino';

const logger = pino();

const RETENTION_HOURS = 24;

async function cleanupOrphanPhotos() {
  logger.info('Starting orphan photo cleanup...');

  // Initialize R2 client
  const endpoint = `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: config.R2_ACCESS_KEY_ID!,
      secretAccessKey: config.R2_SECRET_ACCESS_KEY!,
    },
  });

  const bucketName = config.R2_BUCKET_NAME!;
  const now = new Date();
  const cutoffTime = new Date(now.getTime() - RETENTION_HOURS * 60 * 60 * 1000);

  try {
    // 1. List all objects in products/ prefix
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'products/',
    });

    const response = await client.send(listCommand);
    const allKeys = response.Contents?.map((obj) => obj.Key).filter(Boolean) || [];

    logger.info({ total: allKeys.length }, 'Total objects in R2');

    // 2. Get all fotoKey yang direferensikan oleh Product
    const products = await prisma.product.findMany({
      where: { fotoKey: { not: null } },
      select: { fotoKey: true },
    });

    const referencedKeys = new Set(products.map((p) => p.fotoKey).filter(Boolean));
    logger.info({ total: referencedKeys.size }, 'Total referenced photos in DB');

    // 3. Find orphan keys (tidak ada di DB dan berumur > 24 jam)
    const orphanKeys: string[] = [];

    for (const key of allKeys) {
      if (!key) continue;

      // Skip jika key masih direferensikan
      if (referencedKeys.has(key)) continue;

      // Cek umur object (dari response.Contents)
      const obj = response.Contents?.find((o) => o.Key === key);
      if (!obj?.LastModified) continue;

      const age = now.getTime() - obj.LastModified.getTime();
      const ageHours = age / (60 * 60 * 1000);

      if (ageHours > RETENTION_HOURS) {
        orphanKeys.push(key);
      }
    }

    logger.info({ total: orphanKeys.length }, 'Orphan photos found');

    // 4. Delete orphan objects
    let deletedCount = 0;
    for (const key of orphanKeys) {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: key,
        });

        await client.send(deleteCommand);
        deletedCount++;
        logger.info({ key }, 'Deleted orphan photo');
      } catch (error) {
        logger.error({ error, key }, 'Failed to delete orphan photo');
      }
    }

    logger.info(
      { deleted: deletedCount, total: orphanKeys.length },
      'Cleanup completed',
    );

    return { deleted: deletedCount, total: orphanKeys.length };
  } catch (error) {
    logger.error({ error }, 'Cleanup failed');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupOrphanPhotos()
    .then((result) => {
      console.log('✅ Cleanup completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Cleanup failed:', error);
      process.exit(1);
    });
}

export { cleanupOrphanPhotos };
