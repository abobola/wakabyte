import { Grid, TileType } from './Grid';
import { Vector2D } from './Vector2D';
import { Direction } from './Direction';
import { ScoreManager } from './ScoreManager';
import {
  CollisionManager,
  CollisionType,
  GhostEntity,
  DEFAULT_INITIAL_LIVES,
  CollisionResult,
} from './Collision';
import { Pacman, Ghost } from '../entities';
import { GhostType, GlobalWaveTimer } from '../ai';
import { RAW_MAP_DATA } from '../config/mapData';

/**
 * Default upper limit on simulation step delta time in seconds (0.1s = 100ms)
 * to prevent numerical explosion or physics tunneling across lag spikes or tab suspensions.
 */
export const DEFAULT_MAX_DELTA_TIME_SEC = 0.1;

export interface GameLoopOptions {
  grid?: Grid;
  pacman?: Pacman;
  ghosts?: Ghost[];
  scoreManager?: ScoreManager;
  waveTimer?: GlobalWaveTimer;
  collisionManager?: CollisionManager;
  tileSize?: number;
  maxDeltaTimeSec?: number;
  onPelletEaten?: (tile: Vector2D, score: number) => void;
  onEnergizerEaten?: (tile: Vector2D, score: number) => void;
  onGhostEaten?: (ghost: GhostEntity, points: number) => void;
  onPacmanDeath?: (remainingLives: number, isGameOver: boolean) => void;
  onGameOver?: () => void;
  onLevelCleared?: () => void;
  onTick?: (deltaSeconds: number) => void;
}

export interface DefaultGameLoopOptions {
  highScore?: number;
  initialLives?: number;
  tileSize?: number;
  maxDeltaTimeSec?: number;
  onPelletEaten?: (tile: Vector2D, score: number) => void;
  onEnergizerEaten?: (tile: Vector2D, score: number) => void;
  onGhostEaten?: (ghost: GhostEntity, points: number) => void;
  onPacmanDeath?: (remainingLives: number, isGameOver: boolean) => void;
  onGameOver?: () => void;
  onLevelCleared?: () => void;
  onTick?: (deltaSeconds: number) => void;
}

/**
 * Deterministic simulation coordinator and game loop engine.
 * Decoupled from browser DOM APIs for 100% headless execution and testing.
 */
export class GameLoop {
  private readonly grid: Grid;
  private readonly pacman: Pacman;
  private readonly ghosts: Ghost[];
  private readonly scoreManager: ScoreManager;
  private readonly waveTimer: GlobalWaveTimer;
  private readonly collisionManager: CollisionManager;
  private readonly tileSize: number;
  private readonly maxDeltaTimeSec: number;
  private readonly initialGridMatrix: TileType[][];

  private paused: boolean = false;

  private readonly onPelletEaten?: (tile: Vector2D, score: number) => void;
  private readonly onEnergizerEaten?: (tile: Vector2D, score: number) => void;
  private readonly onGhostEaten?: (ghost: GhostEntity, points: number) => void;
  private readonly onPacmanDeath?: (remainingLives: number, isGameOver: boolean) => void;
  private readonly onGameOver?: () => void;
  private readonly onLevelCleared?: () => void;
  private readonly onTick?: (deltaSeconds: number) => void;

  constructor(options: GameLoopOptions = {}) {
    this.tileSize = options.tileSize ?? 8;
    this.maxDeltaTimeSec = options.maxDeltaTimeSec ?? DEFAULT_MAX_DELTA_TIME_SEC;
    this.grid = options.grid ?? Grid.fromStringArray(RAW_MAP_DATA);
    this.initialGridMatrix = this.grid.getRawMatrix();

    this.scoreManager = options.scoreManager ?? new ScoreManager({ grid: this.grid });
    this.waveTimer = options.waveTimer ?? new GlobalWaveTimer();
    this.collisionManager =
      options.collisionManager ??
      new CollisionManager({
        scoreManager: this.scoreManager,
        initialLives: DEFAULT_INITIAL_LIVES,
      });

    this.pacman =
      options.pacman ??
      new Pacman({
        grid: this.grid,
        tileSize: this.tileSize,
        position: new Vector2D(13.5 * this.tileSize, 26 * this.tileSize + 4),
        direction: Direction.NONE,
        speed: 80,
      });

    this.ghosts = options.ghosts ?? [];

    this.onPelletEaten = options.onPelletEaten;
    this.onEnergizerEaten = options.onEnergizerEaten;
    this.onGhostEaten = options.onGhostEaten;
    this.onPacmanDeath = options.onPacmanDeath;
    this.onGameOver = options.onGameOver;
    this.onLevelCleared = options.onLevelCleared;
    this.onTick = options.onTick;
  }

