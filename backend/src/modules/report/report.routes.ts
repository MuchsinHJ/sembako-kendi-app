/**
 * report.routes.ts
 * Routing untuk modul report & export (Fase 9).
 *
 * Referensi: SDD §5.8
 */

import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { reportQuerySchema, exportQuerySchema } from "./report.schema.js";
import { consignmentReportQuerySchema } from "../consignment/consignment.schema.js";
import {
  getSales,
  getDebts,
  getProductTrend,
  getConsignment,
  exportSales,
  exportDebts,
} from "./report.controller.js";

const router = Router();

/**
 * GET /reports/sales
 * Laporan penjualan (omzet, profit, daftar transaksi).
 * Referensi: FR-35, FR-36, FR-39, AC-13.
 */
router.get(
  "/sales",
  authenticate,
  validate({ query: reportQuerySchema }),
  getSales,
);

/**
 * GET /reports/debts
 * Laporan utang (daftar utang dengan riwayat cicilan).
 * Referensi: FR-37, AC-14.
 */
router.get(
  "/debts",
  authenticate,
  validate({ query: reportQuerySchema }),
  getDebts,
);

/**
 * GET /reports/product-trend
 * Tren produk terlaris (minimal 5 produk).
 * Referensi: FR-38, AC-16.
 */
router.get(
  "/product-trend",
  authenticate,
  validate({ query: reportQuerySchema }),
  getProductTrend,
);

/**
 * GET /reports/consignment
 * Laporan konsinyasi per penitip (modal, setoran, saldo).
 * Referensi: Fitur Penitipan Barang Tahap 2.
 */
router.get(
  "/consignment",
  authenticate,
  validate({ query: consignmentReportQuerySchema }),
  getConsignment,
);

/**
 * GET /reports/sales/export
 * Ekspor laporan penjualan ke Excel atau PDF.
 * Referensi: FR-40, FR-42.
 */
router.get(
  "/sales/export",
  authenticate,
  validate({ query: exportQuerySchema }),
  exportSales,
);

/**
 * GET /reports/debts/export
 * Ekspor laporan utang ke Excel atau PDF.
 * Referensi: FR-41, FR-42.
 */
router.get(
  "/debts/export",
  authenticate,
  validate({ query: exportQuerySchema }),
  exportDebts,
);

export default router;
