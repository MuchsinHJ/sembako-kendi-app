import { describe, expect, it, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server';
import { renderWithProviders } from '../../test/helpers';
import { LoginPage } from './LoginPage';
import { getAccessToken, setAccessToken } from '@/lib/http';

function Providers({ initial, ui, login }: { initial: string; ui: React.ReactNode; login?: React.ReactNode }) {
  return (
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/login" element={login ?? <LoginPage />} />
        {ui}
      </Routes>
    </MemoryRouter>
  );
}

describe('LoginPage — integrasi login', () => {
  beforeEach(() => setAccessToken(null));

  it('sukses: simpan access token + navigasi ke target', async () => {
    server.use(
      http.post('*/auth/login', () =>
        HttpResponse.json({ success: true, data: { accessToken: 'token-dari-login' } })
      ),
      http.post('*/auth/refresh-token', () => new HttpResponse(null, { status: 401 }))
    );

    renderWithProviders(
      <Providers
        initial="/login"
        login={<LoginPage />}
        ui={<Route path="/" element={<div>beranda tujuan</div>} />}
      />
    );

    await userEvent.type(screen.getByLabelText(/email/i), 'pemilik@kendi.id');
    await userEvent.type(screen.getByLabelText(/kata sandi/i), 'rahasia123');
    await userEvent.click(screen.getByRole('button', { name: /masuk/i }));

    expect(await screen.findByText('beranda tujuan')).toBeInTheDocument();
    expect(getAccessToken()).toBe('token-dari-login');
  });

  it('kredensial salah: tampilkan pesan persis dari 04 §6', async () => {
    server.use(
      http.post('*/auth/login', () =>
        HttpResponse.json(
          { success: false, error: { code: 'AUTH_INVALID_CREDENTIALS', message: 'x' } },
          { status: 401 }
        )
      ),
      http.post('*/auth/refresh-token', () => new HttpResponse(null, { status: 401 }))
    );

    renderWithProviders(
      <Providers
        initial="/login"
        login={<LoginPage />}
        ui={<Route path="/" element={<div>beranda tujuan</div>} />}
      />
    );

    await userEvent.type(screen.getByLabelText(/email/i), 'salah@kendi.id');
    await userEvent.type(screen.getByLabelText(/kata sandi/i), 'salahjuga');
    await userEvent.click(screen.getByRole('button', { name: /masuk/i }));

    expect(
      await screen.findByText('Email atau kata sandi salah. Periksa kembali lalu coba lagi.')
    ).toBeInTheDocument();
    expect(getAccessToken()).toBeNull();
  });

  it('email kosong: tampilkan error validasi tanpa memanggil API', async () => {
    const loginSpy = vi.fn();
    server.use(http.post('*/auth/login', () => loginSpy()));
    renderWithProviders(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole('button', { name: /masuk/i }));

    expect(await screen.findByText(/Masukkan email/i)).toBeInTheDocument();
    expect(loginSpy).not.toHaveBeenCalled();
  });
});
