/**
 * utils/asyncHandler.ts
 * Wrapper agar error di fungsi async controller otomatis diteruskan ke
 * errorHandler tanpa perlu menulis try/catch berulang (SDD §3.13).
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

/**
 * Membungkus route handler async agar exception-nya diteruskan ke `next(err)`,
 * yang kemudian ditangani oleh middleware `errorHandler`.
 */
export const asyncHandler =
  (fn: AsyncRequestHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
