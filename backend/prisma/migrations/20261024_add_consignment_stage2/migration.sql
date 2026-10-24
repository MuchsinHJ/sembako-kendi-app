-- ═══════════════════════════════════════════════════════════════════════════
-- Fitur Penitipan Barang (Konsinyasi) — Tahap 2
-- Setoran ke penitip (ConsignorPayment) beserta constraint & index pendukung.
--
-- Sifat migrasi: ADITIF. Tidak ada tabel/kolom lama yang diubah.
-- ═══════════════════════════════════════════════════════════════════════════

-- CreateTable
CREATE TABLE "ConsignorPayment" (
    "id" TEXT NOT NULL,
    "consignorId" TEXT NOT NULL,
    "tanggalBayar" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jumlahBayar" DECIMAL(12,2) NOT NULL,
    "saldoSetelahBayar" DECIMAL(12,2) NOT NULL,
    "catatan" TEXT,
    "dicatatOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsignorPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsignorPayment_consignorId_idx" ON "ConsignorPayment"("consignorId");

-- AddForeignKey
ALTER TABLE "ConsignorPayment" ADD CONSTRAINT "ConsignorPayment_consignorId_fkey" FOREIGN KEY ("consignorId") REFERENCES "Consignor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignorPayment" ADD CONSTRAINT "ConsignorPayment_dicatatOlehId_fkey" FOREIGN KEY ("dicatatOlehId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- CHECK constraint (BR-D) — defense in depth di level database.
-- ═══════════════════════════════════════════════════════════════════════════

-- BR-D: jumlah setoran selalu positif; arah (pembayaran ke penitip) implisit.
ALTER TABLE "ConsignorPayment" ADD CONSTRAINT "ConsignorPayment_jumlahBayar_check"
  CHECK ("jumlahBayar" > 0);
