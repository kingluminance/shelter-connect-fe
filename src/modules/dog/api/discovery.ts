import { apiFetch } from '../../../shared/lib/apiClient';
import type { Page, ShelterDiscoveryItem } from '../types';

// docs/personal-discovery-api.md — public, no login. Both coordinates together sort by
// distance; otherwise id order with distanceMeters null. The server never stores them.
export function fetchShelterDiscovery(params?: {
  q?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.region) query.set('region', params.region);
  if (params?.latitude !== undefined && params?.longitude !== undefined) {
    query.set('latitude', String(params.latitude));
    query.set('longitude', String(params.longitude));
  }
  query.set('limit', String(params?.limit ?? 50));
  return apiFetch<Page<ShelterDiscoveryItem>>(`/v1/shelter-discovery?${query.toString()}`);
}
