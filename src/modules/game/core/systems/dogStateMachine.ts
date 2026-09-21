import { type Bounds, stepMovement } from './movement';

export type DogState =
  | 'IDLE'
  | 'WALK'
  | 'RUN'
  | 'SNIFF'
  | 'TAIL_WAG'
  | 'BACK_OFF'
  | 'SIT'
  | 'LIE_DOWN';

export interface DogPersonality {
  playfulness: number; // 0~1
  sociability: number; // 0~1
  energy: number; // 0~1
  likesBall: boolean;
}

export interface DogAgent {
  state: DogState;
  x: number;
  y: number;
  target: { x: number; y: number } | null;
  stateElapsed: number;
  stationaryElapsed: number;
  decisionCooldown: number;
}

const WALK_SPEED = 26;
const RUN_SPEED = 55;
const BACK_OFF_SPEED = 45;
const DOG_RADIUS = 8;
const PROXIMITY_NEAR = 28; // map units — player is "close"
const SIT_AFTER_STATIONARY_S = 10;
const DECISION_INTERVAL_S = 2.5;
const TARGET_REACHED_DIST = 4;
const SNIFF_DURATION_S = 2;
const TAIL_WAG_MIN_S = 1.5;

export function createDogAgent(x: number, y: number): DogAgent {
  return { state: 'IDLE', x, y, target: null, stateElapsed: 0, stationaryElapsed: 0, decisionCooldown: 0 };
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

/** Weighted pick of the next autonomous state, shaped by personality. */
function pickNextState(personality: DogPersonality, rng: () => number): DogState {
  const weights: Array<[DogState, number]> = [
    ['IDLE', 0.2],
    ['WALK', 0.3 + personality.energy * 0.3],
    ['RUN', personality.energy > 0.4 ? personality.playfulness * 0.3 : 0],
    ['SNIFF', 0.15],
    ['SIT', (1 - personality.energy) * 0.2],
  ];
  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [state, weight] of weights) {
    roll -= weight;
    if (roll <= 0) {
      return state;
    }
  }
  return 'IDLE';
}

function setState(agent: DogAgent, state: DogState, target: DogAgent['target'] = null): DogAgent {
  return { ...agent, state, target, stateElapsed: 0 };
}

/**
 * Advances one dog's behavior by dt seconds. Personality shapes weighted random
 * transitions; player proximity overrides them (sociable dogs wag their tail,
 * shy ones back away); standing still for 10s settles the dog into SIT.
 */
export function tickDog(
  agent: DogAgent,
  personality: DogPersonality,
  dt: number,
  player: { x: number; y: number },
  bounds: Bounds,
  obstacles: Parameters<typeof stepMovement>[0]['obstacles'],
  rng: () => number = Math.random,
): DogAgent {
  let next = { ...agent, stateElapsed: agent.stateElapsed + dt };

  const nearPlayer = distance(next.x, next.y, player.x, player.y) < PROXIMITY_NEAR;

  if (nearPlayer && next.state !== 'TAIL_WAG' && next.state !== 'BACK_OFF') {
    next = personality.sociability > 0.5
      ? setState(next, 'TAIL_WAG')
      : setState(next, 'BACK_OFF', {
          x: next.x + (next.x - player.x),
          y: next.y + (next.y - player.y),
        });
  } else if (!nearPlayer && (next.state === 'TAIL_WAG' || next.state === 'BACK_OFF')) {
    // Settle into IDLE and hold it — without this the autonomous block below would
    // see decisionCooldown already expired and re-roll a new state the same tick.
    next = { ...setState(next, 'IDLE'), decisionCooldown: DECISION_INTERVAL_S };
  }

  // Autonomous state changes only apply outside the player-reaction states.
  if (next.state !== 'TAIL_WAG' && next.state !== 'BACK_OFF') {
    if (next.state === 'SNIFF' && next.stateElapsed >= SNIFF_DURATION_S) {
      next = setState(next, 'IDLE');
    } else if (
      (next.state === 'WALK' || next.state === 'RUN') &&
      next.target &&
      distance(next.x, next.y, next.target.x, next.target.y) < TARGET_REACHED_DIST
    ) {
      next = setState(next, 'IDLE');
    } else if (next.state === 'IDLE' || next.state === 'SIT') {
      next = { ...next, decisionCooldown: Math.max(0, next.decisionCooldown - dt) };
      if (next.state === 'IDLE' && next.stationaryElapsed >= SIT_AFTER_STATIONARY_S) {
        next = setState(next, 'SIT');
      } else if (next.decisionCooldown <= 0) {
        const picked = pickNextState(personality, rng);
        const target = picked === 'WALK' || picked === 'RUN' ? randomTargetWithin(bounds, rng) : null;
        next = { ...setState(next, picked, target), decisionCooldown: DECISION_INTERVAL_S };
      }
    }
  } else if (next.state === 'TAIL_WAG' && next.stateElapsed < TAIL_WAG_MIN_S) {
    // hold the pose briefly even if proximity flickers
  }

  // Movement.
  const moving =
    (next.state === 'WALK' || next.state === 'RUN' || next.state === 'BACK_OFF') && next.target;
  if (moving && next.target) {
    const speed = next.state === 'RUN' ? RUN_SPEED : next.state === 'BACK_OFF' ? BACK_OFF_SPEED : WALK_SPEED;
    const dx = next.target.x - next.x;
    const dy = next.target.y - next.y;
    const moved = stepMovement({
      x: next.x,
      y: next.y,
      dx,
      dy,
      speed,
      dt,
      radius: DOG_RADIUS,
      bounds,
      obstacles,
    });
    const displacement = distance(next.x, next.y, moved.x, moved.y);
    next = {
      ...next,
      x: moved.x,
      y: moved.y,
      stationaryElapsed: displacement > 0.01 ? 0 : next.stationaryElapsed + dt,
    };
  } else {
    next = { ...next, stationaryElapsed: next.stationaryElapsed + dt };
  }

  return next;
}
