export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Point {
  x: number;
  y: number;
}

// Distance from a circle center to the nearest point on a rect, for circle-vs-AABB collision.
function circleHitsRect(cx: number, cy: number, radius: number, rect: Rect): boolean {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < radius * radius;
}

/**
 * Moves a circular actor by (dx, dy) * speed * dt, resolving axis-by-axis against
 * obstacles (so sliding along a wall works) and clamping to the map bounds.
 */
export function stepMovement(params: {
  x: number;
  y: number;
  dx: number;
  dy: number;
  speed: number;
  dt: number;
  radius: number;
  bounds: Bounds;
  obstacles: Rect[];
}): Point {
  const { x, y, dx, dy, speed, dt, radius, bounds, obstacles } = params;

  const length = Math.hypot(dx, dy);
  if (length === 0) {
    return { x, y };
  }
  const step = speed * dt;
  const moveX = (dx / length) * step;
  const moveY = (dy / length) * step;

  let nextX = x + moveX;
  if (obstacles.some(o => circleHitsRect(nextX, y, radius, o))) {
    nextX = x;
  }

  let nextY = y + moveY;
  if (obstacles.some(o => circleHitsRect(nextX, nextY, radius, o))) {
    nextY = y;
  }

  return {
    x: Math.min(Math.max(nextX, bounds.left + radius), bounds.right - radius),
    y: Math.min(Math.max(nextY, bounds.top + radius), bounds.bottom - radius),
  };
}
