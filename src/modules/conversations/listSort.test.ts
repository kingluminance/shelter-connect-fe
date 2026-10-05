import { sortDogConversations, sortRooms } from './listSort';
import type { DogConversation } from '../dog/types';
import type { InquiryRoom } from '../inquiry/types';

const room = (id: string, unreadCount: number) => ({ id, unreadCount }) as InquiryRoom;
const dog = (dogName: string) => ({ dogName }) as DogConversation;

describe('sortRooms', () => {
  it('RECENT keeps the server order', () => {
    const rooms = [room('a', 0), room('b', 2)];
    expect(sortRooms(rooms, 'RECENT')).toBe(rooms);
  });
  it('UNREAD puts unread first and keeps recency among ties', () => {
    const sorted = sortRooms([room('a', 0), room('b', 1), room('c', 3), room('d', 1)], 'UNREAD');
    expect(sorted.map(r => r.id)).toEqual(['c', 'b', 'd', 'a']);
  });
});

describe('sortDogConversations', () => {
  it('NAME sorts Korean names without mutating the input', () => {
    const list = [dog('콩이'), dog('나비'), dog('가을')];
    expect(sortDogConversations(list, 'NAME').map(d => d.dogName)).toEqual(['가을', '나비', '콩이']);
    expect(list[0].dogName).toBe('콩이');
  });
});
