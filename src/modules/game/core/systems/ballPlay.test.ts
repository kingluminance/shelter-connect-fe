import { ballControl, ballDogPose, createBallPlayState, findThrowTarget, isBallPlayActive, startReceive, startThrow, tickBallPlay, type BallPlayState } from './ballPlay';
import type { DogBehaviorSettings } from '../../../dog/types';

const bounds = { left: 0, top: 0, right: 400, bottom: 400 };
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

const hand = (player: { x: number; y: number }) => ({ x: player.x + 14, y: player.y - 2 });

/** Runs the game forward until `done(state)` or the time budget runs out. */
function run(
  start: BallPlayState,
  dogStart: { x: number; y: number },
  player: { x: number; y: number },
  settings: DogBehaviorSettings,
  done: (state: BallPlayState) => boolean,
  budgetS = 30,
) {
  let state = start;
  let dog = dogStart;
  const seen: string[] = [state.phase];
  for (let t = 0; t < budgetS && !done(state); t += 0.05) {
    const result = tickBallPlay(state, dog, 'RIGHT', settings, player, hand(player), 0.05, bounds, noObstacles);
    state = result.state;
    dog = result.dogPos;
    if (seen[seen.length - 1] !== state.phase) seen.push(state.phase);
  }
  return { state, dog, seen };
}

const player = { x: 200, y: 200 };
const dogAt = { x: 160, y: 200 };

test('the ball rests (and the dog wanders) until the player comes close', () => {
  const settings = makeSettings();
  const far = tickBallPlay(createBallPlayState(40, 40), { x: 40, y: 40 }, 'DOWN', settings, player, hand(player), 0.05, bounds, noObstacles);
  expect(isBallPlayActive(far.state)).toBe(false);
  const near = tickBallPlay(createBallPlayState(dogAt.x, dogAt.y), dogAt, 'DOWN', settings, player, hand(player), 0.05, bounds, noObstacles);
  expect(near.state.phase).toBe('FETCH');
});

test('a dog that does not chase never starts the game', () => {
  const settings = makeSettings({ ballPlay: { chaseEnabled: false, returnEnabled: false, reactionDelayMs: 200 } });
  const result = tickBallPlay(createBallPlayState(dogAt.x, dogAt.y), dogAt, 'DOWN', settings, player, hand(player), 0.05, bounds, noObstacles);
  expect(result.state.phase).toBe('REST');
});

test('fetches the ball, picks it up, brings it back and offers it', () => {
  const settings = makeSettings();
  const { state, seen } = run(createBallPlayState(dogAt.x, dogAt.y), dogAt, player, settings, s => s.phase === 'OFFER');
  expect(seen).toEqual(['REST', 'FETCH', 'PICK', 'RETURN', 'OFFER']);
  expect(state.phase).toBe('OFFER');
});

test('without returnEnabled the dog drops the ball after picking it up', () => {
  const settings = makeSettings({ ballPlay: { chaseEnabled: true, returnEnabled: false, reactionDelayMs: 200 } });
  const { seen } = run(createBallPlayState(dogAt.x, dogAt.y), dogAt, player, settings, s => s.phase === 'REST' && s.phaseMs > 5000, 12);
  expect(seen).toContain('PICK');
  expect(seen).not.toContain('RETURN');
});

test('receive → hold → throw → flight → fetch → pick → return → offer again', () => {
  const settings = makeSettings();
  let { state, dog } = run(createBallPlayState(dogAt.x, dogAt.y), dogAt, player, settings, s => s.phase === 'OFFER');
  state = startReceive(state, dog, 'RIGHT');
  expect(state.phase).toBe('RECEIVING');
  expect(state.playerAction).toBe('pull');
  ({ state, dog } = run(state, dog, player, settings, s => s.phase === 'READY'));
  expect(state.phase).toBe('READY');
  expect(state.ballX).toBeCloseTo(hand(player).x);

  const target = findThrowTarget(player, dog, bounds, noObstacles);
  expect(target).not.toBeNull();
  state = startThrow(state, hand(player), target);
  expect(state.phase).toBe('WINDUP');
  expect(state.playerAction).toBe('push');
  const flown = run(state, dog, player, settings, s => s.phase === 'OFFER');
  expect(flown.seen).toEqual(['WINDUP', 'FLIGHT', 'FETCH', 'PICK', 'RETURN', 'OFFER']);
});

