import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthSession } from '../../../shared/lib/useAuthSession';
import { fetchSavedDogs } from '../api/savedDogs';
import type { SavedDog } from '../types';

export type SavedDogsState =
  | { status: 'anon' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; dogs: SavedDog[] };

/** Saved-dogs is login-gated server-side — don't call it while signed out. Refreshes each
 * time the screen regains focus, so a dog saved/unsaved elsewhere shows up on return. */
export function useSavedDogsList(limit: number) {
  const session = useAuthSession();
  const [state, setState] = useState<SavedDogsState>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  useFocusEffect(useCallback(() => setVersion(v => v + 1), []));

  useEffect(() => {
    if (session.status !== 'signedIn') {
      setState(session.status === 'anon' ? { status: 'anon' } : { status: 'loading' });
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const { data } = await fetchSavedDogs({ limit });
        if (!cancelled) {
          setState({ status: 'ready', dogs: data });
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
  }, [session.status, limit, version]);

  const removeLocally = useCallback((dogId: string) => {
    setState(prev => (prev.status === 'ready' ? { status: 'ready', dogs: prev.dogs.filter(d => d.dogId !== dogId) } : prev));
  }, []);

  return { state, removeLocally, reload: () => setVersion(v => v + 1) };
}

export function useSavedDogs(limit: number): SavedDogsState {
  return useSavedDogsList(limit).state;
}
