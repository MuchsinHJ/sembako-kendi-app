/** Konstanta path — hindari magic string (SDD FE §3). */
export const PATHS = {
  login: '/login',
  home: '/',
  products: '/produk',
  productDetail: '/produk/:id',
  pos: '/transaksi',
  debts: '/utang',
  history: '/riwayat',
  consignors: '/penitip',
  consignorDetail: '/penitip/:id',
  reportSales: '/laporan/penjualan',
  reportConsignment: '/laporan/konsinyasi',
} as const;
