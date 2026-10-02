import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { createSecureAuthStorage } from './secureAuthStorage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn(),
}));
jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: { AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'device-only' },
  getGenericPassword: jest.fn(), setGenericPassword: jest.fn(),
}));

const key = 'sb-test-auth-token';
const service = `com.kingluminance.shelterconnectfe.auth.${key}`;
let secure: Map<string, string>;
let legacy: Map<string, string>;
beforeEach(() => {
  jest.resetAllMocks();
  secure = new Map(); legacy = new Map();
  (Keychain.getGenericPassword as jest.Mock).mockImplementation(async options =>
    secure.has(options.service) ? { password: secure.get(options.service) } : false);
  (Keychain.setGenericPassword as jest.Mock).mockImplementation(async (_user, value, options) => {
    secure.set(options.service, value); return { service: options.service };
  });
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async name => legacy.get(name) ?? null);
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async name => { legacy.delete(name); });
});

test('migrates the existing session once and preserves unrelated preferences', async () => {
  legacy.set(key, 'session-v1'); legacy.set('theme', 'light');
  expect(await createSecureAuthStorage().getItem(key)).toBe('session-v1');
  expect(legacy.has(key)).toBe(false); expect(legacy.get('theme')).toBe('light');
  expect(await createSecureAuthStorage().getItem(key)).toBe('session-v1');
  expect(Keychain.setGenericPassword).toHaveBeenCalledTimes(1);
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test('failed secure writes never delete the only copy or fall back to plaintext', async () => {
  legacy.set(key, 'old');
  (Keychain.setGenericPassword as jest.Mock).mockResolvedValueOnce(false);
  const storage = createSecureAuthStorage();
  await expect(storage.getItem(key)).rejects.toThrow('안전하게 저장');
  expect(legacy.get(key)).toBe('old');
  await expect(storage.setItem(key, 'new')).resolves.toBeUndefined();
  expect(await storage.getItem(key)).toBe('new');
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test('refresh and logout serialize; a new adapter cannot restore the old token', async () => {
  const storage = createSecureAuthStorage();
  await Promise.all([storage.setItem(key, 'refreshed'), storage.removeItem(key)]);
  expect(await createSecureAuthStorage().getItem(key)).toBeNull();
  expect(secure.get(service)).not.toContain('refreshed');
});

test('logout tombstone blocks stale plaintext even when cleanup was interrupted', async () => {
  legacy.set(key, 'stale');
  (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(new Error('storage unavailable'));
  await expect(createSecureAuthStorage().removeItem(key)).rejects.toThrow();
  expect(await createSecureAuthStorage().getItem(key)).toBeNull();
  expect(legacy.has(key)).toBe(false);
});

test('native storage failure fails closed instead of reading plaintext', async () => {
  (Keychain.getGenericPassword as jest.Mock).mockRejectedValueOnce(new Error('locked'));
  await expect(createSecureAuthStorage().getItem(key)).rejects.toThrow();
  expect(AsyncStorage.getItem).not.toHaveBeenCalled();
});

test('stores large sessions and SDK companion keys independently', async () => {
  const storage = createSecureAuthStorage();
  const value = 'token-fixture-'.repeat(800);
  await storage.setItem(key, value);
  await storage.setItem(`${key}-code-verifier`, 'pkce');
  await storage.removeItem(`${key}-code-verifier`);
  expect(await storage.getItem(key)).toBe(value);
  expect(Keychain.setGenericPassword).toHaveBeenCalledWith('supabase-session', expect.any(String),
    expect.objectContaining({ accessible: 'device-only' }));
});

test('malformed encrypted data never exposes its contents in an error', async () => {
  secure.set(service, 'private-token-invalid-json');
  await expect(createSecureAuthStorage().getItem(key)).rejects.toThrow('저장된 로그인 정보를 확인');
  expect(AsyncStorage.getItem).not.toHaveBeenCalled();
});
