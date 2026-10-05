import { boxPx, DPAD, dpadCell, LCD, shellSize, SHELL_ASPECT } from './layout';

describe('shellSize', () => {
  it('is limited by width on a tall screen', () => {
    const size = shellSize(390, 900);
    expect(size.width).toBe(390);
    expect(size.height).toBeCloseTo(390 / SHELL_ASPECT);
  });
  it('is limited by height on a short screen and keeps the aspect', () => {
    const size = shellSize(430, 700);
    expect(size.height).toBeCloseTo(700);
    expect(size.width / size.height).toBeCloseTo(SHELL_ASPECT);
  });
});

describe('boxPx', () => {
  it('converts percentages of the case into pixels', () => {
    const px = boxPx(LCD, { width: 500, height: 1000 });
    expect(px.left).toBeCloseTo(71);
    expect(px.top).toBeCloseTo(124.3);
    expect(px.width).toBeCloseTo(358.5);
  });
});

describe('dpadCell', () => {
  const shell = { width: 510, height: 1046 };
  it('places up/down in the middle column and left/right in the middle row', () => {
    const pad = boxPx(DPAD, shell);
    const up = dpadCell(DPAD, 'up', shell);
    const left = dpadCell(DPAD, 'left', shell);
    const right = dpadCell(DPAD, 'right', shell);
    const down = dpadCell(DPAD, 'down', shell);
    expect(up.left).toBeCloseTo(pad.left + pad.width / 3);
    expect(up.top).toBeCloseTo(pad.top);
    expect(down.top).toBeCloseTo(pad.top + (pad.height * 2) / 3);
    expect(left.left).toBeCloseTo(pad.left);
    expect(right.left).toBeCloseTo(pad.left + (pad.width * 2) / 3);
  });
});
