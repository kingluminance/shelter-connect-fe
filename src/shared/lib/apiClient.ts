import { API_BASE_URL } from '@env';
import { supabase } from './supabase';
import { notifyAuthExpired } from './authExpired';

// 보호소 커넥트 백엔드(Spring Boot) 계약: docs/api-conventions.md 참고
export class ApiError extends Error {
  code: string;
  requestId: string;

  constructor(code: string, message: string, requestId: string) {
    super(message);
    this.code = code;
    this.requestId = requestId;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  // Supabase's client refreshes the token itself and reads its cached session —
  // no network call unless the token actually needs refreshing. supabase is null
  // until SUPABASE_ANON_KEY is set, which just means no token — public endpoints
  // still work.
  const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    // fetch only rejects when no response arrived at all (offline, DNS, timeout) — screens
    // show the 연결 오류 view for this code and offer a retry.
    throw new ApiError('NETWORK_ERROR', '인터넷 연결을 확인해 주세요.', '');
  }

  if (response.status === 401 && token) {
    notifyAuthExpired();
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      body?.code ?? 'UNKNOWN_ERROR',
      body?.message ?? response.statusText,
      body?.requestId ?? '',
    );
  }

  return response.json();
}
