import type { CommunityCategory, CommunityPost } from './types';

// Pure form logic for 글쓰기 (Figma 08) and 목격 제보 (Figma 10): limits mirror the server
// (community-api.md: title 50, text 1,000, region 100, place 200, ≤8 features × 20, ≤5 photos).

export const TITLE_MAX = 50;
export const TEXT_MAX = 1000;
export const SIGHTING_TEXT_MAX = 500; // Figma 10's counter; the API itself allows 1,000
export const REGION_MAX = 100;
export const PLACE_MAX = 200;
export const FEATURE_MAX = 20;
export const FEATURES_MAX = 8;
export const PHOTOS_MAX = 5;
const FUTURE_SLACK_MS = 5 * 60_000;

export interface ComposePhoto {
  /** Server media id once uploaded. */
  mediaId: string;
  /** Local file uri for the preview (null for photos loaded from an existing post). */
  uri: string | null;
}

export interface ComposeForm {
  category: CommunityCategory;
  title: string;
  text: string;
  /** 동네 소식's 동네 field; for 찾기/발견 it falls back (see `resolveRegion`). */
  regionLabel: string;
  placeLabel: string;
  latitude: number | null;
  longitude: number | null;
  occurredAt: Date | null;
  features: string[];
  photos: ComposePhoto[];
}

export const emptyForm = (category: CommunityCategory = 'LOST'): ComposeForm => ({
  category,
  title: '',
  text: '',
  regionLabel: '',
  placeLabel: '',
  latitude: null,
  longitude: null,
  occurredAt: null,
  features: [],
  photos: [],
});

export const needsPlace = (category: CommunityCategory) => category !== 'NEIGHBOR_NEWS';

export function cleanFeatures(features: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of features) {
    const feature = raw.trim().slice(0, FEATURE_MAX);
    if (feature && !seen.has(feature)) {
      seen.add(feature);
      out.push(feature);
    }
  }
  return out.slice(0, FEATURES_MAX);
}

/** The region the server stores for filtering: my 동네 if set, else what was typed/where it happened. */
export function resolveRegion(form: ComposeForm, myRegion: string | null): string {
  const chosen = form.category === 'NEIGHBOR_NEWS' ? form.regionLabel.trim() || myRegion : myRegion || form.placeLabel.trim();
  return (chosen ?? '').slice(0, REGION_MAX);
}

/** First blocking problem for *registering* (drafts may be incomplete), or null. */
export function publishError(form: ComposeForm, myRegion: string | null, now: Date = new Date()): string | null {
  if (!form.title.trim()) return '제목을 입력해 주세요.';
  if (form.title.trim().length > TITLE_MAX) return `제목은 ${TITLE_MAX}자까지 쓸 수 있어요.`;
  if (!form.text.trim()) return '자세한 내용을 입력해 주세요.';
  if (form.text.length > TEXT_MAX) return `내용은 ${TEXT_MAX.toLocaleString()}자까지 쓸 수 있어요.`;
  if (needsPlace(form.category)) {
    if (!form.placeLabel.trim()) return form.category === 'LOST' ? '마지막으로 본 곳을 입력해 주세요.' : '발견한 곳을 입력해 주세요.';
    if (!form.occurredAt) return form.category === 'LOST' ? '마지막으로 본 날짜·시간을 골라 주세요.' : '발견한 날짜·시간을 골라 주세요.';
    if (form.occurredAt.getTime() > now.getTime() + FUTURE_SLACK_MS) return '미래 시각은 고를 수 없어요.';
  }
  if (!resolveRegion(form, myRegion)) return '동네를 입력해 주세요.';
  return null;
}

function locationBody(form: ComposeForm) {
  if (!needsPlace(form.category) || !form.placeLabel.trim() || !form.occurredAt) {
    return undefined; // an incomplete place can't be sent (server needs label + time together)
  }
  return {
    label: form.placeLabel.trim().slice(0, PLACE_MAX),
    ...(form.latitude !== null && form.longitude !== null ? { latitude: form.latitude, longitude: form.longitude } : {}),
    occurredAt: form.occurredAt.toISOString(),
  };
}

function contentBody(form: ComposeForm, myRegion: string | null) {
  return {
    title: form.title.trim(),
    text: form.text.trim(),
    regionLabel: resolveRegion(form, myRegion),
    ...(locationBody(form) ? { location: locationBody(form) } : {}),
    features: cleanFeatures(form.features),
    mediaIds: form.photos.map(p => p.mediaId),
  };
}

export function buildCreateBody(form: ComposeForm, publication: 'DRAFT' | 'PUBLISHED', clientRequestId: string, myRegion: string | null) {
  return { clientRequestId, category: form.category, publication, ...contentBody(form, myRegion) };
}

/** PATCH replaces the whole content (omitted optional fields are cleared) — always send everything. */
export function buildUpdateBody(form: ComposeForm, version: number, myRegion: string | null) {
  return { version, category: form.category, ...contentBody(form, myRegion) };
}

