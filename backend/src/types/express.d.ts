/**
 * types/express.d.ts
 * Augmentasi tipe Express untuk menambahkan `user` dan `id` ke Request (SDD §3.11).
 *
 * `req.user` diisi oleh auth.middleware setelah verifikasi token/session.
 * `req.id`   diisi oleh pino-http sebagai request ID.
 */

import 'express';

declare global {
  namespace Express {
    interface Request {
      /**
       * User yang sedang terautentikasi.
       * Hanya ada setelah melewati middleware `authenticate`.
       * undefined di route publik (login, refresh-token, health).
       */
      user?: {
        id: string;
        email: string;
        nama: string;
      };

      /**
       * Request ID unik yang diset oleh pino-http untuk tracing.
       */
      id?: string | number;
    }
  }
}
