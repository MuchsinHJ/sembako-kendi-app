import { createBrowserRouter } from 'react-router-dom';
import { RequireAuth } from '@/components/RequireAuth';
import { AppShell } from '@/components/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { KatalogPage } from '@/features/products/KatalogPage';
import { DetailProdukPage } from '@/features/products/DetailProdukPage';
import { PosPage } from '@/features/transactions/components/PosPage';
import { DebtsPage } from '@/features/transactions/components/DebtsPage';
import { RiwayatPage } from '@/features/transactions/components/RiwayatPage';
import { HomeStub } from './HomeStub';
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
          { path: PATHS.home, element: <HomeStub /> },
          { path: PATHS.products, element: <KatalogPage /> },
          { path: PATHS.productDetail, element: <DetailProdukPage /> },
          { path: PATHS.pos, element: <PosPage /> },
          { path: PATHS.debts, element: <DebtsPage /> },
          { path: PATHS.history, element: <RiwayatPage /> },
        ],
      },
    ],
  },
]);
