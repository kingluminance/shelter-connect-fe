import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas, Circle, Image as SkiaImage, useImage } from '@shopify/react-native-skia';
import { groundImage, mapLayout } from './core/assets/maps/sunnyMeadow';
import { stepMovement } from './core/systems/movement';
import { Joystick } from './input/Joystick';

const PLAYER_RADIUS = 10;
const PLAYER_SPEED = 160; // px/s of map space
const RUN_MULTIPLIER = 1.8;

// ponytail: JS-thread requestAnimationFrame loop, not a Reanimated UI-thread worklet —
// simplest thing that works for one moving entity. Move to useFrameCallback if frame
// drops show up once the dog AI/multiple entities are added.
export function GameScreen() {
  const ground = useImage(groundImage);
  const { width: screenWidth } = useWindowDimensions();
  const mapSize = Math.min(screenWidth, mapLayout.width);
  const scale = mapSize / mapLayout.width;

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

  return (
    <View style={styles.container}>
      <Canvas style={{ width: mapSize, height: mapSize }}>
        {ground && (
          <SkiaImage image={ground} x={0} y={0} width={mapSize} height={mapSize} fit="fill" />
        )}
        <Circle cx={player.x * scale} cy={player.y * scale} r={PLAYER_RADIUS * scale} color="#4a90d9" />
      </Canvas>
      <View style={styles.joystick}>
        <Joystick onChange={(dx, dy) => { direction.current = { dx, dy }; }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#000',
  },
  joystick: {
    position: 'absolute',
    left: 24,
    bottom: 40,
  },
});
