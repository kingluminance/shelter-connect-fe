import { useCallback, useEffect, useState } from 'react';
import { useAuthSession } from '../../../shared/lib/useAuthSession';
import { registerServiceUser } from '../api/account';
import { updateDisplayName } from '../api/profile';
import type { ServiceUserProfile } from '../types';

export type ServiceProfileState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; profile: ServiceUserProfile };

/** The signed-in user's service profile (nickname). There is no GET /v1/me — the idempotent
 * `POST /v1/me` registration call is what returns it (docs/auth-and-permissions.md). */
export function useServiceProfile() {
  const session = useAuthSession();
  const [state, setState] = useState<ServiceProfileState>({ status: 'loading' });

  useEffect(() => {
    if (session.status !== 'signedIn') {
      return;
    }
    let cancelled = false;
    setState({ status: 'loading' });
    registerServiceUser().then(
      ({ data }) => !cancelled && setState({ status: 'ready', profile: data }),
      err => !cancelled && setState({ status: 'error', message: err instanceof Error ? err.message : String(err) }),
    );
    return () => {
      cancelled = true;
    };
  }, [session.status]);

  /** Rejects with the server's message (e.g. 400 for a too-long nickname). */
  const rename = useCallback(async (displayName: string) => {
    const { data } = await updateDisplayName(displayName);
    setState({ status: 'ready', profile: data });
  }, []);

  return { state, rename };
}
