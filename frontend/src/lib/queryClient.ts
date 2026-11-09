import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './http';

/**
 * Query client tunggal (SDD FE §5.3).
 * - Query 4xx tidak di-retry; 5xx / jaringan maksimal 2 kali.
 * - Mutasi tidak pernah auto-retry (cegah POST /transactions ganda).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (count, err) => {
        if (err instanceof ApiError && err.status >= 400 && err.status < 500) return false;
        return count < 2;
      },
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
});
