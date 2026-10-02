import { useCallback, useEffect, useState } from 'react';
import { useAuthSession } from '../../../shared/lib/useAuthSession';
import { fetchDogSaved, saveDog, unsaveDog } from '../api/savedDogs';

/** Save/unsave toggle for one dog (docs/personal-discovery-api.md `/v1/me/saved-dogs/{dogId}`).
 * `needsLogin` is true while signed out — the caller sends the user to Login instead. */
export function useDogSaved(dogId: string) {
  const session = useAuthSession();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session.status !== 'signedIn') {
      setSaved(false);
      return;
    }
    let cancelled = false;
    fetchDogSaved(dogId).then(
      ({ data }) => !cancelled && setSaved(data.saved),
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [dogId, session.status]);

  const toggle = useCallback(async () => {
    if (busy) {
      return;
    }
    const next = !saved;
    setSaved(next);
    setBusy(true);
    try {
      await (next ? saveDog(dogId) : unsaveDog(dogId));
    } catch {
      setSaved(!next);
    } finally {
      setBusy(false);
    }
  }, [busy, dogId, saved]);

  return { saved, toggle, needsLogin: session.status === 'anon' };
}
