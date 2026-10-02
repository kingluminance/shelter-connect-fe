import type { StyleProp, ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { svgAssets } from '../assets/svgAssets';

interface HomeSvgProps {
  name: keyof typeof svgAssets;
  width: number;
  height: number;
  /** Recolors every stroke — only the tab-bar icons need this (selected vs not). */
  stroke?: string;
  style?: StyleProp<ViewStyle>;
}

// Figma-exported icons/illustrations from assets/svg (see scripts/gen-svg-assets.mjs).
export function HomeSvg({ name, width, height, stroke, style }: HomeSvgProps) {
  const xml = stroke ? svgAssets[name].replace(/stroke="#[0-9A-Fa-f]{6}"/g, `stroke="${stroke}"`) : svgAssets[name];
  return <SvgXml xml={xml} width={width} height={height} style={style} />;
}
