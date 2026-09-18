import {
  DEFAULT_INPUT_BUFFER_TIMEOUT_MS,
  Direction,
  type Grid,
  getDirectionVector,
  InputBuffer,
  isOppositeDirection,
  isPerpendicularDirection,
  Vector2D,
} from '../core';
import { getTileLane, resolveEntityPosition } from './movement';

/**
 * Default movement speed in pixels per second (approx. 10–11 arcade tiles per second).
 */
export const DEFAULT_PACMAN_SPEED = 80;

/**
 * Default arcade tile dimension in pixels.
 */
export const DEFAULT_TILE_SIZE = 8;

export interface PacmanOptions {
  grid: Grid;
  position?: Vector2D;
  tile?: Vector2D;
  direction?: Direction;
  speed?: number;
  tileSize?: number;
  inputBuffer?: InputBuffer;
  inputBufferTimeoutMs?: number;
}

export interface PacmanResetOptions {
  position?: Vector2D;
  tile?: Vector2D;
  direction?: Direction;
}

/**
 * Pacman player controller entity.
 * Handles sub-pixel continuous movement, corner snapping, wall collision blocking,
 * instant 180° direction reversals, input buffering, and screen-edge tunnel wrapping.
 */
export class Pacman {
  private readonly grid: Grid;
  private readonly tileSize: number;
  private speed: number;
  private readonly initialPosition: Vector2D;
  private readonly initialDirection: Direction;
  private position: Vector2D;
  private direction: Direction;
  private readonly inputBuffer: InputBuffer;
  private moving: boolean = false;

  constructor(options: PacmanOptions) {
    this.grid = options.grid;
    this.tileSize = options.tileSize ?? DEFAULT_TILE_SIZE;
    this.speed = options.speed ?? DEFAULT_PACMAN_SPEED;
    this.direction = options.direction ?? Direction.NONE;
    this.initialDirection = this.direction;

    if (options.inputBuffer) {
      this.inputBuffer = options.inputBuffer;
    } else {
      this.inputBuffer = new InputBuffer(
        options.inputBufferTimeoutMs ?? DEFAULT_INPUT_BUFFER_TIMEOUT_MS,
      );
    }

    this.position = resolveEntityPosition(options, this.tileSize);
    this.initialPosition = this.position.clone();

    if (this.direction !== Direction.NONE && this.speed > 0) {
      this.moving = true;
    }
  }

  /**
   * Returns current continuous sub-pixel position.
   */
  public getPosition(): Vector2D {
    return this.position;
  }

  /**
   * Sets continuous position directly.
   */
  public setPosition(position: Vector2D): void {
    this.position = position.clone();
  }

  /**
   * Returns discrete grid tile coordinate.
   */
  public getTile(): Vector2D {
    return this.position.toTile(this.tileSize);
  }

  /**
   * Returns current active movement direction.
   */
  public getDirection(): Direction {
    return this.direction;
  }

  /**
   * Returns the currently buffered desired direction (or NONE if empty/expired).
   */
  public getDesiredDirection(): Direction {
    return this.inputBuffer.peek();
  }

  /**
   * Returns movement speed in pixels per second.
   */
  public getSpeed(): number {
    return this.speed;
  }

  /**
   * Sets movement speed in pixels per second.
   */
  public setSpeed(speed: number): void {
    this.speed = Math.max(0, speed);
  }

  /**
   * Returns configured tile size in pixels.
   */
  public getTileSize(): number {
    return this.tileSize;
  }

  /**
   * Indicates whether Pacman is actively moving in the current frame.
   */
  public isMoving(): boolean {
    return this.moving;
  }

  /**
   * Requests a new direction from player input.
   * - Immediately executes 180° direction reversals without waiting for tile centers.
   * - Starts moving immediately if stationary and direction is valid.
   * - Otherwise buffers the intent in the InputBuffer.
   */
  public requestDirection(direction: Direction, timestamp?: number): void {
    if (direction === Direction.NONE) {
      return;
    }

    // 1. Instant 180° reversal
    if (isOppositeDirection(this.direction, direction)) {
      this.direction = direction;
      this.moving = true;
      this.inputBuffer.clear();
      return;
    }

    // 2. Starting movement from stationary state
    if (this.direction === Direction.NONE) {
      const currentTile = this.getTile();
      const targetTile = currentTile.add(getDirectionVector(direction));
      if (this.grid.isWalkableWrapped(targetTile)) {
        this.direction = direction;
        this.moving = true;
        this.snapToTileCenter();
        this.inputBuffer.clear();
        return;
      }
    }

    // 3. Same direction requested
    if (direction === this.direction) {
      this.inputBuffer.clear();
      return;
    }

    // 4. Buffer intent for perpendicular turns
    this.inputBuffer.enqueue(direction, timestamp);
  }

  /**
   * Updates Pacman position and movement state for the elapsed frame time in milliseconds.
   */
  public updateMs(deltaTimeMs: number): void {
    this.update(deltaTimeMs / 1000);
  }

  /**
   * Main simulation update step.
   *
   * @param deltaTimeSec - Frame delta time in seconds.
   */
  public update(deltaTimeSec: number): void {
    if (deltaTimeSec <= 0) {
      return;
    }

    // Decay buffered input lifetime
    this.inputBuffer.update(deltaTimeSec * 1000);

    let remainingDistance = this.speed * deltaTimeSec;
    if (remainingDistance <= 0) {
      this.moving = false;
      return;
    }

    let iterations = 0;
    const maxIterations = 20;

    while (remainingDistance > 0.00001 && iterations < maxIterations) {
      iterations++;
      const result = this.executeMovementIteration(remainingDistance);
      remainingDistance = result.remainingDistance;
      if (!result.shouldContinue) {
        break;
      }
    }
  }

