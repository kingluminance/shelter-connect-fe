import { lastReadMineSequence, mergeMessages, newestSequence, postStatusLabel } from './messages';
import type { InquiryMessage } from './types';

const msg = (sequence: number, mine: boolean, text = `m${sequence}`): InquiryMessage => ({
  id: `id${sequence}`,
  roomId: 'r',
  sequence,
  senderId: mine ? 'me' : 'other',
  mine,
  kind: 'TEXT',
  text,
  mediaId: null,
  location: null,
  createdAt: '2026-10-01T00:00:00Z',
});

describe('mergeMessages', () => {
  test('orders by sequence and drops duplicates (incoming wins)', () => {
    const merged = mergeMessages([msg(1, false), msg(3, true)], [msg(2, false), msg(3, true, 'edited')]);
    expect(merged.map(m => m.sequence)).toEqual([1, 2, 3]);
    expect(merged[2].text).toBe('edited');
  });
});

describe('lastReadMineSequence', () => {
  const list = [msg(1, true), msg(2, false), msg(3, true), msg(4, true)];

  test('newest of my messages the counterpart has read', () => {
    expect(lastReadMineSequence(list, 3)).toBe(3);
    expect(lastReadMineSequence(list, 2)).toBe(1);
  });

  test('null when none are read yet', () => {
    expect(lastReadMineSequence(list, 0)).toBeNull();
  });
});

test('newestSequence', () => {
  expect(newestSequence([])).toBe(0);
  expect(newestSequence([msg(2, true), msg(5, false)])).toBe(5);
});

describe('postStatusLabel', () => {
  test('maps category + status like the Figma chips', () => {
    expect(postStatusLabel('LOST', 'ACTIVE')).toBe('찾는 중');
    expect(postStatusLabel('FOUND', 'ACTIVE')).toBe('보호 중');
    expect(postStatusLabel('LOST', 'REUNITED')).toBe('가족 만남');
    expect(postStatusLabel('NEIGHBOR_NEWS', 'ACTIVE')).toBe('동네 소식');
  });

  test('masked posts', () => {
    expect(postStatusLabel(null, null, false)).toBe('삭제된 글');
  });
});
