import { useEffect, useRef, useState, type ReactElement } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { Canvas, Circle, FilterMode, Image as SkiaImage, useImage } from '@shopify/react-native-skia';
import { groundImage, mapLayout, propImages, reedsSheet, grassSheet, waterFullMapFrames } from './core/assets/maps/sunnyMeadow';
import {
  PLAYER_FRAME_SIZE,
  PLAYER_SHEET_COLS,
  PLAYER_WALK_ROW,
  playerWalkSheet,
} from './core/assets/character/playerWalk';
import {
  DOG_FRAME_SIZE,
  DOG_IDENTITY_COUNT,
  DogDirection,
  dogIdleColumn,
  dogIdleRow,
  dogWalkAtlas,
  dogWalkRow,
} from './core/assets/dog/dogWalkAtlas';
import { usePropImages } from './core/assets/usePropImages';
import { SpriteFrame } from './core/entities/SpriteFrame';
import { createDogAgent, tickDog, type DogAgent, type DogState } from './core/systems/dogStateMachine';
import {
  createBallPlayState,
  isBallPlayActive,
  throwBall,
  tickBallPlay,
  type BallPlayState,
} from './core/systems/ballPlay';
import { stepMovement } from './core/systems/movement';
import { Joystick } from './input/Joystick';
import { useShelterDogs, type DogWithBehavior } from '../dog/hooks/useShelterDogs';
import type { RootStackParamList } from '../../app/navigation';

const DOG_DISPLAY_SIZE = 30;
// Pixel art, nearest-neighbor only — no blur from bilinear interpolation on upscale.
const NEAREST_SAMPLING = { filter: FilterMode.Nearest };

const PLAYER_RADIUS = 10;
const PLAYER_DISPLAY_SIZE = 44;
const PLAYER_SPEED = 55; // px/s of map space
const RUN_MULTIPLIER = 1.8;
// How many map units are visible across the viewport's width — smaller = more zoomed in.
// Height follows the screen's aspect ratio so a tall phone just shows more vertically.
const VIEWPORT_MAP_UNITS = 160;
const ANIM_FRAME_MS = 250;
const ANIM_FRAME_COUNT = 8;
const PLANT_DISPLAY_SIZE = 24;
// Walk cycle reads better faster than the 250ms environment clock, and bouncing
// back and forth through the columns instead of looping straight through reads
// more like footsteps than the flat forward loop did.
const PLAYER_ANIM_FRAME_MS = 90;
const PLAYER_WALK_SEQUENCE = [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1];
// How close the player needs to be to a dog before "talk" shows up, in map units.
const TALK_RANGE = 40;
// How close the player needs to be to a ball-chasing dog before "throw" shows up,
// and how far a throw itself travels — both in map units.
const THROW_RANGE = 60;
const THROW_DISTANCE = 40;
const BALL_DISPLAY_RADIUS = 4;

