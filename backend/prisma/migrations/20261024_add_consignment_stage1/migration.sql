-- ═══════════════════════════════════════════════════════════════════════════
-- Fitur Penitipan Barang (Konsinyasi) — Tahap 1
-- Produk titipan, data penitip (consignor), penerimaan & retur titipan.
--
-- Sifat migrasi: ADITIF. Tidak ada kolom/tabel lama yang diubah bentuknya
-- selain penambahan kolom baru pada "Product" (dengan DEFAULT sehingga baris
-- lama otomatis bernilai MILIK_SENDIRI).
-- ═══════════════════════════════════════════════════════════════════════════

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('MILIK_SENDIRI', 'TITIPAN');

-- CreateEnum
CREATE TYPE "ConsignorStatus" AS ENUM ('AKTIF', 'NONAKTIF');

-- CreateEnum
CREATE TYPE "ConsignmentMovementType" AS ENUM ('TERIMA', 'RETUR');

-- CreateTable
CREATE TABLE "Consignor" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "noHp" TEXT,
    "catatan" TEXT,
    "status" "ConsignorStatus" NOT NULL DEFAULT 'AKTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consignor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsignmentMovement" (
    "id" TEXT NOT NULL,
    "consignorId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "tipe" "ConsignmentMovementType" NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "stokSebelum" INTEGER NOT NULL,
    "stokSesudah" INTEGER NOT NULL,
    "catatan" TEXT,
    "dicatatOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsignmentMovement_pkey" PRIMARY KEY ("id")
);

-- AlterTable: kolom baru pada Product.
-- DEFAULT 'MILIK_SENDIRI' membuat seluruh baris lama otomatis menjadi produk
-- milik sendiri, sehingga tidak perlu UPDATE terpisah.
ALTER TABLE "Product" ADD COLUMN "tipe" "ProductType" NOT NULL DEFAULT 'MILIK_SENDIRI';
ALTER TABLE "Product" ADD COLUMN "consignorId" TEXT;

-- CreateIndex
CREATE INDEX "Consignor_status_idx" ON "Consignor"("status");

-- CreateIndex
CREATE INDEX "ConsignmentMovement_consignorId_idx" ON "ConsignmentMovement"("consignorId");

-- CreateIndex
CREATE INDEX "ConsignmentMovement_productId_idx" ON "ConsignmentMovement"("productId");

-- CreateIndex
CREATE INDEX "ConsignmentMovement_createdAt_idx" ON "ConsignmentMovement"("createdAt");

-- CreateIndex
CREATE INDEX "Product_tipe_idx" ON "Product"("tipe");

-- CreateIndex
CREATE INDEX "Product_consignorId_idx" ON "Product"("consignorId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_consignorId_fkey" FOREIGN KEY ("consignorId") REFERENCES "Consignor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentMovement" ADD CONSTRAINT "ConsignmentMovement_consignorId_fkey" FOREIGN KEY ("consignorId") REFERENCES "Consignor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentMovement" ADD CONSTRAINT "ConsignmentMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentMovement" ADD CONSTRAINT "ConsignmentMovement_dicatatOlehId_fkey" FOREIGN KEY ("dicatatOlehId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- CHECK constraints (BR-A, BR-C) — defense in depth di level database.
-- Ditulis sebagai raw SQL sesuai konvensi migrasi proyek ini.
-- ═══════════════════════════════════════════════════════════════════════════

-- BR-A: TITIPAN wajib punya consignorId, MILIK_SENDIRI wajib null.
ALTER TABLE "Product" ADD CONSTRAINT "Product_tipe_consignor_check"
  CHECK (
    ("tipe" = 'TITIPAN' AND "consignorId" IS NOT NULL)
    OR ("tipe" = 'MILIK_SENDIRI' AND "consignorId" IS NULL)
  );

-- BR-C: jumlah pergerakan selalu positif; arah ditentukan oleh `tipe`.
ALTER TABLE "ConsignmentMovement" ADD CONSTRAINT "ConsignmentMovement_jumlah_check"
  CHECK ("jumlah" > 0);

-- Stok hasil pergerakan tidak boleh negatif (retur melebihi stok ditolak).
ALTER TABLE "ConsignmentMovement" ADD CONSTRAINT "ConsignmentMovement_stokSesudah_check"
  CHECK ("stokSesudah" >= 0);
