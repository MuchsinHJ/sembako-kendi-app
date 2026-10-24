/**
 * dashboard.schema.ts
 * Validasi input untuk endpoint dashboard (Fase 9).
 *
 * Referensi: SDD §3.9, §5.7; SRS FR-43–FR-45, AC-17
 *
 * Catatan: SDD §5.7 mendefinisikan `GET /dashboard/summary` sebagai ringkasan
 * "periode berjalan" (hari ini & bulan berjalan) tanpa parameter periode.
 * Karena itu tidak ada query parameter yang diterima — parameter tambahan
 * diabaikan oleh Express, bukan divalidasi.
 */

import { z } from "zod";

/** Query dashboard summary: tidak ada parameter yang didukung di MVP. */
export const dashboardSummaryQuerySchema = z.object({});

export type DashboardSummaryQuery = z.infer<
  typeof dashboardSummaryQuerySchema
>;
