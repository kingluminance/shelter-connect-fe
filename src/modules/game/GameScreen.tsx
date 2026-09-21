import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas, Circle, Image as SkiaImage, useImage } from '@shopify/react-native-skia';
import { groundImage, mapLayout, propImages, reedsSheet, grassSheet, waterFullMapFrames } from './core/assets/maps/sunnyMeadow';
import {
  PLAYER_FRAME_SIZE,
  PLAYER_SHEET_COLS,
  PLAYER_WALK_ROW,
  playerWalkSheet,
} from './core/assets/character/playerWalk';
import { sampleDogs } from './core/entities/sampleDogs';
import { usePropImages } from './core/assets/usePropImages';
import { SpriteFrame } from './core/entities/SpriteFrame';
import { createDogAgent, tickDog, type DogAgent } from './core/systems/dogStateMachine';
import { stepMovement } from './core/systems/movement';
import { Joystick } from './input/Joystick';

const DOG_DISPLAY_RADIUS = 9;
const DOG_TAIL_WAG_RADIUS = 12;

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

// ponytail: JS-thread requestAnimationFrame loop, not a Reanimated UI-thread worklet —
// simplest thing that works for one moving entity. Move to useFrameCallback if frame
// drops show up once the dog AI/multiple entities are added.
export function GameScreen() {
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

  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const scale = viewportWidth / VIEWPORT_MAP_UNITS;
  const visibleMapUnitsY = viewportHeight / scale;

  const [player, setPlayer] = useState(mapLayout.spawn);
  const [dogs, setDogs] = useState<DogAgent[]>(() =>
    sampleDogs.map(dog => {
      const slot = mapLayout.slots[dog.slotIndex];
      return createDogAgent(slot.x, slot.y);
    }),
  );
  const [animFrame, setAnimFrame] = useState(0);
  const [playerAnimStep, setPlayerAnimStep] = useState(0);
  const isMoving = useRef(false);
  const facingLeft = useRef(false);
  const direction = useRef({ dx: 0, dy: 0 });
  const playerPosRef = useRef(mapLayout.spawn);

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

      setDogs(prevDogs =>
        prevDogs.map((agent, i) =>
          tickDog(
            agent,
            sampleDogs[i].personality,
            dt,
            playerPosRef.current,
            mapLayout.bounds,
            mapLayout.obstacles,
          ),
        ),
      );

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
  }, []);

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
              />
            );
          })}
          {dogs.map((dog, i) => (
            <Circle
              key={sampleDogs[i].id}
              cx={toScreenX(dog.x)}
              cy={toScreenY(dog.y)}
              r={(dog.state === 'TAIL_WAG' ? DOG_TAIL_WAG_RADIUS : DOG_DISPLAY_RADIUS) * scale}
              color={sampleDogs[i].color}
            />
          ))}
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
});
