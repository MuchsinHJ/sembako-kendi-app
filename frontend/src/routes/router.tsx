import { createBrowserRouter } from 'react-router-dom';
import { RequireAuth } from '@/components/RequireAuth';
import { AppShell } from '@/components/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { KatalogPage } from '@/features/products/KatalogPage';
import { DetailProdukPage } from '@/features/products/DetailProdukPage';
import { PosPage } from '@/features/transactions/components/PosPage';
import { DebtsPage } from '@/features/transactions/components/DebtsPage';
import { RiwayatPage } from '@/features/transactions/components/RiwayatPage';
import { DaftarPenitipPage } from '@/features/consignors/components/DaftarPenitipPage';
import { DetailPenitipPage } from '@/features/consignors/components/DetailPenitipPage';
import { LaporanPenjualanPage } from '@/features/reports/components/LaporanPenjualanPage';
import { LaporanKonsinyasiPage } from '@/features/reports/components/LaporanKonsinyasiPage';
import { LaporanUtangPage } from '@/features/reports/components/LaporanUtangPage';
import { HomePage } from '@/features/dashboard/HomePage';
import { PATHS } from './paths';

/**
 * Router (SDD FE §4.1–4.3). Route privat: RequireAuth → AppShell → layar.
 */
export const router = createBrowserRouter([
  { path: PATHS.login, element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: PATHS.home, element: <HomePage /> },
          { path: PATHS.products, element: <KatalogPage /> },
          { path: PATHS.productDetail, element: <DetailProdukPage /> },
          { path: PATHS.pos, element: <PosPage /> },
          { path: PATHS.debts, element: <DebtsPage /> },
          { path: PATHS.history, element: <RiwayatPage /> },
          { path: PATHS.consignors, element: <DaftarPenitipPage /> },
          { path: PATHS.consignorDetail, element: <DetailPenitipPage /> },
          { path: PATHS.reportSales, element: <LaporanPenjualanPage /> },
          { path: PATHS.reportDebts, element: <LaporanUtangPage /> },
          { path: PATHS.reportConsignment, element: <LaporanKonsinyasiPage /> },
        ],
      },
    ],
  },
]);
