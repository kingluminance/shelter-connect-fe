import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { generateClientMessageId } from '../../../shared/lib/clientId';
import { ApiError } from '../../../shared/lib/apiClient';
import { writeErrorMessage } from '../../../shared/lib/communityErrors';
import { fetchInquiryRoom } from '../api/rooms';
import { fetchInquiryMessages, markInquiryRead, sendInquiryAttachment, sendInquiryText, type InquiryAttachment } from '../api/messages';
import { mergeMessages, newestSequence } from '../messages';
import type { InquiryMessage, InquiryRoom } from '../types';

// No push/WebSocket in the backend contract — new messages arrive by polling `afterSequence`.
const POLL_MS = 5000;

export interface PendingMessage {
  clientMessageId: string;
  text: string;
  failed: boolean;
}

export type InquiryRoomState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; room: InquiryRoom; messages: InquiryMessage[]; pending: PendingMessage[]; olderBeforeSequence: number | null };

export function useInquiryRoom(roomId: string) {
  const [state, setState] = useState<InquiryRoomState>({ status: 'loading' });
  const [loadingOlder, setLoadingOlder] = useState(false);
  const readUpTo = useRef(0);
  const newestKnown = useRef(0);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const [{ data: room }, page] = await Promise.all([fetchInquiryRoom(roomId), fetchInquiryMessages(roomId)]);
      readUpTo.current = room.readSequence;
      setState({ status: 'ready', room, messages: page.data, pending: [], olderBeforeSequence: page.olderBeforeSequence });
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll for new messages while the screen is focused.
  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(async () => {
        try {
          const [{ data: room }, page] = await Promise.all([
            fetchInquiryRoom(roomId),
            fetchInquiryMessages(roomId, { afterSequence: newestKnown.current }),
          ]);
          setState(prev =>
            prev.status === 'ready' ? { ...prev, room, messages: mergeMessages(prev.messages, page.data) } : prev,
          );
        } catch {
          // transient — the next tick retries; the connection-error UI is for the initial load
        }
      }, POLL_MS);
      return () => clearInterval(timer);
    }, [roomId]),
  );

  useEffect(() => {
    if (state.status !== 'ready') {
      return;
    }
    const newest = newestSequence(state.messages);
    newestKnown.current = newest;
    // Mark read only once the messages are on screen (a GET alone never marks them).
    if (newest > readUpTo.current) {
      readUpTo.current = newest;
      markInquiryRead(roomId, newest).catch(() => {
        readUpTo.current = Math.min(readUpTo.current, newest - 1);
      });
    }
  }, [state, roomId]);

  const loadOlder = useCallback(async () => {
    if (state.status !== 'ready' || state.olderBeforeSequence === null || loadingOlder) {
      return;
    }
    setLoadingOlder(true);
    try {
      const page = await fetchInquiryMessages(roomId, { beforeSequence: state.olderBeforeSequence });
      setState(prev =>
        prev.status === 'ready'
          ? { ...prev, messages: mergeMessages(prev.messages, page.data), olderBeforeSequence: page.olderBeforeSequence }
          : prev,
      );
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder, roomId, state]);

  const transmit = useCallback(
    async (pending: PendingMessage) => {
      try {
        const { data } = await sendInquiryText(roomId, { clientMessageId: pending.clientMessageId, text: pending.text });
        setState(prev =>
          prev.status === 'ready'
            ? {
                ...prev,
                messages: mergeMessages(prev.messages, [data]),
                pending: prev.pending.filter(p => p.clientMessageId !== pending.clientMessageId),
              }
            : prev,
        );
      } catch (err) {
        const readOnly = err instanceof ApiError && err.code === 'INQUIRY_READ_ONLY';
        setState(prev =>
          prev.status === 'ready'
            ? {
                ...prev,
                room: readOnly ? { ...prev.room, canSend: false } : prev.room,
                pending: prev.pending.map(p => (p.clientMessageId === pending.clientMessageId ? { ...p, failed: true } : p)),
              }
            : prev,
        );
      }
    },
    [roomId],
  );

  const send = useCallback(
    (text: string) => {
      const pending: PendingMessage = { clientMessageId: generateClientMessageId(), text, failed: false };
      setState(prev => (prev.status === 'ready' ? { ...prev, pending: [...prev.pending, pending] } : prev));
      return transmit(pending);
    },
    [transmit],
  );

  /** Same id and same text — the server dedups, a changed body would be a 409 conflict. */
  const retry = useCallback(
    (clientMessageId: string) => {
      if (state.status !== 'ready') {
        return;
      }
      const pending = state.pending.find(p => p.clientMessageId === clientMessageId);
      if (pending) {
        setState(prev =>
          prev.status === 'ready'
            ? { ...prev, pending: prev.pending.map(p => (p.clientMessageId === clientMessageId ? { ...p, failed: false } : p)) }
            : prev,
        );
        transmit({ ...pending, failed: false });
      }
    },
    [state, transmit],
  );

  /** Photo / location message — sent in one go (no pending bubble); resolves to an error message or null. */
  const sendAttachment = useCallback(
    async (attachment: InquiryAttachment): Promise<string | null> => {
      try {
        const { data } = await sendInquiryAttachment(roomId, generateClientMessageId(), attachment);
        setState(prev => (prev.status === 'ready' ? { ...prev, messages: mergeMessages(prev.messages, [data]) } : prev));
        return null;
      } catch (err) {
        if (err instanceof ApiError && err.code === 'INQUIRY_READ_ONLY') {
          setState(prev => (prev.status === 'ready' ? { ...prev, room: { ...prev.room, canSend: false } } : prev));
        }
        return writeErrorMessage(err);
      }
    },
    [roomId],
  );

  return { state, send, sendAttachment, retry, reload: load, loadOlder, loadingOlder };
}
