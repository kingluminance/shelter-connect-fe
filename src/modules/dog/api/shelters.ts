import { apiFetch } from '../../../shared/lib/apiClient';
import type { DogBehavior, DogProfile, DogSummary, Page, Shelter, ShelterDetail } from '../types';

export function fetchShelters(params?: { region?: string; limit?: number; cursor?: string }) {
  const query = new URLSearchParams();
  if (params?.region) query.set('region', params.region);
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.cursor) query.set('cursor', params.cursor);
  const qs = query.toString();
  return apiFetch<Page<Shelter>>(`/v1/shelters${qs ? `?${qs}` : ''}`);
}

export function fetchShelterDetail(shelterId: string) {
  return apiFetch<{ data: ShelterDetail }>(`/v1/shelters/${shelterId}`);
}

export function fetchShelterDogs(shelterId: string, params?: { limit?: number; cursor?: string }) {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.cursor) query.set('cursor', params.cursor);
  const qs = query.toString();
  return apiFetch<Page<DogSummary>>(`/v1/shelters/${shelterId}/dogs${qs ? `?${qs}` : ''}`);
}

export function fetchDog(dogId: string) {
  return apiFetch<{ data: DogProfile }>(`/v1/dogs/${dogId}`);
}

export function fetchDogBehavior(dogId: string) {
  return apiFetch<{ data: DogBehavior }>(`/v1/dogs/${dogId}/behavior`);
}
