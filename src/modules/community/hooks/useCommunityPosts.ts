import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthSession } from '../../../shared/lib/useAuthSession';
import { fetchCommunityPosts } from '../api/posts';
import type { CommunityCategory, CommunityPost } from '../types';

export type CommunityPostsState =
  | { status: 'anon' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; posts: CommunityPost[]; nextCursor: string | null; loadingMore: boolean };

/** Newest-first feed. Search is debounced; a new query/filter/region starts over from page 1
 * (cursors are tied to the query — community-api.md), and the screen refetches on focus. */
export function useCommunityPosts(query: { q: string; category: CommunityCategory | null; region: string | null }) {
  const session = useAuthSession();
  const [state, setState] = useState<CommunityPostsState>({ status: 'loading' });
  const [version, setVersion] = useState(0);
  const generation = useRef(0);
  const { q, category, region } = query;

  useFocusEffect(useCallback(() => setVersion(v => v + 1), []));

  useEffect(() => {
    if (session.status !== 'signedIn') {
      setState(session.status === 'anon' ? { status: 'anon' } : { status: 'loading' });
      return;
    }
    const mine = ++generation.current;
    const timer = setTimeout(async () => {
      try {
        const page = await fetchCommunityPosts({ q: q.trim() || undefined, category: category ?? undefined, region: region ?? undefined, limit: 20 });
        if (generation.current === mine) {
          setState({ status: 'ready', posts: page.data, nextCursor: page.nextCursor, loadingMore: false });
        }
      } catch (err) {
        if (generation.current === mine) {
          setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
        }
      }
    }, q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [session.status, q, category, region, version]);

  const loadMore = useCallback(async () => {
    if (state.status !== 'ready' || !state.nextCursor || state.loadingMore) {
      return;
    }
    const mine = generation.current;
    const cursor = state.nextCursor;
    setState({ ...state, loadingMore: true });
    try {
      const page = await fetchCommunityPosts({ q: q.trim() || undefined, category: category ?? undefined, region: region ?? undefined, limit: 20, cursor });
      if (generation.current === mine) {
        setState(prev =>
          prev.status === 'ready' ? { status: 'ready', posts: [...prev.posts, ...page.data], nextCursor: page.nextCursor, loadingMore: false } : prev,
        );
      }
    } catch {
      setState(prev => (prev.status === 'ready' ? { ...prev, loadingMore: false } : prev));
    }
  }, [category, q, region, state]);

  return { state, loadMore, reload: () => setVersion(v => v + 1) };
}
