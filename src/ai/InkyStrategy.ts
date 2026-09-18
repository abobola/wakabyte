import { Direction } from '../core/Direction';
import { Vector2D } from '../core/Vector2D';
import { GhostState } from './GhostFSM';
import {
  DEFAULT_GHOST_HOUSE_TARGET,
  DEFAULT_SCATTER_TARGETS,
  type GhostStrategy,
  GhostType,
  type TargetingContext,
} from './GhostStrategy';

/**
 * Inky (Bashful / Cyan Ghost) Targeting Strategy.
 * Dual-vector targeting:
 * 1. Computes intermediate tile 2 tiles ahead of Pacman (with authentic Up+Left overflow quirk).
 * 2. Doubles vector from Blinky's tile through the intermediate tile.
 */
export class InkyStrategy implements GhostStrategy {
  private readonly scatterTarget: Vector2D;

  constructor(scatterTarget: Vector2D = DEFAULT_SCATTER_TARGETS[GhostType.INKY]) {
    this.scatterTarget = scatterTarget;
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
    const offset = InkyStrategy.calculateIntermediateOffset(context.pacmanDirection);
    const intermediateTile = context.pacmanTile.add(offset);

    if (!context.blinkyTile) {
      return intermediateTile;
    }

    // Vector from Blinky to intermediate point
    const vectorFromBlinky = intermediateTile.subtract(context.blinkyTile);

    // Double the vector from Blinky's position
    return context.blinkyTile.add(vectorFromBlinky.multiply(2));
  }

  public getScatterTarget(): Vector2D {
    return this.scatterTarget;
  }

  /**
   * Calculates 2-tile intermediate offset with authentic arcade Up+Left overflow quirk.
   */
  public static calculateIntermediateOffset(direction: Direction): Vector2D {
    switch (direction) {
      case Direction.RIGHT:
        return new Vector2D(2, 0);
      case Direction.LEFT:
        return new Vector2D(-2, 0);
      case Direction.DOWN:
        return new Vector2D(0, 2);
      case Direction.UP:
        // Authentic 1980 arcade overflow quirk: 2 tiles UP and 2 tiles LEFT (-2, -2)
        return new Vector2D(-2, -2);
      default:
        return Vector2D.zero();
    }
  }
}
