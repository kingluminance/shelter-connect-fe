import type { InquiryMessage, PostCategory, PostStatus } from './types';

/** Merges fetched messages into the list: de-duplicates by sequence (the server copy wins over
 * an optimistic one) and keeps ascending order. */
export function mergeMessages(existing: InquiryMessage[], incoming: InquiryMessage[]): InquiryMessage[] {
  const bySequence = new Map<number, InquiryMessage>();
  for (const message of [...existing, ...incoming]) {
    bySequence.set(message.sequence, message);
  }
  return [...bySequence.values()].sort((a, b) => a.sequence - b.sequence);
}

/** The "읽음" mark sits under my newest message the counterpart has read — null if none yet. */
export function lastReadMineSequence(messages: InquiryMessage[], counterpartReadSequence: number): number | null {
  let found: number | null = null;
  for (const message of messages) {
    if (message.mine && message.sequence <= counterpartReadSequence) {
      found = message.sequence;
    }
  }
  return found;
}

/** Highest sequence the user has seen — what to send to PUT /read. */
export function newestSequence(messages: InquiryMessage[]): number {
  return messages.reduce((max, m) => Math.max(max, m.sequence), 0);
}

// Figma status chip on the related-post row ("찾는 중" / "보호 중" / "가족 만남" ...).
export function postStatusLabel(category: PostCategory | null, status: PostStatus | null, available = true): string {
  if (!available || !category || !status) {
    return '삭제된 글';
  }
  if (status === 'REUNITED') return '가족 만남';
  if (status === 'CLOSED') return '종료';
  if (status === 'TRANSFERRED') return '인계 완료';
  if (category === 'LOST') return '찾는 중';
  if (category === 'FOUND') return '보호 중';
  return '동네 소식';
}

export const POST_CATEGORY_LABEL: Record<PostCategory, string> = {
  LOST: '찾고 있어요',
  FOUND: '발견했어요',
  NEIGHBOR_NEWS: '동네 소식',
};
