import { fitRegion } from './mapRegion';

describe('fitRegion', () => {
  it('returns null without points', () => {
    expect(fitRegion([])).toBeNull();
  });
  it('gives a single place a minimum window centered on it', () => {
    const region = fitRegion([{ latitude: 37.88, longitude: 127.73 }])!;
    expect(region.latitude + region.latitudeDelta / 2).toBeCloseTo(37.88);
    expect(region.longitude + region.longitudeDelta / 2).toBeCloseTo(127.73);
    expect(region.latitudeDelta).toBeGreaterThan(0);
  });
  it('covers all points with padding', () => {
    const region = fitRegion([
      { latitude: 37.0, longitude: 127.0 },
      { latitude: 37.1, longitude: 127.2 },
    ])!;
    expect(region.latitude).toBeLessThan(37.0);
    expect(region.latitude + region.latitudeDelta).toBeGreaterThan(37.1);
    expect(region.longitude + region.longitudeDelta).toBeGreaterThan(127.2);
  });
});
