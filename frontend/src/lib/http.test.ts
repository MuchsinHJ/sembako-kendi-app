import { describe, expect, it } from 'vitest';
import { apiFetch, ApiError, setAccessToken } from './http';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server';

describe('apiFetch', () => {
  it('sukses: kembalikan data dari envelope', async () => {
    const data = await apiFetch<{ pong: boolean }>('/ping');
    expect(data).toEqual({ pong: true });
  });

  it('gagal: lempar ApiError dari envelope error', async () => {
    const err = await apiFetch('/fail').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(400);
    expect((err as ApiError).code).toBe('VALIDATION_ERROR');
    expect((err as ApiError).message).toBe('Harga jual harus lebih dari 0');
    expect((err as ApiError).details).toEqual([{ field: 'hargaJual', issue: 'must be > 0' }]);
  });

  it('menyuntikkan Authorization saat token ada', async () => {
    setAccessToken('token-abc');
    server.use(
      http.get('*/api/v1/ping', ({ request }) =>
        HttpResponse.json({ success: true, data: { auth: request.headers.get('Authorization') } })
      )
    );
    const data = await apiFetch<{ auth: string }>('/ping');
    expect(data.auth).toBe('Bearer token-abc');
  });

  it('tanpa token / auth=false: tidak ada header Authorization', async () => {
    server.use(
      http.get('*/api/v1/ping', ({ request }) =>
        HttpResponse.json({ success: true, data: { auth: request.headers.get('Authorization') } })
      )
    );
    const data = await apiFetch<{ auth: string | null }>('/ping', { auth: false });
    expect(data.auth).toBeNull();
  });

  it('FormData: Content-Type tidak diset manual (biarkan browser set boundary)', async () => {
    const form = new FormData();
    form.append('foto', new Blob(['x'], { type: 'image/png' }), 'a.png');
    const data = await apiFetch<{ contentType: string; hasAuth: boolean }>('/upload', {
      method: 'POST',
      body: form,
    });
    expect(data.contentType).not.toContain('application/json');
  });

  it('mode raw: kembalikan Response utuh (untuk blob ekspor)', async () => {
    const res = await apiFetch<Response>('/export.xlsx', { raw: true });
    expect(res).toBeInstanceOf(Response);
    const blob = await res.blob();
    expect(blob.size).toBeGreaterThan(0);
  });

  it('401 → refresh sekali → ulangi request asli dengan token baru', async () => {
    let calls = 0;
    let refreshCalls = 0;
    server.use(
      http.get('*/api/v1/secure', ({ request }) => {
        calls++;
        if (calls === 1 || !request.headers.get('Authorization')?.includes('token-baru')) {
          return new HttpResponse(null, { status: 401 });
        }
        return HttpResponse.json({ success: true, data: { ok: true } });
      }),
      http.post('*/auth/refresh-token', () => {
        refreshCalls++;
        setAccessToken('token-baru');
        return HttpResponse.json({ success: true, data: { accessToken: 'token-baru' } });
      })
    );

    const data = await apiFetch<{ ok: boolean }>('/secure');
    expect(data.ok).toBe(true);
    expect(refreshCalls).toBe(1);
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it('401 dan refresh gagal → ApiError 401, tanpa loop', async () => {
    let calls = 0;
    let refreshCalls = 0;
    server.use(
      http.get('*/api/v1/secure', () => {
        calls++;
        return new HttpResponse(null, { status: 401 });
      }),
      http.post('*/auth/refresh-token', () => {
        refreshCalls++;
        return new HttpResponse(null, { status: 401 });
      })
    );

    const err = await apiFetch('/secure').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
    expect(refreshCalls).toBe(1);
    expect(calls).toBe(1); // refresh gagal → langsung gagal, request asli tidak diulang
  });

  it('401 paralel berbagi satu promise refresh', async () => {
    let refreshCalls = 0;
    let calls = 0;
    server.use(
      http.get('*/api/v1/secure', ({ request }) => {
        calls++;
        if (request.headers.get('Authorization')?.includes('token-baru')) {
          return HttpResponse.json({ success: true, data: { ok: true } });
        }
        return new HttpResponse(null, { status: 401 });
      }),
      http.post('*/auth/refresh-token', async () => {
        refreshCalls++;
        await new Promise((r) => setTimeout(r, 20));
        setAccessToken('token-baru');
        return HttpResponse.json({ success: true, data: { accessToken: 'token-baru' } });
      })
    );

    const [a, b] = await Promise.all([apiFetch('/secure'), apiFetch('/secure')]);
    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
    expect(refreshCalls).toBe(1);
    expect(calls).toBe(4); // 2 request awal 401 + 2 retry sukses
  });

  it('refresh token path: 401 di refresh itu sendiri tidak memicu refresh lagi', async () => {
    let refreshCalls = 0;
    server.use(
      http.post('*/auth/refresh-token', () => {
        refreshCalls++;
        return new HttpResponse(null, { status: 401 });
      })
    );
    const err = await apiFetch('/auth/refresh-token', { method: 'POST', auth: false }).catch((e) => e);
    expect((err as ApiError).status).toBe(401);
    expect(refreshCalls).toBe(1);
  });
});
