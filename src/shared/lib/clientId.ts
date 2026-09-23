// ponytail: Math.random-based UUID v4, not crypto-secure — fine here, it's only a
// client-side idempotency key for chat message dedup, not a security token. Swap for
// react-native-get-random-values + crypto.randomUUID if that ever changes.
export function generateClientMessageId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r % 4) + 8;
    return v.toString(16);
  });
}