  /**
   * Factory method creating a fully configured standard arcade GameLoop with default map and all 4 ghosts.
   */
  public static createDefault(options: DefaultGameLoopOptions = {}): GameLoop {
    const tileSize = options.tileSize ?? 8;
    const grid = Grid.fromStringArray(RAW_MAP_DATA);
    const scoreManager = new ScoreManager({ grid, highScore: options.highScore ?? 10000 });
    const waveTimer = new GlobalWaveTimer();
    const collisionManager = new CollisionManager({
      scoreManager,
      initialLives: options.initialLives ?? DEFAULT_INITIAL_LIVES,
    });

    const pacman = new Pacman({
      grid,
      tileSize,
      position: new Vector2D(13.5 * tileSize, 26 * tileSize + 4),
      direction: Direction.NONE,
      speed: 80,
    });

    const blinky = new Ghost({
      grid,
      type: GhostType.BLINKY,
      waveTimer,
      tileSize,
      position: new Vector2D(13.5 * tileSize, 14 * tileSize + 4),
      direction: Direction.LEFT,
      speed: 75,
    });

    const pinky = new Ghost({
      grid,
      type: GhostType.PINKY,
      waveTimer,
      tileSize,
      position: new Vector2D(13.5 * tileSize, 14 * tileSize + 4),
      direction: Direction.LEFT,
      speed: 75,
    });

    const inky = new Ghost({
      grid,
      type: GhostType.INKY,
      waveTimer,
      tileSize,
      position: new Vector2D(11.5 * tileSize, 14 * tileSize + 4),
      direction: Direction.RIGHT,
      speed: 75,
    });

    const clyde = new Ghost({
      grid,
      type: GhostType.CLYDE,
      waveTimer,
      tileSize,
      position: new Vector2D(15.5 * tileSize, 14 * tileSize + 4),
      direction: Direction.LEFT,
      speed: 75,
    });

    return new GameLoop({
      grid,
      pacman,
      ghosts: [blinky, pinky, inky, clyde],
      scoreManager,
      waveTimer,
      collisionManager,
      tileSize,
      maxDeltaTimeSec: options.maxDeltaTimeSec,
      onPelletEaten: options.onPelletEaten,
      onEnergizerEaten: options.onEnergizerEaten,
      onGhostEaten: options.onGhostEaten,
      onPacmanDeath: options.onPacmanDeath,
      onGameOver: options.onGameOver,
      onLevelCleared: options.onLevelCleared,
      onTick: options.onTick,
    });
  }

  public getGrid(): Grid {
    return this.grid;
  }

  public getPacman(): Pacman {
    return this.pacman;
  }

  public getGhosts(): Ghost[] {
    return this.ghosts;
  }

  public getBlinky(): Ghost | undefined {
    return this.ghosts.find((ghost) => ghost.getType() === GhostType.BLINKY);
  }

  public getScoreManager(): ScoreManager {
    return this.scoreManager;
  }

  public getWaveTimer(): GlobalWaveTimer {
    return this.waveTimer;
  }

  public getCollisionManager(): CollisionManager {
    return this.collisionManager;
  }

  public isGameOver(): boolean {
    return this.collisionManager.isGameOver();
  }

  public isLevelCleared(): boolean {
    return this.scoreManager.isLevelCleared();
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public pause(): void {
    this.paused = true;
  }

  public resume(): void {
    this.paused = false;
  }

  public togglePause(): boolean {
    this.paused = !this.paused;
    return this.paused;
  }

  /**
   * Resets entity positions and wave timer (e.g. after player death).
   */
  public reset(): void {
    this.pacman.reset();
    for (const ghost of this.ghosts) {
      ghost.reset();
    }
    this.waveTimer.reset();
  }

  /**
   * Restores initial grid tiles, score, lives, and entity positions.
   */
  public restartGame(initialLives?: number): void {
    for (let y = 0; y < this.initialGridMatrix.length; y++) {
      for (let x = 0; x < this.initialGridMatrix[y].length; x++) {
        this.grid.setTileAt(x, y, this.initialGridMatrix[y][x]);
      }
    }
    this.scoreManager.resetGame({ grid: this.grid });
    this.collisionManager.resetLives(initialLives);
    this.reset();
  }

  /**
   * Advances the simulation by deltaSeconds.
   */
  public update(deltaTimeSec: number): void {
    if (this.paused || this.isGameOver() || deltaTimeSec <= 0) {
      return;
    }

    const clampedDelta = Math.min(deltaTimeSec, this.maxDeltaTimeSec);

    this.waveTimer.update(clampedDelta);
    this.pacman.update(clampedDelta);
    this.updateGhosts(clampedDelta);
    this.checkTileConsumption(this.pacman.getTile());
    this.handleCollisions();
    this.onTick?.(clampedDelta);
  }

  private updateGhosts(clampedDelta: number): void {
    const pacmanTile = this.pacman.getTile();
    const pacmanDirection = this.pacman.getDirection();
    const blinky = this.getBlinky();
    const blinkyTile = blinky ? blinky.getTile() : pacmanTile;

    for (const ghost of this.ghosts) {
      ghost.update(clampedDelta, {
        pacmanTile,
        pacmanDirection,
        blinkyTile,
      });
    }
  }

  private checkTileConsumption(pacmanTile: Vector2D): void {
    const currentTile = this.grid.getTileAt(pacmanTile.x, pacmanTile.y);
    if (currentTile !== TileType.PELLET && currentTile !== TileType.ENERGIZER) {
      return;
    }

    const consumption = this.scoreManager.consumeTile(currentTile);
    if (currentTile === TileType.PELLET) {
      this.onPelletEaten?.(pacmanTile, consumption.points);
    } else {
      this.waveTimer.triggerFrightened();
      this.onEnergizerEaten?.(pacmanTile, consumption.points);
    }
    this.grid.setTileAt(pacmanTile.x, pacmanTile.y, TileType.EMPTY);

    if (this.scoreManager.isLevelCleared()) {
      this.onLevelCleared?.();
    }
  }

  private handleCollisions(): void {
    const collisionResults = this.collisionManager.resolveCollisions(this.pacman, this.ghosts);
    for (const res of collisionResults) {
      this.handleCollisionResult(res);
    }
  }

  private handleCollisionResult(res: CollisionResult): void {
    if (res.type === CollisionType.PACMAN_DEATH) {
      this.onPacmanDeath?.(res.remainingLives, res.isGameOver);
      if (res.isGameOver) {
        this.onGameOver?.();
      }
    } else if (res.type === CollisionType.GHOST_EATEN && res.ghost) {
      this.onGhostEaten?.(res.ghost, res.pointsAwarded);
    }
  }
}
