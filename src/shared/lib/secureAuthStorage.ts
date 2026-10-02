import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

// Supabase owns the storage keys, including its PKCE/user companion keys.
// Only those keys are migrated; other app preferences remain in AsyncStorage.
export function createSecureAuthStorage() {
  let pending: Promise<unknown> = Promise.resolve();
  function serialize<T>(operation: () => Promise<T>): Promise<T> {
    const next = pending.then(operation);
    pending = next.catch(() => undefined);
    return next;
  }
  const options = (key: string) => ({
    service: `com.kingluminance.shelterconnectfe.auth.${key}`,
    accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
  async function write(key: string, value: string | null) {
    const saved = await Keychain.setGenericPassword(
      'supabase-session', JSON.stringify({ version: 1, value }), options(key),
    );
    if (!saved) {
      throw new Error('로그인 정보를 안전하게 저장하지 못했어요. 다시 시도해 주세요.');
    }
  }
  return {
    getItem(key: string): Promise<string | null> {
      return serialize(async () => {
        const stored = await Keychain.getGenericPassword(options(key));
        if (stored) {
          let record: { version?: unknown; value?: unknown };
          try {
            record = JSON.parse(stored.password);
            if (!record || record.version !== 1 ||
                (record.value !== null && typeof record.value !== 'string')) {
              throw new Error();
            }
          } catch {
            // Do not include native errors, tokens or stored data in logs/errors.
            throw new Error('저장된 로그인 정보를 확인하지 못했어요.');
          }
          await AsyncStorage.removeItem(key);
          return record.value as string | null;
        }
        const legacy = await AsyncStorage.getItem(key);
        if (legacy !== null) {
          // Delete plaintext only AFTER the encrypted write succeeds.
          await write(key, legacy);
          await AsyncStorage.removeItem(key);
        }
        return legacy;
      });
    },
    setItem(key: string, value: string): Promise<void> {
      return serialize(async () => {
        await write(key, value);
        await AsyncStorage.removeItem(key);
      });
    },
    removeItem(key: string): Promise<void> {
      return serialize(async () => {
        // A null tombstone prevents an interrupted legacy cleanup from restoring
        // a logged-out session on next launch. No token remains in Keychain.
        await write(key, null);
        await AsyncStorage.removeItem(key);
      });
    },
  };
}

export const secureAuthStorage = createSecureAuthStorage();
