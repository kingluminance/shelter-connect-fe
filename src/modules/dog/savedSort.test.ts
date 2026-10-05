import { sortSavedDogs } from './savedSort';
import type { SavedDog } from './types';

const dog = (dogName: string, savedAt: string) => ({ dogName, savedAt }) as SavedDog;
const dogs = [dog('콩이', '2026-10-03T00:00:00Z'), dog('나비', '2026-10-02T00:00:00Z'), dog('가을', '2026-10-01T00:00:00Z')];

describe('sortSavedDogs', () => {
  it('RECENT keeps the server order', () => {
    expect(sortSavedDogs(dogs, 'RECENT')).toBe(dogs);
  });
  it('OLDEST puts the earliest save first without mutating', () => {
    expect(sortSavedDogs(dogs, 'OLDEST').map(d => d.dogName)).toEqual(['가을', '나비', '콩이']);
    expect(dogs[0].dogName).toBe('콩이');
  });
  it('NAME sorts Korean names', () => {
    expect(sortSavedDogs(dogs, 'NAME').map(d => d.dogName)).toEqual(['가을', '나비', '콩이']);
  });
});
