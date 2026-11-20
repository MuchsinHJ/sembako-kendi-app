/**
 * prisma/seed.ts
 * Membuat akun pemilik toko. Run dengan: npm run seed
 *
 * Production:
 *   SEED_OWNER_EMAIL=...  SEED_OWNER_PASSWORD=... (min. 12 karakter)  [SEED_OWNER_NAMA=...]
 *   Hanya membuat akun bila BELUM ada user sama sekali; tidak pernah menghapus atau
 *   menimpa data. Menjalankannya ulang aman (tidak melakukan apa-apa).
 *
 * Development/test:
 *   Tanpa env → akun bawaan test@example.com / password123 (untuk Postman & uji manual).
 *   Dibuat/diperbarui per email (upsert); data lain tidak dihapus.
 */
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { config } from "../src/config/env.js";
import { resolveSeedOwner, SeedConfigError } from "../src/config/seedOwner.js";

const prisma = new PrismaClient();

async function main() {
  const owner = resolveSeedOwner(process.env);
  console.log("🌱 Seeding database...");

  if (config.IS_PRODUCTION) {
    const jumlahUser = await prisma.user.count();
    if (jumlahUser > 0) {
      console.log(
        `ℹ️  Sudah ada ${jumlahUser} akun. Seed dilewati, tidak ada yang diubah.`,
      );
      return;
    }
  }

  const passwordHash = await bcrypt.hash(
    owner.password,
    config.BCRYPT_SALT_ROUNDS,
  );

  if (config.IS_PRODUCTION) {
    await prisma.user.create({
      data: { email: owner.email, nama: owner.nama, passwordHash },
    });
  } else {
    await prisma.user.upsert({
      where: { email: owner.email },
      update: { nama: owner.nama, passwordHash },
      create: { email: owner.email, nama: owner.nama, passwordHash },
    });
  }

  // Password hanya dicetak untuk akun bawaan development; nilai dari env tidak pernah masuk log.
  console.log(
    owner.usingDevDefaults
      ? `✅ Akun development siap: ${owner.email} (password: ${owner.password})`
      : `✅ Akun pemilik siap: ${owner.email}`,
  );
  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    if (e instanceof SeedConfigError) console.error(`❌ ${e.message}`);
    else console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
