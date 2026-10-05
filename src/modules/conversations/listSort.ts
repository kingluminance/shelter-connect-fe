import type { DogConversation } from '../dog/types';
import type { InquiryRoom } from '../inquiry/types';

// The conversation endpoints return most-recent-first with no sort parameter — these re-order
// the loaded page. ponytail: loaded page only; ask the backend for a sort param if lists get long.

export type RoomSort = 'RECENT' | 'UNREAD';
export const ROOM_SORTS: { key: RoomSort; label: string }[] = [
  { key: 'RECENT', label: '최근 대화순' },
  { key: 'UNREAD', label: '안 읽은 순' },
];

export function sortRooms(rooms: InquiryRoom[], sort: RoomSort): InquiryRoom[] {
  if (sort === 'RECENT') return rooms;
  return rooms
    .map((room, index) => ({ room, index }))
    .sort((a, b) => b.room.unreadCount - a.room.unreadCount || a.index - b.index)
    .map(entry => entry.room);
}

export type DogSort = 'RECENT' | 'NAME';
export const DOG_SORTS: { key: DogSort; label: string }[] = [
  { key: 'RECENT', label: '최근 대화순' },
  { key: 'NAME', label: '이름순' },
];

export function sortDogConversations(list: DogConversation[], sort: DogSort): DogConversation[] {
  if (sort === 'RECENT') return list;
  return [...list].sort((a, b) => a.dogName.localeCompare(b.dogName, 'ko'));
}
