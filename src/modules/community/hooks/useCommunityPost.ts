import { useCallback, useEffect, useState } from 'react';
import { fetchCommunityComments, fetchCommunityPost } from '../api/posts';
import type { CommentKind, CommunityComment, CommunityPost } from '../types';

export type CommunityPostState =
  | { status: 'loading' }
  | { status: 'error'; message: string; code: string | null }
  | { status: 'ready'; post: CommunityPost };

export function useCommunityPost(postId: string) {
  const [state, setState] = useState<CommunityPostState>({ status: 'loading' });
  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const { data } = await fetchCommunityPost(postId);
      setState({ status: 'ready', post: data });
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : String(err), code: (err as { code?: string }).code ?? null });
    }
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  return { state, reload: load };
}

export type CommunityCommentsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; comments: CommunityComment[]; nextCursor: string | null; loadingMore: boolean };

/** Comments + sightings of a post, oldest first. `kind` narrows to one of the two. */
export function useCommunityComments(postId: string, kind: CommentKind | null) {
  const [state, setState] = useState<CommunityCommentsState>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    fetchCommunityComments(postId, { kind: kind ?? undefined }).then(
      page => !cancelled && setState({ status: 'ready', comments: page.data, nextCursor: page.nextCursor, loadingMore: false }),
      err => !cancelled && setState({ status: 'error', message: err instanceof Error ? err.message : String(err) }),
    );
    return () => {
      cancelled = true;
    };
  }, [postId, kind, version]);

  const loadMore = useCallback(async () => {
    if (state.status !== 'ready' || !state.nextCursor || state.loadingMore) {
      return;
    }
    const cursor = state.nextCursor;
    setState({ ...state, loadingMore: true });
    try {
      const page = await fetchCommunityComments(postId, { kind: kind ?? undefined, cursor });
      setState(prev =>
        prev.status === 'ready' ? { status: 'ready', comments: [...prev.comments, ...page.data], nextCursor: page.nextCursor, loadingMore: false } : prev,
      );
    } catch {
      setState(prev => (prev.status === 'ready' ? { ...prev, loadingMore: false } : prev));
    }
  }, [kind, postId, state]);

  return { state, loadMore, reload: () => setVersion(v => v + 1) };
}
