import { Skia, type SkImage } from '@shopify/react-native-skia';
import type { DogAssetClip, DogAssetManifest } from '../../../dog/types';

export type DogSheets = Record<string, SkImage | null>;

/**
 * Loads every sheet a manifest references (`animations` + all `mapDirections`), keyed by
 * URL — what useImage does internally, just awaited up front so the game can wait for all
 * of them before showing the map (no placeholder-then-swap flicker), and before the signed
 * /assets URLs expire (~60s). A sheet that fails to load is `null` (DogSprite draws a
 * skeleton for it).
 */
export async function loadDogSheets(manifest: DogAssetManifest): Promise<DogSheets> {
  const clips: (DogAssetClip | undefined)[] = [
    ...Object.values(manifest.animations),
    ...Object.values(manifest.mapDirections ?? {}).flatMap(byAction => Object.values(byAction ?? {})),
  ];
  const urls = [...new Set(clips.flatMap(clip => (clip ? [clip.spritesheetUrl] : [])))];
  const images = await Promise.all(
    urls.map(url =>
      Skia.Data.fromURI(url)
        .then(data => Skia.Image.MakeImageFromEncoded(data))
        .catch(() => null),
    ),
  );
  return Object.fromEntries(urls.map((url, i) => [url, images[i]]));
}
