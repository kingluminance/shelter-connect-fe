import { useEffect, useState } from 'react';
import { fetchShelters } from '../api/shelters';
import type { Shelter } from '../types';

export type SheltersState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; shelters: Shelter[] };

/** Fetches the public shelter list (docs/api-conventions.md). */
export function useShelters(): SheltersState {
  const [state, setState] = useState<SheltersState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    (async () => {
      try {
        const { data } = await fetchShelters({ limit: 20 });
        if (!cancelled) {
          setState({ status: 'ready', shelters: data });
        }
      } catch (err) {
        if (!cancelled) {
          setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
