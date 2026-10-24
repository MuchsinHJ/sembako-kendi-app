/**
 * modules/consignment/consignment.service.ts
 * Business logic untuk penitipan barang (konsinyasi).
 *
 * Tahap 1:
 * BR-A: konsistensi tipe/consignorId (ditegakkan di modul product)
 * BR-C: penerimaan menambah stok; retur mengurangi stok & tidak boleh melebihi stok
 * BR-E: penonaktifan consignor hanya bila semua produk titipannya berstok 0
 * BR-G: consignor NONAKTIF tidak dapat menerima titipan / mengaktifkan produknya
 * BR-I: receipt hanya untuk produk TITIPAN AKTIF milik consignor AKTIF
 *
 * Tahap 2:
 * BR-D: setoran > 0 dan tidak melebihi saldo kewajiban saat itu
 * BR-F: void boleh membuat saldo negatif (tidak diblokir di sini)
 *
 * Catatan arsitektur: seluruh operasi multi-tabel memakai `prisma.$transaction`
 * dan pengecekan ulang di dalam transaction (dengan row lock `FOR UPDATE`)
 * agar aman terhadap penjualan/penyesuaian yang berjalan bersamaan.
 *
 * Rumus kewajiban (keputusan desain no. 3): kewajiban TIDAK disimpan, melainkan
 * diturunkan dari snapshot penjualan dikurangi setoran:
 *   saldo = SUM(d.jumlah × d."hargaModalSnapshot")  [transaksi AKTIF]
 *         − SUM(ConsignorPayment.jumlahBayar)
 * Status produk maupun consignor tidak memengaruhi saldo (keputusan no. 6).
 */

import {
  Prisma,
  ConsignorStatus,
  ConsignmentMovementType,
  ProductStatus,
  ProductType,
} from '@prisma/client';
import { prisma } from '../../config/db.js';
import {
  NotFoundError,
  BusinessRuleError,
  ProductNotConsignmentError,
  ConsignorInactiveError,
  ConsignorHasStockError,
  ConsignorOverpaymentError,
  StockExceededError,
} from '../../utils/errors.js';
import { decimalToString } from '../../utils/money.js';
import type {
  ListConsignorsQuery,
  CreateConsignorInput,
  UpdateConsignorInput,
  UpdateConsignorStatusInput,
  CreateReceiptInput,
  CreateReturnInput,
  ListMovementsQuery,
  ListConsignorPaymentsQuery,
  CreateConsignorPaymentInput,
  ConsignmentReportQuery,
} from './consignment.schema.js';

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

interface ConsignorSummary {
  jumlahProdukTitipanAktif: number;
  totalStokTitipan: number;
}

type ConsignorDetail = Prisma.ConsignorGetPayload<object> & {
  ringkasan: ConsignorSummary;
};

type MovementWithRelations = Prisma.ConsignmentMovementGetPayload<{
  include: {
    product: { select: { id: true; nama: true; tipe: true; stok: true } };
    consignor: { select: { id: true; nama: true } };
    dicatatOleh: { select: { id: true; nama: true; email: true } };
  };
}>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildPagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

const emptySummary = (): ConsignorSummary => ({
  jumlahProdukTitipanAktif: 0,
  totalStokTitipan: 0,
});

/**
 * Ambil ringkasan produk titipan milik consignor.
 * `totalStokTitipan` menjumlahkan stok SEMUA produk titipan (apa pun statusnya),
 * karena stok fisik yang masih ada tetap menjadi tanggung jawab penitip.
 */
const getConsignorSummary = async (
  consignorId: string,
): Promise<ConsignorSummary> => {
  const [aktifCount, stokAggregate] = await Promise.all([
    prisma.product.count({
      where: {
        consignorId,
        tipe: ProductType.TITIPAN,
        status: ProductStatus.AKTIF,
      },
    }),
    prisma.product.aggregate({
      where: {
        consignorId,
        tipe: ProductType.TITIPAN,
      },
      _sum: { stok: true },
    }),
  ]);

  return {
    jumlahProdukTitipanAktif: aktifCount,
    totalStokTitipan: stokAggregate._sum.stok ?? 0,
  };
};

/**
 * Baris produk yang di-lock di dalam transaction (bentuk minimal yang dibutuhkan).
 */
