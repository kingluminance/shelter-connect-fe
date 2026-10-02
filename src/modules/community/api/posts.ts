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
