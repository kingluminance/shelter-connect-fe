import { useCallback, useEffect, useState } from 'react';
import { fetchChatMessages, openChatSession, requestChatReply, sendChatMessage } from '../api/chat';
import { generateClientMessageId } from '../../../shared/lib/clientId';
import { ApiError } from '../../../shared/lib/apiClient';
import type { ChatMessage, ChatSession } from '../types';

export type DogChatState =
  | { status: 'loading' }
  | { status: 'error'; message: string; code: string | null }
  | {
      status: 'ready';
      session: ChatSession;
      messages: ChatMessage[];
      sending: boolean;
      sendError: string | null;
    };

/** Opens (or resumes) a dog's chat session and sends messages through it (docs/chat-storage-api.md, docs/grounded-chat-api.md). */
export function useDogChat(dogId: string) {
  const [state, setState] = useState<DogChatState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    (async () => {
      try {
        const { data: session } = await openChatSession(dogId);
        const { data: messages } = await fetchChatMessages(session.id, { limit: 50 });
        if (!cancelled) {
          setState({ status: 'ready', session, messages, sending: false, sendError: null });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: err instanceof ApiError ? err.message : String(err),
            code: err instanceof ApiError ? err.code : null,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dogId]);

  const send = useCallback(
    async (text: string) => {
      if (state.status !== 'ready' || state.sending) {
        return;
      }
      const sessionId = state.session.id;
      setState(prev => (prev.status === 'ready' ? { ...prev, sending: true, sendError: null } : prev));

      try {
        const clientMessageId = generateClientMessageId();
        const { data: userMessage } = await sendChatMessage(sessionId, clientMessageId, text);
        setState(prev => (prev.status === 'ready' ? { ...prev, messages: [...prev.messages, userMessage] } : prev));

        // Blocks until the AI call finishes (or fails) server-side — no polling.
        const { data: result } = await requestChatReply(sessionId, userMessage.id);
        setState(prev => {
          if (prev.status !== 'ready') {
            return prev;
          }
          const messages = result.reply ? [...prev.messages, result.reply] : prev.messages;
          return {
            ...prev,
            messages,
            sending: false,
            sendError: result.reply ? null : result.failureCode ?? '답변을 받지 못했어요',
          };
        });
      } catch (err) {
        const message = err instanceof ApiError ? err.message : String(err);
        setState(prev => (prev.status === 'ready' ? { ...prev, sending: false, sendError: message } : prev));
      }
    },
    [state],
  );

  return { state, send };
}
