import { apiFetch } from '../../../shared/lib/apiClient';
import type { InquiryRoom, Page } from '../types';

export function fetchInquiryRooms(params?: { q?: string; unreadOnly?: boolean; limit?: number; cursor?: string }) {
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.unreadOnly) query.set('unreadOnly', 'true');
  query.set('limit', String(params?.limit ?? 50));
  if (params?.cursor) query.set('cursor', params.cursor);
  // `unreadRoomCount` counts unread ROOMS and ignores the search/filter (docs/inquiry-api.md).
  return apiFetch<Page<InquiryRoom> & { unreadRoomCount: number }>(`/v1/inquiry-rooms?${query.toString()}`);
}

export function fetchInquiryRoom(roomId: string) {
  return apiFetch<{ data: InquiryRoom }>(`/v1/inquiry-rooms/${roomId}`);
}
