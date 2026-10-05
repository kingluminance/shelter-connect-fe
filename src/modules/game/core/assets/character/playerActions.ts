// Ball-play gestures for the player: row 0 = push (throw, 560ms), row 1 = pull (receive, 600ms), 4 frames each.
// Cut from the prototype's player-walk-atlas.png (HANN-Creator/shelter-connect work/mobile-concept, 24×32
// frames) and centered into 32×32 cells so SpriteFrame's square frameSize can draw them. The figure's feet sit
// on the cell's bottom edge — draw it bottom-aligned with the walk frame.
export const playerActionsSheet = require('./player-actions.png');
export const PLAYER_ACTION_CELL = 32;
export const PLAYER_ACTION_FRAMES = 4;
export const PLAYER_ACTION_ROW = { push: 0, pull: 1 } as const;
export const PLAYER_ACTION_MS = { push: 560, pull: 600 } as const;
