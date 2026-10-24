/**
 * dashboard.service.ts
 * Business logic untuk dashboard ringkasan (Fase 9).
 *
 * Referensi: SDD §3.9; SRS FR-43–FR-45, BR-11, BR-16, AC-17
 *
 * Catatan konvensi: nilai uang dikirim sebagai STRING desimal (utils/money.ts).
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db.js";
import {
  getStartOfDayJakarta,
  getEndOfDayJakarta,
  getStartOfMonthJakarta,
  getEndOfMonthJakarta,
} from "../../utils/date.js";
import { decimalToString } from "../../utils/money.js";
import { getTotalKewajibanPenitip } from "../consignment/consignment.service.js";
import type { DashboardSummaryQuery } from "./dashboard.schema.js";

interface PeriodSummary {
  omzet: string;
  profit: string;
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
  totalSaldoUtang: string;
  /**
   * Tahap 2 konsinyasi: jumlah saldo POSITIF seluruh penitip (termasuk yang
   * NONAKTIF) — kewajiban toko yang belum disetor.
   */
  totalKewajibanPenitip: string;
}

/**
 * Mendapatkan ringkasan dashboard: omzet/profit hari ini & bulan berjalan,
 * produk low-stock, dan total utang.
 *
 * Query dilakukan secara efisien dengan aggregate Prisma.
 * Referensi: FR-43, FR-44, FR-45, AC-17.
 */
export async function getDashboardSummary(
  _query: DashboardSummaryQuery = {},
): Promise<DashboardSummaryData> {
  // Rentang waktu hari ini & bulan berjalan (Asia/Jakarta → UTC)
  const todayStart = getStartOfDayJakarta();
  const todayEnd = getEndOfDayJakarta();
  const monthStart = getStartOfMonthJakarta();
  const monthEnd = getEndOfMonthJakarta();

  // ─── 1 & 2. Omzet & Profit hari ini dan bulan berjalan ──────────────────────
  const [hariIni, bulanBerjalan] = await Promise.all([
    calculatePeriodSummary(todayStart, todayEnd),
    calculatePeriodSummary(monthStart, monthEnd),
  ]);

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

  // ─── 5. Total kewajiban ke penitip (konsinyasi Tahap 2) ───────────────────────
  const totalKewajibanPenitip = await getTotalKewajibanPenitip();

  return {
    hariIni,
    bulanBerjalan,
    produkLowStock,
    totalSaldoUtang: decimalToString(utangAggregate._sum.sisaSaldoUtang) ?? "0.00",
    totalKewajibanPenitip,
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
  const where: Prisma.DetailTransactionWhereInput = {
    transaction: {
      statusTransaksi: "AKTIF", // KECUALIKAN yang dibatalkan (FR-39, BR-13)
      tanggal: {
        gte: start,
        lte: end,
      },
    },
  };

  const [omzetAggregate, details, transactionCount] = await Promise.all([
    // omzet = SUM(subtotal); dihitung di DB dengan Decimal
    prisma.detailTransaction.aggregate({
      where,
      _sum: { subtotal: true },
    }),
    // profit butuh snapshot harga per baris, bukan sekadar SUM kolom
    prisma.detailTransaction.findMany({
      where,
      select: {
        hargaJualSnapshot: true,
        hargaModalSnapshot: true,
        jumlah: true,
      },
    }),
    prisma.transaction.count({
      where: {
        statusTransaksi: "AKTIF",
        tanggal: {
          gte: start,
          lte: end,
        },
      },
    }),
  ]);

  const profitDecimal = details.reduce((sum, item) => {
    return sum.add(
      item.hargaJualSnapshot.sub(item.hargaModalSnapshot).mul(item.jumlah),
    );
  }, new Prisma.Decimal(0));

  return {
    omzet: decimalToString(omzetAggregate._sum.subtotal) ?? "0.00",
    profit: decimalToString(profitDecimal) ?? "0.00",
    transactionCount,
  };
}
