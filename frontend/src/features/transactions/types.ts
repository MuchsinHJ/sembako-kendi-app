import type { z } from 'zod';
import { statusPembayaran, statusTransaksi } from './schemas';
import type { Product } from '@/features/products/types';

export type PaymentStatus = z.infer<typeof statusPembayaran>;
export type TransactionStatus = z.infer<typeof statusTransaksi>;

/** Item transaksi (snapshot + relasi produk serialized). */
export interface TransactionItem {
  id: string;
  transactionId: string;
  productId: string;
  namaProdukSnapshot: string;
  hargaJualSnapshot: string;
  hargaModalSnapshot: string;
  jumlah: number;
  subtotal: string;
  product: Product;
}

/** Cicilan (PaymentHistory). */
export interface Payment {
  id: string;
  transactionId: string;
  tanggalBayar: string;
  jumlahBayar: string;
  saldoSetelahBayar: string;
  dicatatOlehId: string;
  dicatatOleh: { id: string; nama: string; email: string };
}

export interface Transaction {
  id: string;
  tanggal: string;
  total: string;
  uangDiterima: string | null;
  kembalian: string | null;
  statusPembayaran: PaymentStatus;
  statusTransaksi: TransactionStatus;
  namaPembeli: string | null;
  noHpPembeli: string | null;
  sisaSaldoUtang: string | null;
  dibuatOlehId: string;
  dibuatOleh: { id: string; nama: string; email: string };
  dibatalkanPada: string | null;
  createdAt: string;
  items: TransactionItem[];
  payments: Payment[];
}

export interface PagedResult<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  statusPembayaran?: PaymentStatus;
  statusTransaksi?: TransactionStatus;
}

/** Item keranjang POS: produk + jumlah. */
export interface CartItem {
  product: Product;
  qty: number;
}
