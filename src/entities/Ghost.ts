import {
  BlinkyStrategy,
  ClydeStrategy,
  chooseFrightenedDirection,
  chooseNextDirection,
  DEFAULT_GHOST_HOUSE_TARGET,
  GhostFSM,
  GhostState,
  type GhostStrategy,
  GhostType,
  type GlobalWaveTimer,
  InkyStrategy,
  PinkyStrategy,
} from '../ai';
import {
  Direction,
  type GhostEntity,
  type Grid,
  getDirectionVector,
  getOppositeDirection,
  Vector2D,
  type WalkableOptions,
} from '../core';
import { getTileLane, resolveEntityPosition, type TileLane } from './movement';
import { DEFAULT_TILE_SIZE } from './Pacman';

/**
 * Default ghost speeds in pixels per second.
 */
export const DEFAULT_GHOST_SPEED = 75;
export const DEFAULT_FRIGHTENED_SPEED = 40;
export const DEFAULT_EATEN_SPEED = 150;

export interface GhostOptions {
  grid: Grid;
  type: GhostType;
  strategy?: GhostStrategy;
  fsm?: GhostFSM;
  waveTimer?: GlobalWaveTimer;
  position?: Vector2D;
  tile?: Vector2D;
  direction?: Direction;
  speed?: number;
  frightenedSpeed?: number;
  eatenSpeed?: number;
  tileSize?: number;
  houseTarget?: Vector2D;
  rng?: () => number;
}

export interface GhostUpdateContext {
  pacmanTile?: Vector2D;
  pacmanDirection?: Direction;
  blinkyTile?: Vector2D;
}

/**
 * Creates the authentic targeting strategy for a given GhostType.
 */
function createDefaultStrategy(type: GhostType): GhostStrategy {
  switch (type) {
    case GhostType.BLINKY:
      return new BlinkyStrategy();
    case GhostType.PINKY:
      return new PinkyStrategy();
    case GhostType.INKY:
      return new InkyStrategy();
    case GhostType.CLYDE:
      return new ClydeStrategy();
  }
}

/**
 * Ghost entity controller.
 * Manages autonomous movement, strategy targeting, wave state machine synchronization,
 * Frightened mode random turns, and Eaten state house return.
 */
export class Ghost implements GhostEntity {
  private readonly grid: Grid;
  private readonly type: GhostType;
  private readonly strategy: GhostStrategy;
  private readonly fsm: GhostFSM;
  private position: Vector2D;
  private readonly initialPosition: Vector2D;
  private direction: Direction;
  private readonly initialDirection: Direction;
  private readonly baseSpeed: number;
  private readonly frightenedSpeed: number;
  private readonly eatenSpeed: number;
  private readonly tileSize: number;
  private readonly houseTarget: Vector2D;
  private readonly rng: () => number;

  constructor(options: GhostOptions) {
    this.grid = options.grid;
    this.type = options.type;
    this.strategy = options.strategy ?? createDefaultStrategy(options.type);
    this.fsm = options.fsm ?? new GhostFSM({ waveTimer: options.waveTimer });
    this.tileSize = options.tileSize ?? DEFAULT_TILE_SIZE;
    this.baseSpeed = options.speed ?? DEFAULT_GHOST_SPEED;
    this.frightenedSpeed = options.frightenedSpeed ?? DEFAULT_FRIGHTENED_SPEED;
    this.eatenSpeed = options.eatenSpeed ?? DEFAULT_EATEN_SPEED;
    this.houseTarget = options.houseTarget ?? DEFAULT_GHOST_HOUSE_TARGET;
    this.rng = options.rng ?? Math.random;

    this.position = resolveEntityPosition(options, this.tileSize);
    this.initialPosition = this.position.clone();

    this.direction = options.direction ?? Direction.NONE;
    this.initialDirection = this.direction;
  }

  public getType(): GhostType {
    return this.type;
  }

  public getState(): GhostState {
    return this.fsm.getState();
  }

  public getFSM(): GhostFSM {
    return this.fsm;
  }

  public getStrategy(): GhostStrategy {
    return this.strategy;
  }

  public getPosition(): Vector2D {
    return this.position;
  }

  public setPosition(position: Vector2D): void {
    this.position = position.clone();
  }

  public getTile(): Vector2D {
    return this.position.toTile(this.tileSize);
  }

  public getDirection(): Direction {
    return this.direction;
  }

  public setDirection(direction: Direction): void {
    this.direction = direction;
  }

  public getTileSize(): number {
    return this.tileSize;
  }

  public getBaseSpeed(): number {
    return this.baseSpeed;
  }

  public getFrightenedSpeed(): number {
    return this.frightenedSpeed;
  }

  public getEatenSpeed(): number {
    return this.eatenSpeed;
  }

