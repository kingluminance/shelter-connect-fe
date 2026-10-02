import { ApiError } from './apiClient';

// Korean copy for the errors the community write APIs document (community-api.md: 409 version /
// state / duplicate-id conflicts, 413 photo size, 415 content type, 429 rate limit, 503 storage).
export function writeErrorMessage(err: unknown): string {
  if (!(err instanceof ApiError)) {
    return err instanceof Error ? err.message : '잠시 후 다시 시도해 주세요.';
  }
  switch (err.code) {
    case 'NETWORK_ERROR':
      return '인터넷 연결을 확인해 주세요.';
    case 'VERSION_CONFLICT':
      return '다른 곳에서 글이 바뀌었어요. 다시 불러온 뒤 시도해 주세요.';
    case 'SIGHTINGS_CLOSED':
      return '새 목격 제보가 마감된 글이에요.';
    case 'REQUEST_ID_CONFLICT':
      return '이미 접수된 요청이에요. 처음부터 다시 시도해 주세요.';
    case 'RESOURCE_DELETED':
      return '삭제된 글이에요.';
    case 'INQUIRY_READ_ONLY':
      return '더 이상 메시지를 보낼 수 없어요.';
  }
  switch (err.status) {
    case 413:
      return '사진이 너무 커요. 5MB 이하 사진을 골라 주세요.';
    case 415:
      return 'PNG 또는 JPEG 사진만 올릴 수 있어요.';
    case 429:
      return '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.';
    case 503:
      return '지금은 사진을 올릴 수 없어요. 잠시 후 다시 시도해 주세요.';
  }
  return err.message || '잠시 후 다시 시도해 주세요.';
}
