/**
 * tests/helpers/testUser.ts
 * Memastikan user seed untuk test API tersedia.
 *
 * Sebelumnya setiap suite API mengandalkan `prisma/seed.ts` sudah dijalankan
 * dan berasumsi tidak ada suite lain yang menghapus user tersebut. Ketergantungan
 * pada urutan eksekusi itu rapuh (mis. suite constraint yang membersihkan tabel),
 * sehingga helper ini membuat user bila belum ada. Idempoten & aman dijalankan
 * berkali-kali.
 */

import bcrypt from 'bcrypt';
import { prisma } from '../../src/config/db.js';

export const TEST_USER = {
  email: 'test@example.com',
  password: 'password123',
  nama: 'Test User',
} as const;

export const ensureTestUser = async (): Promise<string> => {
  const existing = await prisma.user.findUnique({
    where: { email: TEST_USER.email },
  });

  if (existing) return existing.id;

  const passwordHash = await bcrypt.hash(TEST_USER.password, 10);
  const created = await prisma.user.create({
    data: {
      email: TEST_USER.email,
      nama: TEST_USER.nama,
      passwordHash,
    },
  });

  return created.id;
};