interface LockedProduct {
  id: string;
  nama: string;
  tipe: ProductType;
  status: ProductStatus;
  stok: number;
  consignorId: string | null;
}

const lockProduct = async (
  tx: Prisma.TransactionClient,
  productId: string,
): Promise<LockedProduct> => {
  const rows = await tx.$queryRaw<LockedProduct[]>`
    SELECT id, nama, tipe, status, stok, "consignorId"
    FROM "Product"
    WHERE id = ${productId}
    FOR UPDATE
  `;

  const product = rows[0];
  if (!product) {
    throw new NotFoundError(`Produk dengan ID ${productId} tidak ditemukan.`);
  }

  return product;
};

const lockConsignorStatus = async (
  tx: Prisma.TransactionClient,
  consignorId: string,
): Promise<ConsignorStatus> => {
  const rows = await tx.$queryRaw<Array<{ id: string; status: ConsignorStatus }>>`
    SELECT id, status
    FROM "Consignor"
    WHERE id = ${consignorId}
    FOR UPDATE
  `;

  const consignor = rows[0];
  if (!consignor) {
    throw new NotFoundError(`Penitip dengan ID ${consignorId} tidak ditemukan.`);
  }

  return consignor.status;
};

// ─── Kewajiban / saldo penitip (Tahap 2) ──────────────────────────────────────

/**
 * Klien Prisma yang bisa dipakai untuk query saldo: `prisma` global maupun
 * `tx` di dalam `$transaction`.
 */
type PrismaLike = Pick<Prisma.TransactionClient, '$queryRaw'>;

/** Ambil total modal barang titipan yang sudah terjual (transaksi AKTIF). */
const sumTerjualModal = async (
  client: PrismaLike,
  consignorId: string,
): Promise<Prisma.Decimal> => {
  // SUM(d.jumlah × hargaModalSnapshot) — kewajiban timbul saat barang terjual,
  // tanpa memandang status pembayaran pembeli maupun status produk/consignor.
  const rows = await client.$queryRaw<Array<{ total: Prisma.Decimal }>>(
    Prisma.sql`
      SELECT COALESCE(SUM(d."jumlah" * d."hargaModalSnapshot"), 0)::numeric AS "total"
      FROM "DetailTransaction" d
      JOIN "Transaction" t ON t."id" = d."transactionId"
      JOIN "Product" p ON p."id" = d."productId"
      WHERE p."consignorId" = ${consignorId}
        AND t."statusTransaksi" = 'AKTIF'
    `,
  );

  return rows[0]?.total ?? new Prisma.Decimal(0);
};

/** Ambil total setoran yang sudah dibayarkan ke penitip. */
const sumDisetor = async (
  client: PrismaLike,
  consignorId: string,
): Promise<Prisma.Decimal> => {
  const rows = await client.$queryRaw<Array<{ total: Prisma.Decimal }>>(
    Prisma.sql`
      SELECT COALESCE(SUM("jumlahBayar"), 0)::numeric AS "total"
      FROM "ConsignorPayment"
      WHERE "consignorId" = ${consignorId}
    `,
  );

  return rows[0]?.total ?? new Prisma.Decimal(0);
};

interface ConsignorBalanceRaw {
  totalTerjualModal: Prisma.Decimal;
  totalDisetor: Prisma.Decimal;
  saldo: Prisma.Decimal;
}

/** Hitung saldo all-time seorang penitip (Decimal, untuk logika bisnis). */
const calculateBalance = async (
  client: PrismaLike,
  consignorId: string,
): Promise<ConsignorBalanceRaw> => {
  const [totalTerjualModal, totalDisetor] = await Promise.all([
    sumTerjualModal(client, consignorId),
    sumDisetor(client, consignorId),
  ]);

  return {
    totalTerjualModal,
    totalDisetor,
    saldo: totalTerjualModal.sub(totalDisetor),
  };
};

