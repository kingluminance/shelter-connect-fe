import { apiFetch } from '../../../shared/lib/apiClient';
import type { CommentKind, CommunityCategory, CommunityComment, CommunityPost, Page } from '../types';

export function fetchCommunityPosts(params?: {
  q?: string;
  limit?: number;
  cursor?: string;
  region?: string;
  category?: CommunityCategory;
}) {
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.cursor) query.set('cursor', params.cursor);
  if (params?.region) query.set('region', params.region);
  if (params?.category) query.set('category', params.category);
  const qs = query.toString();
  return apiFetch<Page<CommunityPost>>(`/v1/community/posts${qs ? `?${qs}` : ''}`);
}

export function fetchCommunityMediaUrl(mediaId: string) {
  return apiFetch<{ data: { id: string; url: string; expiresAt: string } }>(`/v1/community/media/${mediaId}`);
}

export function fetchCommunityRegion() {
  return apiFetch<{ data: { regionLabel: string | null } }>('/v1/me/community-region');
}

export function fetchCommunityPost(postId: string) {
  return apiFetch<{ data: CommunityPost }>(`/v1/community/posts/${postId}`);
}

export function fetchCommunityComments(postId: string, params?: { kind?: CommentKind; limit?: number; cursor?: string }) {
  const query = new URLSearchParams();
  if (params?.kind) query.set('kind', params.kind);
  query.set('limit', String(params?.limit ?? 50));
  if (params?.cursor) query.set('cursor', params.cursor);
  return apiFetch<Page<CommunityComment>>(`/v1/community/posts/${postId}/comments?${query.toString()}`);
}

export function updateCommunityRegion(regionLabel: string | null) {
  return apiFetch<{ data: { regionLabel: string | null } }>('/v1/me/community-region', {
    method: 'PUT',
    body: JSON.stringify({ regionLabel }),
  });
}

// ── 쓰기 (F-21) ────────────────────────────────────────────────────────

type PostBody = Record<string, unknown>;
const json = (method: string, body?: unknown) => ({ method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

export function createCommunityPost(body: PostBody) {
  return apiFetch<{ data: CommunityPost }>('/v1/community/posts', json('POST', body));
}

export function updateCommunityPost(postId: string, body: PostBody) {
  return apiFetch<{ data: CommunityPost }>(`/v1/community/posts/${postId}`, json('PATCH', body));
}

export function publishCommunityPost(postId: string, version: number) {
  return apiFetch<{ data: CommunityPost }>(`/v1/community/posts/${postId}/publish`, json('POST', { version }));
}

export function updateCommunityPostStatus(postId: string, version: number, status: string) {
  return apiFetch<{ data: CommunityPost }>(`/v1/community/posts/${postId}/status`, json('PUT', { version, status }));
}

export function deleteCommunityPost(postId: string, version: number) {
  return apiFetch<void>(`/v1/community/posts/${postId}?version=${version}`, json('DELETE'));
}

export function createCommunityComment(postId: string, body: PostBody) {
  return apiFetch<{ data: CommunityComment }>(`/v1/community/posts/${postId}/comments`, json('POST', body));
}

export function deleteCommunityComment(postId: string, commentId: string) {
  return apiFetch<void>(`/v1/community/posts/${postId}/comments/${commentId}`, json('DELETE'));
}

export function reportCommunityPost(postId: string, reason: string, details: string) {
  return apiFetch<unknown>(`/v1/community/posts/${postId}/reports`, json('POST', { reason, details: details.trim() || null }));
}

/** Latest first — compose uses [0] as "continue my draft". */
export function fetchMyDrafts() {
  return apiFetch<Page<CommunityPost>>('/v1/me/community-posts?publication=DRAFT&limit=1');
}

export function startPostInquiry(postId: string) {
  return apiFetch<{ data: { id: string } }>(`/v1/community/posts/${postId}/inquiries`, json('POST'));
}
