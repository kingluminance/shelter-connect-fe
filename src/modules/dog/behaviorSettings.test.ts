import { normalizeBehavior } from './behaviorSettings';
import type { DogBehavior } from './types';

const base = {
  basis: 'DEFAULT',
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

describe('normalizeBehavior demoBallPlay', () => {
  it('turns ball fetch on for unconfirmed (DEFAULT) dogs', () => {
    const next = normalizeBehavior(base, { demoBallPlay: true });
    expect(next.settings.ballPlay).toEqual({ chaseEnabled: true, returnEnabled: true, reactionDelayMs: 1000 });
  });
  it('never overrides a confirmed dog or an enabled BALL_CHASE', () => {
    const confirmed = { ...base, basis: 'CONFIRMED' } as DogBehavior;
    expect(normalizeBehavior(confirmed, { demoBallPlay: true })).toBe(confirmed);
    const enabled = { ...base, interactions: { BALL_CHASE: { enabled: true, returnEnabled: false, reactionDelayMs: 200 } } } as DogBehavior;
    expect(normalizeBehavior(enabled, { demoBallPlay: true }).settings.ballPlay.returnEnabled).toBe(false);
  });
});
