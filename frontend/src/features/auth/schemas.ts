import { z } from 'zod';

/**
 * Validasi form login (SDD FE §6, PRD FR-01/FR-02).
 * Backend tetap sumber kebenaran — schema ini untuk umpan balik form saja.
 * Pesan mengikuti `docs-frontend/04-interaksi-dan-aturan-bisnis.md` §6.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Masukkan email.')
    .email('Format email tidak valid.'),
  password: z.string().min(1, 'Masukkan kata sandi.'),
});

export type LoginInput = z.infer<typeof loginSchema>;
