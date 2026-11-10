import type { z } from 'zod';
import { consignorStatus, movementTipe } from './schemas';
import type { Product } from '@/features/products/types';

export type ConsignorStatus = z.infer<typeof consignorStatus>;
export type MovementTipe = z.infer<typeof movementTipe>;

/** `GET /consignors` — item daftar penitip. */
export interface Consignor {
  id: string;
  nama: string;
  noHp: string | null;
  catatan: string | null;
  status: ConsignorStatus;
  createdAt: string;
  updatedAt: string;
}

/** `GET /consignors/:id` — penitip + ringkasan produk titipan. */
export interface ConsignorDetail extends Consignor {
  ringkasan: {
    jumlahProdukTitipanAktif: number;
    totalStokTitipan: number;
  };
}

/** `GET /consignors/:id/balance` — saldo all-time (boleh negatif, BR-F). */
export interface ConsignorBalance {
  consignorId: string;
  totalTerjualModal: string;
  totalDisetor: string;
  saldo: string;
}

/** Baris setoran (ConsignorPayment serialized). */
export interface ConsignorPayment {
  id: string;
  consignorId: string;
  tanggalBayar: string;
  jumlahBayar: string;
  saldoSetelahBayar: string;
  catatan: string | null;
  dicatatOlehId: string;
  dicatatOleh: { id: string; nama: string; email: string };
}

/** Baris pergerakan titipan (Terima / Retur). */
export interface ConsignmentMovement {
  id: string;
  consignorId: string;
  productId: string;
  tipe: MovementTipe;
  jumlah: number;
  stokSebelum: number;
  stokSesudah: number;
  catatan: string | null;
  dicatatOlehId: string;
  dicatatOleh: { id: string; nama: string; email: string };
  createdAt: string;
  product: Pick<Product, 'id' | 'nama' | 'tipe' | 'stok'>;
  consignor: { id: string; nama: string };
}

export interface PagedResult<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/** `consignorId` opsional (null → filter Semua). */
export type MovementFilter = 'SEMUA' | MovementTipe;

export interface ConsignorFilters {
  status?: ConsignorStatus;
  search?: string;
  /** `punyaSaldo=true` → hanya penitip dengan saldo ≠ 0 (termasuk negatif). */
  punyaSaldo?: boolean;
}

/** `GET /reports/consignment` — laporan per penitip (Tahap 2). */
export interface ConsignmentReportRow {
  consignorId: string;
  nama: string;
  status: ConsignorStatus;
  terjualPeriode: string;
  modalPeriode: string;
  disetorPeriode: string;
  saldoAkhir: string;
}

export interface ConsignmentReport {
  periode: { start: string; end: string };
  totalModalPeriode: string;
  totalDisetorPeriode: string;
  totalSaldoAkhir: string;
  consignors: ConsignmentReportRow[];
}
