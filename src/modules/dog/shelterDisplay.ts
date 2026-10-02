// Pure display helpers for the 보호소 탭 (Figma 02) — kept out of the screen so they're testable.

export type HouseKind = 'warmth' | 'starlight' | 'lakeside';

// Figma's shared list houses (A 벽돌집 / B 초록 지붕 / C 분홍 지붕) aren't tied to a
// shelter by the design — map by the backend's mapKey, and spread unknown keys by name
// so a new map still gets a stable house.
const HOUSE_BY_MAP_KEY: Record<string, HouseKind> = {
  sunnyMeadow: 'warmth',
  woodlandTrail: 'starlight',
  lakesideRetreat: 'lakeside',
};
const HOUSE_ORDER: HouseKind[] = ['warmth', 'starlight', 'lakeside'];

export function houseKindFor(mapKey: string, name: string): HouseKind {
  const known = HOUSE_BY_MAP_KEY[mapKey];
  if (known) {
    return known;
  }
  let hash = 0;
  for (const ch of name) {
    hash = (hash + ch.charCodeAt(0)) % HOUSE_ORDER.length;
  }
  return HOUSE_ORDER[hash];
}

/** "1.2 km" — one decimal, null when the server had no reference point. */
export function formatDistanceKm(distanceMeters: number | null): string | null {
  if (distanceMeters === null) {
    return null;
  }
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

/** 로/으로 — 받침 있는 마지막 글자(ㄹ 받침 제외)면 "으로". */
export function withRoParticle(name: string): string {
  const last = name.trim().charCodeAt(name.trim().length - 1);
  const isHangul = last >= 0xac00 && last <= 0xd7a3;
  if (!isHangul) {
    return `${name}로`;
  }
  const finalConsonant = (last - 0xac00) % 28;
  return finalConsonant === 0 || finalConsonant === 8 ? `${name}로` : `${name}으로`;
}
