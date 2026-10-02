/**
 * modules/transaction/transaction.service.ts
 * Business logic untuk transaksi penjualan.
 * BR-05: Stok tidak boleh negatif saat transaksi
 * BR-07: Total dihitung dengan Decimal untuk precision
 * BR-08: UTANG wajib nama + noHP pembeli
 * BR-13: Void hanya dalam window waktu yang ditentukan (default: hari yang sama)
 */

import { Prisma, TransactionStatus, PaymentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../config/db.js';
import {
  NotFoundError,
  ValidationError,
  BusinessRuleError,
  StockExceededError,
  VoidWindowExpiredError,
} from '../../utils/errors.js';
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
} from './transaction.schema.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Void window configuration (BR-13).
 * Default: transaksi hanya bisa di-void dalam hari kalender yang sama dengan createdAt,
 * dihitung dengan zona Asia/Jakarta sesuai contoh SRS.
 * 
 * Open Question: Apakah perlu konfigurasi yang lebih fleksibel (misal: 24 jam dari createdAt)?
 * Untuk sementara ikuti interpretasi konservatif: hari kalender yang sama.
 */
const VOID_WINDOW_TIMEZONE = 'Asia/Jakarta';

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

// Transaction dengan relasi items dan payments
type TransactionWithRelations = Prisma.TransactionGetPayload<{
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

// ─── Create Transaction ───────────────────────────────────────────────────────

export const createTransaction = async (
  input: CreateTransactionInput,
  userId: string,
): Promise<TransactionWithRelations> => {
  // Validasi items tidak kosong (sudah di-handle Zod, tapi double-check)
  if (!input.items || input.items.length === 0) {
    throw new ValidationError('Transaksi harus memiliki minimal 1 item');
  }

  // BR-08: Validasi UTANG wajib nama + noHP (sudah di-handle Zod refine, tapi double-check di service)
  if (input.statusPembayaran === PaymentStatus.UTANG) {
    if (!input.namaPembeli?.trim() || !input.noHpPembeli?.trim()) {
      throw new ValidationError(
        'Nama pembeli dan nomor HP wajib diisi untuk transaksi UTANG',
      );
    }
  }

  // Atomic transaction untuk insert + stock decrement
  const transaction = await prisma.$transaction(async (tx) => {
    // 1. Fetch products dan validasi
    const productIds = input.items.map((item) => item.productId);
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
    });

    // Validasi semua produk ditemukan
    if (products.length !== productIds.length) {
      const foundIds = new Set(products.map((p) => p.id));
      const missingIds = productIds.filter((id) => !foundIds.has(id));
      throw new NotFoundError(
        `Produk tidak ditemukan: ${missingIds.join(', ')}`,
      );
    }

    // Validasi produk AKTIF dan stok cukup (BR-05)
    const productMap = new Map(products.map((p) => [p.id, p]));
    const itemsWithData: Array<{
      productId: string;
      jumlah: number;
      product: (typeof products)[0];
    }> = [];

    for (const item of input.items) {
      const product = productMap.get(item.productId)!;

      // Validasi status AKTIF
      if (product.status !== 'AKTIF') {
        throw new ValidationError(
          `Produk "${product.nama}" tidak aktif dan tidak dapat ditransaksikan`,
        );
      }

      // Validasi stok cukup (BR-05)
      if (product.stok < item.jumlah) {
        throw new StockExceededError(
          `Stok produk "${product.nama}" tidak mencukupi (tersedia: ${product.stok}, diminta: ${item.jumlah})`,
        );
      }

      itemsWithData.push({
        productId: item.productId,
        jumlah: item.jumlah,
        product,
      });
    }

    // 2. Hitung total (BR-07: gunakan Decimal)
    let total = new Decimal(0);
    const detailTransactionData: Prisma.DetailTransactionCreateManyInput[] = [];

    for (const item of itemsWithData) {
      const subtotal = item.product.hargaJual.mul(item.jumlah);
      total = total.add(subtotal);

      detailTransactionData.push({
        transactionId: '', // Will be set after transaction creation
        productId: item.productId,
        namaProdukSnapshot: item.product.nama,
        hargaJualSnapshot: item.product.hargaJual,
        hargaModalSnapshot: item.product.hargaModal,
        jumlah: item.jumlah,
        subtotal,
      });
    }

    // 3. Create transaction
    const newTransaction = await tx.transaction.create({
      data: {
        total,
        statusPembayaran: input.statusPembayaran,
        statusTransaksi: TransactionStatus.AKTIF,
        namaPembeli: input.namaPembeli || null,
        noHpPembeli: input.noHpPembeli || null,
        sisaSaldoUtang:
          input.statusPembayaran === PaymentStatus.UTANG ? total : null,
        dibuatOlehId: userId,
      },
    });

    // 4. Insert detail transactions
    for (const detail of detailTransactionData) {
      detail.transactionId = newTransaction.id;
    }
    await tx.detailTransaction.createMany({
      data: detailTransactionData,
    });

    // 5. Decrement stock atomically dengan kondisi WHERE untuk concurrency safety
    for (const item of itemsWithData) {
      const updateResult = await tx.product.updateMany({
        where: {
          id: item.productId,
          stok: { gte: item.jumlah }, // Atomic check: stok >= jumlah
        },
        data: {
          stok: { decrement: item.jumlah },
        },
      });

      // Jika updateMany return count 0 → stok tidak cukup (race condition)
      if (updateResult.count === 0) {
        throw new StockExceededError(
          `Stok produk "${item.product.nama}" tidak mencukupi (kemungkinan transaksi paralel)`,
        );
      }
    }

    // 6. Fetch transaction dengan relasi untuk response
    const createdTransaction = await tx.transaction.findUnique({
      where: { id: newTransaction.id },
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

    if (!createdTransaction) {
      throw new Error('Transaksi berhasil dibuat tapi gagal di-fetch');
    }

    return createdTransaction;
  });

  return transaction;
};

// ─── List Transactions ────────────────────────────────────────────────────────

export const listTransactions = async (
  query: ListTransactionsQuery,
): Promise<PaginatedResult<TransactionWithRelations>> => {
  const {
    startDate,
    endDate,
    statusTransaksi,
    statusPembayaran,
    page = 1,
    limit = 20,
  } = query;

  const where: Prisma.TransactionWhereInput = {};

  // Filter periode
  if (startDate || endDate) {
    where.tanggal = {};
    if (startDate) {
      where.tanggal.gte = new Date(startDate);
    }
    if (endDate) {
      where.tanggal.lte = new Date(endDate);
    }
  }

  // Filter status
  if (statusTransaksi) {
    where.statusTransaksi = statusTransaksi;
  }
  if (statusPembayaran) {
    where.statusPembayaran = statusPembayaran;
  }

  // Pagination
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { tanggal: 'desc' }, // Transaksi terbaru dulu
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

// ─── Get Transaction Detail ───────────────────────────────────────────────────

export const getTransactionById = async (
  id: string,
): Promise<TransactionWithRelations> => {
  const transaction = await prisma.transaction.findUnique({
    where: { id },
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
        orderBy: { tanggalBayar: 'asc' }, // Riwayat pembayaran urut kronologis
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

  if (!transaction) {
    throw new NotFoundError('Transaksi tidak ditemukan');
  }

  return transaction;
};

// ─── Void Transaction ─────────────────────────────────────────────────────────

export const voidTransaction = async (
  id: string,
): Promise<TransactionWithRelations> => {
  // Fetch transaction untuk validasi
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      items: true,
      payments: true,
    },
  });

  if (!transaction) {
    throw new NotFoundError('Transaksi tidak ditemukan');
  }

  // Validasi: sudah dibatalkan?
  if (transaction.statusTransaksi === TransactionStatus.DIBATALKAN) {
    throw new BusinessRuleError('Transaksi sudah dibatalkan sebelumnya');
  }

  // BR-13: Validasi void window (hari kalender yang sama, zona Asia/Jakarta)
  const now = new Date();
  const isWithinVoidWindow = isSameDayInTimezone(
    transaction.createdAt,
    now,
    VOID_WINDOW_TIMEZONE,
  );

  if (!isWithinVoidWindow) {
    throw new VoidWindowExpiredError(
      'Batas waktu pembatalan transaksi telah terlewati (hanya dapat dibatalkan dalam hari yang sama)',
    );
  }

  // Open Question: Bagaimana void transaksi UTANG yang sudah punya cicilan?
  // Opsi konservatif: tolak dengan BusinessRuleError
  if (
    transaction.statusPembayaran === PaymentStatus.UTANG &&
    transaction.payments.length > 0
  ) {
    throw new BusinessRuleError(
      'Transaksi utang yang sudah memiliki cicilan tidak dapat dibatalkan. Silakan hubungi administrator.',
    );
  }

  // Atomic void: update status + increment stok
  const voidedTransaction = await prisma.$transaction(async (tx) => {
    // 1. Update transaction status
    await tx.transaction.update({
      where: { id },
      data: {
        statusTransaksi: TransactionStatus.DIBATALKAN,
        dibatalkanPada: now,
      },
    });

    // 2. Increment stock untuk setiap item
    for (const item of transaction.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stok: { increment: item.jumlah },
        },
      });
    }

    // 3. Fetch updated transaction dengan relasi
    const updated = await tx.transaction.findUnique({
      where: { id },
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

    if (!updated) {
      throw new Error('Transaksi berhasil di-void tapi gagal di-fetch');
    }

    return updated;
  });

  return voidedTransaction;
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Check if two dates are in the same calendar day in a specific timezone.
 * Uses Intl.DateTimeFormat to handle timezone conversion properly.
 */
function isSameDayInTimezone(
  date1: Date,
  date2: Date,
  timezone: string,
): boolean {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const dateStr1 = formatter.format(date1); // Format: YYYY-MM-DD
  const dateStr2 = formatter.format(date2);

  return dateStr1 === dateStr2;
}
