import { createBrowserRouter } from 'react-router-dom';
import { RequireAuth } from '@/components/RequireAuth';
import { LoginPage } from '@/features/auth/LoginPage';
import App from '@/App';
import { PATHS } from './paths';

/**
 * Router tunggal (SDD FE §4.1–4.3). Route privat dibungkus RequireAuth.
 * Layar lain menyusul per fase — semua menggantikan <App/> sebagai index.
 */
export const router = createBrowserRouter([
  { path: PATHS.login, element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [{ path: PATHS.home, element: <App /> }],
  },
]);
