import { normalizeBehavior } from './behaviorSettings';
import type { DogBehavior } from './types';

const base = {
  settings: { ballPlay: { chaseEnabled: false, returnEnabled: false, reactionDelayMs: 1000 } },
} as unknown as DogBehavior;

describe('normalizeBehavior', () => {
  it('leaves old responses without interactions untouched', () => {
    expect(normalizeBehavior(base)).toBe(base);
  });
  it('lets BALL_CHASE decide ball play', () => {
    const next = normalizeBehavior({ ...base, interactions: { BALL_CHASE: { enabled: true, returnEnabled: true, reactionDelayMs: 300 } } });
    expect(next.settings.ballPlay).toEqual({ chaseEnabled: true, returnEnabled: true, reactionDelayMs: 300 });
  });
});
