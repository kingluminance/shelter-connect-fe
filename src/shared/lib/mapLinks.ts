import { Linking, Platform } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

export interface MapPlace {
  label: string;
  latitude: number | null;
  longitude: number | null;
}

/** URL that opens the device's map app on this place. With coordinates it drops a pin; without
 * them (the API treats coordinates as optional) it falls back to searching the label. */
export function mapUrl(place: MapPlace, platform: string = Platform.OS): string {
  const label = encodeURIComponent(place.label);
  const hasCoords = place.latitude !== null && place.longitude !== null;
  if (platform === 'ios') {
    return hasCoords ? `http://maps.apple.com/?ll=${place.latitude},${place.longitude}&q=${label}` : `http://maps.apple.com/?q=${label}`;
  }
  return hasCoords ? `geo:${place.latitude},${place.longitude}?q=${place.latitude},${place.longitude}(${label})` : `geo:0,0?q=${label}`;
}

export function openInMaps(place: MapPlace) {
  return Linking.openURL(mapUrl(place));
}

export function copyAddress(label: string) {
  Clipboard.setString(label);
}
