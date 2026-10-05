import type { DogBehavior } from './types';

/**
 * BALL_CHASE in `interactions` is the current contract for ball play (the older
 * `settings.ballPlay` mirrors it) — when it is present, it wins, so the game reads one place.
 *
 * `demoBallPlay`: dogs the shelter has not confirmed yet (`basis: DEFAULT`) all come with ball play
 * switched off, which hides 공 던지기 entirely. With the flag on, such dogs fetch the ball anyway so the
 * feature is playable; a confirmed dog (or an enabled BALL_CHASE) always follows the server.
 * ponytail: demo only — drop the flag once the demo dogs' behavior is confirmed on the backend.
 */
export function normalizeBehavior(behavior: DogBehavior, options: { demoBallPlay?: boolean } = {}): DogBehavior {
  const chase = behavior.interactions?.BALL_CHASE;
  const demo = options.demoBallPlay === true && behavior.basis === 'DEFAULT' && !chase?.enabled;
  if (demo) {
    const reactionDelayMs = chase?.reactionDelayMs ?? behavior.settings.ballPlay.reactionDelayMs;
    return { ...behavior, settings: { ...behavior.settings, ballPlay: { chaseEnabled: true, returnEnabled: true, reactionDelayMs } } };
  }
  if (!chase) return behavior;
  return {
    ...behavior,
    settings: {
      ...behavior.settings,
      ballPlay: { chaseEnabled: chase.enabled, returnEnabled: chase.returnEnabled, reactionDelayMs: chase.reactionDelayMs },
    },
  };
}
