import '@testing-library/jest-dom/vitest';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { queryClient } from '@/lib/queryClient';
import { server, resetProducts, resetTransactions, resetConsignors, resetReportFixtures } from './msw/server';
import { setAccessToken } from '@/lib/http';

// JSDOM tidak punya matchMedia. Default: mobile (query min-width → false),
// supaya test menguji layout mobile seperti sebelumnya.
beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = () => 'blob:mock-url';
    window.URL.revokeObjectURL = () => {};
  }
  server.listen({ onUnhandledRequest: 'bypass' });
});
afterEach(() => {
  // RTL cleanup otomatis (vitest globals). Sisanya manual:
  queryClient.clear();
  setAccessToken(null);
  server.resetHandlers();
  resetProducts();
  resetTransactions();
  resetConsignors();
  resetReportFixtures();
});
afterAll(() => server.close());