import type { DogPersonality } from '../systems/dogStateMachine';

// Placeholder local data standing in for GET /shelters/{id}/dogs (docs/api-conventions.md)
// until the backend is wired up. 5 dogs per the Obsidian sample-data plan, one per
// map slot (sunny-meadow's layout.json defines 6).
export interface SampleDog {
  id: string;
  name: string;
  color: string;
  slotIndex: number;
  personality: DogPersonality;
}

export const sampleDogs: SampleDog[] = [
  {
    id: 'dog-001',
    name: '콩이',
    color: '#e0a458',
    slotIndex: 0,
    personality: { playfulness: 0.8, sociability: 0.6, energy: 0.7, likesBall: true },
  },
  {
    id: 'dog-002',
    name: '보리',
    color: '#8a6d3b',
    slotIndex: 1,
    personality: { playfulness: 0.3, sociability: 0.2, energy: 0.4, likesBall: false },
  },
  {
    id: 'dog-003',
    name: '초코',
    color: '#5a3825',
    slotIndex: 2,
    personality: { playfulness: 0.6, sociability: 0.9, energy: 0.5, likesBall: true },
  },
  {
    id: 'dog-004',
    name: '몽이',
    color: '#c9c9c9',
    slotIndex: 3,
    personality: { playfulness: 0.2, sociability: 0.4, energy: 0.2, likesBall: false },
  },
  {
    id: 'dog-005',
    name: '두부',
    color: '#f0ead6',
    slotIndex: 4,
    personality: { playfulness: 0.9, sociability: 0.7, energy: 0.9, likesBall: true },
  },
];
