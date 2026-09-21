import { API_BASE_URL } from '@env';
import { supabase } from './supabase';

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
  // no network call unless the token actually needs refreshing.
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

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
