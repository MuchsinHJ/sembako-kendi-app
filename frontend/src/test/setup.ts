import '@testing-library/jest-dom/vitest';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { queryClient } from '@/lib/queryClient';
import { server, resetProducts, resetTransactions } from './msw/server';
import { setAccessToken } from '@/lib/http';

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  // RTL cleanup otomatis (vitest globals). Sisanya manual:
  queryClient.clear();
  setAccessToken(null);
  server.resetHandlers();
  resetProducts();
  resetTransactions();
});
afterAll(() => server.close());