import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';

/**
 * Guard route privat (SDD FE §4.3 — pakai React Router, bukan TanStack Router).
 * Boot refresh sudah dijalankan <AuthProvider>; di sini cuma baca status.
 */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    // Loading state wajib (skeleton, bukan spinner penuh).
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg" role="status" aria-label="Memuat">
        <div className="flex w-64 flex-col gap-3">
          <div className="h-20 rounded-card bg-surface-muted" />
          <div className="h-4 w-3/4 rounded bg-surface-muted" />
          <div className="h-4 w-1/2 rounded bg-surface-muted" />
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
