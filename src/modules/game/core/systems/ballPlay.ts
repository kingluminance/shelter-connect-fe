import { type Bounds, stepMovement } from './movement';
import { DOG_RADIUS, TILE_SIZE_MAP_UNITS } from './dogStateMachine';
import type { DogBehaviorSettings } from '../../../dog/types';

// Fetch mini-game, gated by the backend's ballPlay settings (docs/dog-behavior-api.md):
// chaseEnabled/returnEnabled/reactionDelayMs. The 5-phase flow (thrown → chase → grab →
// return → drop) is the shelter-connect prototype's own UX design — the backend has no
// opinion beyond those three fields ("이동·공 충돌과 복귀 경로는 앱에서 처리해").
export type BallPlayPhase = 'IDLE' | 'THROWN' | 'CHASING' | 'GRABBING' | 'RETURNING' | 'DROPPING';

export interface BallPlayState {
  phase: BallPlayPhase;
  ballX: number;
  ballY: number;
  /** ms left in a fixed-duration phase (THROWN's wait, GRABBING's bite, DROPPING's drop). */
  phaseRemainingMs: number;
}

const GRAB_DURATION_MS = 400;
const DROP_DURATION_MS = 400;
const ARRIVE_DIST = 4;

export function createBallPlayState(): BallPlayState {
  return { phase: 'IDLE', ballX: 0, ballY: 0, phaseRemainingMs: 0 };
}

export function isBallPlayActive(state: BallPlayState): boolean {
  return state.phase !== 'IDLE';
}

/** Player taps "throw" — ignored if this dog doesn't chase, or a throw is already in progress. */
export function throwBall(
  state: BallPlayState,
  targetX: number,
  targetY: number,
  ballPlay: DogBehaviorSettings['ballPlay'],
): BallPlayState {
  if (!ballPlay.chaseEnabled || state.phase !== 'IDLE') {
    return state;
  }
  return { phase: 'THROWN', ballX: targetX, ballY: targetY, phaseRemainingMs: ballPlay.reactionDelayMs };
}

/**
 * Advances one dog's ball-play sequence by dt seconds. Returns the dog's new position
 * alongside the updated ball state — GameScreen uses this instead of tickDog's normal
 * FSM movement whenever `isBallPlayActive` is true for that dog ("공놀이 중에는 배회
 * 선택을 멈추고" — the two systems never drive the same dog in the same tick).
 */
export function tickBallPlay(
  state: BallPlayState,
  dogPos: { x: number; y: number },
  settings: DogBehaviorSettings,
  player: { x: number; y: number },
  dt: number,
  bounds: Bounds,
  obstacles: Parameters<typeof stepMovement>[0]['obstacles'],
): { state: BallPlayState; dogPos: { x: number; y: number } } {
  const dtMs = dt * 1000;

  if (state.phase === 'IDLE') {
    return { state, dogPos };
  }

  if (state.phase === 'THROWN') {
    const remaining = state.phaseRemainingMs - dtMs;
    return remaining <= 0
      ? { state: { ...state, phase: 'CHASING', phaseRemainingMs: 0 }, dogPos }
      : { state: { ...state, phaseRemainingMs: remaining }, dogPos };
  }

  if (state.phase === 'CHASING') {
    // "공을 쫓을 때 RUN 비중이 0이면 WALK를 써" — chase at RUN speed when the shelter
    // actually uses RUN, otherwise fall back to WALK.
    const chaseTiles =
      settings.actions.RUN.weight > 0 ? settings.actions.RUN.speedTilesPerSecond : settings.actions.WALK.speedTilesPerSecond;
    const dist = Math.hypot(state.ballX - dogPos.x, state.ballY - dogPos.y);
    if (dist < ARRIVE_DIST) {
      return { state: { ...state, phase: 'GRABBING', phaseRemainingMs: GRAB_DURATION_MS }, dogPos };
    }
    const moved = stepMovement({
      x: dogPos.x,
      y: dogPos.y,
      dx: state.ballX - dogPos.x,
      dy: state.ballY - dogPos.y,
      speed: chaseTiles * TILE_SIZE_MAP_UNITS,
      dt,
      radius: DOG_RADIUS,
      bounds,
      obstacles,
    });
    return { state, dogPos: moved };
  }

  if (state.phase === 'GRABBING') {
    const remaining = state.phaseRemainingMs - dtMs;
    if (remaining > 0) {
      return { state: { ...state, phaseRemainingMs: remaining }, dogPos };
    }
    // "returnEnabled가 켜져 있으면 ... 돌아오고, 꺼져 있으면 가져오기 단계는 생략해"
    return settings.ballPlay.returnEnabled
      ? { state: { ...state, phase: 'RETURNING', phaseRemainingMs: 0 }, dogPos }
      : { state: { ...state, phase: 'DROPPING', phaseRemainingMs: DROP_DURATION_MS }, dogPos };
  }

  if (state.phase === 'RETURNING') {
    const walkTiles = settings.actions.WALK.speedTilesPerSecond;
    const dist = Math.hypot(player.x - dogPos.x, player.y - dogPos.y);
    if (dist < ARRIVE_DIST) {
      return { state: { ...state, phase: 'DROPPING', phaseRemainingMs: DROP_DURATION_MS }, dogPos };
    }
    const moved = stepMovement({
      x: dogPos.x,
      y: dogPos.y,
      dx: player.x - dogPos.x,
      dy: player.y - dogPos.y,
      speed: walkTiles * TILE_SIZE_MAP_UNITS,
      dt,
      radius: DOG_RADIUS,
      bounds,
      obstacles,
    });
    // Ball rides at the dog's mouth on the way back.
    return { state: { ...state, ballX: moved.x, ballY: moved.y }, dogPos: moved };
  }

  // DROPPING
  const remaining = state.phaseRemainingMs - dtMs;
  return remaining <= 0
    ? { state: createBallPlayState(), dogPos }
    : { state: { ...state, phaseRemainingMs: remaining }, dogPos };
}
