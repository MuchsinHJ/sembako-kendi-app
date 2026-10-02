/**
 * modules/transaction/transaction.controller.ts
 * HTTP handlers untuk transaction endpoints.
 */

import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/response.js';
import * as transactionService from './transaction.service.js';
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
} from './transaction.schema.js';

// ─── POST /transactions ───────────────────────────────────────────────────────

export const createTransaction = asyncHandler(
  async (req: Request, res: Response) => {
    const input = req.body as CreateTransactionInput;
    const userId = req.user!.id; // User dari auth middleware

    const transaction = await transactionService.createTransaction(
      input,
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

// ─── GET /transactions ────────────────────────────────────────────────────────

export const listTransactions = asyncHandler(
  async (req: Request, res: Response) => {
    const query = req.query as unknown as ListTransactionsQuery;
    const result = await transactionService.listTransactions(query);

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
  },
);

// ─── GET /transactions/:id ────────────────────────────────────────────────────

export const getTransaction = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const transaction = await transactionService.getTransactionById(id);

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

    sendSuccess(res, 200, response);
  },
);

// ─── POST /transactions/:id/void ──────────────────────────────────────────────

export const voidTransaction = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const transaction = await transactionService.voidTransaction(id);

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

    sendSuccess(res, 200, response);
  },
);
