import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Test ini sengaja TIDAK menghapus seluruh isi database: suite lain berbagi
 * user seed `test@example.com`, sehingga `deleteMany()` global membuat hasil
 * test bergantung pada urutan eksekusi. Cleanup dibatasi ke data milik test ini.
 */
const CONSTRAINT_TEST_EMAIL = 'test_constraint@kendismarket.com';
const CONSTRAINT_NEGATIVE_EMAIL = 'test_constraint_negative@kendismarket.com';

const cleanupOwnData = async () => {
  const users = await prisma.user.findMany({
    where: { email: { in: [CONSTRAINT_TEST_EMAIL, CONSTRAINT_NEGATIVE_EMAIL] } },
  });

  for (const user of users) {
    await prisma.detailTransaction.deleteMany({
      where: { transaction: { dibuatOlehId: user.id } },
    });
    await prisma.transaction.deleteMany({ where: { dibuatOlehId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
};

describe('Database CHECK Constraints', () => {
  beforeAll(async () => {
    await cleanupOwnData();
  });

  afterAll(async () => {
    await cleanupOwnData();
    await prisma.$disconnect();
  });

  it('should reject Product with hargaJual <= 0', async () => {
    await expect(
      prisma.product.create({
        data: {
          nama: 'Test',
          kategori: 'Test',
          hargaJual: 0,
          hargaModal: 10,
          stok: 10,
          stokMinimum: 1,
        },
      })
    ).rejects.toThrow();
  });

  it('should reject Product with stok < 0', async () => {
    await expect(
      prisma.product.create({
        data: {
          nama: 'Test',
          kategori: 'Test',
          hargaJual: 10,
          hargaModal: 10,
          stok: -1,
          stokMinimum: 1,
        },
      })
    ).rejects.toThrow();
  });

  it('should reject DetailTransaction with jumlah <= 0', async () => {
    const user = await prisma.user.create({
      data: {
        nama: 'Test User',
        email: 'test_constraint@kendismarket.com',
        passwordHash: 'hash',
      }
    });

    const trx = await prisma.transaction.create({
      data: {
        total: 10,
        uangDiterima: 10,
        kembalian: 0,
        statusPembayaran: 'LUNAS',
        dibuatOlehId: user.id,
      }
    });

    const product = await prisma.product.create({
      data: {
        nama: 'Test Product',
        kategori: 'Test',
        hargaJual: 10,
        hargaModal: 10,
        stok: 10,
      }
    });

    await expect(
      prisma.detailTransaction.create({
        data: {
          transactionId: trx.id,
          productId: product.id,
          namaProdukSnapshot: product.nama,
          hargaJualSnapshot: product.hargaJual,
          hargaModalSnapshot: product.hargaModal,
          jumlah: 0,
          subtotal: 0,
        }
      })
    ).rejects.toThrow();

    // Cleanup data milik test ini saja (product tidak punya relasi tersisa)
    await prisma.product.delete({ where: { id: product.id } });
  });

  it('should reject Transaction with negative uangDiterima (BR-07)', async () => {
    const user = await prisma.user.create({
      data: {
        nama: 'Test User Negative',
        email: 'test_constraint_negative@kendismarket.com',
        passwordHash: 'hash',
      },
    });

    await expect(
      prisma.transaction.create({
        data: {
          total: 10,
          uangDiterima: -1,
          statusPembayaran: 'LUNAS',
          dibuatOlehId: user.id,
        },
      }),
    ).rejects.toThrow();

    await prisma.user.delete({ where: { id: user.id } });
  });
});

/**
 * CHECK constraint konsinyasi (Fitur Penitipan Barang — Tahap 1).
 * Defense in depth: aturan BR-A & BR-C juga ditegakkan di level database.
 */
describe('Database CHECK Constraints — Konsinyasi', () => {
  const CONSIGNOR_NAME = '__constraint_test_consignor__';

  const cleanup = async () => {
    const consignor = await prisma.consignor.findFirst({
      where: { nama: CONSIGNOR_NAME },
    });
    if (!consignor) return;

    const products = await prisma.product.findMany({
      where: { consignorId: consignor.id },
      select: { id: true },
    });
    const productIds = products.map((p) => p.id);

    if (productIds.length > 0) {
      await prisma.consignmentMovement.deleteMany({
        where: { productId: { in: productIds } },
      });
      await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    }

    await prisma.consignor.delete({ where: { id: consignor.id } });
  };

  beforeAll(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('should reject Product TITIPAN without consignorId (BR-A)', async () => {
    await expect(
      prisma.product.create({
        data: {
          nama: 'Titipan Tanpa Penitip (constraint)',
          kategori: 'Test',
          hargaJual: 100,
          hargaModal: 50,
          stok: 1,
          stokMinimum: 0,
          tipe: 'TITIPAN',
        },
      }),
    ).rejects.toThrow();
  });

  it('should reject Product MILIK_SENDIRI with consignorId (BR-A)', async () => {
    const consignor = await prisma.consignor.create({
      data: { nama: CONSIGNOR_NAME },
    });

    await expect(
      prisma.product.create({
        data: {
          nama: 'Milik Sendiri Dengan Penitip (constraint)',
          kategori: 'Test',
          hargaJual: 100,
          hargaModal: 50,
          stok: 1,
          stokMinimum: 0,
          tipe: 'MILIK_SENDIRI',
          consignorId: consignor.id,
        },
      }),
    ).rejects.toThrow();
  });

  it('should reject ConsignmentMovement with jumlah <= 0 (BR-C)', async () => {
    const consignor = await prisma.consignor.create({
      data: { nama: CONSIGNOR_NAME },
    });

    const product = await prisma.product.create({
      data: {
        nama: 'Titipan Movement Constraint',
        kategori: 'Test',
        hargaJual: 100,
        hargaModal: 50,
        stok: 0,
        stokMinimum: 0,
        tipe: 'TITIPAN',
        consignorId: consignor.id,
      },
    });

    const user = await prisma.user.findFirst();
    expect(user).not.toBeNull();

    await expect(
      prisma.consignmentMovement.create({
        data: {
          consignorId: consignor.id,
          productId: product.id,
          tipe: 'TERIMA',
          jumlah: 0,
          stokSebelum: 0,
          stokSesudah: 0,
          dicatatOlehId: user!.id,
        },
      }),
    ).rejects.toThrow();
  });
});

/**
 * CHECK constraint setoran ke penitip (Fitur Penitipan Barang — Tahap 2).
 * Defense in depth: BR-D juga ditegakkan di level database.
 */
describe('Database CHECK Constraints — Setoran Penitip', () => {
  const CONSIGNOR_NAME = '__constraint_test_payment__';

  const cleanup = async () => {
    const consignor = await prisma.consignor.findFirst({
      where: { nama: CONSIGNOR_NAME },
    });
    if (!consignor) return;

    await prisma.consignorPayment.deleteMany({
      where: { consignorId: consignor.id },
    });
    await prisma.consignor.delete({ where: { id: consignor.id } });
  };

  beforeAll(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('should reject ConsignorPayment with jumlahBayar <= 0 (BR-D)', async () => {
    const consignor = await prisma.consignor.create({
      data: { nama: CONSIGNOR_NAME },
    });

    const user = await prisma.user.findFirst();
    expect(user).not.toBeNull();

    await expect(
      prisma.consignorPayment.create({
        data: {
          consignorId: consignor.id,
          jumlahBayar: 0,
          saldoSetelahBayar: 0,
          dicatatOlehId: user!.id,
        },
      }),
    ).rejects.toThrow();
  });

  it('should reject ConsignorPayment with negative jumlahBayar (BR-D)', async () => {
    const consignor = await prisma.consignor.findFirst({
      where: { nama: CONSIGNOR_NAME },
    });
    expect(consignor).not.toBeNull();

    const user = await prisma.user.findFirst();
    expect(user).not.toBeNull();

    await expect(
      prisma.consignorPayment.create({
        data: {
          consignorId: consignor!.id,
          jumlahBayar: -1,
          saldoSetelahBayar: 1,
          dicatatOlehId: user!.id,
        },
      }),
    ).rejects.toThrow();
  });
});
