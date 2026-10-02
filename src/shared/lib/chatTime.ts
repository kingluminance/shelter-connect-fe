// Korean chat timestamps (Figma 04 대화 / 11 문의방). Pure — `now` is injectable for tests.

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const dayDiff = (a: Date, b: Date) => Math.round((startOfDay(a) - startOfDay(b)) / 86_400_000);

/** "오후 3:35" */
export function formatClock(iso: string): string {
  const d = new Date(iso);
  const hours = d.getHours();
  const meridiem = hours < 12 ? '오전' : '오후';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${meridiem} ${hour12}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** List-row time: today → clock (or "오늘" without it), yesterday → "어제", older → "10월 1일". */
export function formatRoomTime(iso: string, now: Date = new Date(), withClock = true): string {
  const d = new Date(iso);
  const diff = dayDiff(now, d);
  if (diff <= 0) {
    return withClock ? formatClock(iso) : '오늘';
  }
  if (diff === 1) {
    return '어제';
  }
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** "10월 1일 목요일" — the divider between days inside a room. */
export function formatDayHeader(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}`;
}

export function isSameDay(a: string, b: string): boolean {
  return dayDiff(new Date(a), new Date(b)) === 0;
}
