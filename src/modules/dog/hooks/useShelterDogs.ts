import { useEffect, useState } from 'react';
import { fetchDogAssets, fetchDogBehavior, fetchShelterDogs } from '../api/shelters';
import { normalizeBehavior } from '../behaviorSettings';
import type { DogAssetManifest, DogBehavior, DogSummary } from '../types';

/** Demo: unconfirmed dogs fetch the ball too (see normalizeBehavior). */
const DEMO_BALL_PLAY = true;

export interface DogWithBehavior extends DogSummary {
  behavior: DogBehavior;
  /** null = no approved art yet (404) — the game falls back to its bundled sprites. */
  manifest: DogAssetManifest | null;
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
          summaries.map(async dog => {
            const [behavior, manifest] = await Promise.all([
              fetchDogBehavior(dog.id),
              fetchDogAssets(dog.id).then(
                res => res.data,
                () => null,
              ),
            ]);
            return {
              ...dog,
              behavior: normalizeBehavior(behavior.data, { demoBallPlay: DEMO_BALL_PLAY }),
              manifest,
            };
          }),
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
