import { apiFetch, ApiError } from './apiClient';
import { notifyAuthExpired } from './authExpired';

jest.mock('./supabase', () => ({
  supabase: { auth: { getSession: jest.fn(async () => ({ data: { session: { access_token: 'tok' } } })) } },
}));
jest.mock('./authExpired', () => ({ notifyAuthExpired: jest.fn() }));

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.clearAllMocks();
});

test('a fetch that never gets a response becomes NETWORK_ERROR', async () => {
  globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
  await expect(apiFetch('/v1/shelters')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  await expect(apiFetch('/v1/shelters')).rejects.toBeInstanceOf(ApiError);
});

test('401 on a request that carried a token announces the expiry', async () => {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 401,
    statusText: 'Unauthorized',
    json: async () => ({ code: 'UNAUTHENTICATED', message: 'expired', requestId: 'r1' }),
  });
  await expect(apiFetch('/v1/me')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  expect(notifyAuthExpired).toHaveBeenCalledTimes(1);
});

test('other errors keep their server code and do not announce expiry', async () => {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 500,
    statusText: 'Server Error',
    json: async () => ({ code: 'INTERNAL_ERROR', message: 'oops', requestId: 'r2' }),
  });
  await expect(apiFetch('/v1/shelters')).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
  expect(notifyAuthExpired).not.toHaveBeenCalled();
});
