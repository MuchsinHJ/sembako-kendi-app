/**
 * export.service.ts
 * Service untuk ekspor laporan ke Excel & PDF (Fase 9).
 *
 * Referensi: SDD §3.10, Lampiran B; SRS FR-40–FR-42, IR-07–IR-09
 */

import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { format } from "date-fns";
import { formatRupiah } from "../../utils/money.js";
import type { Readable } from "stream";

interface SalesExportData {
  periode: { start: string; end: string };
  omzet: number;
  profit: number;
  transactionCount: number;
  transactions: Array<{
    id: string;
    tanggal: Date;
    total: number;
    statusPembayaran: string;
    namaPembeli: string | null;
  }>;
}

interface DebtExportData {
  periode: { start: string; end: string };
  totalSaldoUtang: number;
  debtCount: number;
  debts: Array<{
    id: string;
    tanggal: Date;
    total: number;
    namaPembeli: string;
    noHpPembeli: string | null;
    sisaSaldoUtang: number;
    payments: Array<{
      tanggalBayar: Date;
      jumlahBayar: number;
      saldoSetelahBayar: number;
    }>;
  }>;
}

/**
 * Ekspor laporan penjualan ke Excel (.xlsx).
 * Referensi: FR-40, FR-42, IR-07, IR-09.
 */
export async function exportSalesToExcel(
  data: SalesExportData,
): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Laporan Penjualan");

  // Metadata
  const now = new Date();
  const startDate = format(new Date(data.periode.start), "dd/MM/yyyy");
  const endDate = format(new Date(data.periode.end), "dd/MM/yyyy");
  const createdAt = format(now, "dd/MM/yyyy HH:mm");

  // Header
  worksheet.mergeCells("A1:E1");
  worksheet.getCell("A1").value = "LAPORAN PENJUALAN";
  worksheet.getCell("A1").font = { size: 16, bold: true };
  worksheet.getCell("A1").alignment = { horizontal: "center" };

  worksheet.mergeCells("A2:E2");
  worksheet.getCell("A2").value = `Periode: ${startDate} - ${endDate}`;
  worksheet.getCell("A2").alignment = { horizontal: "center" };

  worksheet.mergeCells("A3:E3");
  worksheet.getCell("A3").value = `Dibuat: ${createdAt}`;
  worksheet.getCell("A3").alignment = { horizontal: "center" };

  // Ringkasan
  worksheet.addRow([]);
  worksheet.addRow(["Total Omzet:", formatRupiah(data.omzet)]);
  worksheet.addRow(["Estimasi Profit:", formatRupiah(data.profit)]);
  worksheet.addRow(["Jumlah Transaksi:", data.transactionCount]);
  worksheet.addRow([]);

  // Tabel transaksi
  const headerRow = worksheet.addRow([
    "Tanggal",
    "ID Transaksi",
    "Total",
    "Status Pembayaran",
    "Nama Pembeli",
  ]);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  data.transactions.forEach((txn) => {
    worksheet.addRow([
      format(txn.tanggal, "dd/MM/yyyy HH:mm"),
      txn.id,
      formatRupiah(txn.total),
      txn.statusPembayaran,
      txn.namaPembeli ?? "-",
    ]);
  });

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    if (column) {
      column.width = 20;
    }
  });

  return await workbook.xlsx.writeBuffer();
}

/**
 * Ekspor laporan penjualan ke PDF.
 * Referensi: FR-40, FR-42, IR-08, IR-09.
 */
