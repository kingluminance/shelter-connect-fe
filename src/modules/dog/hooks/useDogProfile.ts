import { useEffect, useState } from 'react';
import { fetchDog, fetchDogPhotos } from '../api/shelters';
import { ApiError } from '../../../shared/lib/apiClient';
import type { DogPhoto, DogProfile } from '../types';

export type PhotosState =
  | { status: 'loading' }
  // Not logged in, or logged in but hasn't had a completed reply from this dog yet
  // (docs/photo-read-api.md: 403 PHOTO_LOCKED / 401 UNAUTHENTICATED / 403
  // ACCOUNT_NOT_REGISTERED) — an expected gate, not a failure.
  | { status: 'locked' }
  | { status: 'error'; message: string }
  | { status: 'ready'; photos: DogPhoto[] };

export type DogProfileState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; profile: DogProfile; photos: PhotosState };

const LOCKED_CODES = new Set(['PHOTO_LOCKED', 'UNAUTHENTICATED', 'ACCOUNT_NOT_REGISTERED']);

/** GET /v1/dogs/{id} (public) + GET /v1/dogs/{id}/photos (needs login + a completed chat reply). */
export function useDogProfile(dogId: string) {
  const [state, setState] = useState<DogProfileState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    (async () => {
      let profile: DogProfile;
      try {
        ({ data: profile } = await fetchDog(dogId));
      } catch (err) {
        if (!cancelled) {
          setState({ status: 'error', message: err instanceof ApiError ? err.message : String(err) });
        }
        return;
      }
      if (cancelled) {
        return;
      }
      setState({ status: 'ready', profile, photos: { status: 'loading' } });

      try {
        const { data: photos } = await fetchDogPhotos(dogId);
        if (!cancelled) {
          setState(prev => (prev.status === 'ready' ? { ...prev, photos: { status: 'ready', photos } } : prev));
        }
      } catch (err) {
        if (cancelled) {
          return;
        }
        const code = err instanceof ApiError ? err.code : null;
        const photos: PhotosState = code && LOCKED_CODES.has(code)
          ? { status: 'locked' }
          : { status: 'error', message: err instanceof ApiError ? err.message : String(err) };
        setState(prev => (prev.status === 'ready' ? { ...prev, photos } : prev));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dogId]);

  return state;
}