/** Saldo banyak penitip sekaligus (dipakai filter `punyaSaldo` & dashboard). */
const getSaldoMap = async (
  consignorIds: string[],
): Promise<Map<string, Prisma.Decimal>> => {
  const map = new Map<string, Prisma.Decimal>();
  if (consignorIds.length === 0) return map;

  const [soldRows, paidRows] = await Promise.all([
    prisma.$queryRaw<Array<{ consignorId: string; total: Prisma.Decimal }>>(
      Prisma.sql`
        SELECT p."consignorId" AS "consignorId",
               COALESCE(SUM(d."jumlah" * d."hargaModalSnapshot"), 0)::numeric AS "total"
        FROM "DetailTransaction" d
        JOIN "Transaction" t ON t."id" = d."transactionId"
        JOIN "Product" p ON p."id" = d."productId"
        WHERE t."statusTransaksi" = 'AKTIF'
          AND p."consignorId" IN (${Prisma.join(consignorIds)})
        GROUP BY p."consignorId"
      `,
    ),
    prisma.$queryRaw<Array<{ consignorId: string; total: Prisma.Decimal }>>(
      Prisma.sql`
        SELECT "consignorId" AS "consignorId",
               COALESCE(SUM("jumlahBayar"), 0)::numeric AS "total"
        FROM "ConsignorPayment"
        WHERE "consignorId" IN (${Prisma.join(consignorIds)})
        GROUP BY "consignorId"
      `,
    ),
  ]);

  for (const id of consignorIds) {
    map.set(id, new Prisma.Decimal(0));
  }

  for (const row of soldRows) {
    map.set(row.consignorId, (map.get(row.consignorId) ?? new Prisma.Decimal(0)).add(row.total));
  }

  for (const row of paidRows) {
    map.set(row.consignorId, (map.get(row.consignorId) ?? new Prisma.Decimal(0)).sub(row.total));
  }

  return map;
};

/**
 * Total kewajiban ke seluruh penitip = jumlah saldo POSITIF semua consignor
 * (termasuk yang NONAKTIF). Dipakai dashboard (Tahap 2).
 */
export const getTotalKewajibanPenitip = async (): Promise<string> => {
  const consignors = await prisma.consignor.findMany({ select: { id: true } });
  const saldoMap = await getSaldoMap(consignors.map((c) => c.id));

  let total = new Prisma.Decimal(0);
  for (const saldo of saldoMap.values()) {
    if (saldo.gt(0)) total = total.add(saldo);
  }

  return decimalToString(total) ?? '0.00';
};

// ─── List Consignors ──────────────────────────────────────────────────────────

export const listConsignors = async (
  query: ListConsignorsQuery,
): Promise<PaginatedResult<Prisma.ConsignorGetPayload<object>>> => {
  const { status, search, punyaSaldo, page = 1, limit = 20 } = query;

  const where: Prisma.ConsignorWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.nama = { contains: search, mode: 'insensitive' };
  }

  // Filter saldo (Tahap 2). Saldo diturunkan dari transaksi AKTIF dikurangi
  // setoran, sehingga tidak bisa diekspresikan sebagai `where` Prisma biasa.
  // Skala data UMKM memungkinkan penyaringan di memori setelah query id.
  if (punyaSaldo !== undefined) {
    const candidates = await prisma.consignor.findMany({
      where,
      select: { id: true },
    });

    const saldoMap = await getSaldoMap(candidates.map((c) => c.id));

    where.id = {
      in: candidates
        .filter((c) => {
          const saldo = saldoMap.get(c.id) ?? new Prisma.Decimal(0);
          return punyaSaldo ? !saldo.equals(0) : saldo.equals(0);
        })
        .map((c) => c.id),
    };
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.consignor.findMany({
      where,
      skip,
      take: limit,
      orderBy: { nama: 'asc' },
    }),
    prisma.consignor.count({ where }),
  ]);

  return {
    data,
    pagination: buildPagination(page, limit, total),
  };
};

// ─── Get Consignor by ID ──────────────────────────────────────────────────────

export const getConsignorById = async (id: string): Promise<ConsignorDetail> => {
  const consignor = await prisma.consignor.findUnique({ where: { id } });

  if (!consignor) {
    throw new NotFoundError(`Penitip dengan ID ${id} tidak ditemukan.`);
  }

  const ringkasan = await getConsignorSummary(id);

  return { ...consignor, ringkasan };
};

// ─── Create Consignor ─────────────────────────────────────────────────────────

export const createConsignor = async (input: CreateConsignorInput) => {
  const consignor = await prisma.consignor.create({
    data: {
      nama: input.nama,
      noHp: input.noHp ?? null,
      catatan: input.catatan ?? null,
    },
  });

  return { ...consignor, ringkasan: emptySummary() };
};

