import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@env';

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

const AUTH_TOKEN_KEY = 'auth_token';

export async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}

export async function setAuthToken(token: string | null): Promise<void> {
  if (token) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAuthToken();

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
