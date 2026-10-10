/**
 * modules/debt/debt.controller.ts
 * HTTP handlers untuk debt endpoints.
 */

import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/response.js';
import * as debtService from './debt.service.js';
import type { ListDebtsQuery, RecordPaymentInput } from './debt.schema.js';

// ─── GET /debts ───────────────────────────────────────────────────────────────

export const listDebts = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListDebtsQuery;
  const result = await debtService.listDebts(query);

  // Convert Decimal to string untuk response
  const data = result.data.map((t) => ({
    ...t,
    total: t.total.toString(),
    sisaSaldoUtang: t.sisaSaldoUtang?.toString() || null,
    items: t.items.map((item) => ({
      ...item,
      hargaJualSnapshot: item.hargaJualSnapshot.toString(),
      hargaModalSnapshot: item.hargaModalSnapshot.toString(),
      subtotal: item.subtotal.toString(),
      product: {
        ...item.product,
        hargaJual: item.product.hargaJual.toString(),
        hargaModal: item.product.hargaModal.toString(),
      },
    })),
    payments: t.payments.map((payment) => ({
      ...payment,
      jumlahBayar: payment.jumlahBayar.toString(),
      saldoSetelahBayar: payment.saldoSetelahBayar.toString(),
    })),
  }));

  sendSuccess(res, 200, {
    data,
    pagination: result.pagination,
  });
});

// ─── GET /debts/:transactionId/payments ───────────────────────────────────────

export const getPaymentHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const { transactionId } = req.params as { transactionId: string };
    const payments = await debtService.getPaymentHistory(transactionId);

    // Convert Decimal to string untuk response
    const data = payments.map((payment) => ({
      ...payment,
      jumlahBayar: payment.jumlahBayar.toString(),
      saldoSetelahBayar: payment.saldoSetelahBayar.toString(),
    }));

    sendSuccess(res, 200, data);
  },
);

// ─── POST /debts/:transactionId/payments ──────────────────────────────────────

export const recordPayment = asyncHandler(
  async (req: Request, res: Response) => {
    const { transactionId } = req.params as { transactionId: string };
    const { jumlahBayar } = req.body as RecordPaymentInput;
    const userId = req.user!.id; // User dari auth middleware

    const transaction = await debtService.recordPayment(
      transactionId,
      jumlahBayar,
      userId,
    );

    // Convert Decimal to string untuk response
    const response = {
      ...transaction,
      total: transaction.total.toString(),
      sisaSaldoUtang: transaction.sisaSaldoUtang?.toString() || null,
      items: transaction.items.map((item) => ({
        ...item,
        hargaJualSnapshot: item.hargaJualSnapshot.toString(),
        hargaModalSnapshot: item.hargaModalSnapshot.toString(),
        subtotal: item.subtotal.toString(),
        product: {
          ...item.product,
          hargaJual: item.product.hargaJual.toString(),
          hargaModal: item.product.hargaModal.toString(),
        },
      })),
      payments: transaction.payments.map((payment) => ({
        ...payment,
        jumlahBayar: payment.jumlahBayar.toString(),
        saldoSetelahBayar: payment.saldoSetelahBayar.toString(),
      })),
    };

    sendSuccess(res, 201, response);
  },
);
