import type { Vector2D } from '../core/Vector2D';
import { GhostState } from './GhostFSM';
import {
  DEFAULT_GHOST_HOUSE_TARGET,
  DEFAULT_SCATTER_TARGETS,
  type GhostStrategy,
  GhostType,
  type TargetingContext,
} from './GhostStrategy';

/**
 * Default proximity distance threshold (8 tiles) for Clyde's cowardice trigger.
 */
export const DEFAULT_CLYDE_PROXIMITY_THRESHOLD = 8;

/**
 * Clyde (Pokey / Orange Ghost) Targeting Strategy.
 * Proximity-based targeting:
 * - When Clyde is > 8 tiles away from Pacman: targets Pacman directly (chase like Blinky).
 * - When Clyde is <= 8 tiles away from Pacman: retreats to bottom-left scatter corner (0, 35).
 */
export class ClydeStrategy implements GhostStrategy {
  private readonly scatterTarget: Vector2D;
  private readonly proximityThreshold: number;

  constructor(
    scatterTarget: Vector2D = DEFAULT_SCATTER_TARGETS[GhostType.CLYDE],
    proximityThreshold: number = DEFAULT_CLYDE_PROXIMITY_THRESHOLD,
  ) {
    this.scatterTarget = scatterTarget;
    this.proximityThreshold = proximityThreshold;
  }

  public getTargetTile(context: TargetingContext): Vector2D {
    if (context.ghostState === GhostState.SCATTER) {
      return this.getScatterTarget();
    }
    if (context.ghostState === GhostState.EATEN) {
      return DEFAULT_GHOST_HOUSE_TARGET;
    }
    return this.getChaseTarget(context);
  }

  public getChaseTarget(context: TargetingContext): Vector2D {
    const distance = context.ghostTile.euclideanDistanceTo(context.pacmanTile);
    if (distance > this.proximityThreshold) {
      return context.pacmanTile;
    }
    return this.getScatterTarget();
  }

  public getScatterTarget(): Vector2D {
    return this.scatterTarget;
  }

  public getProximityThreshold(): number {
    return this.proximityThreshold;
  }
}
