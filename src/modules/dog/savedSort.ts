import type { SavedDog } from './types';

export type SavedSort = 'RECENT' | 'OLDEST' | 'NAME';
export const SAVED_SORTS: { key: SavedSort; label: string }[] = [
  { key: 'RECENT', label: '최근 저장순' },
  { key: 'OLDEST', label: '오래된 저장순' },
  { key: 'NAME', label: '이름순' },
];

/** The API lists newest-saved first; the other orders re-sort what is loaded. */
export function sortSavedDogs(dogs: SavedDog[], sort: SavedSort): SavedDog[] {
  if (sort === 'RECENT') return dogs;
  if (sort === 'OLDEST') return [...dogs].sort((a, b) => a.savedAt.localeCompare(b.savedAt));
  return [...dogs].sort((a, b) => a.dogName.localeCompare(b.dogName, 'ko'));
}
