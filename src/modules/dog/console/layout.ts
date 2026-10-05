// Geometry of the console case image (510×1046). Every box is a percentage of the case, taken from
// the design's CSS (puppy-profile.html), so the LCD and the hit areas line up with the artwork.
export const SHELL_ASPECT = 510 / 1046;
/** The design is drawn at a 390px-wide case; text and padding scale from that. */
export const DESIGN_WIDTH = 390;

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const LCD: Box = { left: 14.2, top: 12.43, width: 71.7, height: 60.2 };
export const NAMEPLATE: Box = { left: 27.5, top: 3.3, width: 47.1, height: 4 };
export const DPAD: Box = { left: 5.3, top: 78.6, width: 33.85, height: 16.5 };
export const BUTTON_A: Box = { left: 73.4, top: 78.6, width: 17.5, height: 8.8 };
export const BUTTON_B: Box = { left: 58.9, top: 84.6, width: 17.3, height: 8.7 };
export const BUTTON_SELECT: Box = { left: 32.8, top: 92.9, width: 18, height: 6.5 };
export const BUTTON_START: Box = { left: 51.8, top: 92.9, width: 18, height: 6.5 };
/** Chat window overlay (left/right 3.6%, top 7.5%, height 76.5%). */
export const CHAT_WINDOW: Box = { left: 3.6, top: 7.5, width: 92.8, height: 76.5 };

export interface Size {
  width: number;
  height: number;
}

/** Largest case that fits the screen without stretching. */
export function shellSize(availableWidth: number, availableHeight: number): Size {
  const width = Math.min(availableWidth, availableHeight * SHELL_ASPECT);
  return { width, height: width / SHELL_ASPECT };
}

export function boxPx(box: Box, shell: Size) {
  return {
    left: (shell.width * box.left) / 100,
    top: (shell.height * box.top) / 100,
    width: (shell.width * box.width) / 100,
    height: (shell.height * box.height) / 100,
  };
}

/** Design px → this case's px. */
export function designScale(shell: Size): number {
  return shell.width / DESIGN_WIDTH;
}

/** D-pad is a 3×3 grid; the four arrows are its edge cells. */
export function dpadCell(box: Box, cell: 'up' | 'left' | 'right' | 'down', shell: Size) {
  const px = boxPx(box, shell);
  const w = px.width / 3;
  const h = px.height / 3;
  const col = cell === 'left' ? 0 : cell === 'right' ? 2 : 1;
  const row = cell === 'up' ? 0 : cell === 'down' ? 2 : 1;
  return { left: px.left + col * w, top: px.top + row * h, width: w, height: h };
}
