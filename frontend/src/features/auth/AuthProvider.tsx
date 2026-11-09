import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { getAccessToken, setAccessToken } from '@/lib/http';
import { refreshTokenApi } from './api';
import { AuthContext, type AuthContextValue, type AuthStatus } from './AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [bootstrapDone, setBootstrapDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Boot: restore session via httpOnly cookie sekali sebelum render privat.
      const ok = getAccessToken() !== null || (await refreshTokenApi());
      if (cancelled) return;
      setStatus(ok ? 'authenticated' : 'unauthenticated');
      setBootstrapDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      bootstrapDone,
      setAuthenticated: (token) => {
        setAccessToken(token);
        setStatus(token ? 'authenticated' : 'unauthenticated');
      },
    }),
    [status, bootstrapDone]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
