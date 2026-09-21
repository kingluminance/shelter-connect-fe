import { type Bounds, stepMovement } from './movement';
import type { DogActionKey, DogBehaviorSettings } from '../../../dog/types';

export type DogState = DogActionKey;

// ponytail: the backend's `speedTilesPerSecond`/`*Tiles` fields assume a "tile" unit
// the map assets don't define anywhere — picked 24 map-units/tile (matches the env
// animation frame size) as a working assumption. Confirm with backend/art before
// this ships past a demo.
const TILE_SIZE_MAP_UNITS = 24;

const DOG_RADIUS = 8;
const TARGET_REACHED_DIST = 4;

export interface DogAgent {
  state: DogState;
  x: number;
  y: number;
  target: { x: number; y: number } | null;
  /** ms remaining in the current state (counts down; re-decide at 0). */
  stateRemainingMs: number;
  /** ms until each action becomes selectable again, keyed by action. */
  cooldownUntilMs: Partial<Record<DogState, number>>;
  /** total elapsed ms, used against cooldownUntilMs. */
  clockMs: number;
  /** ms left before a nearby-player reaction actually kicks in (reactionDelayMs). */
  reactionPendingMs: number | null;
  reactionTarget: 'TAIL_WAG' | 'BACK_OFF' | null;
}

