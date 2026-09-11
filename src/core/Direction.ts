import { Vector2D } from './Vector2D';

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  NONE = 'NONE',
}

const DIRECTION_VECTORS: Record<Direction, Vector2D> = {
  [Direction.UP]: new Vector2D(0, -1),
  [Direction.DOWN]: new Vector2D(0, 1),
  [Direction.LEFT]: new Vector2D(-1, 0),
  [Direction.RIGHT]: new Vector2D(1, 0),
  [Direction.NONE]: new Vector2D(0, 0),
};

const OPPOSITE_DIRECTIONS: Record<Direction, Direction> = {
  [Direction.UP]: Direction.DOWN,
  [Direction.DOWN]: Direction.UP,
  [Direction.LEFT]: Direction.RIGHT,
  [Direction.RIGHT]: Direction.LEFT,
  [Direction.NONE]: Direction.NONE,
};

/**
 * Returns the unit Vector2D corresponding to a Direction (using canvas y-down convention).
 */
export function getDirectionVector(direction: Direction): Vector2D {
  return DIRECTION_VECTORS[direction] ?? Vector2D.zero();
}

/**
 * Returns the 180-degree opposite Direction.
 */
export function getOppositeDirection(direction: Direction): Direction {
  return OPPOSITE_DIRECTIONS[direction] ?? Direction.NONE;
}

/**
 * Checks if two directions are exact opposites (e.g., UP and DOWN).
 */
export function isOppositeDirection(a: Direction, b: Direction): boolean {
  if (a === Direction.NONE || b === Direction.NONE) {
    return false;
  }
  return OPPOSITE_DIRECTIONS[a] === b;
}

/**
 * Checks if two directions are perpendicular (90 degrees).
 */
export function isPerpendicularDirection(a: Direction, b: Direction): boolean {
  if (a === Direction.NONE || b === Direction.NONE) {
    return false;
  }
  const isHorizontalA = a === Direction.LEFT || a === Direction.RIGHT;
  const isVerticalB = b === Direction.UP || b === Direction.DOWN;
  const isVerticalA = a === Direction.UP || a === Direction.DOWN;
  const isHorizontalB = b === Direction.LEFT || b === Direction.RIGHT;

  return (isHorizontalA && isVerticalB) || (isVerticalA && isHorizontalB);
}

/**
 * Maps a continuous Vector2D offset to its dominant cardinal Direction.
 */
export function vectorToDirection(vec: Vector2D): Direction {
  if (vec.x === 0 && vec.y === 0) {
    return Direction.NONE;
  }

  if (Math.abs(vec.x) > Math.abs(vec.y)) {
    return vec.x > 0 ? Direction.RIGHT : Direction.LEFT;
  } else {
    return vec.y > 0 ? Direction.DOWN : Direction.UP;
  }
}
