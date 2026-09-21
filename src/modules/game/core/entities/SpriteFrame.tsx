import { Group, Image as SkiaImage } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';

interface SpriteFrameProps {
  sheet: SkImage;
  frameSize: number;
  col: number;
  row: number;
  x: number;
  y: number;
  size: number;
  /** Mirror horizontally in place — for sprites with only one facing drawn. */
  flipX?: boolean;
}

/**
 * Draws one frame of a grid sprite sheet at (x, y) sized to `size` — clips to the
 * destination cell, then draws the full sheet shifted so only that frame lands inside.
 */
// The grid isn't pixel-perfect (frames were trimmed/packed, not laid out on an exact
// pitch), so a tight clip shaves a source pixel or two off some frames' edges — give
// the clip a little breathing room. Neighboring cells have enough transparent margin
// that this doesn't bleed into them.
const OVERSCAN_SOURCE_PX = 2;

export function SpriteFrame({ sheet, frameSize, col, row, x, y, size, flipX }: SpriteFrameProps) {
  const scale = size / frameSize;
  const sheetWidth = sheet.width() * scale;
  const sheetHeight = sheet.height() * scale;
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const overscan = OVERSCAN_SOURCE_PX * scale;

  return (
    <Group
      clip={{
        x: x - overscan,
        y: y - overscan,
        width: size + overscan * 2,
        height: size + overscan * 2,
      }}
      transform={flipX ? [{ scaleX: -1 }] : undefined}
      origin={{ x: centerX, y: centerY }}
    >
      <SkiaImage
        image={sheet}
        x={x - col * frameSize * scale}
        y={y - row * frameSize * scale}
        width={sheetWidth}
        height={sheetHeight}
        fit="fill"
      />
    </Group>
  );
}
