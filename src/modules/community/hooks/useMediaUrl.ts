import { useEffect, useState } from 'react';
import { fetchCommunityMediaUrl } from '../api/posts';

/** Signed URL for a community media id. URLs expire after 60s (community-api.md), so this
 * fetches fresh on every mount instead of caching. null while loading / when there's no id / on failure. */
export function useMediaUrl(mediaId: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!mediaId) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    fetchCommunityMediaUrl(mediaId).then(
      ({ data }) => !cancelled && setUrl(data.url),
      () => !cancelled && setUrl(null),
    );
    return () => {
      cancelled = true;
    };
  }, [mediaId]);

  return url;
}