// ─── Update Consignor ─────────────────────────────────────────────────────────

export const updateConsignor = async (
  id: string,
  input: UpdateConsignorInput,
) => {
  const existing = await prisma.consignor.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError(`Penitip dengan ID ${id} tidak ditemukan.`);
  }

  const data: Prisma.ConsignorUpdateInput = {};

  if (input.nama !== undefined) {
    data.nama = input.nama;
  }

  if (input.noHp !== undefined) {
    data.noHp = input.noHp;
  }

  if (input.catatan !== undefined) {
    data.catatan = input.catatan;
  }

  const consignor = await prisma.consignor.update({ where: { id }, data });
  const ringkasan = await getConsignorSummary(id);

  return { ...consignor, ringkasan };
};

// ─── Update Consignor Status (BR-E) ───────────────────────────────────────────

/**
 * BR-E: Penonaktifan hanya diizinkan bila SEMUA produk titipan berstok 0.
 * Produk yang masih AKTIF dengan stok 0 otomatis di-set NONAKTIF dalam
 * transaction yang sama. Saldo kewajiban tidak dipersyaratkan 0 (Tahap 2).
 * Mengaktifkan kembali selalu diizinkan; produk TIDAK ikut aktif otomatis.
 */
export const updateConsignorStatus = async (
  id: string,
  input: UpdateConsignorStatusInput,
): Promise<ConsignorDetail> => {
  await prisma.$transaction(async (tx) => {
    // Lock baris consignor agar penonaktifan tidak berlomba dengan operasi lain.
    await lockConsignorStatus(tx, id);

    if (input.status === ConsignorStatus.NONAKTIF) {
      // Pengecekan stok dilakukan ULANG di dalam transaction (BR-E.a)
      const productsWithStock = await tx.product.findMany({
        where: {
          consignorId: id,
          tipe: ProductType.TITIPAN,
          stok: { gt: 0 },
        },
        select: { id: true, nama: true, stok: true },
        orderBy: { nama: 'asc' },
      });

      if (productsWithStock.length > 0) {
        throw new ConsignorHasStockError(
          'Penitip masih memiliki produk titipan yang berstok, sehingga tidak dapat dinonaktifkan (BR-E).',
          {
            products: productsWithStock.map((p) => ({
              id: p.id,
              nama: p.nama,
              stok: p.stok,
            })),
          },
        );
      }

      // Produk titipan yang masih AKTIF (stok 0) ikut dinonaktifkan.
      await tx.product.updateMany({
        where: {
          consignorId: id,
          tipe: ProductType.TITIPAN,
          status: ProductStatus.AKTIF,
        },
        data: { status: ProductStatus.NONAKTIF },
      });
    }

    await tx.consignor.update({
      where: { id },
      data: { status: input.status },
    });
  });

  return getConsignorById(id);
};

// ─── Receipt (BR-I) ───────────────────────────────────────────────────────────

/**
 * BR-I: penerimaan titipan hanya untuk produk TITIPAN berstatus AKTIF milik
 * consignor AKTIF. `consignorId` pada movement diambil dari produk, bukan input.
 */
export const createReceipt = async (
  input: CreateReceiptInput,
  userId: string,
): Promise<MovementWithRelations> => {
  const { productId, jumlah, catatan } = input;

  return prisma.$transaction(async (tx) => {
    const product = await lockProduct(tx, productId);

    if (product.tipe !== ProductType.TITIPAN) {
      throw new ProductNotConsignmentError(
        'Produk ini bukan produk titipan, sehingga tidak dapat menerima titipan (BR-I).',
      );
    }

    if (product.status !== ProductStatus.AKTIF) {
      throw new BusinessRuleError(
        'Produk titipan berstatus NONAKTIF sehingga tidak dapat menerima titipan (BR-I).',
      );
    }

    if (!product.consignorId) {
      // Dijaga oleh CHECK constraint, tetapi dicek agar pesan jelas.
      throw new BusinessRuleError(
        'Produk titipan tidak memiliki penitip sehingga penerimaan tidak dapat dicatat.',
      );
    }

    // BR-G: penitip harus AKTIF
    const consignorStatus = await lockConsignorStatus(tx, product.consignorId);
    if (consignorStatus !== ConsignorStatus.AKTIF) {
      throw new ConsignorInactiveError(
        'Penitip berstatus NONAKTIF sehingga tidak dapat menerima titipan (BR-G).',
      );
    }

    const stokSebelum = product.stok;
    const stokSesudah = stokSebelum + jumlah;

    await tx.product.update({
      where: { id: productId },
      data: { stok: stokSesudah },
    });

    return tx.consignmentMovement.create({
      data: {
        consignorId: product.consignorId,
        productId,
        tipe: ConsignmentMovementType.TERIMA,
        jumlah,
        stokSebelum,
        stokSesudah,
        catatan: catatan ?? null,
        dicatatOlehId: userId,
      },
      include: {
        product: { select: { id: true, nama: true, tipe: true, stok: true } },
        consignor: { select: { id: true, nama: true } },
        dicatatOleh: { select: { id: true, nama: true, email: true } },
      },
    });
  });
};

