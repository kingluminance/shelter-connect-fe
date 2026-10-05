import { Group, Rect } from '@shopify/react-native-skia';

// The prototype's pixel ball (natural-dogs.js drawBall): a 6×5 / 4×7 dark rim, a lighter body and a
// highlight, plus a soft ground shadow. `unit` = screen px per ball "pixel".
export function BallSprite({ x, y, shadowY, unit }: { x: number; y: number; shadowY: number | null; unit: number }) {
  const px = Math.round(x);
  const py = Math.round(y);
  return (
    <Group>
      {shadowY !== null && <Rect x={px - 3 * unit} y={Math.round(shadowY)} width={7 * unit} height={2 * unit} color="rgba(141,123,86,0.33)" />}
      <Rect x={px - 3 * unit} y={py - 2 * unit} width={6 * unit} height={5 * unit} color="#9e6657" />
      <Rect x={px - 2 * unit} y={py - 3 * unit} width={4 * unit} height={7 * unit} color="#9e6657" />
      <Rect x={px - 2 * unit} y={py - 2 * unit} width={4 * unit} height={5 * unit} color="#efb47b" />
      <Rect x={px - 2 * unit} y={py - 2 * unit} width={2 * unit} height={2 * unit} color="#ffe6af" />
    </Group>
  );
}
