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
