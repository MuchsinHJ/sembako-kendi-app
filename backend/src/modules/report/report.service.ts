/**
 * report.service.ts
 * Business logic untuk laporan & tren produk (Fase 9).
 *
 * Referensi: SDD §3.10; SRS FR-35–FR-42, BR-11, BR-16, AC-13–AC-16
 *
 * Catatan konvensi: seluruh nilai uang pada response JSON dikirim sebagai
 * STRING desimal (2 angka desimal) — lihat utils/money.ts & SDD §5.1.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db.js";
import { decimalToString } from "../../utils/money.js";
import type { ReportQuery } from "./report.schema.js";

interface SalesReportData {
  periode: {
    start: string;
    end: string;
  };
  omzet: string;
  profit: string;
  transactionCount: number;
  transactions: Array<{
    id: string;
    tanggal: Date;
    total: string;
    statusPembayaran: string;
    namaPembeli: string | null;
  }>;
}

interface DebtReportData {
  periode: {
    start: string;
    end: string;
  };
  totalSaldoUtang: string;
  debtCount: number;
  debts: Array<{
    id: string;
    tanggal: Date;
    total: string;
    namaPembeli: string;
    noHpPembeli: string | null;
    sisaSaldoUtang: string;
    payments: Array<{
      id: string;
      tanggalBayar: Date;
      jumlahBayar: string;
      saldoSetelahBayar: string;
    }>;
  }>;
}

interface ProductTrendData {
  periode: {
    start: string;
    end: string;
  };
  topProducts: Array<{
    productId: string;
    namaProduk: string;
    kategori: string;
    totalQuantitySold: number;
    totalRevenue: string;
  }>;
}

/**
 * Laporan penjualan: omzet, profit, dan daftar transaksi.
 * Hanya transaksi AKTIF (bukan DIBATALKAN).
 *
 * Referensi: FR-35, FR-36, FR-39, AC-13.
 */
export async function getSalesReport(
  query: ReportQuery,
): Promise<SalesReportData> {
  const start = new Date(query.startDate);
  const end = new Date(query.endDate);

  // Fetch transaksi aktif dalam periode
  const transactionsRaw = await prisma.transaction.findMany({
    where: {
      statusTransaksi: "AKTIF", // KECUALIKAN DIBATALKAN (FR-39, BR-13)
      tanggal: {
        gte: start,
        lte: end,
      },
    },
    select: {
      id: true,
      tanggal: true,
      total: true,
      statusPembayaran: true,
      namaPembeli: true,
    },
    orderBy: { tanggal: "desc" },
  });

  // Transform Decimal to string (konvensi response JSON)
  const transactions = transactionsRaw.map((t) => ({
    id: t.id,
    tanggal: t.tanggal,
    total: decimalToString(t.total) ?? "0.00",
    statusPembayaran: t.statusPembayaran,
    namaPembeli: t.namaPembeli,
  }));

  // Hitung omzet = SUM(total) dengan Decimal agar presisi terjaga
  const omzetDecimal = transactionsRaw.reduce(
    (sum, t) => sum.add(t.total),
    new Prisma.Decimal(0),
  );

  // Hitung profit dari DetailTransaction
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

  const profitDecimal = details.reduce((sum, item) => {
    const itemProfit = item.hargaJualSnapshot
      .sub(item.hargaModalSnapshot)
      .mul(item.jumlah);
    return sum.add(itemProfit);
  }, new Prisma.Decimal(0));

  return {
    periode: {
      start: query.startDate,
      end: query.endDate,
    },
    omzet: decimalToString(omzetDecimal) ?? "0.00",
    profit: decimalToString(profitDecimal) ?? "0.00",
    transactionCount: transactions.length,
    transactions,
  };
}

/**
 * Laporan utang: daftar transaksi utang dengan riwayat cicilan.
 *
 * Referensi: FR-37, AC-14.
 */
