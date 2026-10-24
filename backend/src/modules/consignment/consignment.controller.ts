/**
 * modules/consignment/consignment.controller.ts
 * HTTP handlers untuk endpoint penitipan barang (konsinyasi).
 */

import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/response.js';
import * as consignmentService from './consignment.service.js';
import type {
  ListConsignorsQuery,
  ListMovementsQuery,
  ListConsignorPaymentsQuery,
  ConsignmentReportQuery,
} from './consignment.schema.js';

// ─── GET /consignors ──────────────────────────────────────────────────────────

export const listConsignors = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListConsignorsQuery;
  const result = await consignmentService.listConsignors(query);

  sendSuccess(res, 200, {
    data: result.data,
    pagination: result.pagination,
  });
});

// ─── GET /consignors/:id ──────────────────────────────────────────────────────

export const getConsignor = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const consignor = await consignmentService.getConsignorById(id);

  sendSuccess(res, 200, consignor);
});

// ─── POST /consignors ─────────────────────────────────────────────────────────

export const createConsignor = asyncHandler(async (req: Request, res: Response) => {
  const consignor = await consignmentService.createConsignor(req.body);

  sendSuccess(res, 201, consignor);
});

// ─── PUT /consignors/:id ──────────────────────────────────────────────────────

export const updateConsignor = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const consignor = await consignmentService.updateConsignor(id, req.body);

  sendSuccess(res, 200, consignor);
});

// ─── PATCH /consignors/:id/status ─────────────────────────────────────────────

export const updateConsignorStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const consignor = await consignmentService.updateConsignorStatus(id, req.body);

    sendSuccess(res, 200, consignor);
  },
);

// ─── POST /consignment/receipts ───────────────────────────────────────────────

export const createReceipt = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id; // dari auth middleware
  const movement = await consignmentService.createReceipt(req.body, userId);

  sendSuccess(res, 201, movement, 'Penerimaan titipan berhasil dicatat.');
});

// ─── POST /consignment/returns ────────────────────────────────────────────────

export const createReturn = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id; // dari auth middleware
  const movement = await consignmentService.createReturn(req.body, userId);

  sendSuccess(res, 201, movement, 'Retur titipan berhasil dicatat.');
});

// ─── GET /consignment/movements ───────────────────────────────────────────────

export const listMovements = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListMovementsQuery;
  const result = await consignmentService.listMovements(query);

  sendSuccess(res, 200, {
    data: result.data,
    pagination: result.pagination,
  });
});

// ─── GET /consignors/:id/balance (Tahap 2) ────────────────────────────────────

export const getConsignorBalance = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const balance = await consignmentService.getConsignorBalance(id);

    sendSuccess(res, 200, balance);
  },
);

// ─── GET /consignors/:id/payments (Tahap 2) ───────────────────────────────────

export const listConsignorPayments = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const query = req.query as unknown as ListConsignorPaymentsQuery;
    const result = await consignmentService.listConsignorPayments(id, query);

    const data = result.data.map((payment) => ({
      ...payment,
      jumlahBayar: payment.jumlahBayar.toString(),
      saldoSetelahBayar: payment.saldoSetelahBayar.toString(),
    }));

    sendSuccess(res, 200, {
      data,
      pagination: result.pagination,
    });
  },
);

// ─── POST /consignors/:id/payments (Tahap 2) ──────────────────────────────────

export const createConsignorPayment = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const userId = req.user!.id; // dari auth middleware

    const payment = await consignmentService.createConsignorPayment(
      id,
      req.body,
      userId,
    );

    sendSuccess(
      res,
      201,
      {
        ...payment,
        jumlahBayar: payment.jumlahBayar.toString(),
        saldoSetelahBayar: payment.saldoSetelahBayar.toString(),
      },
      'Setoran ke penitip berhasil dicatat.',
    );
  },
);

// ─── GET /reports/consignment (Tahap 2) ───────────────────────────────────────

export const getConsignmentReport = asyncHandler(
  async (req: Request, res: Response) => {
    const query = req.query as unknown as ConsignmentReportQuery;
    const data = await consignmentService.getConsignmentReport(query);

    sendSuccess(res, 200, data, 'Laporan konsinyasi berhasil dimuat');
  },
);
