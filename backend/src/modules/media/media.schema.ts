/**
 * modules/media/media.schema.ts
 * Validasi untuk upload foto produk.
 */

import { z } from 'zod';

// ─── Upload Photo ─────────────────────────────────────────────────────────────

export const uploadPhotoSchema = {
  params: z.object({
    id: z.string().uuid('ID produk harus berformat UUID'),
  }),
  // File validation akan dilakukan di Multer & Sharp, bukan Zod
};

// ─── Delete Photo ─────────────────────────────────────────────────────────────

export const deletePhotoSchema = {
  params: z.object({
    id: z.string().uuid('ID produk harus berformat UUID'),
  }),
};
