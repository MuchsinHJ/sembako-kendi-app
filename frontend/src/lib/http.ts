/**
 * Satu pintu HTTP (SDD FE §5.1–§5.2b).
 *
 * Aturan keras:
 * - Dilarang axios. Semua request lewat sini.
 * - Komponen tidak pernah parse `res.ok` — semua error dilempar sebagai `ApiError`.
 * - `credentials: 'include'` selalu dikirim agar cookie refresh (httpOnly) ikut.
 * - Access token hanya di memori — tidak pernah menyentuh localStorage/sessionStorage.
 * - FormData tidak diberi `Content-Type` manual — biar browser set boundary-nya.
 */

const API_PREFIX = '/api/v1';

/** Access token disimpan di modul-scope (memori tab), bukan storage. */
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    /** Bentuk `details` bergantung error backend (Zod → daftar field/issue; BR-E → `{ products }`). */
    readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** URL refresh dianggap publik: 401 di sini jangan picu refresh lagi. */
function isRefreshPath(path: string): boolean {
  return path.includes('/auth/refresh-token') || path.includes('/auth/login');
}

type ApiInit = RequestInit & { auth?: boolean; raw?: boolean };

/**
 * Satu refresh in-flight dibagi ke semua request 401 paralel,
 * supaya tidak terjadi loop / burst refresh berulang.
 */
let refreshInFlight: Promise<boolean> | null = null;

function doRefresh(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}${API_PREFIX}/auth/refresh-token`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return false;
      const json = (await res.json()) as { data?: { accessToken?: string } };
      const token = json.data?.accessToken;
      if (!token) return false;
      setAccessToken(token);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export async function apiFetch<T>(path: string, opts: ApiInit = {}): Promise<T> {
  const { auth = true, raw = false, ...init } = opts;

  const buildInit = (token: string | null): RequestInit => ({
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  let res = await fetch(`${import.meta.env.VITE_API_BASE}${API_PREFIX}${path}`, buildInit(getAccessToken()));

  // 401 sekali: refresh → ulangi request asli. Jangan coba lagi kalau masih 401.
  if (res.status === 401 && auth && !isRefreshPath(path)) {
    const ok = await doRefresh();
    if (ok) {
      res = await fetch(`${import.meta.env.VITE_API_BASE}${API_PREFIX}${path}`, buildInit(getAccessToken()));
    }
  }

  if (raw) return res as unknown as T; // untuk unduh blob (ekspor laporan)

  const json = (await res.json().catch(() => null)) as
    | { success?: boolean; data?: T; error?: { code?: string; message?: string; details?: ApiError['details'] } }
    | null;

  if (!res.ok || json?.success === false) {
    throw new ApiError(
      res.status,
      json?.error?.code ?? 'UNKNOWN',
      json?.error?.message ?? 'Terjadi kesalahan.',
      json?.error?.details
    );
  }

  return json?.data as T;
}
