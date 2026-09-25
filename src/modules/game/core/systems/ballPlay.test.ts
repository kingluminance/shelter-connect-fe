import { createBallPlayState, isBallPlayActive, throwBall, tickBallPlay } from './ballPlay';
import type { DogBehaviorSettings } from '../../../dog/types';

const bounds = { left: 0, top: 0, right: 200, bottom: 200 };
const noObstacles: { x: number; y: number; w: number; h: number }[] = [];

function makeSettings(overrides: Partial<DogBehaviorSettings> = {}): DogBehaviorSettings {
  return {
    actions: {
      IDLE: { weight: 70, speedTilesPerSecond: 0, minDurationMs: 2000, maxDurationMs: 5000, cooldownMs: 2000 },
      WALK: { weight: 30, speedTilesPerSecond: 1, minDurationMs: 2000, maxDurationMs: 5000, cooldownMs: 2000 },
      RUN: { weight: 0, speedTilesPerSecond: 2, minDurationMs: 2000, maxDurationMs: 5000, cooldownMs: 2000 },
      SNIFF: { weight: 0, speedTilesPerSecond: 0, minDurationMs: 2000, maxDurationMs: 5000, cooldownMs: 2000 },
      TAIL_WAG: { weight: 0, speedTilesPerSecond: 0, minDurationMs: 2000, maxDurationMs: 5000, cooldownMs: 2000 },
      BACK_OFF: { weight: 0, speedTilesPerSecond: 0.6, minDurationMs: 2000, maxDurationMs: 5000, cooldownMs: 2000 },
      SIT: { weight: 0, speedTilesPerSecond: 0, minDurationMs: 2000, maxDurationMs: 5000, cooldownMs: 2000 },
      LIE_DOWN: { weight: 0, speedTilesPerSecond: 0, minDurationMs: 2000, maxDurationMs: 5000, cooldownMs: 2000 },
    },
    approachDistanceTiles: 0,
    personalSpaceTiles: 0,
    reactionDelayMs: 500,
    ballPlay: { chaseEnabled: true, returnEnabled: true, reactionDelayMs: 200 },
    ...overrides,
  };
}

test('a throw is ignored when the dog is not set up to chase', () => {
  const settings = makeSettings({ ballPlay: { chaseEnabled: false, returnEnabled: false, reactionDelayMs: 200 } });
  const state = throwBall(createBallPlayState(), 150, 100, settings.ballPlay);
  expect(isBallPlayActive(state)).toBe(false);
});

test('a throw is ignored while a play sequence is already in progress', () => {
  const settings = makeSettings();
  const inProgress = throwBall(createBallPlayState(), 150, 100, settings.ballPlay);
  const second = throwBall(inProgress, 10, 10, settings.ballPlay);
  expect(second).toEqual(inProgress);
});

test('full sequence with returnEnabled: waits, chases, grabs, returns to the player, then drops', () => {
  const settings = makeSettings();
  const player = { x: 100, y: 100 };
  let ball = throwBall(createBallPlayState(), 150, 100, settings.ballPlay);
  let dogPos = { x: 90, y: 100 };

  // Still inside reactionDelayMs (200ms) — hasn't started moving yet.
  ({ state: ball, dogPos } = tickBallPlay(ball, dogPos, settings, player, 0.05, bounds, noObstacles));
  expect(ball.phase).toBe('THROWN');
  expect(dogPos).toEqual({ x: 90, y: 100 });

  // Clear the wait.
  for (let i = 0; i < 5; i++) {
    ({ state: ball, dogPos } = tickBallPlay(ball, dogPos, settings, player, 0.05, bounds, noObstacles));
  }
  expect(ball.phase).toBe('CHASING');

  // Chase until it reaches the ball.
  for (let i = 0; i < 200 && ball.phase === 'CHASING'; i++) {
    ({ state: ball, dogPos } = tickBallPlay(ball, dogPos, settings, player, 0.1, bounds, noObstacles));
  }
  expect(ball.phase).toBe('GRABBING');
  expect(Math.hypot(dogPos.x - 150, dogPos.y - 100)).toBeLessThan(5);

  // Grab is a fixed 400ms pause.
  for (let i = 0; i < 10 && ball.phase === 'GRABBING'; i++) {
    ({ state: ball, dogPos } = tickBallPlay(ball, dogPos, settings, player, 0.05, bounds, noObstacles));
  }
  expect(ball.phase).toBe('RETURNING');

  // Return to the player, carrying the ball.
  for (let i = 0; i < 200 && ball.phase === 'RETURNING'; i++) {
    ({ state: ball, dogPos } = tickBallPlay(ball, dogPos, settings, player, 0.1, bounds, noObstacles));
  }
  expect(ball.phase).toBe('DROPPING');
  expect(Math.hypot(dogPos.x - player.x, dogPos.y - player.y)).toBeLessThan(5);
  expect(ball.ballX).toBeCloseTo(dogPos.x);

  // Drop is a fixed 400ms pause, then the sequence ends.
  for (let i = 0; i < 10 && ball.phase === 'DROPPING'; i++) {
    ({ state: ball, dogPos } = tickBallPlay(ball, dogPos, settings, player, 0.05, bounds, noObstacles));
  }
  expect(ball.phase).toBe('IDLE');
  expect(isBallPlayActive(ball)).toBe(false);
});

test('returnEnabled false skips the fetch — the dog drops the ball where it grabbed it', () => {
  const settings = makeSettings({ ballPlay: { chaseEnabled: true, returnEnabled: false, reactionDelayMs: 0 } });
  const player = { x: 0, y: 0 }; // far away — would fail the test if RETURNING ran anyway
  let ball = throwBall(createBallPlayState(), 150, 100, settings.ballPlay);
  let dogPos = { x: 140, y: 100 };

  for (let i = 0; i < 200 && ball.phase !== 'GRABBING'; i++) {
    ({ state: ball, dogPos } = tickBallPlay(ball, dogPos, settings, player, 0.1, bounds, noObstacles));
  }
  expect(ball.phase).toBe('GRABBING');
  const grabPos = dogPos;

  for (let i = 0; i < 10 && ball.phase !== 'IDLE'; i++) {
    ({ state: ball, dogPos } = tickBallPlay(ball, dogPos, settings, player, 0.1, bounds, noObstacles));
  }
  expect(ball.phase).toBe('IDLE');
  expect(dogPos).toEqual(grabPos); // never moved toward the (far away) player
});
