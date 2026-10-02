// docs/community-api.md (B-36)

// Duplicated from modules/dog/types.ts's Page<T> rather than imported — CLAUDE.md
// bars cross-domain internal imports between modules/* (only shared and a
// screen's own public-hook imports are exempt).
export interface Page<T> {
  data: T[];
  nextCursor: string | null;
}

export type CommunityCategory = 'LOST' | 'FOUND' | 'NEIGHBOR_NEWS';
export type CommunityPostStatus = 'ACTIVE' | 'REUNITED' | 'CLOSED' | 'TRANSFERRED';

export interface CommunityPostLocation {
  label: string;
  latitude: number | null;
  longitude: number | null;
  occurredAt: string;
}

export interface CommunityPostContent {
  title: string;
  text: string;
  regionLabel: string;
  location: CommunityPostLocation | null;
  features: string[];
  mediaIds: string[];
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  mine: boolean;
  category: CommunityCategory;
  publication: 'DRAFT' | 'PUBLISHED';
  status: CommunityPostStatus;
  version: number;
  content: CommunityPostContent;
  hidden: boolean;
  createdAt: string;
  publishedAt: string | null;
  updatedAt: string;
  commentCount: number;
  sightingCount: number;
}

export type CommentKind = 'COMMENT' | 'SIGHTING';

export interface CommunityComment {
  id: string;
  postId: string;
  /** null once the comment was deleted (the row stays as a marker so replies keep their place). */
  authorId: string | null;
  authorName: string | null;
  mine: boolean;
  kind: CommentKind;
  /** Set on a reply — one level deep; sightings never have a parent. */
  parentId: string | null;
  content: { text: string; location: CommunityPostLocation | null; mediaIds: string[] } | null;
  deleted: boolean;
  createdAt: string;
}
