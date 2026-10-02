import type { CommentKind, CommunityCategory, CommunityComment } from './types';

export const CATEGORY_LABEL: Record<CommunityCategory, string> = {
  LOST: '찾고 있어요',
  FOUND: '발견했어요',
  NEIGHBOR_NEWS: '동네 소식',
};

/** "춘천시 석사동" → "석사동" — the card shows just the last (neighborhood) part. */
export function shortRegion(regionLabel: string): string {
  const parts = regionLabel.trim().split(/\s+/);
  return parts[parts.length - 1] ?? regionLabel;
}

/** "어제 오후" / "오늘 오전" / "10월 1일" — when something happened, loosely (card + facts). */
export function describeOccurredAt(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const days = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86_400_000,
  );
  const half = d.getHours() < 12 ? '오전' : '오후';
  if (days === 0) return `오늘 ${half}`;
  if (days === 1) return `어제 ${half}`;
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** "어제 오후 5시쯤" — the detail screen's loose time (the API stores an exact instant). */
export function describeApproxTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const hours = d.getHours();
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const day = describeOccurredAt(iso, now);
  return /오전|오후/.test(day) ? `${day} ${hour12}시쯤` : `${day} ${d.getHours() < 12 ? '오전' : '오후'} ${hour12}시쯤`;
}

export interface CommentThread {
  comment: CommunityComment;
  replies: CommunityComment[];
}

/** Top-level comments/sightings in server order with their (one-level) replies attached.
 * A reply whose parent isn't in the list (filtered out by `kind`) is dropped from the top level
 * rather than shown orphaned. */
export function groupComments(comments: CommunityComment[]): CommentThread[] {
  const byParent = new Map<string, CommunityComment[]>();
  for (const comment of comments) {
    if (comment.parentId) {
      byParent.set(comment.parentId, [...(byParent.get(comment.parentId) ?? []), comment]);
    }
  }
  return comments.filter(c => !c.parentId).map(comment => ({ comment, replies: byParent.get(comment.id) ?? [] }));
}

export function commentKindLabel(kind: CommentKind): string {
  return kind === 'SIGHTING' ? '목격 제보' : '댓글';
}
