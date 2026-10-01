/**
 * utils/response.ts
 * Helper untuk membentuk response sukses / gagal yang konsisten (SDD §5.1).
 *
 * Format sukses : { success: true,  data?, message? }
 * Format gagal  : { success: false, error: { code, message, details? } }
 *
 * Keputusan arsitektur: nilai uang selalu dikirim sebagai STRING desimal
 * (bukan float JS) agar tidak ada masalah presisi di sisi client.
 * Ini didokumentasikan sebagai keputusan deviasi kecil dari SDD §5.1
 * yang hanya menulis "string/number desimal".
 */

import type { Response } from 'express';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SuccessPayload<T> {
  success: true;
  data?: T;
  message?: string;
}

interface ErrorPayload {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Kirim response sukses.
 * @param res     - Express Response
 * @param status  - HTTP status code (200, 201, …)
 * @param data    - Payload utama (opsional)
 * @param message - Pesan human-readable (opsional)
 */
export const sendSuccess = <T>(
  res: Response,
  status: number,
  data?: T,
  message?: string,
): Response => {
  const payload: SuccessPayload<T> = { success: true };
  if (data !== undefined) payload.data = data;
  if (message)           payload.message = message;
  return res.status(status).json(payload);
};

/**
 * Kirim response error.
 * Biasanya dipanggil dari errorHandler, bukan dari controller/service.
 */
export const sendError = (
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response => {
  const payload: ErrorPayload = {
    success: false,
    error: { code, message },
  };
  if (details !== undefined) payload.error.details = details;
  return res.status(status).json(payload);
};
