import { GhostState } from '../ai';
import { ScoreManager } from './ScoreManager';
import type { Vector2D } from './Vector2D';

/**
 * Default initial player lives in authentic arcade rules (3 lives).
 */
export const DEFAULT_INITIAL_LIVES = 3;

/**
 * Default radial collision threshold in pixels (half of an 8x8 arcade tile).
 */
export const DEFAULT_COLLISION_DISTANCE = 4;

/**
 * Categorical result types for entity interactions.
 */
export enum CollisionType {
  NONE = 'NONE',
  PACMAN_DEATH = 'PACMAN_DEATH',
  GHOST_EATEN = 'GHOST_EATEN',
}

/**
 * Generic positionable and resettable entity interface.
 */
export interface CollidableEntity {
  getPosition(): Vector2D;
  reset?(): void;
}

/**
 * Pacman entity contract for collision resolution.
 */
export type PacmanEntity = CollidableEntity;

/**
 * Ghost entity contract for collision resolution.
 */
export interface GhostEntity extends CollidableEntity {
  getState(): GhostState;
  eat(): void;
}

/**
 * Structured outcome resulting from an entity collision check.
 */
export interface CollisionResult {
  type: CollisionType;
  ghost?: GhostEntity;
  pointsAwarded: number;
  remainingLives: number;
  isGameOver: boolean;
  entitiesReset: boolean;
}

/**
 * Configuration options for initializing a CollisionManager.
 */
export interface CollisionManagerOptions {
  scoreManager?: ScoreManager;
  initialLives?: number;
  collisionDistance?: number;
  onPacmanDeath?: (remainingLives: number, isGameOver: boolean) => void;
  onGhostEaten?: (ghost: GhostEntity, points: number) => void;
  onGameOver?: () => void;
}

/**
 * Checks whether two 2D positions are within a radial proximity threshold.
 * Uses continuous Euclidean distance for sub-pixel accuracy.
 */
export function checkProximity(
  posA: Vector2D,
  posB: Vector2D,
  threshold: number = DEFAULT_COLLISION_DISTANCE,
): boolean {
  return posA.euclideanDistanceTo(posB) <= threshold + 1e-9;
}

/**
 * Deterministic entity collision resolution system.
 * Manages player life tracking, Game Over conditions, Frightened ghost consumption,
 * and board reset coordination.
 */
export class CollisionManager {
  private readonly scoreManager: ScoreManager;
  private readonly initialLives: number;
  private readonly collisionDistance: number;
  private lives: number;
  private readonly onPacmanDeath?: (remainingLives: number, isGameOver: boolean) => void;
  private readonly onGhostEaten?: (ghost: GhostEntity, points: number) => void;
  private readonly onGameOver?: () => void;

  constructor(options: CollisionManagerOptions = {}) {
    this.scoreManager = options.scoreManager ?? new ScoreManager();
    this.initialLives = options.initialLives ?? DEFAULT_INITIAL_LIVES;
    this.lives = Math.max(0, this.initialLives);
    this.collisionDistance = options.collisionDistance ?? DEFAULT_COLLISION_DISTANCE;
    this.onPacmanDeath = options.onPacmanDeath;
    this.onGhostEaten = options.onGhostEaten;
    this.onGameOver = options.onGameOver;
  }

  /**
   * Returns current remaining player lives.
   */
  public getLives(): number {
    return this.lives;
  }

  /**
   * Directly sets current life count.
   */
  public setLives(lives: number): void {
    this.lives = Math.max(0, lives);
  }

  /**
   * Decrements player lives by 1 and returns the new count.
   */
  public loseLife(): number {
    if (this.lives > 0) {
      this.lives--;
    }
    return this.lives;
  }

  /**
   * Increments player lives (e.g. from milestone score reward) and returns the new count.
   */
  public addLife(count: number = 1): number {
    if (count > 0) {
      this.lives += count;
    }
    return this.lives;
  }

  /**
   * Checks whether the game is over (lives <= 0).
   */
  public isGameOver(): boolean {
    return this.lives <= 0;
  }

  /**
   * Resets remaining lives back to initial count or a specified number.
   */
  public resetLives(lives?: number): void {
    this.lives = Math.max(0, lives ?? this.initialLives);
  }

  /**
   * Returns the underlying ScoreManager instance.
   */
  public getScoreManager(): ScoreManager {
    return this.scoreManager;
  }

  /**
   * Evaluates collision between Pacman and a single Ghost.
   */
  public checkCollision(pacman: PacmanEntity, ghost: GhostEntity): CollisionResult {
    const isNearby = checkProximity(
      pacman.getPosition(),
      ghost.getPosition(),
      this.collisionDistance,
    );

    if (!isNearby) {
      return {
        type: CollisionType.NONE,
        pointsAwarded: 0,
        remainingLives: this.lives,
        isGameOver: this.isGameOver(),
        entitiesReset: false,
      };
    }

    const ghostState = ghost.getState();

    // EATEN ghosts (eyes returning to spawn) are harmless
    if (ghostState === GhostState.EATEN) {
      return {
        type: CollisionType.NONE,
        pointsAwarded: 0,
        remainingLives: this.lives,
        isGameOver: this.isGameOver(),
        entitiesReset: false,
      };
    }

    // FRIGHTENED ghost: Pacman consumes the ghost
    if (ghostState === GhostState.FRIGHTENED) {
      ghost.eat();
      const points = this.scoreManager.eatGhost();
      this.onGhostEaten?.(ghost, points);

      return {
        type: CollisionType.GHOST_EATEN,
        ghost,
        pointsAwarded: points,
        remainingLives: this.lives,
        isGameOver: false,
        entitiesReset: false,
      };
    }

    // Normal ghost state (SCATTER or CHASE): Pacman loses a life
    this.loseLife();
    const isOver = this.isGameOver();

    pacman.reset?.();
    ghost.reset?.();

    this.onPacmanDeath?.(this.lives, isOver);
    if (isOver) {
      this.onGameOver?.();
    }

    return {
      type: CollisionType.PACMAN_DEATH,
      ghost,
      pointsAwarded: 0,
      remainingLives: this.lives,
      isGameOver: isOver,
      entitiesReset: true,
    };
  }

  /**
   * Batch resolves collisions between Pacman and all active ghosts.
   */
  public resolveCollisions(
    pacman: PacmanEntity,
    ghosts: readonly GhostEntity[],
  ): CollisionResult[] {
    const results: CollisionResult[] = [];

    for (let i = 0; i < ghosts.length; i++) {
      const ghost = ghosts[i];
      const result = this.checkCollision(pacman, ghost);
      results.push(result);

      if (result.type === CollisionType.PACMAN_DEATH) {
        // When Pacman dies, reset all other ghosts as well
        for (let j = 0; j < ghosts.length; j++) {
          if (j !== i) {
            ghosts[j].reset?.();
          }
        }
        break;
      }
    }

    return results;
  }
}