// ─── Return (BR-C) ────────────────────────────────────────────────────────────

/**
 * BR-C: retur ke penitip mengurangi stok dan tidak boleh melebihi stok saat ini.
 * Validasi stok dilakukan ulang di dalam transaction.
 *
 * Status produk/penitip tidak dipersyaratkan AKTIF: retur justru dipakai untuk
 * mengosongkan stok sebelum produk/penitip dinonaktifkan.
 */
export const createReturn = async (
  input: CreateReturnInput,
  userId: string,
): Promise<MovementWithRelations> => {
  const { productId, jumlah, catatan } = input;

  return prisma.$transaction(async (tx) => {
    const product = await lockProduct(tx, productId);

    if (product.tipe !== ProductType.TITIPAN) {
      throw new ProductNotConsignmentError(
        'Produk ini bukan produk titipan, sehingga tidak dapat diretur ke penitip (BR-C).',
      );
    }

    if (!product.consignorId) {
      throw new BusinessRuleError(
        'Produk titipan tidak memiliki penitip sehingga retur tidak dapat dicatat.',
      );
    }

    const stokSebelum = product.stok;
    const stokSesudah = stokSebelum - jumlah;

    // BR-04 tetap berlaku: stok tidak boleh negatif
    if (stokSesudah < 0) {
      throw new StockExceededError(
        `Retur ditolak. Jumlah retur (${jumlah}) melebihi stok saat ini (${stokSebelum}).`,
      );
    }

    await tx.product.update({
      where: { id: productId },
      data: { stok: stokSesudah },
    });

    return tx.consignmentMovement.create({
      data: {
        consignorId: product.consignorId,
        productId,
        tipe: ConsignmentMovementType.RETUR,
        jumlah,
        stokSebelum,
        stokSesudah,
        catatan: catatan ?? null,
        dicatatOlehId: userId,
      },
      include: {
        product: { select: { id: true, nama: true, tipe: true, stok: true } },
        consignor: { select: { id: true, nama: true } },
        dicatatOleh: { select: { id: true, nama: true, email: true } },
      },
    });
  });
};

// ─── List Movements ───────────────────────────────────────────────────────────

export const listMovements = async (
  query: ListMovementsQuery,
): Promise<PaginatedResult<MovementWithRelations>> => {
  const {
    consignorId,
    productId,
    tipe,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = query;

  const where: Prisma.ConsignmentMovementWhereInput = {};

  if (consignorId) {
    where.consignorId = consignorId;
  }

  if (productId) {
    where.productId = productId;
  }

  if (tipe) {
    where.tipe = tipe;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.consignmentMovement.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, nama: true, tipe: true, stok: true } },
        consignor: { select: { id: true, nama: true } },
        dicatatOleh: { select: { id: true, nama: true, email: true } },
      },
    }),
    prisma.consignmentMovement.count({ where }),
  ]);

  return {
    data,
    pagination: buildPagination(page, limit, total),
  };
};

// ═════════════════════════════════════════════════════════════════════════════
// TAHAP 2 — Saldo & setoran ke penitip
// ═════════════════════════════════════════════════════════════════════════════

export interface ConsignorBalance {
  consignorId: string;
  totalTerjualModal: string;
  totalDisetor: string;
  saldo: string;
}

// ─── GET /consignors/:id/balance ──────────────────────────────────────────────

/**
 * Saldo all-time seorang penitip.
 * Saldo negatif ditampilkan apa adanya (berarti kelebihan setor, BR-F).
 */
