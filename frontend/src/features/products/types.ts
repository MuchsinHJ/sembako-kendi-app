import type { z } from 'zod';
import { productFormSchema, statusProduk, stockAdjustSchema, tipeProduk } from './schemas';

export type ProductStatus = z.infer<typeof statusProduk>;
export type ProductTipe = z.infer<typeof tipeProduk>;
export type ProductFormValues = z.infer<typeof productFormSchema>;
export type StockAdjustValues = z.infer<typeof stockAdjustSchema>;

/** Response `GET /products/:id` & item `GET /products` (backend serialize). */
export interface Product {
  id: string;
  nama: string;
  kategori: string;
  hargaJual: string;
  hargaModal: string;
  stok: number;
  stokMinimum: number;
  status: ProductStatus;
  tipe: ProductTipe;
  consignorId: string | null;
  consignor: { id: string; nama: string } | null;
  fotoKey: string | null;
  fotoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListResult {
  data: Product[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export type StatusFilter = 'SEMUA' | ProductStatus;
export type TipeFilter = 'SEMUA' | ProductTipe;

export interface ProductFilters {
  search?: string;
  status?: StatusFilter;
  tipe?: TipeFilter;
  /** Filter titipan per penitip (backend `GET /products?consignorId=`). */
  consignorId?: string;
  /** Batas halaman (default backend 20; POS minta 100). */
  limit?: number;
}

export type ProductPayload = Pick<
  ProductFormValues,
  'nama' | 'kategori' | 'hargaJual' | 'hargaModal' | 'tipe' | 'consignorId'
> & { stok: number; stokMinimum: number };

export type UpdateProductPayload = Omit<ProductPayload, 'stok'>;

export interface ConsignorOption {
  id: string;
  nama: string;
}
