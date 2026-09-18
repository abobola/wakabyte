import { Direction } from './Direction';

/**
 * Default timeout in milliseconds before a buffered turn request expires.
 */
export const DEFAULT_INPUT_BUFFER_TIMEOUT_MS = 250;

/**
 * Single-slot input buffer queue for capturing player directional intent with expiration timeouts.
 * Supports both continuous delta-time decay and absolute timestamp expiration checks.
 */
export class InputBuffer {
  private bufferedDirection: Direction = Direction.NONE;
  private timestamp: number = 0;
  private remainingLifetimeMs: number = 0;
  private readonly timeoutMs: number;

  constructor(timeoutMs: number = DEFAULT_INPUT_BUFFER_TIMEOUT_MS) {
    this.timeoutMs = Math.max(0, timeoutMs);
  }

  /**
   * Returns the configured buffer expiration timeout in milliseconds.
   */
  public getTimeout(): number {
    return this.timeoutMs;
  }

  /**
   * Buffers a new directional intent, overwriting any previous unconsumed input.
   * Ignores Direction.NONE.
   *
   * @param direction - Intended cardinal direction.
   * @param timestamp - Optional absolute timestamp (ms) when the input occurred.
   */
  public enqueue(direction: Direction, timestamp?: number): void {
    if (direction === Direction.NONE) {
      return;
    }

    this.bufferedDirection = direction;
    this.remainingLifetimeMs = this.timeoutMs;
    this.timestamp = timestamp !== undefined ? timestamp : 0;
  }

  /**
   * Inspects the currently buffered direction without clearing it.
   * Returns Direction.NONE if empty or expired.
   *
   * @param currentTimestamp - Optional current absolute timestamp (ms) to check expiration against.
   */
  public peek(currentTimestamp?: number): Direction {
    if (this.bufferedDirection === Direction.NONE) {
      return Direction.NONE;
    }

    if (currentTimestamp !== undefined) {
      if (currentTimestamp - this.timestamp > this.timeoutMs) {
        this.clear();
        return Direction.NONE;
      }
    } else if (this.remainingLifetimeMs <= 0) {
      this.clear();
      return Direction.NONE;
    }

    return this.bufferedDirection;
  }

  /**
   * Consumes and clears the currently buffered direction.
   * Returns Direction.NONE if empty or expired.
   *
   * @param currentTimestamp - Optional current absolute timestamp (ms) to check expiration against.
   */
  public consume(currentTimestamp?: number): Direction {
    const direction = this.peek(currentTimestamp);
    this.clear();
    return direction;
  }

  /**
   * Immediately clears any buffered input.
   */
  public clear(): void {
    this.bufferedDirection = Direction.NONE;
    this.timestamp = 0;
    this.remainingLifetimeMs = 0;
  }

  /**
   * Checks whether the buffer is empty or expired.
   *
   * @param currentTimestamp - Optional current absolute timestamp (ms) to check expiration against.
   */
  public isEmpty(currentTimestamp?: number): boolean {
    return this.peek(currentTimestamp) === Direction.NONE;
  }

  /**
   * Updates buffer lifetime using elapsed frame delta time.
   *
   * @param deltaTimeMs - Frame delta time in milliseconds.
   */
  public update(deltaTimeMs: number): void {
    if (deltaTimeMs <= 0 || this.bufferedDirection === Direction.NONE) {
      return;
    }

    this.remainingLifetimeMs -= deltaTimeMs;
    if (this.remainingLifetimeMs <= 0) {
      this.clear();
    }
  }
}
