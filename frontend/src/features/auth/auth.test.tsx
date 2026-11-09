import { describe, expect, it, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from './useAuth';
import { LoginPage } from './LoginPage';
import { setAccessToken } from '@/lib/http';
import { renderWithProviders } from '../../test/helpers';

describe('RequireAuth', () => {
  beforeEach(() => setAccessToken(null));

  it('tanpa token: redirect ke /login', async () => {
    renderWithProviders(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/" element={<div>beranda</div>} />
          </Route>
          <Route path="/login" element={<div>halaman login</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByText('halaman login')).toBeInTheDocument();
  });

  it('dengan token: render route privat setelah boot', async () => {
    setAccessToken('token-ada');
    renderWithProviders(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/" element={<div>beranda</div>} />
          </Route>
          <Route path="/login" element={<div>halaman login</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByText('beranda')).toBeInTheDocument();
  });

  it('exposes setAuthenticated via useAuth', () => {
    let probeResult: ReturnType<typeof useAuth> | undefined;
    function Probe() {
      probeResult = useAuth();
      return null;
    }
    renderWithProviders(
      <MemoryRouter>
        <Probe />
      </MemoryRouter>
    );
    expect(typeof probeResult?.setAuthenticated).toBe('function');
  });
});

describe('LoginPage — render awal', () => {
  it('menampilkan field email, password, tombol Masuk', () => {
    renderWithProviders(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/kata sandi/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /masuk/i })).toBeInTheDocument();
  });
});
