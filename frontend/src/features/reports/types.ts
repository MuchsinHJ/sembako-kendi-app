/** Tipe respons modul laporan (backend `modules/report`, SDD §5.8). */

export interface ReportPeriode {
  start: string;
  end: string;
}

export interface SalesReport {
  periode: ReportPeriode;
  omzet: string;
  profit: string;
  transactionCount: number;
  perTipe: {
    MILIK_SENDIRI: { omzet: string; profit: string };
    TITIPAN: { omzet: string; profit: string };
  };
  transactions: Array<{
    id: string;
    tanggal: string;
    total: string;
    statusPembayaran: string;
    namaPembeli: string | null;
  }>;
}

export interface DebtReport {
  periode: ReportPeriode;
  totalSaldoUtang: string;
  debtCount: number;
  debts: Array<{
    id: string;
    tanggal: string;
    total: string;
    namaPembeli: string;
    noHpPembeli: string | null;
    sisaSaldoUtang: string;
    payments: Array<{
      id: string;
      tanggalBayar: string;
      jumlahBayar: string;
      saldoSetelahBayar: string;
    }>;
  }>;
}

export interface ProductTrend {
  periode: ReportPeriode;
  topProducts: Array<{
    productId: string;
    namaProduk: string;
    kategori: string;
    totalQuantitySold: number;
    totalRevenue: string;
  }>;
}

export interface ReportRange {
  startDate: string;
  endDate: string;
}
