import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@kendismarket.com' },
    update: {},
    create: {
      nama: 'Administrator',
      email: 'admin@kendismarket.com',
      passwordHash,
    },
  });

  console.log('Seed: User created', user.email);

  const product1 = await prisma.product.create({
    data: {
      nama: 'Beras Pandan Wangi 5kg',
      kategori: 'Sembako',
      hargaJual: 75000,
      hargaModal: 70000,
      stok: 50,
      stokMinimum: 10,
    }
  });

  const product2 = await prisma.product.create({
    data: {
      nama: 'Minyak Goreng Bimoli 2L',
      kategori: 'Sembako',
      hargaJual: 35000,
      hargaModal: 32000,
      stok: 5, // low stock
      stokMinimum: 10,
    }
  });

  console.log('Seed: Products created', product1.nama, product2.nama);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
