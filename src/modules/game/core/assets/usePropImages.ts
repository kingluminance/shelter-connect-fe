import { useImage } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';

/**
 * Loads every prop image for a map in one fixed-size pass. `propImages` comes from a
 * generated, module-level constant (see scripts/gen-map-assets.mjs) so its key count
 * never changes across renders — calling useImage in this loop is safe even though
 * react-hooks/rules-of-hooks can't prove that statically.
 */
export function usePropImages(propImages: Record<string, number>): Record<string, SkImage | null> {
  const ids = Object.keys(propImages);
  const result: Record<string, SkImage | null> = {};
  for (const id of ids) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- see doc comment above
    result[id] = useImage(propImages[id]);
  }
  return result;
}
