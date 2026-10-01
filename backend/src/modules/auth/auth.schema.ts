/**
 * modules/auth/auth.schema.ts
 * Zod schemas untuk validasi request auth endpoints.
 */

import { z } from 'zod';

export const loginSchema = {
  body: z.object({
    email: z.string().email('Email tidak valid'),
    password: z.string().min(1, 'Password wajib diisi'),
  }),
};

export const refreshTokenSchema = {
  body: z.object({}).optional(),
};

export const logoutSchema = {
  body: z.object({}).optional(),
};

export type LoginInput = z.infer<typeof loginSchema.body>;

