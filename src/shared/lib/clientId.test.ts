import { generateClientMessageId } from './clientId';

test('generates a v4-shaped UUID, unique per call', () => {
  const a = generateClientMessageId();
  const b = generateClientMessageId();
  expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(a).not.toBe(b);
});
