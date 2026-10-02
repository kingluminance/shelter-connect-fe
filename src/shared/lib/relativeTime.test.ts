import { formatRelativeTime } from './relativeTime';

const now = new Date('2026-10-02T12:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

test('formats age in the largest sensible unit', () => {
  expect(formatRelativeTime(ago(20_000), now)).toBe('방금 전');
  expect(formatRelativeTime(ago(10 * 60_000), now)).toBe('10분 전');
  expect(formatRelativeTime(ago(3 * 3_600_000), now)).toBe('3시간 전');
  expect(formatRelativeTime(ago(50 * 3_600_000), now)).toBe('2일 전');
});
