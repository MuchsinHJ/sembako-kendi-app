import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

describe('Database CHECK Constraints', () => {
  beforeAll(async () => {
    // clean db before tests - delete in correct order to avoid FK violations
    await prisma.paymentHistory.deleteMany();
    await prisma.detailTransaction.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.stockAdjustment.deleteMany();
    await prisma.product.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    // Clean up in correct order to avoid FK violations
    await prisma.paymentHistory.deleteMany();
    await prisma.detailTransaction.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.stockAdjustment.deleteMany();
    await prisma.product.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
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
  });
});