export async function getDebtsReport(
  query: ReportQuery,
): Promise<DebtReportData> {
  const start = new Date(query.startDate);
  const end = new Date(query.endDate);

  // Fetch transaksi utang dalam periode (dengan sisa saldo > 0)
  const debts = await prisma.transaction.findMany({
    where: {
      statusPembayaran: "UTANG",
      statusTransaksi: "AKTIF",
      tanggal: {
        gte: start,
        lte: end,
      },
      sisaSaldoUtang: {
        gt: 0,
      },
    },
    select: {
      id: true,
      tanggal: true,
      total: true,
      namaPembeli: true,
      noHpPembeli: true,
      sisaSaldoUtang: true,
      payments: {
        select: {
          id: true,
          tanggalBayar: true,
          jumlahBayar: true,
          saldoSetelahBayar: true,
        },
        orderBy: { tanggalBayar: "asc" },
      },
    },
    orderBy: { tanggal: "desc" },
  });

  // Hitung total saldo utang dengan Decimal
  const totalSaldoUtangDecimal = debts.reduce(
    (sum, d) => sum.add(d.sisaSaldoUtang ?? 0),
    new Prisma.Decimal(0),
  );

  // Transform data
  const transformedDebts = debts.map((d) => ({
    id: d.id,
    tanggal: d.tanggal,
    total: decimalToString(d.total) ?? "0.00",
    namaPembeli: d.namaPembeli!,
    noHpPembeli: d.noHpPembeli,
    sisaSaldoUtang: decimalToString(d.sisaSaldoUtang) ?? "0.00",
    payments: d.payments.map((p) => ({
      id: p.id,
      tanggalBayar: p.tanggalBayar,
      jumlahBayar: decimalToString(p.jumlahBayar) ?? "0.00",
      saldoSetelahBayar: decimalToString(p.saldoSetelahBayar) ?? "0.00",
    })),
  }));

  return {
    periode: {
      start: query.startDate,
      end: query.endDate,
    },
    totalSaldoUtang: decimalToString(totalSaldoUtangDecimal) ?? "0.00",
    debtCount: debts.length,
    debts: transformedDebts,
  };
}

/**
 * Tren produk: minimal 5 produk terlaris dalam periode.
 * Diurutkan berdasarkan jumlah unit terjual (descending).
 *
 * Referensi: FR-38, AC-16.
 */
export async function getProductTrend(
  query: ReportQuery,
): Promise<ProductTrendData> {
  const start = new Date(query.startDate);
  const end = new Date(query.endDate);

  // Aggregate per produk: SUM(jumlah), SUM(subtotal)
  const trendData = await prisma.detailTransaction.groupBy({
    by: ["productId"],
    where: {
      transaction: {
        statusTransaksi: "AKTIF",
        tanggal: {
          gte: start,
          lte: end,
        },
      },
    },
    _sum: {
      jumlah: true,
      subtotal: true,
    },
    orderBy: {
      _sum: {
        jumlah: "desc",
      },
    },
    take: 10, // ambil lebih banyak untuk antisipasi produk dihapus
  });

  // Fetch detail produk
  const productIds = trendData.map((t) => t.productId);
  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
    select: {
      id: true,
      nama: true,
      kategori: true,
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  // Gabungkan data
  const topProducts = trendData
    .map((t) => {
      const product = productMap.get(t.productId);
      if (!product) return null; // produk sudah dihapus

      return {
        productId: t.productId,
        namaProduk: product.nama,
        kategori: product.kategori,
        totalQuantitySold: t._sum.jumlah ?? 0,
        totalRevenue: decimalToString(t._sum.subtotal) ?? "0.00",
      };
    })
    .filter((p) => p !== null)
    .slice(0, 5); // minimal 5 produk (FR-38)

  return {
    periode: {
      start: query.startDate,
      end: query.endDate,
    },
    topProducts,
  };
}
