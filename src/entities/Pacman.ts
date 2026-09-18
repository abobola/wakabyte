import { Vector2D } from '../core/Vector2D';
import {
  Direction,
  getDirectionVector,
  isOppositeDirection,
  isPerpendicularDirection,
} from '../core/Direction';
import { Grid } from '../core/Grid';
import { InputBuffer, DEFAULT_INPUT_BUFFER_TIMEOUT_MS } from '../core/InputBuffer';

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
  private position: Vector2D;
  private direction: Direction;
  private speed: number;
  private readonly tileSize: number;
  private readonly inputBuffer: InputBuffer;
  private moving: boolean = false;

  constructor(options: PacmanOptions) {
    this.grid = options.grid;
    this.tileSize = options.tileSize ?? DEFAULT_TILE_SIZE;
    this.speed = options.speed ?? DEFAULT_PACMAN_SPEED;
    this.direction = options.direction ?? Direction.NONE;

    if (options.inputBuffer) {
      this.inputBuffer = options.inputBuffer;
    } else {
      this.inputBuffer = new InputBuffer(
        options.inputBufferTimeoutMs ?? DEFAULT_INPUT_BUFFER_TIMEOUT_MS
      );
    }

    if (options.position) {
      this.position = options.position.clone();
    } else if (options.tile) {
      this.position = Vector2D.tileCenter(options.tile.x, options.tile.y, this.tileSize);
    } else {
      this.position = Vector2D.tileCenter(0, 0, this.tileSize);
    }

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

      const desired = this.inputBuffer.peek();

      // Check instant reverse
      if (desired !== Direction.NONE && isOppositeDirection(desired, this.direction)) {
        this.direction = desired;
        this.inputBuffer.consume();
      }

      if (!this.tryStartMoving()) {
        break;
      }

      const currentTile = this.getTile();

      // Check if already at tile center and can turn in desired direction
      if (this.isAtTileCenter()) {
        this.tryExecuteBufferedTurn(currentTile);
      }

      const dirVec = getDirectionVector(this.direction);
      if (dirVec.x === 0 && dirVec.y === 0) {
        this.moving = false;
        break;
      }

      const center = Vector2D.tileCenter(currentTile.x, currentTile.y, this.tileSize);
      const isXAxis = dirVec.x !== 0;
      const currentAxisPos = isXAxis ? this.position.x : this.position.y;
      const centerAxisPos = isXAxis ? center.x : center.y;
      const stepSign = isXAxis ? dirVec.x : dirVec.y;
      const fixedPos = isXAxis ? center.y : center.x;

      const makePosition = (axisPos: number): Vector2D =>
        isXAxis ? new Vector2D(axisPos, fixedPos) : new Vector2D(fixedPos, axisPos);

      const distToCenter = (centerAxisPos - currentAxisPos) * stepSign;
      const isBeforeCenter = distToCenter > 0.00001;

      // If at/past center and path ahead is blocked, stop at center
      if (!isBeforeCenter && !this.grid.isWalkableWrapped(currentTile.add(dirVec))) {
        this.position = makePosition(centerAxisPos);
        this.moving = false;
        break;
      }

      // 1D Waypoint distance calculation: waypoint is either current tile center or next tile center
      const distToWaypoint = isBeforeCenter
        ? distToCenter
        : (centerAxisPos + stepSign * this.tileSize - currentAxisPos) * stepSign;

      // Clamp movement step by distance to waypoint
      const stepDistance = Math.min(remainingDistance, distToWaypoint);
      this.position = makePosition(currentAxisPos + stepSign * stepDistance);
      remainingDistance -= stepDistance;
      this.moving = true;

      // If waypoint at center was reached, evaluate turns and wall collisions
      if (isBeforeCenter && stepDistance >= distToCenter) {
        this.position = makePosition(centerAxisPos);

        if (this.tryExecuteBufferedTurn(currentTile)) {
          this.position = this.grid.wrapContinuous(this.position, this.tileSize);
          continue;
        }

        if (!this.grid.isWalkableWrapped(currentTile.add(dirVec))) {
          this.moving = false;
          break;
        }
      }

      this.position = this.grid.wrapContinuous(this.position, this.tileSize);
    }
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
   * Resets Pacman position, direction, and clears the input buffer.
   */
  public reset(options?: PacmanResetOptions): void {
    if (options?.position) {
      this.position = options.position.clone();
    } else if (options?.tile) {
      this.position = Vector2D.tileCenter(options.tile.x, options.tile.y, this.tileSize);
    }
    this.direction = options?.direction ?? Direction.NONE;
    this.inputBuffer.clear();
    this.moving = this.direction !== Direction.NONE && this.speed > 0;
  }
}
