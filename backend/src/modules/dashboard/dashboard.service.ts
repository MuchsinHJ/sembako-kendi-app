/**
 * dashboard.service.ts
 * Business logic untuk dashboard ringkasan (Fase 9).
 *
 * Referensi: SDD §3.9; SRS FR-43–FR-45, BR-11, BR-16, AC-17
 */

import { prisma } from "../../config/db.js";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { DashboardSummaryQuery } from "./dashboard.schema.js";

const TIMEZONE = "Asia/Jakarta";

interface PeriodSummary {
  omzet: number;
  profit: number;
  transactionCount: number;
}

interface LowStockProduct {
  id: string;
  nama: string;
  stok: number;
  stokMinimum: number;
  kategori: string;
}

interface DashboardSummaryData {
  hariIni: PeriodSummary;
  bulanBerjalan: PeriodSummary;
  produkLowStock: LowStockProduct[];
  totalSaldoUtang: number;
}

/**
 * Mendapatkan ringkasan dashboard: omzet/profit hari ini & bulan berjalan,
 * produk low-stock, dan total utang.
 *
 * Query dilakukan secara efisien dengan aggregate Prisma.
 * Referensi: FR-43, FR-44, FR-45, AC-17.
 */
export async function getDashboardSummary(
  query: DashboardSummaryQuery,
): Promise<DashboardSummaryData> {
  const now = toZonedTime(new Date(), TIMEZONE);

  // Rentang waktu hari ini (Asia/Jakarta)
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  // Rentang waktu bulan berjalan (Asia/Jakarta)
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // ─── 1. Omzet & Profit Hari Ini ──────────────────────────────────────────────
  const hariIni = await calculatePeriodSummary(todayStart, todayEnd);

  // ─── 2. Omzet & Profit Bulan Berjalan ────────────────────────────────────────
  const bulanBerjalan = await calculatePeriodSummary(monthStart, monthEnd);

  // ─── 3. Produk Low-Stock (stok <= stokMinimum) ────────────────────────────────
  // Referensi: FR-14, BR-15
  const produkLowStock = await prisma.product.findMany({
    where: {
      status: "AKTIF",
      stok: {
        lte: prisma.product.fields.stokMinimum, // stok <= stokMinimum
      },
    },
    select: {
      id: true,
      nama: true,
      stok: true,
      stokMinimum: true,
      kategori: true,
    },
    orderBy: [
      { stok: "asc" }, // produk dengan stok terendah di atas
      { nama: "asc" },
    ],
    take: 20, // batasi untuk performa UI
  });

  // ─── 4. Total Saldo Utang Belum Lunas ─────────────────────────────────────────
  // Referensi: FR-45
  const utangAggregate = await prisma.transaction.aggregate({
    where: {
      statusPembayaran: "UTANG",
      statusTransaksi: "AKTIF", // hanya transaksi aktif
      sisaSaldoUtang: {
        gt: 0,
      },
    },
    _sum: {
      sisaSaldoUtang: true,
    },
  });

  const totalSaldoUtang = Number(utangAggregate._sum.sisaSaldoUtang ?? 0);

  return {
    hariIni,
    bulanBerjalan,
    produkLowStock,
    totalSaldoUtang,
  };
}

/**
 * Menghitung omzet, profit, dan jumlah transaksi untuk periode tertentu.
 * Hanya menghitung transaksi AKTIF (bukan DIBATALKAN).
 *
 * Profit = SUM((hargaJualSnapshot - hargaModalSnapshot) × jumlah)
 * Referensi: BR-11, FR-36, FR-39, AC-09.
 */
async function calculatePeriodSummary(
  start: Date,
  end: Date,
): Promise<PeriodSummary> {
  // Aggregate dari DetailTransaction untuk perhitungan profit
  // Karena snapshot harga ada di DetailTransaction, bukan Transaction
  const result = await prisma.detailTransaction.aggregate({
    where: {
      transaction: {
        statusTransaksi: "AKTIF", // KECUALIKAN yang dibatalkan (FR-39, BR-13)
        tanggal: {
          gte: start,
          lte: end,
        },
      },
    },
    _sum: {
      subtotal: true, // omzet = SUM(subtotal)
    },
  });

  const omzet = Number(result._sum.subtotal ?? 0);

  // Hitung profit: SUM((hargaJualSnapshot - hargaModalSnapshot) × jumlah)
  // Tidak bisa dilakukan langsung dengan aggregate, perlu raw query atau fetch detail
  const details = await prisma.detailTransaction.findMany({
    where: {
      transaction: {
        statusTransaksi: "AKTIF",
        tanggal: {
          gte: start,
          lte: end,
        },
      },
    },
    select: {
      hargaJualSnapshot: true,
      hargaModalSnapshot: true,
      jumlah: true,
    },
  });

  const profit = details.reduce((sum, item) => {
    const itemProfit =
      (Number(item.hargaJualSnapshot) - Number(item.hargaModalSnapshot)) *
      item.jumlah;
    return sum + itemProfit;
  }, 0);

  // Hitung jumlah transaksi
  const transactionCount = await prisma.transaction.count({
    where: {
      statusTransaksi: "AKTIF",
      tanggal: {
        gte: start,
        lte: end,
      },
    },
  });

  return {
    omzet,
    profit,
    transactionCount,
  };
}
