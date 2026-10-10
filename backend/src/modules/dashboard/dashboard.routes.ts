/**
 * dashboard.routes.ts
 * Routing untuk modul dashboard (Fase 9).
 *
 * Referensi: SDD §5.7
 */

import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.js";
import { dashboardSummaryQuerySchema } from "./dashboard.schema.js";
import { getSummary } from "./dashboard.controller.js";

const router = Router();

/**
 * GET /dashboard/summary
 * Ringkasan dashboard (omzet/profit, low-stock, total utang).
 * Referensi: FR-43–FR-45, AC-17.
 */
router.get(
  "/summary",
  authenticate,
  validate({ query: dashboardSummaryQuerySchema }),
  getSummary,
);

export default router;
