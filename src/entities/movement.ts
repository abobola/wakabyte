import { type Direction, getDirectionVector, Vector2D } from '../core';

/**
 * Entity position specification options supporting explicit vector position or discrete tile coordinate.
 */
export interface EntityPositionOptions {
  position?: Vector2D;
  tile?: Vector2D;
}

/**
 * Resolves continuous 2D position from explicit position coordinates, tile coordinates, or fallback default tile.
 *
 * @param options - Optional position or tile specifier.
 * @param tileSize - Size of one grid tile in pixels.
 * @param defaultTile - Fallback tile coordinate if no position/tile specified (defaults to (0, 0)).
 */
export function resolveEntityPosition(
  options?: EntityPositionOptions,
  tileSize: number = 8,
  defaultTile: Vector2D = new Vector2D(0, 0),
): Vector2D {
  if (options?.position) {
    return options.position.clone();
  }
  if (options?.tile) {
    return Vector2D.tileCenter(options.tile.x, options.tile.y, tileSize);
  }
  return Vector2D.tileCenter(defaultTile.x, defaultTile.y, tileSize);
}

/**
 * 1D lane geometry and waypoint calculation for grid-constrained continuous entity movement.
 */
export interface TileLane {
  /** Unit direction vector. */
  dirVec: Vector2D;
  /** Axis step sign (+1 or -1). */
  stepSign: number;
  /** Center coordinate along active movement axis for current tile. */
  centerAxisPos: number;
  /** True if entity position is currently before the center of the current tile. */
  isBeforeCenter: boolean;
  /** Distance to the current tile center. */
  distToCenter: number;
  /** Distance to the next waypoint (current tile center if before, else next tile center). */
  distToWaypoint: number;
  /** Constructs a 2D position by setting the active axis coordinate and preserving fixed orthogonal axis. */
  makePosition(axisPos: number): Vector2D;
  /** Calculates a new position advanced along the lane by the specified linear distance. */
  advance(distance: number): Vector2D;
}

/**
 * Calculates 1D lane movement geometry and waypoint distances along the entity's active direction.
 * Returns null if direction is NONE or has zero vector.
 *
 * @param position - Current continuous entity position.
 * @param direction - Current travel direction.
 * @param currentTile - Current discrete tile coordinate.
 * @param tileSize - Size of one grid tile in pixels.
 */
export function getTileLane(
  position: Vector2D,
  direction: Direction,
  currentTile: Vector2D,
  tileSize: number,
): TileLane | null {
  const dirVec = getDirectionVector(direction);
  if (dirVec.x === 0 && dirVec.y === 0) {
    return null;
  }

  const center = Vector2D.tileCenter(currentTile.x, currentTile.y, tileSize);
  const isXAxis = dirVec.x !== 0;
  const currentAxisPos = isXAxis ? position.x : position.y;
  const centerAxisPos = isXAxis ? center.x : center.y;
  const stepSign = isXAxis ? dirVec.x : dirVec.y;
  const fixedPos = isXAxis ? center.y : center.x;

  const makePosition = (axisPos: number): Vector2D =>
    isXAxis ? new Vector2D(axisPos, fixedPos) : new Vector2D(fixedPos, axisPos);

  const distToCenter = (centerAxisPos - currentAxisPos) * stepSign;
  const isBeforeCenter = distToCenter > 0.00001;
  const distToWaypoint = isBeforeCenter
    ? distToCenter
    : (centerAxisPos + stepSign * tileSize - currentAxisPos) * stepSign;

  return {
    dirVec,
    stepSign,
    centerAxisPos,
    isBeforeCenter,
    distToCenter,
    distToWaypoint,
    makePosition,
    advance: (distance: number) => makePosition(currentAxisPos + stepSign * distance),
  };
}
