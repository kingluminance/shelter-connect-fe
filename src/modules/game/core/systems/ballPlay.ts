import { type Bounds, type Point, type Rect, pointFree, stepMovement } from './movement';
import { DOG_RADIUS, TILE_SIZE_MAP_UNITS, type DogState } from './dogStateMachine';
import type { DogBehaviorSettings, DogSpriteDirection } from '../../../dog/types';

// Ball play, ported from the shelter-connect prototype (work/mobile-concept/ball-play.js +
// natural-dogs.js): the dog fetches the ball and brings it over, the player takes it (공 받기),
// holds it, throws it (공 던지기) in an arc, the dog runs after it, picks it up with its head down,
// carries it back in its mouth and offers it again. Distances are the prototype's px × ~1.4 (the RN
// dog/player are bigger); speeds are the backend's own RUN/WALK settings (docs/dog-behavior-api.md).
export type BallPhase =
  | 'REST' // ball lies on the ground, the dog wanders as usual
  | 'FETCH' // dog goes to the ball
  | 'PICK' // dog lowers its head and takes it
  | 'RETURN' // dog carries it to the player
  | 'OFFER' // dog waits next to the player with the ball in its mouth
  | 'RECEIVING' // ball flies from the dog's mouth to the player's hand
  | 'READY' // player holds the ball
  | 'WINDUP' // player pulls back
  | 'FLIGHT'; // ball is in the air; the dog sets off a moment after the throw

export type PlayerBallAction = 'push' | 'pull';

export interface BallPlayState {
  phase: BallPhase;
  /** Visual position of the ball (already includes any lift: mouth / hand / arc). */
  ballX: number;
  ballY: number;
  /** Y of the shadow under the ball while it is airborne or resting on the ground, else null. */
  shadowY: number | null;
  phaseMs: number;
  from: Point;
  /** Where the current throw lands (ball) and where the dog should stand to take it. */
  landing: Point | null;
  returnTarget: Point | null;
  playerAction: PlayerBallAction | null;
  playerActionMs: number;
}

// --- Distances (map units) ---
export const ENGAGE_DISTANCE = 75; // player this close → the dog fetches the ball
export const LEAVE_DISTANCE = 120; // player this far → the dog drops it
export const RECEIVE_DISTANCE = 58;
export const THROW_RANGE = 76;
const RETURN_STANDOFF = 40; // dog stops this far from the player
const THROW_REACH = [106, 87, 67];
const THROW_TURNS = [0, -0.55, 0.55, -1.1, 1.1, -1.8, 1.8, Math.PI];
const LANDING_SIDE = 15;
const MIN_LANDING_FROM_DOG = 34;
const ARRIVE_DIST = 5;
const ARC_HEIGHT = 34;
// --- Timings (ms) ---
const RECEIVE_MS = 600;
const WINDUP_MS = 280;
const FLIGHT_MS = 700;
const DOG_STARTS_AFTER_MS = 160;
const PICK_MS = 650;
const ACTION_MS: Record<PlayerBallAction, number> = { push: 560, pull: 600 };
const BALL_REST_OFFSET = { x: 28, y: -8 };

export function createBallPlayState(dogX = 0, dogY = 0): BallPlayState {
  const x = dogX + BALL_REST_OFFSET.x;
  const y = dogY + BALL_REST_OFFSET.y;
  return { phase: 'REST', ballX: x, ballY: y, shadowY: y + 4, phaseMs: 0, from: { x, y }, landing: null, returnTarget: null, playerAction: null, playerActionMs: 0 };
}

/** The ball game owns the dog (and the player's gesture) while it isn't resting. */
export function isBallPlayActive(state: BallPlayState): boolean {
  return state.phase !== 'REST';
}

