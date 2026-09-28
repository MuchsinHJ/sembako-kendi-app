/**
 * config/logger.ts
 * Instansiasi Pino logger.
 * - development : pretty-print berwarna ke stdout
 * - production  : JSON terstruktur (untuk log aggregator)
 * Field sensitif di-redact agar tidak muncul di log.
 */

import pino from 'pino';
import { env } from './env.js';

const isProduction = env.NODE_ENV === 'production';

export const logger = pino({
  level: isProduction ? 'info' : 'debug',

  // Pretty-print hanya di development (membutuhkan pino-pretty).
  // Di production, properti transport tidak dikirim sama sekali.
  ...(!isProduction && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),

  // Redact field sensitif, tidak pernah muncul di log mana pun
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'body.password',
      'body.passwordHash',
      'body.tokenHash',
      'r2AccessKeyId',
      'r2SecretAccessKey',
    ],
    censor: '[REDACTED]',
  },
});