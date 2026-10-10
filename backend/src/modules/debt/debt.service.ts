/**
 * modules/debt/debt.service.ts
 * Business logic untuk manajemen utang dan cicilan.
 * BR-14: Pelunasan utang dengan validasi overpayment
 * SDD 4.6: Row-level locking dengan SELECT FOR UPDATE untuk concurrency safety
 */

import { Prisma, PaymentStatus, TransactionStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../../config/db.js";
import {
  NotFoundError,
  ValidationError,
  BusinessRuleError,
  DebtOverpaymentError,
} from "../../utils/errors.js";
import type { ListDebtsQuery } from "./debt.schema.js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Transaction dengan relasi untuk debt list
type DebtTransactionWithRelations = Prisma.TransactionGetPayload<{
  include: {
    items: {
      include: {
        product: true;
      };
    };
    payments: {
      include: {
        dicatatOleh: {
          select: {
            id: true;
            nama: true;
            email: true;
          };
        };
      };
    };
    dibuatOleh: {
      select: {
        id: true;
        nama: true;
        email: true;
      };
    };
  };
}>;

// Payment history dengan relasi
type PaymentWithRelations = Prisma.PaymentHistoryGetPayload<{
  include: {
    dicatatOleh: {
      select: {
        id: true;
        nama: true;
        email: true;
      };
    };
  };
}>;

// ─── List Debts ───────────────────────────────────────────────────────────────

/**
 * FR-37: List transaksi berstatus Utang dengan sisa saldo > 0.
 * Hanya menampilkan transaksi AKTIF (tidak dibatalkan).
 */
export const listDebts = async (
  query: ListDebtsQuery,
): Promise<PaginatedResult<DebtTransactionWithRelations>> => {
  const { page = 1, limit = 20 } = query;

  const where: Prisma.TransactionWhereInput = {
    statusPembayaran: PaymentStatus.UTANG,
    statusTransaksi: TransactionStatus.AKTIF,
    sisaSaldoUtang: {
      gt: 0, // Greater than 0
    },
  };

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { tanggal: "desc" }, // Transaksi terbaru dulu
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payments: {
          include: {
            dicatatOleh: {
              select: {
                id: true,
                nama: true,
                email: true,
              },
            },
          },
          orderBy: { tanggalBayar: "asc" }, // Riwayat cicilan kronologis
        },
        dibuatOleh: {
          select: {
            id: true,
            nama: true,
            email: true,
          },
        },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ─── Get Payment History ──────────────────────────────────────────────────────

/**
 * FR-31: Menampilkan riwayat pembayaran cicilan untuk satu transaksi utang.
 */
export const getPaymentHistory = async (
  transactionId: string,
): Promise<PaymentWithRelations[]> => {
  // Validasi transaksi exists
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    throw new NotFoundError("Transaksi tidak ditemukan");
  }

  // Validasi transaksi adalah UTANG atau LUNAS (bukan transaksi tunai)
  // Hanya transaksi yang dimulai sebagai UTANG yang memiliki payment history
  if (transaction.statusPembayaran === PaymentStatus.LUNAS && 
      transaction.sisaSaldoUtang !== null) {
    // LUNAS yang dulunya UTANG - OK, bisa lihat history
  } else if (transaction.statusPembayaran === PaymentStatus.UTANG) {
    // UTANG - OK, bisa lihat history
  } else {
    // LUNAS tunai sejak awal (sisaSaldoUtang = null)
    throw new ValidationError(
      "Transaksi ini adalah transaksi tunai. Hanya transaksi Utang yang memiliki riwayat pembayaran.",
    );
  }

  // Fetch payment history
  const payments = await prisma.paymentHistory.findMany({
    where: { transactionId },
    orderBy: { tanggalBayar: "asc" }, // Kronologis
    include: {
      dicatatOleh: {
        select: {
          id: true,
          nama: true,
          email: true,
        },
      },
    },
  });

  return payments;
};

// ─── Record Payment ───────────────────────────────────────────────────────────

/**
 * FR-30–FR-34: Mencatat pembayaran cicilan dengan row-level locking.
 *
 * SDD 4.6: Menggunakan SELECT FOR UPDATE untuk mencegah race condition
 * saat dua pembayaran dicatat hampir bersamaan.
 *
 * AC-10: Partial payment → sisa saldo berkurang
 * AC-11: Full payment → sisa saldo = 0, status = LUNAS
 * AC-12: Overpayment → ditolak dengan DebtOverpaymentError
 */
export const recordPayment = async (
  transactionId: string,
  jumlahBayar: number,
  userId: string,
): Promise<DebtTransactionWithRelations> => {
  const jumlahBayarDecimal = new Decimal(jumlahBayar);

  // Atomic transaction dengan row-level locking
  const result = await prisma.$transaction(async (tx) => {
    // STEP 1: Lock row dengan SELECT FOR UPDATE (SDD 4.6)
    // Menggunakan Prisma.sql untuk raw query dengan tagged template
    const lockedRows = await tx.$queryRaw<
      Array<{
        id: string;
        statusPembayaran: string;
        statusTransaksi: string;
        sisaSaldoUtang: Decimal | null;
        total: Decimal;
      }>
    >`
      SELECT id, "statusPembayaran", "statusTransaksi", "sisaSaldoUtang", total
      FROM "Transaction"
      WHERE id = ${transactionId}
      FOR UPDATE
    `;

    const lockedTransaction = lockedRows[0];

    if (!lockedTransaction) {
      throw new NotFoundError("Transaksi tidak ditemukan");
    }

    // STEP 2: Validasi dalam transaction (re-validate dengan data yang di-lock)

    // Validasi: transaksi harus berstatus UTANG
    if (lockedTransaction.statusPembayaran !== PaymentStatus.UTANG) {
      throw new BusinessRuleError(
        "Pembayaran hanya dapat dicatat untuk transaksi berstatus Utang",
      );
    }

    // Validasi: transaksi harus AKTIF (tidak dibatalkan)
    if (lockedTransaction.statusTransaksi === TransactionStatus.DIBATALKAN) {
      throw new BusinessRuleError(
        "Tidak dapat mencatat pembayaran untuk transaksi yang sudah dibatalkan",
      );
    }

    // Validasi: sisaSaldoUtang harus ada dan > 0
    if (
      !lockedTransaction.sisaSaldoUtang ||
      lockedTransaction.sisaSaldoUtang.lte(0)
    ) {
      throw new BusinessRuleError(
        "Transaksi ini sudah lunas. Tidak ada sisa saldo utang yang dapat dibayar.",
      );
    }

    // BR-14 / AC-12: Validasi jumlahBayar tidak melebihi sisaSaldoUtang
    if (jumlahBayarDecimal.gt(lockedTransaction.sisaSaldoUtang)) {
      throw new DebtOverpaymentError(
        `Jumlah pembayaran (Rp${jumlahBayar.toLocaleString("id-ID")}) melebihi sisa saldo utang (Rp${lockedTransaction.sisaSaldoUtang.toNumber().toLocaleString("id-ID")})`,
      );
    }

    // STEP 3: Hitung saldo setelah pembayaran
    const saldoSetelahBayar =
      lockedTransaction.sisaSaldoUtang.sub(jumlahBayarDecimal);
    const isFullyPaid = saldoSetelahBayar.equals(0);

    // STEP 4: Insert payment history (append-only)
    await tx.paymentHistory.create({
      data: {
        transactionId,
        jumlahBayar: jumlahBayarDecimal,
        saldoSetelahBayar,
        dicatatOlehId: userId,
      },
    });

    // STEP 5: Update transaction (sisaSaldoUtang & statusPembayaran)
    await tx.transaction.update({
      where: { id: transactionId },
      data: {
        sisaSaldoUtang: saldoSetelahBayar,
        statusPembayaran: isFullyPaid
          ? PaymentStatus.LUNAS
          : PaymentStatus.UTANG,
      },
    });

    // STEP 6: Fetch updated transaction dengan relasi untuk response
    const updatedTransaction = await tx.transaction.findUnique({
      where: { id: transactionId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payments: {
          include: {
            dicatatOleh: {
              select: {
                id: true,
                nama: true,
                email: true,
              },
            },
          },
          orderBy: { tanggalBayar: "asc" },
        },
        dibuatOleh: {
          select: {
            id: true,
            nama: true,
            email: true,
          },
        },
      },
    });

    if (!updatedTransaction) {
      throw new Error("Pembayaran berhasil dicatat tapi gagal di-fetch");
    }

    return updatedTransaction;
  });

  return result;
};
