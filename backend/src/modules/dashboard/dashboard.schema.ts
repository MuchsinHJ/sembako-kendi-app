/**
 * dashboard.schema.ts
 * Validasi input untuk endpoint dashboard (Fase 9).
 *
 * Referensi: SDD §3.9, §5.7; SRS FR-43–FR-45, AC-17
 */

import { z } from "zod";

/**
 * Schema untuk query parameter pada dashboard summary.
 * Opsional: periode dapat dispesifikasi, default ke hari ini dan bulan berjalan.
 */
export const dashboardSummaryQuerySchema = z.object({
  // Periode untuk perhitungan omzet & profit (opsional)
  // Jika tidak diisi, backend gunakan default:
  // - hariIni: 00:00 s/d 23:59 hari ini
  // - bulanBerjalan: awal bulan s/d akhir bulan
  period: z
    .enum(["today", "this_month", "custom"])
    .optional()
    .default("today"),

  // Untuk custom period
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type DashboardSummaryQuery = z.infer<
  typeof dashboardSummaryQuerySchema
>;
