import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';
import { AuthProvider } from '@/features/auth/AuthProvider';
/**
 * Render dengan provider yang dibutuhkan (auth + query client).
 * Query client dibuat baru per panggilan supaya cache antar test bersih.
 */
/**
 * Simulasikan lebar viewport untuk `useMediaQuery` (query `min-width: Npx`).
 * Kembalikan fungsi pemulih; panggil di `afterEach`.
 */
export function mockViewport(width: number): () => void {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => {
    const m = /min-width:\s*(\d+)px/.exec(query);
    return {
      matches: m ? width >= Number(m[1]) : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    };
  }) as unknown as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

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
