import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

const BASE_SIZE = 100;
const KNOB_SIZE = 44;
const MAX_OFFSET = (BASE_SIZE - KNOB_SIZE) / 2;

interface JoystickProps {
  onChange: (dx: number, dy: number) => void;
}

export function Joystick({ onChange }: JoystickProps) {
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  const pan = Gesture.Pan()
    .onChange(event => {
      const nextX = offsetX.value + event.changeX;
      const nextY = offsetY.value + event.changeY;
      const length = Math.hypot(nextX, nextY);
      const scale = length > MAX_OFFSET ? MAX_OFFSET / length : 1;
      offsetX.value = nextX * scale;
      offsetY.value = nextY * scale;
      runOnJS(onChange)(offsetX.value / MAX_OFFSET, offsetY.value / MAX_OFFSET);
    })
    .onEnd(() => {
      offsetX.value = 0;
      offsetY.value = 0;
      runOnJS(onChange)(0, 0);
    });

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }, { translateY: offsetY.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.base}>
        <Animated.View style={[styles.knob, knobStyle]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  base: {
    width: BASE_SIZE,
    height: BASE_SIZE,
    borderRadius: BASE_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
});
