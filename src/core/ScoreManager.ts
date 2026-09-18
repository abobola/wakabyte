import { Grid, TileType } from './Grid';
import type { Vector2D } from './Vector2D';

/**
 * Authentic arcade points awarded for eating a normal dot (pellet).
 */
export const PELLET_POINTS = 10;

/**
 * Authentic arcade points awarded for eating an energizer power pellet.
 */
export const ENERGIZER_POINTS = 50;

/**
 * Authentic arcade points awarded for consecutive ghost consumption in a single energized period:
 * 1st Ghost: 200 pts
 * 2nd Ghost: 400 pts
 * 3rd Ghost: 800 pts
 * 4th Ghost: 1600 pts
 */
export const GHOST_STREAK_POINTS: readonly number[] = [200, 400, 800, 1600];

/**
 * Score threshold to award a bonus extra life in standard arcade rules (10,000 pts).
 */
export const EXTRA_LIFE_THRESHOLD = 10000;

export interface ScoreManagerOptions {
  initialScore?: number;
  highScore?: number;
  totalPellets?: number;
  grid?: Grid;
  extraLifeThreshold?: number;
}

export interface ConsumptionResult {
  type: 'PELLET' | 'ENERGIZER' | 'NONE';
  points: number;
  remainingPellets: number;
  isLevelCleared: boolean;
  awardedExtraLife: boolean;
}

/**
 * Centralized score, objective, and level progression manager.
 * Tracks score, high score, remaining pellets, level clear triggers,
 * and consecutive ghost consumption multiplier streaks.
 */
export class ScoreManager {
  private score: number = 0;
  private highScore: number = 0;
  private totalPellets: number = 0;
  private remainingPellets: number = 0;
  private pelletsEaten: number = 0;
  private ghostStreak: number = 0;
  private extraLifeThreshold: number = EXTRA_LIFE_THRESHOLD;
  private extraLifeAwarded: boolean = false;

  constructor(options: ScoreManagerOptions = {}) {
    this.resetGame(options);
  }

  /**
   * Returns current accumulated player score.
   */
  public getScore(): number {
    return this.score;
  }

  /**
   * Returns current all-time high score.
   */
  public getHighScore(): number {
    return this.highScore;
  }

  /**
   * Returns total number of pellets (dots + energizers) for the current stage.
   */
  public getTotalPellets(): number {
    return this.totalPellets;
  }

  /**
   * Returns number of remaining pellets to clear the stage.
   */
  public getRemainingPellets(): number {
    return this.remainingPellets;
  }

  /**
   * Returns total number of pellets consumed in the current stage.
   */
  public getPelletsEaten(): number {
    return this.pelletsEaten;
  }

  /**
   * Returns consecutive ghost consumption streak count for active energizer mode (0 to 4+).
   */
  public getGhostStreak(): number {
    return this.ghostStreak;
  }

  /**
   * Checks whether the current level is cleared (all pellets consumed).
   */
  public isLevelCleared(): boolean {
    return this.totalPellets > 0 && this.remainingPellets <= 0;
  }

  /**
   * Checks whether the milestone extra life has already been awarded.
   */
  public hasAwardedExtraLife(): boolean {
    return this.extraLifeAwarded;
  }

  /**
   * Adds arbitrary points (e.g. bonus fruit, level bonuses) to current score.
   * Returns boolean indicating if this addition newly triggered an extra life award.
   */
  public addScore(points: number): boolean {
    if (points <= 0) {
      return false;
    }

    this.score += points;
    if (this.score > this.highScore) {
      this.highScore = this.score;
    }

    let newlyAwarded = false;
    if (!this.extraLifeAwarded && this.score >= this.extraLifeThreshold) {
      this.extraLifeAwarded = true;
      newlyAwarded = true;
    }

    return newlyAwarded;
  }

  /**
   * Consumes a normal dot pellet, adding 10 points and decrementing remaining pellet count.
   * Returns points awarded (10).
   */
  public eatPellet(): number {
    this.pelletsEaten++;
    if (this.remainingPellets > 0) {
      this.remainingPellets--;
    }
    this.addScore(PELLET_POINTS);
    return PELLET_POINTS;
  }

  /**
   * Consumes an energizer pellet, adding 50 points, decrementing remaining pellet count,
   * and resetting the ghost multiplier streak to 0.
   * Returns points awarded (50).
   */
  public eatEnergizer(): number {
    this.pelletsEaten++;
    if (this.remainingPellets > 0) {
      this.remainingPellets--;
    }
    this.resetGhostStreak();
    this.addScore(ENERGIZER_POINTS);
    return ENERGIZER_POINTS;
  }

