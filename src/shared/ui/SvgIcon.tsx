import type { StyleProp, ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';

interface SvgIconProps {
  /** One entry of a module's generated svgAssets (scripts/gen-svg-assets.mjs). */
  xml: string;
  width: number | string;
  height: number;
  /** Recolors every stroke — for icons that change color per state (tab bar, etc). */
  stroke?: string;
  style?: StyleProp<ViewStyle>;
}

export function SvgIcon({ xml, width, height, stroke, style }: SvgIconProps) {
  const source = stroke ? xml.replace(/stroke="#[0-9A-Fa-f]{6}"/g, `stroke="${stroke}"`) : xml;
  return <SvgXml xml={source} width={width} height={height} style={style} />;
}
