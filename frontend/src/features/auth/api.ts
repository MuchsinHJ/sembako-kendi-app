import { useMutation } from '@tanstack/react-query';
import { apiFetch, setAccessToken } from '@/lib/http';
import type { LoginInput } from './schemas';

/** Envelope login: backend kirim access token, set refresh cookie via httpOnly. */
export interface LoginData {
  accessToken: string;
}

/** Pesan pasti dari backend utk kredensial salah (04 §6). */
export const LOGIN_FAIL_MESSAGE = 'Identitas atau kata sandi tidak cocok. Periksa kembali dan coba lagi.';

export function loginApi(input: LoginInput): Promise<LoginData> {
  return apiFetch<LoginData>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
    auth: false,
  });
}

export function logoutApi(): Promise<null> {
  return apiFetch<null>('/auth/logout', { method: 'POST' });
}

/** `success => boolean` — dipakai boot guard. 401 = tidak ada session. */
export async function refreshTokenApi(): Promise<boolean> {
  try {
    const data = await apiFetch<LoginData>('/auth/refresh-token', { method: 'POST', auth: false });
    if (!data?.accessToken) return false;
    setAccessToken(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

/** Hook login: simpan token ke memori tanpa retry (mutasi). */
export function useLogin() {
  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const data = await loginApi(input);
      setAccessToken(data.accessToken);
      return data;
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      // Backend merevoke refresh cookie; token bersih walau request gagal.
      await logoutApi().catch(() => undefined);
      setAccessToken(null);
      return true;
    },
  });
}
