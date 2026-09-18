import { Vector2D, Direction } from '../core';
import { GhostState } from './GhostFSM';
import {
  GhostStrategy,
  GhostType,
  DEFAULT_SCATTER_TARGETS,
  DEFAULT_GHOST_HOUSE_TARGET,
  TargetingContext,
} from './GhostStrategy';

/**
 * Pinky (Speedy / Pink Ghost) Targeting Strategy.
 * Predictive targeting: targets 4 tiles ahead of Pacman in Pacman's current direction.
 * Includes authentic arcade Up+Left overflow quirk (when Pacman faces UP, targets 4 tiles UP and 4 tiles LEFT).
 */
export class PinkyStrategy implements GhostStrategy {
  private readonly scatterTarget: Vector2D;

  constructor(scatterTarget: Vector2D = DEFAULT_SCATTER_TARGETS[GhostType.PINKY]) {
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
    const offset = PinkyStrategy.calculateLeadOffset(context.pacmanDirection);
    return context.pacmanTile.add(offset);
  }

  public getScatterTarget(): Vector2D {
    return this.scatterTarget;
  }

  /**
   * Calculates 4-tile lead vector with authentic arcade Up+Left overflow quirk.
   */
  public static calculateLeadOffset(direction: Direction): Vector2D {
    switch (direction) {
      case Direction.RIGHT:
        return new Vector2D(4, 0);
      case Direction.LEFT:
        return new Vector2D(-4, 0);
      case Direction.DOWN:
        return new Vector2D(0, 4);
      case Direction.UP:
        // Authentic 1980 arcade overflow quirk: 4 tiles UP and 4 tiles LEFT (-4, -4)
        return new Vector2D(-4, -4);
      case Direction.NONE:
      default:
        return Vector2D.zero();
    }
  }
}
