import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthSession } from '../../../shared/lib/useAuthSession';
import { fetchInquiryRooms } from '../api/rooms';
import type { InquiryRoom } from '../types';

export type InquiryRoomsState =
  | { status: 'anon' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; rooms: InquiryRoom[]; unreadRoomCount: number };

/** 대화 탭 "이웃 문의" list + the unread-room count for the tab badge / "안 읽음" chip. */
export function useInquiryRooms(query: { q: string; unreadOnly: boolean }) {
  const session = useAuthSession();
  const [state, setState] = useState<InquiryRoomsState>({ status: 'loading' });
  const [version, setVersion] = useState(0);
  const { q, unreadOnly } = query;

  useFocusEffect(useCallback(() => setVersion(v => v + 1), []));

  useEffect(() => {
    if (session.status !== 'signedIn') {
      setState(session.status === 'anon' ? { status: 'anon' } : { status: 'loading' });
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { data, unreadRoomCount } = await fetchInquiryRooms({ q: q.trim() || undefined, unreadOnly });
        if (!cancelled) {
          setState({ status: 'ready', rooms: data, unreadRoomCount });
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
  }, [session.status, q, unreadOnly, version]);

  return { state, reload: () => setVersion(v => v + 1) };
}
