ALTER TABLE "Product" ADD CONSTRAINT "Product_hargaJual_check" CHECK ("hargaJual" > 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_stok_check" CHECK ("stok" >= 0);
ALTER TABLE "DetailTransaction" ADD CONSTRAINT "DetailTransaction_jumlah_check" CHECK ("jumlah" > 0);
