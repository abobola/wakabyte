import { Vector2D } from '../core';
import { GhostState } from './GhostFSM';
import {
  GhostStrategy,
  GhostType,
  DEFAULT_SCATTER_TARGETS,
  DEFAULT_GHOST_HOUSE_TARGET,
  TargetingContext,
} from './GhostStrategy';

/**
 * Blinky (Shadow / Red Ghost) Targeting Strategy.
 * Direct pursuit: targets Pacman's current tile directly in Chase mode.
 */
export class BlinkyStrategy implements GhostStrategy {
  private readonly scatterTarget: Vector2D;

  constructor(scatterTarget: Vector2D = DEFAULT_SCATTER_TARGETS[GhostType.BLINKY]) {
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
    return context.pacmanTile;
  }

  public getScatterTarget(): Vector2D {
    return this.scatterTarget;
  }
}
