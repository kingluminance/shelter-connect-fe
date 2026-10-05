export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface FitRegion {
  /** south-west corner (the map SDK's Region convention). */
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

// A single place still needs a sensible window (≈ 400m), and several get 25% breathing room so
// pins don't sit on the edge.
const MIN_SPAN = 0.004;

export function fitRegion(points: LatLng[]): FitRegion | null {
  if (points.length === 0) return null;
  const lats = points.map(p => p.latitude);
  const lngs = points.map(p => p.longitude);
  const south = Math.min(...lats);
  const north = Math.max(...lats);
  const west = Math.min(...lngs);
  const east = Math.max(...lngs);
  const latSpan = Math.max((north - south) * 1.5, MIN_SPAN);
  const lngSpan = Math.max((east - west) * 1.5, MIN_SPAN);
  return {
    latitude: (south + north) / 2 - latSpan / 2,
    longitude: (west + east) / 2 - lngSpan / 2,
    latitudeDelta: latSpan,
    longitudeDelta: lngSpan,
  };
}
