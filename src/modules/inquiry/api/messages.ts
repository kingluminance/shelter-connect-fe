import { apiFetch } from '../../../shared/lib/apiClient';
import type { InquiryMessage, InquiryMessagePage } from '../types';

/** Latest 20 ascending by default; `afterSequence` fetches what's new (0 = full sync);
 * `beforeSequence` pages older history. The two are mutually exclusive. */
export function fetchInquiryMessages(
  roomId: string,
  params?: { limit?: number; afterSequence?: number; beforeSequence?: number },
) {
  const query = new URLSearchParams();
  query.set('limit', String(params?.limit ?? 20));
  if (params?.afterSequence !== undefined) query.set('afterSequence', String(params.afterSequence));
  if (params?.beforeSequence !== undefined) query.set('beforeSequence', String(params.beforeSequence));
  return apiFetch<InquiryMessagePage>(`/v1/inquiry-rooms/${roomId}/messages?${query.toString()}`);
}

/** TEXT only for now (1~1000 chars). A retry must reuse the same clientMessageId AND text —
 * the same id with different content is a 409 MESSAGE_ID_CONFLICT. */
export function sendInquiryText(roomId: string, params: { clientMessageId: string; text: string }) {
  return apiFetch<{ data: InquiryMessage }>(`/v1/inquiry-rooms/${roomId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ clientMessageId: params.clientMessageId, kind: 'TEXT', text: params.text }),
  });
}

/** Call only after the messages were actually shown — a GET alone doesn't mark them read. */
export function markInquiryRead(roomId: string, upToSequence: number) {
  return apiFetch<unknown>(`/v1/inquiry-rooms/${roomId}/read`, {
    method: 'PUT',
    body: JSON.stringify({ upToSequence }),
  });
}
