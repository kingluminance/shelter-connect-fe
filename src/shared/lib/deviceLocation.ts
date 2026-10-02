import Geolocation from '@react-native-community/geolocation';

export interface Coords {
  latitude: number;
  longitude: number;
}

export type LocationFailure = 'DENIED' | 'UNAVAILABLE';

// Asks for when-in-use permission (iOS prompts once; Android per request) and resolves with
// one fix. Coordinates only ever live in component state — nothing persists them.
export function getCurrentCoords(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    Geolocation.requestAuthorization(
      () => {
        Geolocation.getCurrentPosition(
          position => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
          // error code 1 = PERMISSION_DENIED (W3C geolocation spec, which this library mirrors)
          error => reject((error.code === 1 ? 'DENIED' : 'UNAVAILABLE') satisfies LocationFailure),
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
        );
      },
      () => reject('DENIED' satisfies LocationFailure),
    );
  });
}
