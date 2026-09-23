import { apiFetch } from '../../../shared/lib/apiClient';
import type { ServiceUserProfile } from '../types';

// docs/auth-and-permissions.md: after Supabase login, register (or resume) the
// backend's own service-user row. Idempotent — safe to call every login.
export function registerServiceUser() {
  return apiFetch<{ data: ServiceUserProfile }>('/v1/me', { method: 'POST' });
}
