-- Uang tunai yang diserahkan pembeli pada saat transaksi dibuat.
-- Status pembayaran diturunkan dari nilai ini:
--   uangDiterima >= total -> LUNAS (kembalian = uangDiterima - total)
--   uangDiterima <  total -> UTANG (sisaSaldoUtang = total - uangDiterima)
ALTER TABLE "Transaction" ADD COLUMN "uangDiterima" DECIMAL(12, 2);
ALTER TABLE "Transaction" ADD COLUMN "kembalian" DECIMAL(12, 2);

-- Backfill data lama: transaksi LUNAS dianggap dibayar tepat sebesar total.
-- Transaksi UTANG lama dibiarkan NULL karena nominal uang muka tidak pernah dicatat.
UPDATE "Transaction"
SET "uangDiterima" = total,
    "kembalian" = 0
WHERE "statusPembayaran" = 'LUNAS';

-- Defense in depth (BR-07): nilai uang tidak boleh negatif.
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_uangDiterima_check"
  CHECK ("uangDiterima" IS NULL OR "uangDiterima" >= 0);
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_kembalian_check"
  CHECK ("kembalian" IS NULL OR "kembalian" >= 0);
