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
export function SpriteFrame({ sheet, frameSize, col, row, x, y, size, flipX }: SpriteFrameProps) {
  const scale = size / frameSize;
  const sheetWidth = sheet.width() * scale;
  const sheetHeight = sheet.height() * scale;
  const centerX = x + size / 2;
  const centerY = y + size / 2;

  return (
    <Group
      clip={{ x, y, width: size, height: size }}
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
