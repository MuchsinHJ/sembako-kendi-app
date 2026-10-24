/**
 * prisma/seed.ts
 * Script untuk seed data development/test.
 * Run dengan: npm run seed
 */

import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { config } from '../src/config/env.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Hapus data lama (untuk development)
  await prisma.refreshToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // Hash password dengan salt rounds dari config tervalidasi (SDD §9.2)
  const password = 'password123'; // Password default untuk testing
  const passwordHash = await bcrypt.hash(password, config.BCRYPT_SALT_ROUNDS);

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