export const getConsignorBalance = async (
  consignorId: string,
): Promise<ConsignorBalance> => {
  const consignor = await prisma.consignor.findUnique({
    where: { id: consignorId },
    select: { id: true },
  });

  if (!consignor) {
    throw new NotFoundError(`Penitip dengan ID ${consignorId} tidak ditemukan.`);
  }

  const { totalTerjualModal, totalDisetor, saldo } = await calculateBalance(
    prisma,
    consignorId,
  );

  return {
    consignorId,
    totalTerjualModal: decimalToString(totalTerjualModal) ?? '0.00',
    totalDisetor: decimalToString(totalDisetor) ?? '0.00',
    saldo: decimalToString(saldo) ?? '0.00',
  };
};

// ─── GET /consignors/:id/payments ─────────────────────────────────────────────

type ConsignorPaymentWithRelations = Prisma.ConsignorPaymentGetPayload<{
  include: {
    dicatatOleh: { select: { id: true; nama: true; email: true } };
  };
}>;

export const listConsignorPayments = async (
  consignorId: string,
  query: ListConsignorPaymentsQuery,
): Promise<PaginatedResult<ConsignorPaymentWithRelations>> => {
  const consignor = await prisma.consignor.findUnique({
    where: { id: consignorId },
    select: { id: true },
  });

  if (!consignor) {
    throw new NotFoundError(`Penitip dengan ID ${consignorId} tidak ditemukan.`);
  }

  const { page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.consignorPayment.findMany({
      where: { consignorId },
      skip,
      take: limit,
      orderBy: { tanggalBayar: 'desc' },
      include: {
        dicatatOleh: { select: { id: true, nama: true, email: true } },
      },
    }),
    prisma.consignorPayment.count({ where: { consignorId } }),
  ]);

  return {
    data,
    pagination: buildPagination(page, limit, total),
  };
};

// ─── POST /consignors/:id/payments (BR-D) ─────────────────────────────────────

/**
 * BR-D: catat setoran ke penitip.
 *
 * - `jumlahBayar > 0` (juga CHECK constraint di DB)
 * - tidak boleh melebihi saldo kewajiban saat ini
 * - saldo ≤ 0 → setoran apa pun ditolak
 * - saldo dihitung ULANG di dalam transaction dengan row lock pada consignor,
 *   sehingga dua setoran paralel tidak bisa membuat saldo negatif
 * - BR-G: setoran TETAP diizinkan untuk consignor NONAKTIF
 */
export const createConsignorPayment = async (
  consignorId: string,
  input: CreateConsignorPaymentInput,
  userId: string,
): Promise<ConsignorPaymentWithRelations> => {
  const jumlahBayar = new Prisma.Decimal(input.jumlahBayar);

  if (jumlahBayar.lte(0)) {
    throw new BusinessRuleError('Jumlah setoran harus lebih besar dari 0 (BR-D).');
  }

  return prisma.$transaction(async (tx) => {
    // Lock baris consignor: serialisasi setoran per penitip.
    await lockConsignorStatus(tx, consignorId);

    // Hitung ulang saldo dengan data terkini (di dalam transaction).
    const { saldo } = await calculateBalance(tx, consignorId);

    if (saldo.lte(0)) {
      throw new ConsignorOverpaymentError(
        'Saldo kewajiban ke penitip sudah 0 atau negatif, sehingga setoran tidak dapat dicatat (BR-D).',
      );
    }

    if (jumlahBayar.gt(saldo)) {
      throw new ConsignorOverpaymentError(
        `Jumlah setoran (Rp${jumlahBayar.toFixed(2)}) melebihi saldo kewajiban (Rp${saldo.toFixed(2)}) (BR-D).`,
      );
    }

    const saldoSetelahBayar = saldo.sub(jumlahBayar);

    return tx.consignorPayment.create({
      data: {
        consignorId,
        jumlahBayar,
        saldoSetelahBayar,
        catatan: input.catatan ?? null,
        dicatatOlehId: userId,
      },
      include: {
        dicatatOleh: { select: { id: true, nama: true, email: true } },
      },
    });
  });
};

// ─── GET /reports/consignment ─────────────────────────────────────────────────

