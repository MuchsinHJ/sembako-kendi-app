import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

/**
 * Handler MSW untuk test data layer.
 * Path di sini relatif ke origin; MSW mencocokkan URL penuh.
 */

export const handlers = [
  http.get('*/api/v1/ping', () =>
    HttpResponse.json({ success: true, data: { pong: true } })
  ),

  http.get('*/api/v1/fail', () =>
    HttpResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Harga jual harus lebih dari 0',
          details: [{ field: 'hargaJual', issue: 'must be > 0' }],
        },
      },
      { status: 400 }
    )
  ),

  http.post('*/api/v1/upload', async ({ request }) => {
    const contentType = request.headers.get('Content-Type') ?? '';
    const hasAuth = request.headers.has('Authorization');
    return HttpResponse.json({ success: true, data: { contentType, hasAuth } });
  }),

  http.get('*/api/v1/export.xlsx', () =>
    new HttpResponse(new Blob(['x'], { type: 'application/octet-stream' }), {
      headers: { 'Content-Type': 'application/octet-stream' },
    })
  ),
];

export const server = setupServer(...handlers);
