import { useEffect, useState } from 'react';
import { fetchShelterDiscovery } from '../api/discovery';
import type { ShelterDiscoveryItem } from '../types';

export type ShelterDiscoveryState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; shelters: ShelterDiscoveryItem[] };

export interface DiscoveryQuery {
  q: string;
  region: string | null;
  coords: { latitude: number; longitude: number } | null;
}

/** Nearby-shelter list for the 보호소 tab. Refetches when the search/region/location changes. */
export function useShelterDiscovery(query: DiscoveryQuery): ShelterDiscoveryState {
  const [state, setState] = useState<ShelterDiscoveryState>({ status: 'loading' });
  const { q, region, coords } = query;
  const latitude = coords?.latitude;
  const longitude = coords?.longitude;

  useEffect(() => {
    let cancelled = false;
    // 입력 중 매 글자마다 요청하지 않도록 잠깐 기다린다.
    const timer = setTimeout(async () => {
      try {
        const { data } = await fetchShelterDiscovery({
          q: q.trim() || undefined,
          region: region ?? undefined,
          latitude,
          longitude,
        });
        if (!cancelled) {
          setState({ status: 'ready', shelters: data });
        }
      } catch (err) {
        if (!cancelled) {
          setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
        }
      }
    }, q ? 300 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, region, latitude, longitude]);

  return state;
}
