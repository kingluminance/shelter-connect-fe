import { formatClock, formatDayHeader, formatRoomTime, isSameDay } from './chatTime';

// Local-time constructors keep these independent of the machine's timezone.
const at = (month: number, day: number, h = 0, m = 0) => new Date(2026, month - 1, day, h, m).toISOString();

describe('formatClock', () => {
  test('12-hour clock with 오전/오후', () => {
    expect(formatClock(at(10, 1, 15, 35))).toBe('오후 3:35');
    expect(formatClock(at(10, 1, 9, 5))).toBe('오전 9:05');
    expect(formatClock(at(10, 1, 0, 0))).toBe('오전 12:00');
    expect(formatClock(at(10, 1, 12, 30))).toBe('오후 12:30');
  });
});

describe('formatRoomTime', () => {
  const now = new Date(2026, 9, 2, 18, 0);

  test('today shows the clock, or "오늘" when the clock is off', () => {
    expect(formatRoomTime(at(10, 2, 15, 35), now)).toBe('오후 3:35');
    expect(formatRoomTime(at(10, 2, 15, 35), now, false)).toBe('오늘');
  });

  test('yesterday and older', () => {
    expect(formatRoomTime(at(10, 1, 23, 59), now)).toBe('어제');
    expect(formatRoomTime(at(9, 28, 10, 0), now)).toBe('9월 28일');
  });
});

describe('day headers', () => {
  test('formats month/day/weekday', () => {
    expect(formatDayHeader(at(10, 1, 12))).toBe('10월 1일 목요일');
  });

  test('isSameDay compares calendar days', () => {
    expect(isSameDay(at(10, 1, 0, 1), at(10, 1, 23, 59))).toBe(true);
    expect(isSameDay(at(10, 1, 23, 59), at(10, 2, 0, 1))).toBe(false);
  });
});
