import { createDogAgent, tickDog } from './dogStateMachine';
import type { DogBehaviorSettings } from '../../../dog/types';

const bounds = { left: 0, top: 0, right: 200, bottom: 200 };
const noObstacles: { x: number; y: number; w: number; h: number }[] = [];

function makeSettings(overrides: Partial<DogBehaviorSettings> = {}): DogBehaviorSettings {
  return {
    actions: {
      IDLE: { weight: 70, speedTilesPerSecond: 0, minDurationMs: 2000, maxDurationMs: 5000, cooldownMs: 2000 },
      WALK: { weight: 30, speedTilesPerSecond: 0.8, minDurationMs: 2000, maxDurationMs: 5000, cooldownMs: 2000 },
      RUN: { weight: 0, speedTilesPerSecond: 1.8, minDurationMs: 2000, maxDurationMs: 5000, cooldownMs: 2000 },
      SNIFF: { weight: 0, speedTilesPerSecond: 0, minDurationMs: 2000, maxDurationMs: 5000, cooldownMs: 2000 },
      TAIL_WAG: { weight: 0, speedTilesPerSecond: 0, minDurationMs: 2000, maxDurationMs: 5000, cooldownMs: 2000 },
      BACK_OFF: { weight: 0, speedTilesPerSecond: 0.6, minDurationMs: 2000, maxDurationMs: 5000, cooldownMs: 2000 },
      SIT: { weight: 0, speedTilesPerSecond: 0, minDurationMs: 2000, maxDurationMs: 5000, cooldownMs: 2000 },
      LIE_DOWN: { weight: 0, speedTilesPerSecond: 0, minDurationMs: 2000, maxDurationMs: 5000, cooldownMs: 2000 },
    },
    approachDistanceTiles: 0,
    personalSpaceTiles: 0,
    reactionDelayMs: 500,
    ballPlay: { chaseEnabled: false, returnEnabled: false, reactionDelayMs: 500 },
    ...overrides,
  };
}

test('a dog with default (TAIL_WAG/BACK_OFF weight 0) settings ignores a nearby player', () => {
  const settings = makeSettings({ approachDistanceTiles: 4, personalSpaceTiles: 1.5 });
  let agent = createDogAgent(100, 100);
  for (let i = 0; i < 30; i++) {
    agent = tickDog(agent, settings, 0.1, { x: 101, y: 100 }, bounds, noObstacles);
  }
  expect(agent.state).not.toBe('TAIL_WAG');
  expect(agent.state).not.toBe('BACK_OFF');
});

test('backs off once inside personal space, after the reaction delay, when BACK_OFF has weight', () => {
  const settings = makeSettings({
    approachDistanceTiles: 4,
    personalSpaceTiles: 1.5,
    reactionDelayMs: 300,
    actions: {
      ...makeSettings().actions,
      BACK_OFF: { weight: 10, speedTilesPerSecond: 0.6, minDurationMs: 500, maxDurationMs: 1500, cooldownMs: 3000 },
    },
  });
  let agent = createDogAgent(100, 100);
  // player well inside personalSpaceTiles(1.5 * 24 = 36px)
  const closePlayer = { x: 110, y: 100 };
  for (let i = 0; i < 3; i++) {
    agent = tickDog(agent, settings, 0.1, closePlayer, bounds, noObstacles);
  }
  expect(agent.state).not.toBe('BACK_OFF'); // still within reactionDelayMs
  for (let i = 0; i < 10; i++) {
    agent = tickDog(agent, settings, 0.1, closePlayer, bounds, noObstacles);
  }
  expect(agent.state).toBe('BACK_OFF');
});

test('actually moves away from the player while backing off (target survives enterState)', () => {
  const settings = makeSettings({
    approachDistanceTiles: 4,
    personalSpaceTiles: 1.5,
    reactionDelayMs: 100,
    actions: {
      ...makeSettings().actions,
      BACK_OFF: { weight: 10, speedTilesPerSecond: 0.6, minDurationMs: 500, maxDurationMs: 1500, cooldownMs: 3000 },
    },
  });
  let agent = createDogAgent(100, 100);
  const closePlayer = { x: 110, y: 100 };
  for (let i = 0; i < 3; i++) {
    agent = tickDog(agent, settings, 0.1, closePlayer, bounds, noObstacles);
  }
  expect(agent.state).toBe('BACK_OFF');
  const before = { x: agent.x, y: agent.y };
  agent = tickDog(agent, settings, 0.1, closePlayer, bounds, noObstacles);
  expect(distanceMoved(before, agent)).toBeGreaterThan(0);
  // Moving away from the player, not toward.
  expect(agent.x).toBeLessThan(before.x);
});

