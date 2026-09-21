import { useEffect, useState } from 'react';
import { fetchDogBehavior, fetchShelterDogs } from '../api/shelters';
import type { DogBehavior, DogSummary } from '../types';

export interface DogWithBehavior extends DogSummary {
  behavior: DogBehavior;
}

export type ShelterDogsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; dogs: DogWithBehavior[] };

/** Fetches a shelter's public dogs and each one's behavior settings (docs/dog-behavior-api.md). */
export function useShelterDogs(shelterId: string): ShelterDogsState {
  const [state, setState] = useState<ShelterDogsState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    (async () => {
      try {
        const { data: summaries } = await fetchShelterDogs(shelterId, { limit: 20 });
        const withBehavior = await Promise.all(
          summaries.map(async dog => ({
            ...dog,
            behavior: (await fetchDogBehavior(dog.id)).data,
          })),
        );
        if (!cancelled) {
          setState({ status: 'ready', dogs: withBehavior });
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
  }, [shelterId]);

  return state;
}
