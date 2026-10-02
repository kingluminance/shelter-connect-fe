// docs/inquiry-api.md (B-37) — 커뮤니티 글에서 시작한 사람 간 문의.

export interface Page<T> {
  data: T[];
  nextCursor: string | null;
}

export type PostCategory = 'LOST' | 'FOUND' | 'NEIGHBOR_NEWS';
export type PostStatus = 'ACTIVE' | 'REUNITED' | 'CLOSED' | 'TRANSFERRED';

export type InquiryMessageKind = 'TEXT' | 'IMAGE' | 'LOCATION';

export interface InquiryLocation {
  label: string;
  latitude: number;
  longitude: number;
}

export interface InquiryMessage {
  id: string;
  roomId: string;
  /** Per-room counter starting at 1 — the ordering and read-state key. */
  sequence: number;
  senderId: string;
  mine: boolean;
  kind: InquiryMessageKind;
  text: string | null;
  mediaId: string | null;
  location: InquiryLocation | null;
  createdAt: string;
}

export interface InquiryRoom {
  id: string;
  postId: string;
  counterpart: { id: string | null; nickname: string; avatarKey: string | null; available: boolean };
  post: {
    id: string;
    /** false once the post is hidden/deleted — the room history stays but the summary is masked. */
    available: boolean;
    title: string | null;
    category: PostCategory | null;
    status: PostStatus | null;
    thumbnailMediaId: string | null;
  };
  lastMessage: InquiryMessage | null;
  unreadCount: number;
  lastSequence: number;
  readSequence: number;
  counterpartReadSequence: number;
  /** false → hidden post / suspended counterpart: history is readable, sending is not. */
  canSend: boolean;
  updatedAt: string;
}

export interface InquiryMessagePage {
  data: InquiryMessage[];
  /** Pass as `beforeSequence` for older history; null at the start of the room. */
  olderBeforeSequence: number | null;
  nextAfterSequence: number | null;
  hasMore: boolean;
}
