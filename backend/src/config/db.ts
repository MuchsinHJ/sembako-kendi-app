/**
 * config/db.ts
 * Singleton Prisma Client — dipakai seluruh repository layer.
 * Import dari sini, jangan buat instansi baru di tiap file.
 */

import { PrismaClient } from '@prisma/client';
import { config } from './env.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.IS_PRODUCTION ? ['warn', 'error'] : ['query', 'warn', 'error'],
  });

if (!config.IS_PRODUCTION) {
  globalForPrisma.prisma = prisma;
}