export function createDogAgent(x: number, y: number): DogAgent {
  return {
    state: 'IDLE',
    x,
    y,
    target: null,
    stateRemainingMs: 0,
    cooldownUntilMs: {},
    clockMs: 0,
    reactionPendingMs: null,
    reactionTarget: null,
  };
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function randomTargetWithin(bounds: Bounds, rng: () => number): { x: number; y: number } {
  const margin = 20;
  return {
    x: bounds.left + margin + rng() * Math.max(0, bounds.right - bounds.left - margin * 2),
    y: bounds.top + margin + rng() * Math.max(0, bounds.bottom - bounds.top - margin * 2),
  };
}

/**
 * Weighted pick among autonomous actions (not on cooldown, weight > 0). Excludes
 * TAIL_WAG/BACK_OFF — per docs/dog-behavior-api.md those are purely reactive
 * (entered only through the player-proximity + reactionDelayMs path below), never
 * autonomous wandering.
 */
function pickNextState(
  settings: DogBehaviorSettings,
  clockMs: number,
  cooldownUntilMs: Partial<Record<DogState, number>>,
  rng: () => number,
): DogState {
  const entries = (Object.entries(settings.actions) as [DogState, DogBehaviorSettings['actions'][DogState]][])
    .filter(
      ([state, action]) =>
        state !== 'TAIL_WAG' &&
        state !== 'BACK_OFF' &&
        action.weight > 0 &&
        (cooldownUntilMs[state] ?? 0) <= clockMs,
    );

  if (entries.length === 0) {
    return 'IDLE'; // everything on cooldown or zeroed out — hold still rather than force a state its shelter disabled
  }

  const total = entries.reduce((sum, [, action]) => sum + action.weight, 0);
  let roll = rng() * total;
  for (const [state, action] of entries) {
    roll -= action.weight;
    if (roll <= 0) {
      return state;
    }
  }
  return entries[entries.length - 1][0];
}

function enterState(
  agent: DogAgent,
  state: DogState,
  settings: DogBehaviorSettings,
  bounds: Bounds,
  rng: () => number,
): DogAgent {
  const action = settings.actions[state];
  const duration = action.minDurationMs + rng() * Math.max(0, action.maxDurationMs - action.minDurationMs);
  const target = state === 'WALK' || state === 'RUN' ? randomTargetWithin(bounds, rng) : null;
  return { ...agent, state, target, stateRemainingMs: duration };
}

/**
 * Advances one dog by dt seconds using the shelter-configured behavior settings
 * (docs/dog-behavior-api.md): weighted random action selection bounded by each
 * action's own min/max duration and post-use cooldown, plus a player-proximity
 * override (BACK_OFF inside personalSpace, TAIL_WAG inside approachDistance) that
 * only fires if the shelter gave that reaction a non-zero weight, after
 * reactionDelayMs of the player lingering there.
 */
export function tickDog(
  agent: DogAgent,
  settings: DogBehaviorSettings,
  dt: number,
  player: { x: number; y: number },
  bounds: Bounds,
  obstacles: Parameters<typeof stepMovement>[0]['obstacles'],
  rng: () => number = Math.random,
): DogAgent {
  const dtMs = dt * 1000;
  let next: DogAgent = { ...agent, clockMs: agent.clockMs + dtMs };

  // --- Player-proximity reaction (only if the shelter enabled it with weight > 0) ---
  const dist = distance(next.x, next.y, player.x, player.y);
  const personalSpacePx = settings.personalSpaceTiles * TILE_SIZE_MAP_UNITS;
  const approachPx = settings.approachDistanceTiles * TILE_SIZE_MAP_UNITS;
  const desiredReaction: 'BACK_OFF' | 'TAIL_WAG' | null =
    dist < personalSpacePx && settings.actions.BACK_OFF.weight > 0
      ? 'BACK_OFF'
      : dist < approachPx && settings.actions.TAIL_WAG.weight > 0
        ? 'TAIL_WAG'
        : null;

  if (desiredReaction && next.state !== desiredReaction) {
    if (next.reactionTarget !== desiredReaction) {
      next = { ...next, reactionTarget: desiredReaction, reactionPendingMs: settings.reactionDelayMs };
    } else if (next.reactionPendingMs !== null) {
      const remaining = next.reactionPendingMs - dtMs;
      if (remaining <= 0) {
        next = enterState(
          desiredReaction === 'BACK_OFF'
            ? {
                ...next,
                target: {
                  x: next.x + (next.x - player.x),
                  y: next.y + (next.y - player.y),
                },
              }
            : next,
          desiredReaction,
          settings,
          bounds,
          rng,
        );
        next = { ...next, reactionPendingMs: null, reactionTarget: null };
      } else {
        next = { ...next, reactionPendingMs: remaining };
      }
    }
  } else if (!desiredReaction) {
    next = { ...next, reactionPendingMs: null, reactionTarget: null };
    if (next.state === 'TAIL_WAG' || next.state === 'BACK_OFF') {
      next = { ...next, cooldownUntilMs: { ...next.cooldownUntilMs, [next.state]: next.clockMs + settings.actions[next.state].cooldownMs } };
      next = enterState(next, 'IDLE', settings, bounds, rng);
    }
  }

  // --- Autonomous state duration / re-decide (only outside an active reaction) ---
  if (next.state !== 'TAIL_WAG' && next.state !== 'BACK_OFF') {
    const reachedTarget =
      (next.state === 'WALK' || next.state === 'RUN') &&
      next.target &&
      distance(next.x, next.y, next.target.x, next.target.y) < TARGET_REACHED_DIST;

    next = { ...next, stateRemainingMs: next.stateRemainingMs - dtMs };
    if (reachedTarget || next.stateRemainingMs <= 0) {
      next = {
        ...next,
        cooldownUntilMs: { ...next.cooldownUntilMs, [next.state]: next.clockMs + settings.actions[next.state].cooldownMs },
      };
      const picked = pickNextState(settings, next.clockMs, next.cooldownUntilMs, rng);
      next = enterState(next, picked, settings, bounds, rng);
    }
  }

  // --- Movement ---
  const speed = settings.actions[next.state].speedTilesPerSecond * TILE_SIZE_MAP_UNITS;
  if (speed > 0 && next.target) {
    const moved = stepMovement({
      x: next.x,
      y: next.y,
      dx: next.target.x - next.x,
      dy: next.target.y - next.y,
      speed,
      dt,
      radius: DOG_RADIUS,
      bounds,
      obstacles,
    });
    next = { ...next, x: moved.x, y: moved.y };
  }

  return next;
}
