import { Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export interface Coords {
  latitude: number;
  longitude: number;
}

export type LocationFailure = 'DENIED' | 'UNAVAILABLE';

function currentPosition(resolve: (coords: Coords) => void, reject: (failure: LocationFailure) => void) {
  Geolocation.getCurrentPosition(
    position => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
    // error code 1 = PERMISSION_DENIED (W3C geolocation spec, which this library mirrors)
    error => reject((error.code === 1 ? 'DENIED' : 'UNAVAILABLE') satisfies LocationFailure),
    // timeout is generous: on iOS it also covers the time the user spends on the permission prompt
    { enableHighAccuracy: false, timeout: 30000, maximumAge: 60000 },
  );
}

// Resolves with one fix. Coordinates only ever live in component state — nothing persists them.
export function getCurrentCoords(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (Platform.OS === 'ios') {
      // iOS: getCurrentPosition shows the when-in-use prompt itself and settles on the answer.
      // requestAuthorization's callback only fires when the status *changes*, so once permission
      // was already decided it never answered and "위치 찾는 중…" hung forever.
      currentPosition(resolve, reject);
      return;
    }
    Geolocation.requestAuthorization(
      () => currentPosition(resolve, reject),
      () => reject('DENIED' satisfies LocationFailure),
    );
  });
}
