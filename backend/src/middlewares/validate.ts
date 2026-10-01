/**
 * middlewares/validate.ts
 * Middleware generik untuk validasi body / query / params menggunakan Zod (SDD §6.4).
 *
 * Penggunaan:
 *   router.post('/', validate(mySchema), controller.create);
 *
 * Schema dapat memiliki property `body`, `query`, dan/atau `params`.
 * Jika parsing gagal, middleware melempar ValidationError dengan detail
 * field yang salah — tidak pernah lolos ke service.
 */

import type { Request, Response, NextFunction } from 'express';
import { type ZodTypeAny } from 'zod';
import { ValidationError } from '../utils/errors.js';

interface RequestSchemas {
  body?:   ZodTypeAny;
  query?:  ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Buat middleware validasi dari satu atau lebih Zod schema.
 *
 * @param schemas - Objek dengan key `body`, `query`, dan/atau `params`
 */
export const validate = (schemas: RequestSchemas) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: { field: string; issue: string }[] = [];

    const parts = ['body', 'query', 'params'] as const;
    for (const part of parts) {
      const schema = schemas[part];
      if (!schema) continue;

      const result = schema.safeParse(req[part]);
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            field: [part, ...issue.path].join('.'),
            issue: issue.message,
          });
        }
      } else {
        // Assign parsed (coerced/transformed) value kembali ke req
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any)[part] = result.data;
      }
    }

    if (errors.length > 0) {
      return next(
        new ValidationError('Validasi input gagal.', errors),
      );
    }

    next();
  };
};