  /**
   * Consumes a frightened ghost in the current multiplier streak (200 -> 400 -> 800 -> 1600 pts).
   * Increments the streak count and returns points awarded.
   */
  public eatGhost(): number {
    const index = Math.min(this.ghostStreak, GHOST_STREAK_POINTS.length - 1);
    const points = GHOST_STREAK_POINTS[index];
    this.ghostStreak++;
    this.addScore(points);
    return points;
  }

  /**
   * Resets consecutive ghost multiplier streak back to 0.
   */
  public resetGhostStreak(): void {
    this.ghostStreak = 0;
  }

  /**
   * Processes consumption for a specific TileType.
   */
  public consumeTile(tile: TileType | undefined): ConsumptionResult {
    if (tile === TileType.PELLET) {
      this.pelletsEaten++;
      if (this.remainingPellets > 0) {
        this.remainingPellets--;
      }
      const awardedExtraLife = this.addScore(PELLET_POINTS);
      return {
        type: 'PELLET',
        points: PELLET_POINTS,
        remainingPellets: this.remainingPellets,
        isLevelCleared: this.isLevelCleared(),
        awardedExtraLife,
      };
    }

    if (tile === TileType.ENERGIZER) {
      this.pelletsEaten++;
      if (this.remainingPellets > 0) {
        this.remainingPellets--;
      }
      this.resetGhostStreak();
      const awardedExtraLife = this.addScore(ENERGIZER_POINTS);
      return {
        type: 'ENERGIZER',
        points: ENERGIZER_POINTS,
        remainingPellets: this.remainingPellets,
        isLevelCleared: this.isLevelCleared(),
        awardedExtraLife,
      };
    }

    return {
      type: 'NONE',
      points: 0,
      remainingPellets: this.remainingPellets,
      isLevelCleared: this.isLevelCleared(),
      awardedExtraLife: false,
    };
  }

  /**
   * Consumes a tile from the grid at specified coordinates.
   * If the tile is a PELLET or ENERGIZER, replaces it with EMPTY on the grid
   * and awards points.
   */
  public consumeAt(grid: Grid, coords: Vector2D): ConsumptionResult;
  public consumeAt(grid: Grid, x: number, y: number): ConsumptionResult;
  public consumeAt(grid: Grid, coordsOrX: Vector2D | number, maybeY?: number): ConsumptionResult {
    const x = typeof coordsOrX === 'number' ? coordsOrX : coordsOrX.x;
    const y = typeof coordsOrX === 'number' ? (maybeY as number) : coordsOrX.y;

    if (!grid.isInBounds(x, y)) {
      return {
        type: 'NONE',
        points: 0,
        remainingPellets: this.remainingPellets,
        isLevelCleared: this.isLevelCleared(),
        awardedExtraLife: false,
      };
    }

    const tile = grid.getTileAt(x, y);
    if (tile === TileType.PELLET || tile === TileType.ENERGIZER) {
      grid.setTileAt(x, y, TileType.EMPTY);
      return this.consumeTile(tile);
    }

    return {
      type: 'NONE',
      points: 0,
      remainingPellets: this.remainingPellets,
      isLevelCleared: this.isLevelCleared(),
      awardedExtraLife: false,
    };
  }

  /**
   * Resets level progression (pellet counts and ghost streak) while preserving score and high score.
   */
  public resetLevel(totalPelletsOrGrid?: number | Grid): void {
    if (typeof totalPelletsOrGrid === 'number') {
      this.totalPellets = totalPelletsOrGrid;
    } else if (totalPelletsOrGrid instanceof Grid) {
      const pellets = totalPelletsOrGrid.countTiles(TileType.PELLET);
      const energizers = totalPelletsOrGrid.countTiles(TileType.ENERGIZER);
      this.totalPellets = pellets + energizers;
    }
    this.remainingPellets = this.totalPellets;
    this.pelletsEaten = 0;
    this.ghostStreak = 0;
  }

  /**
   * Resets entire game session back to initial values while preserving the current high score.
   */
  public resetGame(options: ScoreManagerOptions = {}): void {
    const initialScore = options.initialScore ?? 0;
    this.score = initialScore;
    if (options.highScore !== undefined) {
      this.highScore = Math.max(this.highScore, options.highScore);
    }
    this.highScore = Math.max(this.highScore, this.score);
    this.extraLifeThreshold = options.extraLifeThreshold ?? EXTRA_LIFE_THRESHOLD;
    this.extraLifeAwarded = initialScore >= this.extraLifeThreshold;
    this.pelletsEaten = 0;
    this.ghostStreak = 0;

    if (options.grid) {
      const pellets = options.grid.countTiles(TileType.PELLET);
      const energizers = options.grid.countTiles(TileType.ENERGIZER);
      this.totalPellets = pellets + energizers;
    } else {
      this.totalPellets = options.totalPellets ?? 0;
    }
    this.remainingPellets = this.totalPellets;
  }
}