export function mouthPoint(dog: Point, facing: DogSpriteDirection): Point {
  return { x: dog.x + (facing === 'RIGHT' ? 17 : facing === 'LEFT' ? -17 : 0), y: dog.y - (facing === 'UP' ? 25 : 17) };
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function routeClear(from: Point, to: Point, bounds: Bounds, obstacles: Rect[]): boolean {
  const steps = Math.max(1, Math.ceil(dist(from, to) / 6));
  for (let i = 1; i <= steps; i++) {
    if (!pointFree(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps, DOG_RADIUS, bounds, obstacles)) {
      return false;
    }
  }
  return true;
}

/**
 * Where the player can throw (prototype findThrowTarget): around the player→dog direction, at the
 * longest reach that is far enough from the dog, on ground the dog can stand on, with a clear run.
 */
export function findThrowTarget(player: Point, dog: Point, bounds: Bounds, obstacles: Rect[]): { target: Point; landing: Point } | null {
  const angle = Math.atan2(dog.y - player.y, dog.x - player.x);
  for (const reach of THROW_REACH) {
    for (const turn of THROW_TURNS) {
      const a = angle + turn;
      const target = { x: player.x + Math.cos(a) * reach, y: player.y + Math.sin(a) * reach };
      const side = target.x >= dog.x ? 1 : -1;
      const landing = { x: target.x + side * LANDING_SIDE, y: target.y - 3 };
      if (dist(target, dog) < MIN_LANDING_FROM_DOG || !pointFree(landing.x, landing.y, DOG_RADIUS, bounds, obstacles)) {
        continue;
      }
      if (routeClear(dog, target, bounds, obstacles)) {
        return { target, landing };
      }
    }
  }
  return null;
}

export interface BallControl {
  visible: boolean;
  enabled: boolean;
  label: string;
  action: 'receive' | 'throw' | null;
}

/** The single ball button (prototype ballInteraction): its label and whether it can be pressed now. */
export function ballControl(state: BallPlayState, dog: Point, dogName: string, player: Point, canThrow: boolean): BallControl {
  const distance = dist(player, dog);
  const busy: Partial<Record<BallPhase, string>> = { RECEIVING: '받는 중', WINDUP: '던지는 중', FLIGHT: '날아가는 중', FETCH: '가져오는 중', PICK: '줍는 중', RETURN: '가져오는 중' };
  const busyLabel = busy[state.phase];
  if (busyLabel) return { visible: true, enabled: false, label: busyLabel, action: null };
  if (state.phase === 'READY') {
    if (distance > THROW_RANGE) return { visible: true, enabled: false, label: `${dogName} 가까이 가기`, action: null };
    return { visible: true, enabled: canThrow, label: canThrow ? '공 던지기' : '넓은 곳에서 던지기', action: canThrow ? 'throw' : null };
  }
  if (state.phase === 'OFFER') {
    return distance <= RECEIVE_DISTANCE
      ? { visible: true, enabled: true, label: '공 받기', action: 'receive' }
      : { visible: true, enabled: false, label: `${dogName} 가까이 가기`, action: null };
  }
  return { visible: false, enabled: false, label: '', action: null };
}

/** Player taps 공 받기 — only while the dog is offering the ball. */
export function startReceive(state: BallPlayState, dog: Point, facing: DogSpriteDirection): BallPlayState {
  if (state.phase !== 'OFFER') return state;
  const mouth = mouthPoint(dog, facing);
  return { ...state, phase: 'RECEIVING', phaseMs: 0, from: { x: state.ballX, y: state.ballY }, shadowY: null, playerAction: 'pull', playerActionMs: 0, ballX: mouth.x, ballY: mouth.y };
}

/** Player taps 공 던지기 — only while holding the ball; `throwTarget` comes from findThrowTarget. */
export function startThrow(state: BallPlayState, hand: Point, throwTarget: { target: Point; landing: Point } | null): BallPlayState {
  if (state.phase !== 'READY' || !throwTarget) return state;
  return { ...state, phase: 'WINDUP', phaseMs: 0, from: hand, landing: throwTarget.target, returnTarget: throwTarget.landing, playerAction: 'push', playerActionMs: 0 };
}

/** The dog's pose while the ball game drives it (REST → null: the wandering FSM decides). */
export function ballDogPose(state: BallPlayState, settings: DogBehaviorSettings): DogState | null {
  const run: DogState = settings.actions.RUN.weight > 0 ? 'RUN' : 'WALK';
  switch (state.phase) {
    case 'FETCH':
      return run;
    case 'FLIGHT':
      return state.phaseMs > DOG_STARTS_AFTER_MS ? run : 'IDLE';
    case 'PICK':
      return 'SNIFF';
    case 'RETURN':
      return 'WALK';
    case 'REST':
      return null;
    default:
      return 'IDLE';
  }
}

function walkToward(dog: Point, target: Point, tilesPerSecond: number, dt: number, bounds: Bounds, obstacles: Rect[]): Point {
  return stepMovement({ x: dog.x, y: dog.y, dx: target.x - dog.x, dy: target.y - dog.y, speed: tilesPerSecond * TILE_SIZE_MAP_UNITS, dt, radius: DOG_RADIUS, bounds, obstacles });
}

function fetchStandPoint(ball: Point, dog: Point): Point {
  const side = ball.x >= dog.x ? 1 : -1;
  return { x: ball.x - side * 15, y: ball.y + 3 };
}

/**
 * Advances one dog's ball game by dt seconds. Returns the new state and the dog's new position (it only
 * moves while the game drives it). `hand` is the player's hand, `dogFacing` the dog's current facing.
 */
export function tickBallPlay(
  state: BallPlayState,
  dog: Point,
  dogFacing: DogSpriteDirection,
  settings: DogBehaviorSettings,
  player: Point,
  hand: Point,
  dt: number,
  bounds: Bounds,
  obstacles: Rect[],
): { state: BallPlayState; dogPos: Point } {
  const dtMs = dt * 1000;
  const walkSpeed = settings.actions.WALK.speedTilesPerSecond;
  const runSpeed = settings.actions.RUN.weight > 0 ? settings.actions.RUN.speedTilesPerSecond : walkSpeed;
  let next: BallPlayState = { ...state, phaseMs: state.phaseMs + dtMs };
  let dogPos = dog;

  if (next.playerAction) {
    const elapsed = next.playerActionMs + dtMs;
    next = elapsed >= ACTION_MS[next.playerAction] ? { ...next, playerAction: null, playerActionMs: 0 } : { ...next, playerActionMs: elapsed };
  }

  const toPhase = (phase: BallPhase, patch: Partial<BallPlayState> = {}) => {
    next = { ...next, ...patch, phase, phaseMs: 0 };
  };
  const carry = (rate: number) => {
    const mouth = mouthPoint(dogPos, dogFacing);
    const dx = mouth.x - next.ballX;
    const dy = mouth.y - next.ballY;
    const d = Math.hypot(dx, dy);
    const step = Math.min(d * (1 - Math.exp(-dt * rate)), 58 * dt);
    if (d > 0.001) next = { ...next, ballX: next.ballX + (dx / d) * step, ballY: next.ballY + (dy / d) * step };
  };
  const dropAtDog = () => {
    const rest = createBallPlayState(dogPos.x, dogPos.y);
    next = { ...rest, playerAction: next.playerAction, playerActionMs: next.playerActionMs };
  };

  switch (next.phase) {
    case 'REST': {
      if (settings.ballPlay.chaseEnabled && dist(player, dog) < ENGAGE_DISTANCE) {
        toPhase('FETCH', { landing: null });
      }
      break;
    }
    case 'FETCH': {
      const ball = { x: next.ballX, y: next.ballY };
      const stand = next.landing ? fetchStandPoint(next.landing, dogPos) : fetchStandPoint(ball, dogPos);
      if (dist(dogPos, stand) <= ARRIVE_DIST) {
        toPhase('PICK');
      } else {
        dogPos = walkToward(dogPos, stand, runSpeed, dt, bounds, obstacles);
      }
      break;
    }
    case 'PICK': {
      if (next.phaseMs >= PICK_MS) {
        if (settings.ballPlay.returnEnabled) {
          toPhase('RETURN', { shadowY: null, returnTarget: null });
        } else {
          dropAtDog();
        }
      }
      break;
    }
    case 'RETURN': {
      carry(13);
      if (dist(player, dog) > LEAVE_DISTANCE) {
        dropAtDog();
        break;
      }
      const angle = Math.atan2(dogPos.y - player.y, dogPos.x - player.x);
      const target = { x: player.x + Math.cos(angle) * RETURN_STANDOFF, y: player.y + Math.sin(angle) * RETURN_STANDOFF };
      if (dist(dogPos, target) <= ARRIVE_DIST || (dist(dogPos, player) <= RECEIVE_DISTANCE && dist(dogPos, target) <= 14)) {
        toPhase('OFFER');
      } else {
        dogPos = walkToward(dogPos, target, walkSpeed, dt, bounds, obstacles);
      }
      break;
    }
    case 'OFFER': {
      carry(15);
      if (dist(player, dog) > LEAVE_DISTANCE) dropAtDog();
      break;
    }
    case 'RECEIVING': {
      const t = Math.min(1, next.phaseMs / RECEIVE_MS);
      const ease = t * t * (3 - 2 * t);
      next = { ...next, ballX: next.from.x + (hand.x - next.from.x) * ease, ballY: next.from.y + (hand.y - next.from.y) * ease };
      if (t >= 1) toPhase('READY');
      break;
    }
    case 'READY': {
      next = { ...next, ballX: hand.x, ballY: hand.y };
      if (dist(player, dog) > LEAVE_DISTANCE) dropAtDog();
      break;
    }
    case 'WINDUP': {
      next = { ...next, ballX: hand.x, ballY: hand.y };
      if (next.phaseMs >= WINDUP_MS) {
        toPhase('FLIGHT', { from: { x: hand.x, y: hand.y }, shadowY: player.y });
      }
      break;
    }
    case 'FLIGHT': {
      const landing = next.landing as Point;
      const t = Math.min(1, next.phaseMs / FLIGHT_MS);
      next = {
        ...next,
        ballX: next.from.x + (landing.x - next.from.x) * t,
        ballY: next.from.y + (landing.y - next.from.y) * t - Math.sin(Math.PI * t) * ARC_HEIGHT,
        shadowY: player.y + (landing.y + 4 - player.y) * t,
      };
      if (next.phaseMs > DOG_STARTS_AFTER_MS) {
        dogPos = walkToward(dogPos, fetchStandPoint(landing, dogPos), runSpeed, dt, bounds, obstacles);
      }
      if (t >= 1) toPhase('FETCH', { ballX: landing.x, ballY: landing.y, shadowY: landing.y + 4 });
      break;
    }
  }
  return { state: next, dogPos };
}
