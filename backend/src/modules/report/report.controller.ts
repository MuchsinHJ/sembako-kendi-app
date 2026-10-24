/**
 * report.controller.ts
 * HTTP handlers untuk endpoint report & export (Fase 9).
 *
 * Referensi: SDD §3.10, §5.8
 */

import type { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { sendSuccess } from "../../utils/response.js";
import type { ReportQuery, ExportQuery } from "./report.schema.js";
import type { ConsignmentReportQuery } from "../consignment/consignment.schema.js";
import {
  getSalesReport,
  getDebtsReport,
  getProductTrend as getProductTrendService,
} from "./report.service.js";
import { getConsignmentReport as getConsignmentReportService } from "../consignment/consignment.service.js";
import {
  exportSalesToExcel,
  exportSalesToPDF,
  exportDebtsToExcel,
  exportDebtsToPDF,
} from "./export.service.js";
import { format } from "date-fns";

/**
 * GET /reports/sales
 * Laporan penjualan (omzet, profit, daftar transaksi).
 * Referensi: FR-35, FR-36, FR-39, AC-13.
 */
export const getSales = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const query = req.query as ReportQuery;
    const data = await getSalesReport(query);

    sendSuccess(res, 200, data, "Laporan penjualan berhasil dimuat");
  },
);

/**
 * GET /reports/debts
 * Laporan utang (daftar utang dengan riwayat cicilan).
 * Referensi: FR-37, AC-14.
 */
export const getDebts = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const query = req.query as ReportQuery;
    const data = await getDebtsReport(query);

    sendSuccess(res, 200, data, "Laporan utang berhasil dimuat");
  },
);

/**
 * GET /reports/product-trend
 * Tren produk terlaris (minimal 5 produk).
 * Referensi: FR-38, AC-16.
 */
export const getProductTrend = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const query = req.query as ReportQuery;
    const data = await getProductTrendService(query);

    sendSuccess(res, 200, data, "Tren produk berhasil dimuat");
  },
);

/**
 * GET /reports/consignment
 * Laporan konsinyasi per penitip dalam periode.
 *
 * Catatan: service-nya berada di modul `consignment` karena seluruh logika
 * kewajiban penitip terpusat di sana; route tetap di bawah `/reports` sesuai
 * kontrak fitur.
 */
export const getConsignment = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const query = req.query as unknown as ConsignmentReportQuery;
    const data = await getConsignmentReportService(query);

    sendSuccess(res, 200, data, "Laporan konsinyasi berhasil dimuat");
  },
);

/**
 * GET /reports/sales/export
 * Ekspor laporan penjualan ke Excel atau PDF.
 * Referensi: FR-40, FR-42, IR-07–IR-09.
 */
export const exportSales = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const query = req.query as ExportQuery;
    const data = await getSalesReport(query);

    const startDate = format(new Date(query.startDate), "yyyyMMdd");
    const endDate = format(new Date(query.endDate), "yyyyMMdd");
    const filename = `laporan-penjualan_${startDate}_${endDate}`;

    if (query.format === "xlsx") {
      const buffer = await exportSalesToExcel(data);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}.xlsx"`,
      );
      res.send(buffer);
    } else {
      // PDF
      const stream = exportSalesToPDF(data);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}.pdf"`,
      );
      stream.pipe(res);
    }
  },
);

/**
 * GET /reports/debts/export
 * Ekspor laporan utang ke Excel atau PDF.
 * Referensi: FR-41, FR-42, IR-07–IR-09.
 */
export const exportDebts = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const query = req.query as ExportQuery;
    const data = await getDebtsReport(query);

    const startDate = format(new Date(query.startDate), "yyyyMMdd");
    const endDate = format(new Date(query.endDate), "yyyyMMdd");
    const filename = `laporan-utang_${startDate}_${endDate}`;

    if (query.format === "xlsx") {
      const buffer = await exportDebtsToExcel(data);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}.xlsx"`,
      );
      res.send(buffer);
    } else {
      // PDF
      const stream = exportDebtsToPDF(data);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}.pdf"`,
      );
      stream.pipe(res);
    }
  },
);
