/**
 * dashboard.controller.ts
 * HTTP handlers untuk endpoint dashboard (Fase 9).
 *
 * Referensi: SDD §3.9, §5.7
 */

import type { Request, Response, NextFunction } from "express";
import { getDashboardSummary } from "./dashboard.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import type { DashboardSummaryQuery } from "./dashboard.schema.js";

/**
 * GET /dashboard/summary
 * Mengembalikan ringkasan dashboard: omzet/profit hari ini & bulan berjalan,
 * produk low-stock, total saldo utang.
 *
 * Referensi: FR-43, FR-44, FR-45, AC-17.
 */
export const getSummary = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const query = req.query as DashboardSummaryQuery;
    const data = await getDashboardSummary(query);

    res.json({
      success: true,
      data,
      message: "Dashboard summary berhasil dimuat",
    });
  },
);