export function exportSalesToPDF(data: SalesExportData): Readable {
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  const now = new Date();
  const startDate = format(new Date(data.periode.start), "dd/MM/yyyy");
  const endDate = format(new Date(data.periode.end), "dd/MM/yyyy");
  const createdAt = format(now, "dd/MM/yyyy HH:mm");

  // Header
  doc.fontSize(18).text("LAPORAN PENJUALAN", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(12).text(`Periode: ${startDate} - ${endDate}`, { align: "center" });
  doc.fontSize(10).text(`Dibuat: ${createdAt}`, { align: "center" });
  doc.moveDown(1);

  // Ringkasan
  doc.fontSize(12).text(`Total Omzet: ${formatRupiah(data.omzet)}`);
  doc.text(`Estimasi Profit: ${formatRupiah(data.profit)}`);
  doc.text(`Jumlah Transaksi: ${data.transactionCount}`);
  doc.moveDown(1);

  // Tabel transaksi (simplified)
  doc.fontSize(10).text("Daftar Transaksi:", { underline: true });
  doc.moveDown(0.5);

  data.transactions.forEach((txn, idx) => {
    const tanggal = format(txn.tanggal, "dd/MM/yyyy HH:mm");
    const pembeli = txn.namaPembeli ?? "-";
    doc.text(
      `${idx + 1}. ${tanggal} | ${formatRupiah(txn.total)} | ${txn.statusPembayaran} | ${pembeli}`,
    );
  });

  doc.end();
  return doc;
}

/**
 * Ekspor laporan utang ke Excel (.xlsx).
 * Referensi: FR-41, FR-42, IR-07, IR-09.
 */
export async function exportDebtsToExcel(
  data: DebtExportData,
): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Laporan Utang");

  const now = new Date();
  const startDate = format(new Date(data.periode.start), "dd/MM/yyyy");
  const endDate = format(new Date(data.periode.end), "dd/MM/yyyy");
  const createdAt = format(now, "dd/MM/yyyy HH:mm");

  // Header
  worksheet.mergeCells("A1:F1");
  worksheet.getCell("A1").value = "LAPORAN UTANG";
  worksheet.getCell("A1").font = { size: 16, bold: true };
  worksheet.getCell("A1").alignment = { horizontal: "center" };

  worksheet.mergeCells("A2:F2");
  worksheet.getCell("A2").value = `Periode: ${startDate} - ${endDate}`;
  worksheet.getCell("A2").alignment = { horizontal: "center" };

  worksheet.mergeCells("A3:F3");
  worksheet.getCell("A3").value = `Dibuat: ${createdAt}`;
  worksheet.getCell("A3").alignment = { horizontal: "center" };

  // Ringkasan
  worksheet.addRow([]);
  worksheet.addRow(["Total Saldo Utang:", formatRupiah(data.totalSaldoUtang)]);
  worksheet.addRow(["Jumlah Utang:", data.debtCount]);
  worksheet.addRow([]);

  // Tabel utang
  const headerRow = worksheet.addRow([
    "Tanggal",
    "Nama Pembeli",
    "No HP",
    "Total",
    "Sisa Saldo",
    "Riwayat Cicilan",
  ]);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  data.debts.forEach((debt) => {
    const paymentHistory = debt.payments
      .map(
        (p) =>
          `${format(p.tanggalBayar, "dd/MM/yyyy")}: ${formatRupiah(p.jumlahBayar)}`,
      )
      .join("; ");

    worksheet.addRow([
      format(debt.tanggal, "dd/MM/yyyy HH:mm"),
      debt.namaPembeli,
      debt.noHpPembeli ?? "-",
      formatRupiah(debt.total),
      formatRupiah(debt.sisaSaldoUtang),
      paymentHistory || "-",
    ]);
  });

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    if (column) {
      column.width = 20;
    }
  });

  return await workbook.xlsx.writeBuffer();
}

/**
 * Ekspor laporan utang ke PDF.
 * Referensi: FR-41, FR-42, IR-08, IR-09.
 */
export function exportDebtsToPDF(data: DebtExportData): Readable {
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  const now = new Date();
  const startDate = format(new Date(data.periode.start), "dd/MM/yyyy");
  const endDate = format(new Date(data.periode.end), "dd/MM/yyyy");
  const createdAt = format(now, "dd/MM/yyyy HH:mm");

  // Header
  doc.fontSize(18).text("LAPORAN UTANG", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(12).text(`Periode: ${startDate} - ${endDate}`, { align: "center" });
  doc.fontSize(10).text(`Dibuat: ${createdAt}`, { align: "center" });
  doc.moveDown(1);

  // Ringkasan
  doc.fontSize(12).text(`Total Saldo Utang: ${formatRupiah(data.totalSaldoUtang)}`);
  doc.text(`Jumlah Utang: ${data.debtCount}`);
  doc.moveDown(1);

  // Daftar utang
  doc.fontSize(10).text("Daftar Utang:", { underline: true });
  doc.moveDown(0.5);

  data.debts.forEach((debt, idx) => {
    const tanggal = format(debt.tanggal, "dd/MM/yyyy");
    doc.text(
      `${idx + 1}. ${tanggal} | ${debt.namaPembeli} | ${formatRupiah(debt.total)} | Sisa: ${formatRupiah(debt.sisaSaldoUtang)}`,
    );

    if (debt.payments.length > 0) {
      doc.fontSize(9).text("   Riwayat Cicilan:", { indent: 20 });
      debt.payments.forEach((p) => {
        doc.text(
          `   - ${format(p.tanggalBayar, "dd/MM/yyyy")}: ${formatRupiah(p.jumlahBayar)}`,
          { indent: 20 },
        );
      });
      doc.fontSize(10);
    }
    doc.moveDown(0.5);
  });

  doc.end();
  return doc;
}
