/**
 * prisma/seed.ts
 * Script untuk seed data development/test.
 * Run dengan: npm run seed
 */

import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Hapus data lama (untuk development)
  await prisma.refreshToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // Hash password dengan salt rounds dari env (default 10)
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
  const password = 'password123'; // Password default untuk testing
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Seed users
  const testUser = await prisma.user.create({
    data: {
      email: 'test@example.com',
      nama: 'Test User',
      passwordHash,
    },
  });

  console.log(`✅ Created user: ${testUser.email} (password: ${password})`);
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