  /**
   * Checks and executes an instant 180-degree reverse if requested in the buffer.
   */
  private checkInstantReverse(): void {
    const desired = this.inputBuffer.peek();
    if (desired !== Direction.NONE && isOppositeDirection(desired, this.direction)) {
      this.direction = desired;
      this.inputBuffer.consume();
    }
  }

  /**
   * Performs a single iteration of movement physics along the current tile lane.
   */
  private executeMovementIteration(remainingDistance: number): {
    remainingDistance: number;
    shouldContinue: boolean;
  } {
    this.checkInstantReverse();

    if (!this.tryStartMoving()) {
      return { remainingDistance: 0, shouldContinue: false };
    }

    const currentTile = this.getTile();

    // Check if already at tile center and can turn in desired direction
    if (this.isAtTileCenter()) {
      this.tryExecuteBufferedTurn(currentTile);
    }

    const lane = getTileLane(this.position, this.direction, currentTile, this.tileSize);
    if (!lane) {
      this.moving = false;
      return { remainingDistance: 0, shouldContinue: false };
    }

    // If at/past center and path ahead is blocked, stop at center
    if (!lane.isBeforeCenter && !this.grid.isWalkableWrapped(currentTile.add(lane.dirVec))) {
      this.position = lane.makePosition(lane.centerAxisPos);
      this.moving = false;
      return { remainingDistance: 0, shouldContinue: false };
    }

    // Clamp movement step by distance to waypoint
    const stepDistance = Math.min(remainingDistance, lane.distToWaypoint);
    this.position = lane.advance(stepDistance);
    const newRemainingDistance = remainingDistance - stepDistance;
    this.moving = true;

    // If waypoint at center was reached, evaluate turns and wall collisions
    if (lane.isBeforeCenter && stepDistance >= lane.distToCenter) {
      this.position = lane.makePosition(lane.centerAxisPos);

      if (this.tryExecuteBufferedTurn(currentTile)) {
        this.position = this.grid.wrapContinuous(this.position, this.tileSize);
        return { remainingDistance: newRemainingDistance, shouldContinue: true };
      }

      if (!this.grid.isWalkableWrapped(currentTile.add(lane.dirVec))) {
        this.moving = false;
        return { remainingDistance: 0, shouldContinue: false };
      }
    }

    this.position = this.grid.wrapContinuous(this.position, this.tileSize);
    return { remainingDistance: newRemainingDistance, shouldContinue: true };
  }

  /**
   * Attempts to start moving from a stationary state if a valid direction is buffered.
   * Returns true if Pacman is moving or can start moving, false if stationary/blocked.
   */
  private tryStartMoving(): boolean {
    if (this.direction !== Direction.NONE) {
      return true;
    }

    const desired = this.inputBuffer.peek();
    if (desired === Direction.NONE) {
      this.moving = false;
      return false;
    }

    const currentTile = this.getTile();
    const targetTile = currentTile.add(getDirectionVector(desired));
    if (!this.grid.isWalkableWrapped(targetTile)) {
      this.moving = false;
      return false;
    }

    this.direction = desired;
    this.inputBuffer.consume();
    this.snapToTileCenter();
    return true;
  }

  /**
   * Attempts to consume a buffered perpendicular turn if the target tile is walkable.
   * Returns true if a turn was executed.
   */
  private tryExecuteBufferedTurn(currentTile: Vector2D): boolean {
    const desired = this.inputBuffer.peek();
    if (desired === Direction.NONE || !isPerpendicularDirection(desired, this.direction)) {
      return false;
    }

    const turnTile = currentTile.add(getDirectionVector(desired));
    if (this.grid.isWalkableWrapped(turnTile)) {
      this.direction = desired;
      this.inputBuffer.consume();
      this.snapToTileCenter();
      return true;
    }

    return false;
  }

  /**
   * Snaps position to the exact center of its current tile.
   */
  public snapToTileCenter(): void {
    const tile = this.getTile();
    this.position = Vector2D.tileCenter(tile.x, tile.y, this.tileSize);
  }

  /**
   * Checks whether Pacman is aligned at the center of its current tile within a tolerance threshold.
   */
  public isAtTileCenter(tolerance: number = 0.001): boolean {
    const tile = this.getTile();
    const center = Vector2D.tileCenter(tile.x, tile.y, this.tileSize);
    return (
      Math.abs(this.position.x - center.x) <= tolerance &&
      Math.abs(this.position.y - center.y) <= tolerance
    );
  }

  /**
   * Sets current active movement direction directly without buffering.
   */
  public setDirection(direction: Direction): void {
    this.direction = direction;
    this.moving = direction !== Direction.NONE && this.speed > 0;
  }

  /**
   * Resets Pacman position, direction, and clears the input buffer.
   */
  public reset(options?: PacmanResetOptions): void {
    if (options?.position || options?.tile) {
      this.position = resolveEntityPosition(options, this.tileSize);
    } else {
      this.position = this.initialPosition.clone();
    }
    this.direction = options?.direction ?? this.initialDirection;
    this.inputBuffer.clear();
    this.moving = this.direction !== Direction.NONE && this.speed > 0;
  }
}
