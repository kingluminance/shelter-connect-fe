import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthSession } from '../../../shared/lib/useAuthSession';
import { fetchDogConversations } from '../api/conversations';
import type { DogConversation } from '../types';

export type DogConversationsState =
  | { status: 'anon' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; conversations: DogConversation[] };

/** 대화 탭 "강아지 대화" list. Login-gated; refetches on focus (a chat just had) and when the
 * search/filter changes (search is debounced). */
export function useDogConversations(query: { q: string; savedOnly: boolean }) {
  const session = useAuthSession();
  const [state, setState] = useState<DogConversationsState>({ status: 'loading' });
  const [version, setVersion] = useState(0);
  const { q, savedOnly } = query;

  useFocusEffect(useCallback(() => setVersion(v => v + 1), []));

  useEffect(() => {
    if (session.status !== 'signedIn') {
      setState(session.status === 'anon' ? { status: 'anon' } : { status: 'loading' });
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { data } = await fetchDogConversations({ q: q.trim() || undefined, savedOnly });
        if (!cancelled) {
          setState({ status: 'ready', conversations: data });
        }
      } catch (err) {
        if (!cancelled) {
          setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
        }
      }
    }, q ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [session.status, q, savedOnly, version]);

  return { state, reload: () => setVersion(v => v + 1) };
}