test('does not re-enter BACK_OFF while its cooldown is still active', () => {
  const settings = makeSettings({
    approachDistanceTiles: 4,
    personalSpaceTiles: 1.5,
    reactionDelayMs: 100,
    actions: {
      ...makeSettings().actions,
      BACK_OFF: { weight: 10, speedTilesPerSecond: 0.6, minDurationMs: 100, maxDurationMs: 100, cooldownMs: 999999 },
    },
  });
  let agent = createDogAgent(100, 100);
  const closePlayer = { x: 110, y: 100 };
  // Trigger BACK_OFF once, then let it finish (player steps just outside personalSpace).
  for (let i = 0; i < 3; i++) {
    agent = tickDog(agent, settings, 0.1, closePlayer, bounds, noObstacles);
  }
  expect(agent.state).toBe('BACK_OFF');
  const farEnoughPlayer = { x: 200, y: 100 };
  agent = tickDog(agent, settings, 0.1, farEnoughPlayer, bounds, noObstacles);
  expect(agent.state).not.toBe('BACK_OFF'); // exited, cooldown now set to 999999ms

  // Player closes back in immediately — should NOT re-trigger BACK_OFF despite
  // clearing reactionDelayMs again, because cooldownMs hasn't elapsed.
  for (let i = 0; i < 5; i++) {
    agent = tickDog(agent, settings, 0.1, closePlayer, bounds, noObstacles);
  }
  expect(agent.state).not.toBe('BACK_OFF');
});

test('an action on cooldown is not reselected until its cooldown expires', () => {
  const settings = makeSettings({
    actions: {
      ...makeSettings().actions,
      IDLE: { weight: 100, speedTilesPerSecond: 0, minDurationMs: 100, maxDurationMs: 100, cooldownMs: 5000 },
      WALK: { weight: 0, speedTilesPerSecond: 0.8, minDurationMs: 2000, maxDurationMs: 5000, cooldownMs: 0 },
      SIT: { weight: 100, speedTilesPerSecond: 0, minDurationMs: 100, maxDurationMs: 100, cooldownMs: 0 },
    },
  });
  let agent = createDogAgent(100, 100);
  const farPlayer = { x: -1000, y: -1000 };
  const alwaysFirst = () => 0; // deterministic: picks the first eligible entry
  // The agent's default initial state (IDLE, stateRemainingMs 0 from createDogAgent)
  // "expires" on the very first tick, putting IDLE on its 5s cooldown immediately —
  // so from here on, only SIT should ever be selectable.
  agent = tickDog(agent, settings, 0.05, farPlayer, bounds, noObstacles, alwaysFirst);
  for (let i = 0; i < 10; i++) {
    agent = tickDog(agent, settings, 0.05, farPlayer, bounds, noObstacles, alwaysFirst);
    expect(agent.state).toBe('SIT');
  }
});

test('moves toward its WALK target using speedTilesPerSecond converted to map units', () => {
  const settings = makeSettings({
    actions: {
      ...makeSettings().actions,
      IDLE: { weight: 0, speedTilesPerSecond: 0, minDurationMs: 100, maxDurationMs: 100, cooldownMs: 0 },
      WALK: { weight: 100, speedTilesPerSecond: 1, minDurationMs: 5000, maxDurationMs: 5000, cooldownMs: 0 },
    },
  });
  let agent = createDogAgent(100, 100);
  const farPlayer = { x: -1000, y: -1000 };
  agent = tickDog(agent, settings, 0.05, farPlayer, bounds, noObstacles); // picks WALK immediately (IDLE weight 0)
  expect(agent.state).toBe('WALK');
  expect(agent.target).not.toBeNull();
  const before = { x: agent.x, y: agent.y };
  agent = tickDog(agent, settings, 0.5, farPlayer, bounds, noObstacles);
  expect(distanceMoved(before, agent)).toBeGreaterThan(0);
});

function distanceMoved(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
