import { StyleSheet, View } from 'react-native';
import { Canvas, FilterMode, Image as SkiaImage, useImage } from '@shopify/react-native-skia';
import { SvgIcon } from '../../../shared/ui/SvgIcon';
import { houseImages } from '../assets/images';
import { svgAssets } from '../assets/svgAssets';
import type { HouseKind } from '../shelterDisplay';

const WIDTH = 73;
const HEIGHT = 87;
const NEAREST = { filter: FilterMode.Nearest };

// Figma "집 디자인" A/B/C (nodes 11:956 / 11:964 / 11:972) — each variant's own inset for
// the house artwork inside its clip box, copied from the design's percentages.
const VARIANTS: Record<HouseKind, { bg: string; inner: { x: number; top: number } }> = {
  warmth: { bg: '#f0ead7', inner: { x: 0.0278, top: 0.1352 } },
  starlight: { bg: '#e3eddf', inner: { x: 0.0366, top: 0.0732 } },
  lakeside: { bg: '#dfece8', inner: { x: 0.0366, top: 0.0732 } },
};

export function ShelterHouse({ kind, bg }: { kind: HouseKind; bg?: string }) {
  const image = useImage(houseImages[kind]);
  const variant = VARIANTS[kind];

  // Outer clip box: inset [12.26% 8.9% 9.2% 8.9%]; the artwork sits inside it by `inner`.
  const outer = { x: WIDTH * 0.089, y: HEIGHT * 0.1226, w: WIDTH * (1 - 0.178), h: HEIGHT * (1 - 0.1226 - 0.092) };
  const art = {
    x: outer.x + outer.w * variant.inner.x,
    y: outer.y + outer.h * variant.inner.top,
    w: outer.w * (1 - variant.inner.x * 2),
    h: outer.h * (1 - variant.inner.top),
  };

  return (
    <View style={[styles.box, { backgroundColor: bg ?? variant.bg }]}>
      <SvgIcon xml={svgAssets.houseShadow} width={54} height={7} style={styles.shadow} />
      <Canvas style={StyleSheet.absoluteFill}>
        {image && <SkiaImage image={image} x={art.x} y={art.y} width={art.w} height={art.h} fit="contain" sampling={NEAREST} />}
      </Canvas>
      <SvgIcon xml={svgAssets.star5} width={5} height={5} style={styles.starA} />
      <SvgIcon xml={svgAssets.star4} width={4} height={4} style={styles.starB} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: WIDTH, height: HEIGHT, borderRadius: 12, overflow: 'hidden' },
  shadow: { position: 'absolute', left: 9, top: 74 },
  starA: { position: 'absolute', left: 8, top: 10 },
  starB: { position: 'absolute', left: 60, top: 69 },
});
