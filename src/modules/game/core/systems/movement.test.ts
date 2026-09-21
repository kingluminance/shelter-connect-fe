import { stepMovement } from './movement';

const bounds = { left: 0, top: 0, right: 100, bottom: 100 };

test('moves toward input direction', () => {
  const result = stepMovement({
    x: 50, y: 50, dx: 1, dy: 0, speed: 10, dt: 1, radius: 5, bounds, obstacles: [],
  });
  expect(result.x).toBeCloseTo(60);
  expect(result.y).toBeCloseTo(50);
});

test('clamps to bounds', () => {
  const result = stepMovement({
    x: 95, y: 50, dx: 1, dy: 0, speed: 50, dt: 1, radius: 5, bounds, obstacles: [],
  });
  expect(result.x).toBeCloseTo(95);
});

test('stops at an obstacle but keeps the perpendicular axis moving', () => {
  const obstacles = [{ x: 60, y: 0, w: 20, h: 100 }];
  const result = stepMovement({
    x: 50, y: 50, dx: 1, dy: 1, speed: 10, dt: 1, radius: 5, bounds, obstacles,
  });
  expect(result.x).toBeCloseTo(50);
  expect(result.y).toBeCloseTo(50 + 10 / Math.SQRT2);
});

test('zero input keeps position unchanged', () => {
  const result = stepMovement({
    x: 50, y: 50, dx: 0, dy: 0, speed: 10, dt: 1, radius: 5, bounds, obstacles: [],
  });
  expect(result).toEqual({ x: 50, y: 50 });
});
