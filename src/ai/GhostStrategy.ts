import { Direction, getDirectionVector, getOppositeDirection } from '../core/Direction';
import type { Grid, WalkableOptions } from '../core/Grid';
import { Vector2D } from '../core/Vector2D';
import type { GhostState } from './GhostFSM';

/**
 * Ghost types in the arcade simulation.
 */
export enum GhostType {
  BLINKY = 'BLINKY',
  PINKY = 'PINKY',
  INKY = 'INKY',
  CLYDE = 'CLYDE',
}

/**
 * Default scatter corner target tiles for the authentic 28x36 arcade grid.
 */
export const DEFAULT_SCATTER_TARGETS: Record<GhostType, Vector2D> = {
  [GhostType.BLINKY]: new Vector2D(25, 0), // Top-Right
  [GhostType.PINKY]: new Vector2D(2, 0), // Top-Left
  [GhostType.INKY]: new Vector2D(27, 35), // Bottom-Right
  [GhostType.CLYDE]: new Vector2D(0, 35), // Bottom-Left
};

/**
 * Target tile right above the ghost house gate for eyes returning home in EATEN state.
 */
export const DEFAULT_GHOST_HOUSE_TARGET = new Vector2D(13, 14);

/**
 * Runtime state and entity context passed into ghost targeting strategies.
 */
export interface TargetingContext {
  pacmanTile: Vector2D;
  pacmanDirection: Direction;
  ghostTile: Vector2D;
  blinkyTile?: Vector2D;
  ghostState?: GhostState;
}

/**
 * Strategy interface defining target tile computation for an individual ghost.
 */
export interface GhostStrategy {
  /**
   * Evaluates the current targeting context and returns the target grid tile.
   */
  getTargetTile(context: TargetingContext): Vector2D;

  /**
   * Computes the Chase mode target tile.
   */
  getChaseTarget(context: TargetingContext): Vector2D;

  /**
   * Returns the Scatter mode corner target tile.
   */
  getScatterTarget(): Vector2D;
}

export interface ChooseDirectionOptions {
  allowReverse?: boolean;
  walkableOptions?: WalkableOptions;
}

/**
 * Authentic arcade candidate direction evaluation order:
 * UP > LEFT > DOWN > RIGHT.
 */
const CANDIDATE_DIRECTIONS: readonly Direction[] = [
  Direction.UP,
  Direction.LEFT,
  Direction.DOWN,
  Direction.RIGHT,
];

/**
 * Evaluates candidate directions and selects the one that minimizes Euclidean distance
 * to the target tile while forbidding immediate 180° reverse turns (unless forced).
 *
 * Resolves ties using authentic arcade direction priority: UP > LEFT > DOWN > RIGHT.
 */
export function chooseNextDirection(
  grid: Grid,
  currentTile: Vector2D,
  currentDirection: Direction,
  targetTile: Vector2D,
  options?: ChooseDirectionOptions,
): Direction {
  const allowReverse = options?.allowReverse ?? false;
  const forbiddenReverse =
    !allowReverse && currentDirection !== Direction.NONE
      ? getOppositeDirection(currentDirection)
      : Direction.NONE;

  let bestDirection: Direction = Direction.NONE;
  let minDistanceSq = Infinity;

  // Filter and evaluate candidate directions
  for (const dir of CANDIDATE_DIRECTIONS) {
    if (dir === forbiddenReverse) {
      continue;
    }

    const step = getDirectionVector(dir);
    const neighborTile = currentTile.add(step);

    if (grid.isWalkableWrapped(neighborTile, options?.walkableOptions)) {
      const distanceSq = neighborTile.euclideanDistanceSquaredTo(targetTile);
      if (distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq;
        bestDirection = dir;
      }
    }
  }

  // If no valid non-reverse direction is found (e.g., dead end corridor), fallback to reverse if walkable
  if (bestDirection === Direction.NONE && forbiddenReverse !== Direction.NONE) {
    const reverseStep = getDirectionVector(forbiddenReverse);
    const reverseNeighbor = currentTile.add(reverseStep);
    if (grid.isWalkableWrapped(reverseNeighbor, options?.walkableOptions)) {
      return forbiddenReverse;
    }
  }

  return bestDirection;
}

/**
 * Selects a direction for Frightened mode among walkable non-reverse paths using a random number generator.
 */
export function chooseFrightenedDirection(
  grid: Grid,
  currentTile: Vector2D,
  currentDirection: Direction,
  rng: () => number = Math.random,
  options?: ChooseDirectionOptions,
): Direction {
  const allowReverse = options?.allowReverse ?? false;
  const forbiddenReverse =
    !allowReverse && currentDirection !== Direction.NONE
      ? getOppositeDirection(currentDirection)
      : Direction.NONE;

  const validDirections: Direction[] = [];

  for (const dir of CANDIDATE_DIRECTIONS) {
    if (dir === forbiddenReverse) {
      continue;
    }

    const step = getDirectionVector(dir);
    const neighborTile = currentTile.add(step);

    if (grid.isWalkableWrapped(neighborTile, options?.walkableOptions)) {
      validDirections.push(dir);
    }
  }

  if (validDirections.length > 0) {
    const rawRandom = rng();
    const clampedRandom = Math.max(0, Math.min(0.999999, rawRandom));
    const selectedIndex = Math.floor(clampedRandom * validDirections.length);
    return validDirections[selectedIndex];
  }

  // Fallback to reverse if trapped at dead end
  if (forbiddenReverse !== Direction.NONE) {
    const reverseStep = getDirectionVector(forbiddenReverse);
    const reverseNeighbor = currentTile.add(reverseStep);
    if (grid.isWalkableWrapped(reverseNeighbor, options?.walkableOptions)) {
      return forbiddenReverse;
    }
  }

  return Direction.NONE;
}
