// Placeholder dog sprites from HANN-Creator/shelter-connect's own prototype
// (work/mobile-concept/make-dog-walks.py) — procedurally drawn PNG, not AI-generated
// from a photo, and not tied to any real dog's avatarKey. Swap for real per-dog art
// once the graphics team maps avatarKey → sprite (docs/game-architecture.md).
export const dogWalkAtlas = require('./dog-walk-atlas.png');

export const DOG_FRAME_SIZE = 36;
export const DOG_WALK_FRAME_COUNT = 8;
export const DOG_IDENTITY_COUNT = 3;

export const DogDirection = {
  FRONT: 0,
  SIDE: 1,
  REAR: 2,
} as const;
export type DogDirection = (typeof DogDirection)[keyof typeof DogDirection];

/** Row for a walking dog: 3 identities x 3 directions, 8 columns of walk frames each. */
export function dogWalkRow(identity: number, direction: DogDirection): number {
  return (identity % DOG_IDENTITY_COUNT) * 3 + direction;
}

/** Row for a dog's idle bounce (side view only) — rows 9-11, one per identity. */
export function dogIdleRow(identity: number): number {
  return DOG_IDENTITY_COUNT * 3 + (identity % DOG_IDENTITY_COUNT);
}
