import { StyleSheet, View } from 'react-native';
import { Canvas, Image as SkiaImage, useImage } from '@shopify/react-native-skia';

interface RemoteImageProps {
  url: string | null;
  width: number;
  height: number;
  radius: number;
  /** Shown until (or instead of) the image. */
  placeholder?: string;
}

// Skia-only image loading (CLAUDE.md) with a rounded, cover-fit tile.
export function RemoteImage({ url, width, height, radius, placeholder = '#eee8da' }: RemoteImageProps) {
  const image = useImage(url ?? undefined);
  return (
    <View style={{ width, height, borderRadius: radius, overflow: 'hidden', backgroundColor: placeholder }}>
      {image && (
        <Canvas style={StyleSheet.absoluteFill}>
          <SkiaImage image={image} x={0} y={0} width={width} height={height} fit="cover" />
        </Canvas>
      )}
    </View>
  );
}
