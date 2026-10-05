import type { DogBehavior } from './types';

/**
 * BALL_CHASE in `interactions` is the current contract for ball play (the older
 * `settings.ballPlay` mirrors it) — when it is present, it wins, so the game reads one place.
 */
export function normalizeBehavior(behavior: DogBehavior): DogBehavior {
  const chase = behavior.interactions?.BALL_CHASE;
  if (!chase) return behavior;
  return {
    ...behavior,
    settings: {
      ...behavior.settings,
      ballPlay: { chaseEnabled: chase.enabled, returnEnabled: chase.returnEnabled, reactionDelayMs: chase.reactionDelayMs },
    },
  };
}
