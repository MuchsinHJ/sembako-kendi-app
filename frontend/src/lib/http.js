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
let accessToken = null;
export function getAccessToken() {
    return accessToken;
}
export function setAccessToken(token) {
    accessToken = token;
}
export class ApiError extends Error {
    status;
    code;
    details;
    constructor(status, code, message, details) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
        this.name = 'ApiError';
    }
}
/** URL refresh dianggap publik: 401 di sini jangan picu refresh lagi. */
function isRefreshPath(path) {
    return path.includes('/auth/refresh-token') || path.includes('/auth/login');
}
/**
 * Satu refresh in-flight dibagi ke semua request 401 paralel,
 * supaya tidak terjadi loop / burst refresh berulang.
 */
let refreshInFlight = null;
function doRefresh() {
    refreshInFlight ??= (async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE}${API_PREFIX}/auth/refresh-token`, {
                method: 'POST',
                credentials: 'include',
            });
            if (!res.ok)
                return false;
            const json = (await res.json());
            const token = json.data?.accessToken;
            if (!token)
                return false;
            setAccessToken(token);
            return true;
        }
        catch {
            return false;
        }
        finally {
            refreshInFlight = null;
        }
    })();
    return refreshInFlight;
}
export async function apiFetch(path, opts = {}) {
    const { auth = true, raw = false, ...init } = opts;
    const buildInit = (token) => ({
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
    if (raw)
        return res; // untuk unduh blob (ekspor laporan)
    const json = (await res.json().catch(() => null));
    if (!res.ok || json?.success === false) {
        throw new ApiError(res.status, json?.error?.code ?? 'UNKNOWN', json?.error?.message ?? 'Terjadi kesalahan.', json?.error?.details);
    }
    return json?.data;
}
