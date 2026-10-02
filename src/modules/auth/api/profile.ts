import { apiFetch } from '../../../shared/lib/apiClient';
import type { ServiceUserProfile } from '../types';

// displayName: trimmed, 1~30 chars. Nicknames may repeat — users are identified by id.
export function updateDisplayName(displayName: string) {
  return apiFetch<{ data: ServiceUserProfile }>('/v1/me/profile', {
    method: 'PATCH',
    body: JSON.stringify({ displayName }),
  });
}

export function saveConsents(params: { termsVersion: string; privacyVersion: string }) {
  return apiFetch<unknown>('/v1/me/consents', {
    method: 'PUT',
    body: JSON.stringify({ ...params, termsAccepted: true, privacyAccepted: true }),
  });
}