/** Form for editing an existing post (photos keep their media ids, no local preview). */
export function formFromPost(post: CommunityPost): ComposeForm {
  const { content } = post;
  return {
    category: post.category,
    title: content.title,
    text: content.text,
    regionLabel: content.regionLabel,
    placeLabel: content.location?.label ?? '',
    latitude: content.location?.latitude ?? null,
    longitude: content.location?.longitude ?? null,
    occurredAt: content.location ? new Date(content.location.occurredAt) : null,
    features: content.features,
    photos: content.mediaIds.map(mediaId => ({ mediaId, uri: null })),
  };
}

/** Anything typed or picked — decides whether leaving asks "임시저장 / 그냥 나가기". */
export function hasContent(form: ComposeForm): boolean {
  return !!(form.title.trim() || form.text.trim() || form.placeLabel.trim() || form.features.length || form.photos.length);
}

// ── 목격 제보 (Figma 10) ───────────────────────────────────────────────

export interface SightingForm {
  text: string;
  placeLabel: string;
  latitude: number | null;
  longitude: number | null;
  occurredAt: Date | null;
  photo: ComposePhoto | null;
}

export const emptySighting = (): SightingForm => ({ text: '', placeLabel: '', latitude: null, longitude: null, occurredAt: new Date(), photo: null });

export function sightingError(form: SightingForm, now: Date = new Date()): string | null {
  if (!form.placeLabel.trim()) return '어디에서 봤는지 입력해 주세요.';
  if (!form.occurredAt) return '언제 봤는지 골라 주세요.';
  if (form.occurredAt.getTime() > now.getTime() + FUTURE_SLACK_MS) return '미래 시각은 고를 수 없어요.';
  if (!form.text.trim()) return '어떤 모습이었는지 적어 주세요.';
  if (form.text.length > SIGHTING_TEXT_MAX) return `내용은 ${SIGHTING_TEXT_MAX}자까지 쓸 수 있어요.`;
  return null;
}

export function buildSightingBody(form: SightingForm, clientRequestId: string, parentId?: string) {
  return {
    clientRequestId,
    kind: 'SIGHTING' as const,
    ...(parentId ? { parentId } : {}),
    text: form.text.trim(),
    location: {
      label: form.placeLabel.trim().slice(0, PLACE_MAX),
      ...(form.latitude !== null && form.longitude !== null ? { latitude: form.latitude, longitude: form.longitude } : {}),
      occurredAt: (form.occurredAt as Date).toISOString(),
    },
    mediaIds: form.photo ? [form.photo.mediaId] : [],
  };
}

export function buildCommentBody(text: string, clientRequestId: string, parentId?: string) {
  return { clientRequestId, kind: 'COMMENT' as const, ...(parentId ? { parentId } : {}), text: text.trim(), mediaIds: [] as string[] };
}

// ── 글 상태 / 신고 ────────────────────────────────────────────────────

export type PostStatusChoice = { status: 'ACTIVE' | 'REUNITED' | 'CLOSED' | 'TRANSFERRED'; title: string; description: string };

/** Options in the 글 상태 변경 sheet (Figma 13), filtered to what the API allows per category. */
export function statusChoices(category: CommunityCategory): PostStatusChoice[] {
  const lost: PostStatusChoice[] = [
    { status: 'ACTIVE', title: '찾고 있어요', description: '아직 가족을 찾고 있어요.' },
    { status: 'REUNITED', title: '가족을 만났어요', description: '다시 만난 기쁜 소식을 알려요.' },
    { status: 'CLOSED', title: '찾기를 종료했어요', description: '이 글에서 더 이상 제보를 받지 않아요.' },
  ];
  if (category === 'LOST') return lost;
  if (category === 'FOUND') {
    return [
      { status: 'ACTIVE', title: '보호하고 있어요', description: '아직 가족을 찾고 있어요.' },
      { status: 'REUNITED', title: '가족을 만났어요', description: '다시 만난 기쁜 소식을 알려요.' },
      { status: 'TRANSFERRED', title: '보호소로 인계했어요', description: '이 글에서 더 이상 제보를 받지 않아요.' },
      { status: 'CLOSED', title: '글을 종료했어요', description: '기존 글과 댓글은 남고, 새로운 제보는 닫혀요.' },
    ];
  }
  return [
    { status: 'ACTIVE', title: '진행 중이에요', description: '이웃들에게 계속 보여요.' },
    { status: 'CLOSED', title: '글을 종료했어요', description: '기존 글과 댓글은 남아요.' },
  ];
}

export type ReportReason = 'FALSE_INFORMATION' | 'SPAM' | 'ABUSE' | 'PRIVACY' | 'OTHER';
export const REPORT_REASONS: { reason: ReportReason; label: string }[] = [
  { reason: 'FALSE_INFORMATION', label: '잘못되거나 허위인 정보' },
  { reason: 'SPAM', label: '광고·홍보 또는 도배' },
  { reason: 'ABUSE', label: '욕설·혐오 또는 부적절한 내용' },
  { reason: 'PRIVACY', label: '개인정보 노출' },
  { reason: 'OTHER', label: '기타' },
];

/** `OTHER` requires a description (community-api.md); the others take it optionally (≤1,000). */
export function reportError(reason: ReportReason | null, details: string): string | null {
  if (!reason) return '신고 사유를 골라 주세요.';
  if (reason === 'OTHER' && !details.trim()) return '기타 사유는 내용을 적어 주세요.';
  if (details.length > 1000) return '추가 설명은 1,000자까지 쓸 수 있어요.';
  return null;
}
