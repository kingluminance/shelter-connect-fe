import { apiFetch } from '../../../shared/lib/apiClient';

// docs/personal-discovery-api.md — public. `available:false` until the terms/privacy
// documents are actually published; consent saving is a 503 until then.
export interface RegistrationPolicy {
  termsVersion: string | null;
  privacyVersion: string | null;
  available: boolean;
}

export function fetchRegistrationPolicy() {
  return apiFetch<{ data: RegistrationPolicy }>('/v1/registration-policy');
}
