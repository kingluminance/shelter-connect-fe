import { useCallback, useEffect, useState } from 'react';
import { useAuthSession } from '../../../shared/lib/useAuthSession';
import { fetchCommunityRegion, updateCommunityRegion } from '../api/posts';

export type CommunityRegionState = { status: 'loading' } | { status: 'ready'; regionLabel: string | null };

/** "내 동네" — free-text label (no region list API), independent of the current shelter. */
export function useCommunityRegion() {
  const session = useAuthSession();
  const [state, setState] = useState<CommunityRegionState>({ status: 'loading' });

  useEffect(() => {
    if (session.status !== 'signedIn') {
      return;
    }
    let cancelled = false;
    fetchCommunityRegion().then(
      ({ data }) => !cancelled && setState({ status: 'ready', regionLabel: data.regionLabel }),
      () => !cancelled && setState({ status: 'ready', regionLabel: null }),
    );
    return () => {
      cancelled = true;
    };
  }, [session.status]);

  const setRegion = useCallback(async (regionLabel: string | null) => {
    const { data } = await updateCommunityRegion(regionLabel);
    setState({ status: 'ready', regionLabel: data.regionLabel });
  }, []);

  return { state, setRegion };
}
