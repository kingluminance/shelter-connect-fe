import { describeApproxTime, describeOccurredAt, groupComments, shortRegion, sortPosts } from './postText';
import type { CommunityComment, CommunityPost } from './types';

const comment = (id: string, parentId: string | null = null, kind: 'COMMENT' | 'SIGHTING' = 'COMMENT'): CommunityComment => ({
  id,
  postId: 'p',
  authorId: 'a',
  authorName: 'n',
  mine: false,
  kind,
  parentId,
  content: { text: id, location: null, mediaIds: [] },
  deleted: false,
  createdAt: '2026-10-01T00:00:00Z',
});

test('shortRegion keeps the neighborhood', () => {
  expect(shortRegion('춘천시 석사동')).toBe('석사동');
  expect(shortRegion('석사동')).toBe('석사동');
});

describe('describeOccurredAt', () => {
  const now = new Date(2026, 9, 2, 18, 0);
  test('today / yesterday / older', () => {
    expect(describeOccurredAt(new Date(2026, 9, 2, 9, 0).toISOString(), now)).toBe('오늘 오전');
    expect(describeOccurredAt(new Date(2026, 9, 1, 17, 0).toISOString(), now)).toBe('어제 오후');
    expect(describeOccurredAt(new Date(2026, 8, 28, 17, 0).toISOString(), now)).toBe('9월 28일');
  });
});

describe('groupComments', () => {
  test('attaches replies to their parent in order', () => {
    const threads = groupComments([comment('a'), comment('s', null, 'SIGHTING'), comment('r1', 'a'), comment('r2', 'a')]);
    expect(threads.map(t => t.comment.id)).toEqual(['a', 's']);
    expect(threads[0].replies.map(r => r.id)).toEqual(['r1', 'r2']);
    expect(threads[1].replies).toEqual([]);
  });

  test('replies whose parent was filtered out are not shown orphaned', () => {
    expect(groupComments([comment('r1', 'missing')])).toEqual([]);
  });
});

describe('describeApproxTime', () => {
  const now = new Date(2026, 9, 2, 18, 0);
  test('adds the hour to the day phrase', () => {
    expect(describeApproxTime(new Date(2026, 9, 1, 17, 10).toISOString(), now)).toBe('어제 오후 5시쯤');
    expect(describeApproxTime(new Date(2026, 8, 28, 9, 0).toISOString(), now)).toBe('9월 28일 오전 9시쯤');
  });
});

describe('sortPosts', () => {
  const post = (id: string, commentCount: number, sightingCount: number) => ({ id, commentCount, sightingCount }) as CommunityPost;
  it('ACTIVE orders by 제보+댓글, ties keep newest-first', () => {
    const posts = [post('a', 0, 0), post('b', 1, 2), post('c', 3, 0), post('d', 0, 0)];
    expect(sortPosts(posts, 'ACTIVE').map(p => p.id)).toEqual(['b', 'c', 'a', 'd']);
    expect(sortPosts(posts, 'RECENT')).toBe(posts);
  });
});
