import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas, Circle, Image as SkiaImage, useImage } from '@shopify/react-native-skia';
import { groundImage, mapLayout, propImages } from './core/assets/maps/sunnyMeadow';
import { usePropImages } from './core/assets/usePropImages';
import { stepMovement } from './core/systems/movement';
import { Joystick } from './input/Joystick';

const PLAYER_RADIUS = 10;
const PLAYER_SPEED = 160; // px/s of map space
const RUN_MULTIPLIER = 1.8;
// How many map units are visible across the viewport — smaller = more zoomed in.
const VIEWPORT_MAP_UNITS = 260;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// ponytail: JS-thread requestAnimationFrame loop, not a Reanimated UI-thread worklet —
// simplest thing that works for one moving entity. Move to useFrameCallback if frame
// drops show up once the dog AI/multiple entities are added.
export function GameScreen() {
  const ground = useImage(groundImage);
  const props = usePropImages(propImages);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const viewportSize = Math.min(screenWidth, screenHeight) * 0.92;
  const scale = viewportSize / VIEWPORT_MAP_UNITS;

  const [player, setPlayer] = useState(mapLayout.spawn);
  const direction = useRef({ dx: 0, dy: 0 });

  useEffect(() => {
    let raf: number;
    let last = Date.now();

    const tick = () => {
      const now = Date.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const { dx, dy } = direction.current;
      if (dx !== 0 || dy !== 0) {
        const speed = Math.hypot(dx, dy) > 0.8 ? PLAYER_SPEED * RUN_MULTIPLIER : PLAYER_SPEED;
        setPlayer(prev =>
          stepMovement({
            x: prev.x,
            y: prev.y,
            dx,
            dy,
            speed,
            dt,
            radius: PLAYER_RADIUS,
            bounds: mapLayout.bounds,
            obstacles: mapLayout.obstacles,
          }),
        );
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Camera follows the player, clamped so its view never shows past the map edge.
  const half = VIEWPORT_MAP_UNITS / 2;
  const cameraLeft = clamp(player.x - half, 0, mapLayout.width - VIEWPORT_MAP_UNITS);
  const cameraTop = clamp(player.y - half, 0, mapLayout.height - VIEWPORT_MAP_UNITS);
  const toScreenX = (mapX: number) => (mapX - cameraLeft) * scale;
  const toScreenY = (mapY: number) => (mapY - cameraTop) * scale;

  const sortedObjects = useMemo(
    () => [...mapLayout.objects].sort((a, b) => a.depth - b.depth),
    [],
  );

  return (
    <View style={styles.container}>
      <View style={{ width: viewportSize, height: viewportSize }}>
        <Canvas style={{ width: viewportSize, height: viewportSize }}>
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
          <Circle
            cx={toScreenX(player.x)}
            cy={toScreenY(player.y)}
            r={PLAYER_RADIUS * scale}
            color="#4a90d9"
          />
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  joystick: {
    position: 'absolute',
    left: 16,
    bottom: 16,
  },
});
