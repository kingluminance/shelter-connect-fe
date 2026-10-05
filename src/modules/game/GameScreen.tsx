import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import {
  Canvas,
  Circle,
  FilterMode,
  Group,
  Image as SkiaImage,
  matchFont,
  RoundedRect,
  Text as SkiaText,
  useImage,
} from '@shopify/react-native-skia';
import { groundImage, mapLayout, propImages, reedsSheet, grassSheet, waterFullMapFrames } from './core/assets/maps/sunnyMeadow';
import {
  PLAYER_FRAME_SIZE,
  PLAYER_SHEET_COLS,
  PLAYER_WALK_ROW,
  playerWalkSheet,
} from './core/assets/character/playerWalk';
import { DOG_IDENTITY_COUNT } from './core/assets/dog/dogWalkAtlas';
// TEMPORARY, Phase 1 verification only — see localManifest.ts's own header comment.
import { localDogAssetManifest } from './core/assets/dog/real-v1/localManifest';
import { usePropImages } from './core/assets/usePropImages';
import { DogSprite } from './core/entities/DogSprite';
import { SpriteFrame } from './core/entities/SpriteFrame';
import { createDogAgent, tickDog, type DogAgent, type DogState } from './core/systems/dogStateMachine';
import { movementFacing } from './core/systems/spritePlayback';
import type { DogSpriteDirection } from '../dog/types';
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

const DOG_DISPLAY_SIZE = 44;
// The player-vs-dog collision box (below) needs to roughly match what's actually drawn,
// not `dogStateMachine.ts`'s DOG_RADIUS=8 — that one sizes the dog's own path-finding
// around static obstacles and was never tied to DOG_DISPLAY_SIZE. Tuned by eye on-device
// against the real sprite rather than derived: small (most of the display box is
// transparent padding) and centered well above dog.y (the ground/foot anchor, not the
// visual middle of the dog).
const DOG_COLLISION_RADIUS = DOG_DISPLAY_SIZE * 0.18;
const DOG_COLLISION_Y_OFFSET = DOG_DISPLAY_SIZE * 0.85;
// Pixel art, nearest-neighbor only — no blur from bilinear interpolation on upscale.
const NEAREST_SAMPLING = { filter: FilterMode.Nearest };

const PLAYER_RADIUS = 10;
const PLAYER_DISPLAY_SIZE = 64;
const PLAYER_SPEED = 55; // px/s of map space
const RUN_MULTIPLIER = 1.8;
// How many map units are visible across the viewport's width — smaller = more zoomed in.
// Height follows the screen's aspect ratio so a tall phone just shows more vertically.
// Raised from 160 alongside the *_DISPLAY_SIZE bumps above so the view shows more of
// the map while characters still end up bigger on screen than before, not smaller.
const VIEWPORT_MAP_UNITS = 200;
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

const DEFAULT_DOG_FACING: DogSpriteDirection = 'DOWN';

// GRABBING/DROPPING have no dedicated art either — borrow SNIFF's head-down idle
// column since a dog biting/dropping a ball reads reasonably close to that pose.
function ballPoseState(phase: BallPlayState['phase']): DogState {
  return phase === 'GRABBING' || phase === 'DROPPING' ? 'SNIFF' : 'IDLE';
}

// A small "what's this dog doing" label floated over each dog — ball-play gets its own
// wording (the phase already reads as more specific than the borrowed IDLE/SNIFF pose).
const DOG_STATE_LABELS: Record<DogState, string> = {
  IDLE: '쉬는 중',
  WALK: '산책 중',
  RUN: '신나게 뛰는 중',
  SNIFF: '냄새 맡는 중',
  TAIL_WAG: '꼬리 흔드는 중',
  BACK_OFF: '뒷걸음질 치는 중',
  SIT: '앉아있음',
  LIE_DOWN: '누워있음',
};

const BALL_PLAY_LABELS: Record<BallPlayState['phase'], string> = {
  IDLE: '',
  THROWN: '공 보는 중',
  CHASING: '공 쫓는 중',
  GRABBING: '공 무는 중',
  RETURNING: '공 가져오는 중',
  DROPPING: '공 내려놓는 중',
};