function clamp(value: number, min: number, max: number) {
  if (max < min) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

interface DogFacing {
  direction: DogDirection;
  flipX: boolean;
}

const DEFAULT_DOG_FACING: DogFacing = { direction: DogDirection.FRONT, flipX: false };

// Heading toward a target point — ambiguous/idle ticks (no target, or barely moving)
// keep the last facing instead of snapping back to front. Takes a plain position
// rather than DogAgent so ball-play (chasing the ball, then the player) can reuse it.
function nextDogFacing(
  pos: { x: number; y: number; target: { x: number; y: number } | null },
  previous: DogFacing,
): DogFacing {
  if (!pos.target) {
    return previous;
  }
  const dx = pos.target.x - pos.x;
  const dy = pos.target.y - pos.y;
  if (Math.abs(dx) > Math.abs(dy) * 1.2) {
    return { direction: DogDirection.SIDE, flipX: dx < 0 };
  }
  if (Math.abs(dy) > Math.abs(dx) * 1.2) {
    return { direction: dy > 0 ? DogDirection.FRONT : DogDirection.REAR, flipX: previous.flipX };
  }
  return previous;
}

// GRABBING/DROPPING have no dedicated art either — borrow SNIFF's head-down idle
// column since a dog biting/dropping a ball reads reasonably close to that pose.
function ballPoseState(phase: BallPlayState['phase']): DogState {
  return phase === 'GRABBING' || phase === 'DROPPING' ? 'SNIFF' : 'IDLE';
}

// ponytail: JS-thread requestAnimationFrame loop, not a Reanimated UI-thread worklet —
// simplest thing that works for one moving entity. Move to useFrameCallback if frame
// drops show up once more entities are added.
export function GameScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Game'>>();
  const ground = useImage(groundImage);
  const grass = useImage(grassSheet);
  const reeds = useImage(reedsSheet);
  const playerSheet = useImage(playerWalkSheet);
  const dogSheet = useImage(dogWalkAtlas);
  const props = usePropImages(propImages);
  // Fixed-size array from a module constant — same reasoning as usePropImages.
  const waterFrames = [
    useImage(waterFullMapFrames[0]),
    useImage(waterFullMapFrames[1]),
    useImage(waterFullMapFrames[2]),
    useImage(waterFullMapFrames[3]),
    useImage(waterFullMapFrames[4]),
    useImage(waterFullMapFrames[5]),
    useImage(waterFullMapFrames[6]),
    useImage(waterFullMapFrames[7]),
  ];

  const shelterDogs = useShelterDogs(params.shelterId);

  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const scale = viewportWidth / VIEWPORT_MAP_UNITS;
  const visibleMapUnitsY = viewportHeight / scale;

  const [player, setPlayer] = useState(mapLayout.spawn);
  const [dogs, setDogs] = useState<DogAgent[]>([]);
  const [dogMeta, setDogMeta] = useState<DogWithBehavior[]>([]);
  const [animFrame, setAnimFrame] = useState(0);
  const [playerAnimStep, setPlayerAnimStep] = useState(0);
  const isMoving = useRef(false);
  const facingLeft = useRef(false);
  const direction = useRef({ dx: 0, dy: 0 });
  const playerPosRef = useRef(mapLayout.spawn);
  const dogFacingRef = useRef<DogFacing[]>([]);
  const ballStatesRef = useRef<BallPlayState[]>([]);
  const lastDirectionRef = useRef({ dx: 0, dy: 1 }); // toward the viewer by default — where to aim a throw

  // Spawn one dog per slot once the shelter's dogs + behavior settings arrive.
  useEffect(() => {
    if (shelterDogs.status === 'ready') {
      setDogMeta(shelterDogs.dogs);
      setDogs(
        shelterDogs.dogs.map((_, i) => {
          const slot = mapLayout.slots[i % mapLayout.slots.length];
          return createDogAgent(slot.x, slot.y);
        }),
      );
      ballStatesRef.current = shelterDogs.dogs.map(() => createBallPlayState());
    }
  }, [shelterDogs]);

  useEffect(() => {
    let raf: number;
    let last = Date.now();
    let animAccumulator = 0;
    let playerAnimAccumulator = 0;

    const tick = () => {
      const now = Date.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const { dx, dy } = direction.current;
      isMoving.current = dx !== 0 || dy !== 0;
      if (dx !== 0) {
        facingLeft.current = dx < 0;
      }
      if (isMoving.current) {
        lastDirectionRef.current = { dx, dy };
      }
      if (isMoving.current) {
        const speed = Math.hypot(dx, dy) > 0.8 ? PLAYER_SPEED * RUN_MULTIPLIER : PLAYER_SPEED;
        const moved = stepMovement({
          x: playerPosRef.current.x,
          y: playerPosRef.current.y,
          dx,
          dy,
          speed,
          dt,
          radius: PLAYER_RADIUS,
          bounds: mapLayout.bounds,
          obstacles: mapLayout.obstacles,
        });
        playerPosRef.current = moved;
        setPlayer(moved);
      }

      setDogs(prevDogs => {
        const nextDogs = prevDogs.map((agent, i) => {
          if (!dogMeta[i]) {
            return agent;
          }
          const settings = dogMeta[i].behavior.settings;
          const ball = ballStatesRef.current[i] ?? createBallPlayState();
          // Ball-play and the wandering FSM never drive the same dog in the same
          // tick ("공놀이 중에는 배회 선택을 멈추고") — tickDog just doesn't run
          // while a throw is in progress, and resumes wherever it left off after.
          if (isBallPlayActive(ball)) {
            const result = tickBallPlay(
              ball,
              { x: agent.x, y: agent.y },
              settings,
              playerPosRef.current,
              dt,
              mapLayout.bounds,
              mapLayout.obstacles,
            );
            ballStatesRef.current[i] = result.state;
            return { ...agent, x: result.dogPos.x, y: result.dogPos.y };
          }
          return tickDog(agent, settings, dt, playerPosRef.current, mapLayout.bounds, mapLayout.obstacles);
        });
        dogFacingRef.current = nextDogs.map((agent, i) => {
          const ball = ballStatesRef.current[i];
          const previous = dogFacingRef.current[i] ?? DEFAULT_DOG_FACING;
          if (ball && isBallPlayActive(ball)) {
            const target = ball.phase === 'RETURNING' ? playerPosRef.current : { x: ball.ballX, y: ball.ballY };
            return nextDogFacing({ x: agent.x, y: agent.y, target }, previous);
          }
          return nextDogFacing(agent, previous);
        });
        return nextDogs;
      });

      // Water/grass/reeds animate on the 250ms environment clock.
      animAccumulator += dt * 1000;
      if (animAccumulator >= ANIM_FRAME_MS) {
        animAccumulator %= ANIM_FRAME_MS;
        setAnimFrame(f => (f + 1) % ANIM_FRAME_COUNT);
      }

      // Player walk cycle runs faster, and only while actually moving.
      if (isMoving.current) {
        playerAnimAccumulator += dt * 1000;
        if (playerAnimAccumulator >= PLAYER_ANIM_FRAME_MS) {
          playerAnimAccumulator %= PLAYER_ANIM_FRAME_MS;
          setPlayerAnimStep(s => (s + 1) % PLAYER_WALK_SEQUENCE.length);
        }
      } else {
        playerAnimAccumulator = 0;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dogMeta]);

  // Camera follows the player, clamped so its view never shows past the map edge.
  const cameraLeft = clamp(
    player.x - VIEWPORT_MAP_UNITS / 2,
    0,
    mapLayout.width - VIEWPORT_MAP_UNITS,
  );
  const cameraTop = clamp(
    player.y - visibleMapUnitsY / 2,
    0,
    mapLayout.height - visibleMapUnitsY,
  );
  const toScreenX = (mapX: number) => (mapX - cameraLeft) * scale;
  const toScreenY = (mapY: number) => (mapY - cameraTop) * scale;

  const playerFrame = isMoving.current ? PLAYER_WALK_SEQUENCE[playerAnimStep] : 0;

  // Painter's algorithm: props, dogs and the player all plant on the same ground
  // plane, so they have to be sorted into one list by map-Y (mapLayout.objects'
  // precomputed `depth` is each prop's ground-contact point, comparable to the
  // player/dogs' own y) rather than drawn in separate fixed-order blocks — otherwise
  // an entity above a tall prop still paints on top of it.
  const sceneEntities: { depth: number; node: ReactElement }[] = [];

  for (const object of mapLayout.objects) {
    const image = props[object.asset];
    if (!image) {
      continue;
    }
    sceneEntities.push({
      depth: object.depth,
      node: (
        <SkiaImage
          key={object.id}
          image={image}
          x={toScreenX(object.x)}
          y={toScreenY(object.y)}
          width={object.w * scale}
          height={object.h * scale}
          fit="fill"
          sampling={NEAREST_SAMPLING}
        />
      ),
    });
  }

  // Talk target: the nearest dog within range.
  let talkTargetIndex: number | null = null;
  let talkTargetDist = TALK_RANGE;
  // Throw target: the nearest dog within range that's set up to chase and isn't
  // already mid-fetch.
  let throwTargetIndex: number | null = null;
  let throwTargetDist = THROW_RANGE;

  if (dogSheet) {
    dogs.forEach((dog, i) => {
      const identity = i % DOG_IDENTITY_COUNT;
      const ball = ballStatesRef.current[i];
      const ballActive = ball ? isBallPlayActive(ball) : false;
      const moving = ballActive
        ? ball!.phase === 'CHASING' || ball!.phase === 'RETURNING'
        : dog.state === 'WALK' || dog.state === 'RUN' || dog.state === 'BACK_OFF';
      const facing = dogFacingRef.current[i] ?? DEFAULT_DOG_FACING;
      const row = moving ? dogWalkRow(identity, facing.direction) : dogIdleRow(identity);
      const col = moving ? animFrame : dogIdleColumn(ballActive ? ballPoseState(ball!.phase) : dog.state, animFrame);
      sceneEntities.push({
        depth: dog.y,
        node: (
          <SpriteFrame
            key={dogMeta[i]?.id ?? i}
            sheet={dogSheet}
            frameSize={DOG_FRAME_SIZE}
            col={col}
            row={row}
            x={toScreenX(dog.x) - (DOG_DISPLAY_SIZE * scale) / 2}
            y={toScreenY(dog.y) - (DOG_DISPLAY_SIZE * scale) / 2}
            size={DOG_DISPLAY_SIZE * scale}
            flipX={facing.flipX}
          />
        ),
      });

      if (ball && isBallPlayActive(ball)) {
        sceneEntities.push({
          depth: ball.ballY,
          node: (
            <Circle
              key={`ball-${dogMeta[i]?.id ?? i}`}
              cx={toScreenX(ball.ballX)}
              cy={toScreenY(ball.ballY)}
              r={BALL_DISPLAY_RADIUS * scale}
              color="#d9a441"
            />
          ),
        });
      }

      const dist = Math.hypot(dog.x - player.x, dog.y - player.y);
      if (dist < talkTargetDist) {
        talkTargetDist = dist;
        talkTargetIndex = i;
      }

      if (!ballActive && dogMeta[i]?.behavior.settings.ballPlay.chaseEnabled) {
        if (dist < throwTargetDist) {
          throwTargetDist = dist;
          throwTargetIndex = i;
        }
      }
    });
  }

  function openChat() {
    if (talkTargetIndex === null) {
      return;
    }
    const dog = dogMeta[talkTargetIndex];
    if (!dog) {
      return;
    }
    navigation.navigate('Chat', {
      dogId: dog.id,
      dogName: dog.name,
      identityIndex: talkTargetIndex % DOG_IDENTITY_COUNT,
    });
  }

  function handleThrow() {
    if (throwTargetIndex === null) {
      return;
    }
    const meta = dogMeta[throwTargetIndex];
    if (!meta) {
      return;
    }
    const { dx, dy } = lastDirectionRef.current;
    const len = Math.hypot(dx, dy) || 1;
    const targetX = clamp(
      playerPosRef.current.x + (dx / len) * THROW_DISTANCE,
      mapLayout.bounds.left,
      mapLayout.bounds.right,
    );
    const targetY = clamp(
      playerPosRef.current.y + (dy / len) * THROW_DISTANCE,
      mapLayout.bounds.top,
      mapLayout.bounds.bottom,
    );
    ballStatesRef.current[throwTargetIndex] = throwBall(
      ballStatesRef.current[throwTargetIndex] ?? createBallPlayState(),
      targetX,
      targetY,
      meta.behavior.settings.ballPlay,
    );
  }

  if (playerSheet) {
    sceneEntities.push({
      depth: player.y,
      node: (
        <SpriteFrame
          key="player"
          sheet={playerSheet}
          frameSize={PLAYER_FRAME_SIZE}
          col={playerFrame % PLAYER_SHEET_COLS}
          row={PLAYER_WALK_ROW}
          x={toScreenX(player.x) - (PLAYER_DISPLAY_SIZE * scale) / 2}
          y={toScreenY(player.y) - (PLAYER_DISPLAY_SIZE * scale) / 2}
          size={PLAYER_DISPLAY_SIZE * scale}
          flipX={facingLeft.current}
        />
      ),
    });
  }

  sceneEntities.sort((a, b) => a.depth - b.depth);

  return (
    <View style={styles.container}>
      <View style={{ width: viewportWidth, height: viewportHeight }}>
        <Canvas style={{ width: viewportWidth, height: viewportHeight }}>
          {ground && (
            <SkiaImage
              image={ground}
              x={toScreenX(0)}
              y={toScreenY(0)}
              width={mapLayout.width * scale}
              height={mapLayout.height * scale}
              fit="fill"
              sampling={NEAREST_SAMPLING}
            />
          )}
          {waterFrames[animFrame] && (
            <SkiaImage
              image={waterFrames[animFrame]!}
              x={toScreenX(0)}
              y={toScreenY(0)}
              width={mapLayout.width * scale}
              height={mapLayout.height * scale}
              fit="fill"
              sampling={NEAREST_SAMPLING}
            />
          )}
          {mapLayout.environment.plants.map((plant, index) => {
            const sheet = plant.clip === 'reeds' ? reeds : grass;
            const clipInfo = plant.clip === 'reeds'
              ? mapLayout.environment.clips.reeds
              : mapLayout.environment.clips.grass;
            if (!sheet || !clipInfo) {
              return null;
            }
            const frame = (animFrame + plant.phase) % ANIM_FRAME_COUNT;
            return (
              <SpriteFrame
                key={index}
                sheet={sheet}
                frameSize={clipInfo.frameWidth}
                col={frame}
                row={0}
                x={toScreenX(plant.x - clipInfo.anchorX)}
                y={toScreenY(plant.y - clipInfo.anchorY)}
                size={PLANT_DISPLAY_SIZE * scale}
              />
            );
          })}
          {sceneEntities.map(entity => entity.node)}
        </Canvas>
        <View style={styles.joystick}>
          <Joystick onChange={(dx, dy) => { direction.current = { dx, dy }; }} />
        </View>
        {talkTargetIndex !== null && (
          <Pressable style={styles.talkButton} onPress={openChat}>
            <Text style={styles.talkButtonText}>말 걸기</Text>
          </Pressable>
        )}
        {throwTargetIndex !== null && (
          <Pressable style={styles.throwButton} onPress={handleThrow}>
            <Text style={styles.throwButtonText}>공 던지기</Text>
          </Pressable>
        )}
        {shelterDogs.status === 'loading' && (
          <View style={styles.statusBanner}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.statusText}>강아지 불러오는 중… (서버가 잠들어 있으면 최대 1분)</Text>
          </View>
        )}
        {shelterDogs.status === 'error' && (
          <View style={styles.statusBanner}>
            <Text style={styles.statusText}>강아지를 못 불러왔어요: {shelterDogs.message}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  joystick: {
    position: 'absolute',
    left: 16,
    bottom: 16,
  },
  talkButton: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  // Stacked above talkButton — a dog can be both chat-approachable and
  // chase-enabled at once, so both buttons may show together.
  throwButton: {
    position: 'absolute',
    right: 16,
    bottom: 88,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  talkButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  throwButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  statusBanner: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    padding: 10,
  },
  statusText: {
    color: '#fff',
    flexShrink: 1,
  },
});
