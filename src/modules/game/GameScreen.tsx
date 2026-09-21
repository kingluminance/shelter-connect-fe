import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Canvas, FilterMode, Image as SkiaImage, useImage } from '@shopify/react-native-skia';
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
  dogIdleRow,
  dogWalkAtlas,
  dogWalkRow,
} from './core/assets/dog/dogWalkAtlas';
import { usePropImages } from './core/assets/usePropImages';
import { SpriteFrame } from './core/entities/SpriteFrame';
import { createDogAgent, tickDog, type DogAgent } from './core/systems/dogStateMachine';
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

// Heading toward the dog's current target — ambiguous/idle ticks (no target, or
// barely moving) keep the last facing instead of snapping back to front.
function nextDogFacing(agent: DogAgent, previous: DogFacing): DogFacing {
  if (!agent.target) {
    return previous;
  }
  const dx = agent.target.x - agent.x;
  const dy = agent.target.y - agent.y;
  if (Math.abs(dx) > Math.abs(dy) * 1.2) {
    return { direction: DogDirection.SIDE, flipX: dx < 0 };
  }
  if (Math.abs(dy) > Math.abs(dx) * 1.2) {
    return { direction: dy > 0 ? DogDirection.FRONT : DogDirection.REAR, flipX: previous.flipX };
  }
  return previous;
}

// ponytail: JS-thread requestAnimationFrame loop, not a Reanimated UI-thread worklet —
// simplest thing that works for one moving entity. Move to useFrameCallback if frame
// drops show up once more entities are added.
export function GameScreen() {
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
        const nextDogs = prevDogs.map((agent, i) =>
          dogMeta[i]
            ? tickDog(
                agent,
                dogMeta[i].behavior.settings,
                dt,
                playerPosRef.current,
                mapLayout.bounds,
                mapLayout.obstacles,
              )
            : agent,
        );
        dogFacingRef.current = nextDogs.map((agent, i) =>
          nextDogFacing(agent, dogFacingRef.current[i] ?? DEFAULT_DOG_FACING),
        );
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

  const sortedObjects = useMemo(
    () => [...mapLayout.objects].sort((a, b) => a.depth - b.depth),
    [],
  );

  const playerFrame = isMoving.current ? PLAYER_WALK_SEQUENCE[playerAnimStep] : 0;

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
          {sortedObjects.map(object => {
            const image = props[object.asset];
            if (!image) {
              return null;
            }
            return (
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
            );
          })}
          {dogSheet && dogs.map((dog, i) => {
            const identity = i % DOG_IDENTITY_COUNT;
            const moving = dog.state === 'WALK' || dog.state === 'RUN' || dog.state === 'BACK_OFF';
            const facing = dogFacingRef.current[i] ?? DEFAULT_DOG_FACING;
            const row = moving ? dogWalkRow(identity, facing.direction) : dogIdleRow(identity);
            return (
              <SpriteFrame
                key={dogMeta[i]?.id ?? i}
                sheet={dogSheet}
                frameSize={DOG_FRAME_SIZE}
                col={animFrame}
                row={row}
                x={toScreenX(dog.x) - (DOG_DISPLAY_SIZE * scale) / 2}
                y={toScreenY(dog.y) - (DOG_DISPLAY_SIZE * scale) / 2}
                size={DOG_DISPLAY_SIZE * scale}
                flipX={facing.flipX}
              />
            );
          })}
          {playerSheet && (
            <SpriteFrame
              sheet={playerSheet}
              frameSize={PLAYER_FRAME_SIZE}
              col={playerFrame % PLAYER_SHEET_COLS}
              row={PLAYER_WALK_ROW}
              x={toScreenX(player.x) - (PLAYER_DISPLAY_SIZE * scale) / 2}
              y={toScreenY(player.y) - (PLAYER_DISPLAY_SIZE * scale) / 2}
              size={PLAYER_DISPLAY_SIZE * scale}
              flipX={facingLeft.current}
            />
          )}
        </Canvas>
        <View style={styles.joystick}>
          <Joystick onChange={(dx, dy) => { direction.current = { dx, dy }; }} />
        </View>
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
