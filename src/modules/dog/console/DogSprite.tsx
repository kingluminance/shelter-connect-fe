import { Canvas, type SkImage } from '@shopify/react-native-skia';
// Same cross-module reuse as ChatScreen (see the comment there): the dog's dot sprite belongs to this UX.
import { SpriteFrame } from '../../game/core/entities/SpriteFrame';
import { DOG_FRAME_SIZE, dogIdleRow } from '../../game/core/assets/dog/dogWalkAtlas';

/** The dog's idle frame (front-facing) at `size` px. */
export function DogSprite({ sheet, identityIndex, size }: { sheet: SkImage | null; identityIndex: number; size: number }) {
  if (!sheet) return null;
  return (
    <Canvas style={{ width: size, height: size }}>
      <SpriteFrame sheet={sheet} frameSize={DOG_FRAME_SIZE} col={0} row={dogIdleRow(identityIndex)} x={0} y={0} size={size} />
    </Canvas>
  );
}
