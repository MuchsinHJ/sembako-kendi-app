import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';
import { AuthProvider } from '@/features/auth/AuthProvider';
/**
 * Render dengan provider yang dibutuhkan (auth + query client).
 * Query client dibuat baru per panggilan supaya cache antar test bersih.
 */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    queryClient,
    ...render(ui, {
      wrapper: ({ children }: { children?: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      ),
      ...options,
    }),
  };
}