  public getSpeed(): number {
    switch (this.getState()) {
      case GhostState.FRIGHTENED:
        return this.frightenedSpeed;
      case GhostState.EATEN:
        return this.eatenSpeed;
      default:
        return this.baseSpeed;
    }
  }

  public eat(): void {
    this.fsm.eat();
  }

  public reset(): void {
    this.position = this.initialPosition.clone();
    this.direction = this.initialDirection;
    this.fsm.revive();
  }

  /**
   * Evaluates the next best direction at a tile center based on current state and AI strategy.
   */
  private decideNextDirection(currentTile: Vector2D, context: GhostUpdateContext): Direction {
    const isEaten = this.fsm.isEaten();
    const walkableOptions: WalkableOptions = {
      allowGate: isEaten,
      allowGhostHouse: isEaten,
    };

    if (this.getState() === GhostState.FRIGHTENED) {
      return chooseFrightenedDirection(this.grid, currentTile, this.direction, this.rng, {
        walkableOptions,
      });
    }

    const targetTile = isEaten
      ? this.houseTarget
      : this.strategy.getTargetTile({
          pacmanTile: context.pacmanTile ?? new Vector2D(0, 0),
          pacmanDirection: context.pacmanDirection ?? Direction.NONE,
          ghostTile: currentTile,
          blinkyTile: context.blinkyTile,
          ghostState: this.getState(),
        });

    return chooseNextDirection(this.grid, currentTile, this.direction, targetTile, {
      walkableOptions,
    });
  }

  /**
   * Evaluates mode changes and turns the ghost 180° if a reverse request was queued.
   */
  private handleModeReversal(): void {
    if (!this.fsm.consumeReverseRequest() || this.direction === Direction.NONE) {
      return;
    }

    const opposite = getOppositeDirection(this.direction);
    const reverseNeighbor = this.getTile().add(getDirectionVector(opposite));
    const isWalkable = this.grid.isWalkableWrapped(reverseNeighbor, {
      allowGate: this.fsm.isEaten(),
      allowGhostHouse: this.fsm.isEaten(),
    });

    if (isWalkable) {
      this.direction = opposite;
    }
  }

  /**
   * Revives the ghost if it reaches the ghost house target in EATEN state.
   */
  private checkHouseRevival(tile: Vector2D): void {
    if (this.fsm.isEaten() && tile.equals(this.houseTarget)) {
      this.fsm.revive();
    }
  }

  /**
   * Processes arrival at a tile waypoint, updating position, checking house revival,
   * and selecting the next direction for continuous movement.
   */
  private handleWaypointReached(
    lane: TileLane,
    currentTile: Vector2D,
    context: GhostUpdateContext,
  ): void {
    const reachedTile = lane.isBeforeCenter ? currentTile : currentTile.add(lane.dirVec);
    const reachedAxisPos = lane.isBeforeCenter
      ? lane.centerAxisPos
      : lane.centerAxisPos + lane.stepSign * this.tileSize;

    this.position = lane.makePosition(reachedAxisPos);
    this.checkHouseRevival(reachedTile);

    const nextDir = this.decideNextDirection(reachedTile, context);
    if (nextDir !== Direction.NONE) {
      this.direction = nextDir;
    }
  }

  /**
   * Performs a single continuous movement step along the active tile lane.
   * Returns remaining distance after the step, or 0 if movement stopped.
   */
  private executeMovementStep(remainingDistance: number, context: GhostUpdateContext): number {
    const currentTile = this.getTile();
    this.checkHouseRevival(currentTile);

    if (this.direction === Direction.NONE) {
      const nextDir = this.decideNextDirection(currentTile, context);
      if (nextDir === Direction.NONE) {
        return 0;
      }
      this.direction = nextDir;
    }

    const lane = getTileLane(this.position, this.direction, currentTile, this.tileSize);
    if (!lane) {
      return 0;
    }

    const stepDistance = Math.min(remainingDistance, lane.distToWaypoint);
    this.position = lane.advance(stepDistance);

    if (stepDistance >= lane.distToWaypoint) {
      this.handleWaypointReached(lane, currentTile, context);
    }

    this.position = this.grid.wrapContinuous(this.position, this.tileSize);
    return remainingDistance - stepDistance;
  }

  /**
   * Main simulation update step for ghost entity.
   */
  public update(deltaTimeSec: number, context: GhostUpdateContext = {}): void {
    if (deltaTimeSec <= 0) {
      return;
    }

    this.fsm.update(deltaTimeSec);
    this.handleModeReversal();

    let remainingDistance = this.getSpeed() * deltaTimeSec;
    if (remainingDistance <= 0) {
      return;
    }

    let iterations = 0;
    const maxIterations = 20;

    while (remainingDistance > 0.00001 && iterations < maxIterations) {
      iterations++;
      remainingDistance = this.executeMovementStep(remainingDistance, context);
    }
  }
}
