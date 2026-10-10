/**
 * report.schema.ts
 * Validasi input untuk endpoint report (Fase 9).
 *
 * Referensi: SDD §3.10, §5.8; SRS FR-35–FR-42, AC-13–AC-16
 */

import { z } from "zod";

/**
 * Schema untuk query parameter laporan (sales, debts, product-trend).
 * Start dan end wajib diisi (FR-35, FR-37, FR-38).
 */
export const reportQuerySchema = z
  .object({
    // Menerima baik format tanggal saja "2026-10-01" maupun "2026-10-01T00:00:00Z"
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message:
        "Format startDate harus berupa tanggal yang valid (mis. YYYY-MM-DD atau ISO 8601)",
    }),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message:
        "Format endDate harus berupa tanggal yang valid (mis. YYYY-MM-DD atau ISO 8601)",
    }),
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: "startDate harus sebelum atau sama dengan endDate",
    path: ["startDate"],
  });

export type ReportQuery = z.infer<typeof reportQuerySchema>;

/**
 * Schema untuk query parameter export.
 * Format wajib diisi: xlsx atau pdf (FR-40, FR-41).
 */
export const exportQuerySchema = reportQuerySchema.extend({
  format: z.enum(["xlsx", "pdf"], {
    message: "Format harus 'xlsx' atau 'pdf'",
  }),
});

export type ExportQuery = z.infer<typeof exportQuerySchema>;
