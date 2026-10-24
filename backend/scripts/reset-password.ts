import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { config } from '../src/config/env.js';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error(
      'Usage: npm run reset-password -- <email> <newPassword>',
    );
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error('User not found');
    process.exit(1);
  }

  // Salt rounds mengikuti konfigurasi tervalidasi (SDD §9.2)
  const passwordHash = await bcrypt.hash(newPassword, config.BCRYPT_SALT_ROUNDS);

  await prisma.user.update({
    where: { email },
    data: { passwordHash },
  });

  console.log(`Password for ${email} has been reset successfully.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