function dogStatusLabel(dog: DogAgent, ball: BallPlayState | undefined, ballActive: boolean): string {
  if (ballActive && ball) {
    return BALL_PLAY_LABELS[ball.phase];
  }
  return DOG_STATE_LABELS[dog.state];
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
  // Font for each dog's status label, drawn inside the same Canvas/paint pass as the dog
  // sprites themselves (in the dogs.forEach loop below) — an RN View sibling positioned
  // via transform still visibly lagged the Skia-drawn dog it was supposed to track, since
  // the two update on separate native pipelines/clocks.
  // A specific family (not "System") because Skia's font matching doesn't get UIKit's
  // automatic Korean-glyph fallback the way a plain RN <Text> would.
  // 'Apple SD Gothic Neo' is the family name Skia's font matcher needs (CoreText
  // family+style lookup) — 'AppleSDGothicNeo-Bold' is a PostScript instance name, not a
  // family, so it silently fell back to a Hangul-less default font and drew nothing.
  const dogLabelFont = useMemo(() => matchFont({ fontFamily: 'Apple SD Gothic Neo', fontWeight: 'bold', fontSize: 10 }), []);

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
  const dogFacingRef = useRef<DogSpriteDirection[]>([]);
  const ballStatesRef = useRef<BallPlayState[]>([]);
  const lastDirectionRef = useRef({ dx: 0, dy: 1 }); // toward the viewer by default — where to aim a throw
  // Mirrors `dogs` state so the player's own movement this same tick can collide against
  // where dogs were as of last tick — a frame stale, imperceptible, and avoids feeding
  // React state straight back into the same tick's obstacle list.
  const dogsRef = useRef<DogAgent[]>([]);

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
        // Dogs block the player's own path (one tick stale — imperceptible), same as any
        // other map obstacle. Dogs themselves still walk through the player/each other;
        // only this direction was asked for.
        // (dog.x, dog.y) is the dog's ground/foot point (DogSprite anchors the real
        // manifest art there, near the bottom of the sprite), not its visual center —
        // shift the box up by DOG_COLLISION_Y_OFFSET so it actually sits over the dog's
        // body instead of straddling (or hanging below) its feet.
        const dogObstacles = dogsRef.current
          .map(dog => ({
            centerX: dog.x,
            centerY: dog.y - DOG_COLLISION_Y_OFFSET,
          }))
          // stepMovement only ever PREVENTS new overlap, it never pushes an already-
          // overlapping actor back out — since dogs (unlike the player) aren't blocked by
          // this box, one can wander straight into the player's own spot. Left in as an
          // obstacle, that overlap would then block every direction at once and wedge the
          // player in place. Drop any dog the player is already touching so they can still
          // step away; every dog they aren't yet touching still blocks normally.
          .filter(dog => Math.hypot(playerPosRef.current.x - dog.centerX, playerPosRef.current.y - dog.centerY) > PLAYER_RADIUS + DOG_COLLISION_RADIUS)
          .map(dog => ({
            x: dog.centerX - DOG_COLLISION_RADIUS,
            y: dog.centerY - DOG_COLLISION_RADIUS,
            w: DOG_COLLISION_RADIUS * 2,
            h: DOG_COLLISION_RADIUS * 2,
          }));
        const moved = stepMovement({
          x: playerPosRef.current.x,
          y: playerPosRef.current.y,
          dx,
          dy,
          speed,
          dt,
          radius: PLAYER_RADIUS,
          bounds: mapLayout.bounds,
          obstacles: [...mapLayout.obstacles, ...dogObstacles],
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
          // TEMPORARY, Phase 1: every dog uses the same local real-v1 manifest regardless of its
          // real avatarKey/id (see localManifest.ts's header). The behavior values themselves are
          // the backend's, as served — no local weight overrides — so each dog moves by its own
          // settings and PERSON_GREETING recipe (docs/trait-selected-sprites.md).
          return tickDog(
            agent,
            settings,
            dt,
            playerPosRef.current,
            mapLayout.bounds,
            mapLayout.obstacles,
            Math.random,
            localDogAssetManifest,
            dogMeta[i].behavior.interactions?.PERSON_GREETING ?? null,
          );
        });
        // Actual displacement, not a target point — a dog blocked by an obstacle isn't
        // really moving, so it shouldn't animate as if it is (this also naturally covers
        // ball-play: result.dogPos already reflects wherever tickBallPlay really put it,
        // no separate ball.phase/target-based case needed).
        dogFacingRef.current = nextDogs.map((agent, i) => {
          const previous = dogFacingRef.current[i] ?? DEFAULT_DOG_FACING;
          const backwards = agent.state === 'BACK_OFF' && !isBallPlayActive(ballStatesRef.current[i] ?? createBallPlayState());
          return movementFacing(agent.x - prevDogs[i].x, agent.y - prevDogs[i].y, previous, backwards);
        });
        dogsRef.current = nextDogs;
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

  dogs.forEach((dog, i) => {
    const identity = i % DOG_IDENTITY_COUNT;
    const ball = ballStatesRef.current[i];
    const ballActive = ball ? isBallPlayActive(ball) : false;
    const facing = dogFacingRef.current[i] ?? DEFAULT_DOG_FACING;
    sceneEntities.push({
      depth: dog.y,
      node: (
        <DogSprite
          key={dogMeta[i]?.id ?? i}
          dog={dog}
          // TEMPORARY, Phase 1 verification only — see localManifest.ts's header.
          manifest={localDogAssetManifest}
          renderStateOverride={ballActive ? ballPoseState(ball!.phase) : undefined}
          direction={facing}
          envAnimFrame={animFrame}
          identity={identity}
          groundX={toScreenX(dog.x)}
          groundY={toScreenY(dog.y)}
          size={DOG_DISPLAY_SIZE * scale}
        />
      ),
    });

    const labelText = dogStatusLabel(dog, ball, ballActive);
    if (labelText) {
      // Same depth, pushed right after the dog: Array.prototype.sort is stable, so this
      // still draws just after (on top of) that dog once sorted.
      const centerX = toScreenX(dog.x);
      const topY = toScreenY(dog.y) + 4; // dog.y is the ground/foot point, not the center
      const textWidth = dogLabelFont.measureText(labelText).width;
      const pillWidth = textWidth + 16;
      const pillHeight = 18;
      sceneEntities.push({
        depth: dog.y,
        node: (
          <Group key={`label-${dogMeta[i]?.id ?? i}`}>
            <RoundedRect
              x={centerX - pillWidth / 2}
              y={topY}
              width={pillWidth}
              height={pillHeight}
              r={pillHeight / 2}
              color="rgba(0,0,0,0.6)"
            />
            <SkiaText x={centerX - textWidth / 2} y={topY + 13} text={labelText} font={dogLabelFont} color="white" />
          </Group>
        ),
      });
    }

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
      shelterName: params.shelterName,
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 26,
    paddingVertical: 16,
    paddingHorizontal: 26,
  },
  // Stacked above talkButton — a dog can be both chat-approachable and
  // chase-enabled at once, so both buttons may show together.
  throwButton: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 26,
    paddingVertical: 16,
    paddingHorizontal: 26,
  },
  talkButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  throwButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
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