test('the ball arcs through the air and its shadow stays on the ground', () => {
  const settings = makeSettings();
  const target = { target: { x: 280, y: 200 }, landing: { x: 295, y: 197 } };
  let state: BallPlayState = { ...createBallPlayState(dogAt.x, dogAt.y), phase: 'READY' };
  state = startThrow(state, hand(player), target);
  const { state: midFlight } = run(state, dogAt, player, settings, s => s.phase === 'FLIGHT' && s.phaseMs >= 350);
  expect(midFlight.ballY).toBeLessThan(Math.min(hand(player).y, 197) - 15);
  expect(midFlight.shadowY).toBeGreaterThan(midFlight.ballY);
});

test('a throw is refused when not holding the ball or with nowhere to throw', () => {
  const idle = createBallPlayState(dogAt.x, dogAt.y);
  expect(startThrow(idle, hand(player), { target: { x: 1, y: 1 }, landing: { x: 2, y: 2 } })).toBe(idle);
  const ready: BallPlayState = { ...idle, phase: 'READY' };
  expect(startThrow(ready, hand(player), null)).toBe(ready);
  expect(startReceive(idle, dogAt, 'RIGHT')).toBe(idle);
});

test('walking away makes the dog drop the ball', () => {
  const settings = makeSettings();
  const { state, dog } = run(createBallPlayState(dogAt.x, dogAt.y), dogAt, player, settings, s => s.phase === 'OFFER');
  const gone = tickBallPlay(state, dog, 'RIGHT', settings, { x: 395, y: 395 }, hand({ x: 395, y: 395 }), 0.05, bounds, noObstacles);
  expect(gone.state.phase).toBe('REST');
});

describe('findThrowTarget', () => {
  it('finds a spot in the open and respects obstacles', () => {
    expect(findThrowTarget(player, dogAt, bounds, noObstacles)).not.toBeNull();
    const wall = [{ x: 0, y: 0, w: 400, h: 400 }];
    expect(findThrowTarget(player, dogAt, bounds, wall)).toBeNull();
  });
});

describe('ballControl', () => {
  const near = { x: 190, y: 200 };
  it('labels the button by phase', () => {
    const base = createBallPlayState(near.x, near.y);
    expect(ballControl({ ...base, phase: 'OFFER' }, near, '두부', player, true)).toMatchObject({ label: '공 받기', enabled: true, action: 'receive' });
    expect(ballControl({ ...base, phase: 'OFFER' }, { x: 60, y: 200 }, '두부', player, true)).toMatchObject({ label: '두부 가까이 가기', enabled: false });
    expect(ballControl({ ...base, phase: 'READY' }, near, '두부', player, true)).toMatchObject({ label: '공 던지기', enabled: true, action: 'throw' });
    expect(ballControl({ ...base, phase: 'READY' }, near, '두부', player, false)).toMatchObject({ label: '넓은 곳에서 던지기', enabled: false });
    expect(ballControl({ ...base, phase: 'FLIGHT' }, near, '두부', player, true)).toMatchObject({ label: '날아가는 중', enabled: false });
    expect(ballControl(base, near, '두부', player, true).visible).toBe(false);
  });
});

test('pose: runs to the ball (walks when RUN has no weight), head down to pick, walks back', () => {
  const walkOnly = makeSettings();
  const base = createBallPlayState(0, 0);
  expect(ballDogPose({ ...base, phase: 'FETCH' }, walkOnly)).toBe('WALK');
  expect(ballDogPose({ ...base, phase: 'FETCH' }, makeSettings({ actions: { ...walkOnly.actions, RUN: { ...walkOnly.actions.RUN, weight: 10 } } }))).toBe('RUN');
  expect(ballDogPose({ ...base, phase: 'PICK' }, walkOnly)).toBe('SNIFF');
  expect(ballDogPose({ ...base, phase: 'RETURN' }, walkOnly)).toBe('WALK');
  expect(ballDogPose({ ...base, phase: 'OFFER' }, walkOnly)).toBe('IDLE');
  expect(ballDogPose(base, walkOnly)).toBeNull();
});