export interface ConsignmentReportRow {
  consignorId: string;
  nama: string;
  status: ConsignorStatus;
  terjualPeriode: string;
  modalPeriode: string;
  disetorPeriode: string;
  saldoAkhir: string;
}

export interface ConsignmentReportData {
  periode: { start: string; end: string };
  totalModalPeriode: string;
  totalDisetorPeriode: string;
  totalSaldoAkhir: string;
  consignors: ConsignmentReportRow[];
}

/**
 * Laporan konsinyasi per penitip dalam periode.
 *
 * - `terjualPeriode` = omzet penjualan barang titipan penitip (transaksi AKTIF)
 * - `modalPeriode`   = kewajiban yang timbul di periode (jumlah × harga setor)
 * - `disetorPeriode` = setoran yang dicatat di periode
 * - `saldoAkhir`     = saldo all-time (sama dengan `/consignors/:id/balance`)
 *
 * Semua penitip ditampilkan (termasuk yang NONAKTIF) agar saldo tidak "hilang".
 */
export const getConsignmentReport = async (
  query: ConsignmentReportQuery,
): Promise<ConsignmentReportData> => {
  const start = new Date(query.startDate);
  const end = new Date(query.endDate);

  const consignors = await prisma.consignor.findMany({
    select: { id: true, nama: true, status: true },
    orderBy: { nama: 'asc' },
  });

  const soldRows = await prisma.$queryRaw<
    Array<{
      consignorId: string;
      omzet: Prisma.Decimal;
      modal: Prisma.Decimal;
    }>
  >(
    Prisma.sql`
      SELECT p."consignorId" AS "consignorId",
             COALESCE(SUM(d."subtotal"), 0)::numeric AS "omzet",
             COALESCE(SUM(d."jumlah" * d."hargaModalSnapshot"), 0)::numeric AS "modal"
      FROM "DetailTransaction" d
      JOIN "Transaction" t ON t."id" = d."transactionId"
      JOIN "Product" p ON p."id" = d."productId"
      WHERE t."statusTransaksi" = 'AKTIF'
        AND t."tanggal" >= ${start}
        AND t."tanggal" <= ${end}
        AND p."consignorId" IS NOT NULL
      GROUP BY p."consignorId"
    `,
  );

  const paidRows = await prisma.$queryRaw<
    Array<{ consignorId: string; total: Prisma.Decimal }>
  >(
    Prisma.sql`
      SELECT "consignorId" AS "consignorId",
             COALESCE(SUM("jumlahBayar"), 0)::numeric AS "total"
      FROM "ConsignorPayment"
      WHERE "tanggalBayar" >= ${start}
        AND "tanggalBayar" <= ${end}
      GROUP BY "consignorId"
    `,
  );

  const soldMap = new Map(soldRows.map((r) => [r.consignorId, r]));
  const paidMap = new Map(paidRows.map((r) => [r.consignorId, r.total]));
  const saldoMap = await getSaldoMap(consignors.map((c) => c.id));

  const zero = () => new Prisma.Decimal(0);

  const rows: ConsignmentReportRow[] = consignors.map((c) => {
    const sold = soldMap.get(c.id);

    return {
      consignorId: c.id,
      nama: c.nama,
      status: c.status,
      terjualPeriode: decimalToString(sold?.omzet ?? zero()) ?? '0.00',
      modalPeriode: decimalToString(sold?.modal ?? zero()) ?? '0.00',
      disetorPeriode: decimalToString(paidMap.get(c.id) ?? zero()) ?? '0.00',
      saldoAkhir: decimalToString(saldoMap.get(c.id) ?? zero()) ?? '0.00',
    };
  });

  const totalModalPeriode = rows.reduce(
    (sum, r) => sum.add(r.modalPeriode),
    zero(),
  );
  const totalDisetorPeriode = rows.reduce(
    (sum, r) => sum.add(r.disetorPeriode),
    zero(),
  );
  const totalSaldoAkhir = rows.reduce(
    (sum, r) => sum.add(r.saldoAkhir),
    zero(),
  );

  return {
    periode: { start: query.startDate, end: query.endDate },
    totalModalPeriode: decimalToString(totalModalPeriode) ?? '0.00',
    totalDisetorPeriode: decimalToString(totalDisetorPeriode) ?? '0.00',
    totalSaldoAkhir: decimalToString(totalSaldoAkhir) ?? '0.00',
    consignors: rows,
  };
};
