/**
 * server.ts
 * Entry point aplikasi — hanya bertanggung jawab untuk `listen`.
 * Business logic & middleware ada di app.ts.
 */

import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/db.js';

// ─── Graceful shutdown ────────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  logger.info(`Menerima sinyal ${signal}. Menutup server...`);
  await prisma.$disconnect();
  logger.info('Prisma Client disconnected. Server berhenti.');
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

// ─── Unhandled rejection / exception ─────────────────────────────────────────

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled Promise Rejection');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught Exception');
  process.exit(1);
});

// ─── Start server ─────────────────────────────────────────────────────────────

const server = app.listen(env.PORT, () => {
  logger.info(`   Server berjalan di http://localhost:${env.PORT}`);
  logger.info(`   Environment : ${env.NODE_ENV}`);
  logger.info(`   Auth strategy: ${env.AUTH_STRATEGY}`);
});

export default server;
