export class Vector2D {
  readonly x: number;
  readonly y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  /**
   * Returns a static zero vector (0, 0).
   */
  static zero(): Vector2D {
    return new Vector2D(0, 0);
  }

  /**
   * Converts a discrete tile coordinate into continuous pixel coordinates (top-left of tile).
   */
  static fromTile(tileX: number, tileY: number, tileSize: number): Vector2D {
    return new Vector2D(tileX * tileSize, tileY * tileSize);
  }

  /**
   * Calculates the exact center point coordinates of a discrete tile.
   */
  static tileCenter(tileX: number, tileY: number, tileSize: number): Vector2D {
    const halfTile = tileSize / 2;
    return new Vector2D(tileX * tileSize + halfTile, tileY * tileSize + halfTile);
  }

  /**
   * Creates a new Vector2D instance with the same coordinate values.
   */
  clone(): Vector2D {
    return new Vector2D(this.x, this.y);
  }

  /**
   * Checks value equality against another vector.
   */
  equals(other: Vector2D): boolean {
    return this.x === other.x && this.y === other.y;
  }

  /**
   * Adds another vector and returns a new Vector2D instance without mutation.
   */
  add(other: Vector2D): Vector2D {
    return new Vector2D(this.x + other.x, this.y + other.y);
  }

  /**
   * Subtracts another vector and returns a new Vector2D instance without mutation.
   */
  subtract(other: Vector2D): Vector2D {
    return new Vector2D(this.x - other.x, this.y - other.y);
  }

  /**
   * Multiplies the vector by a scalar value and returns a new Vector2D instance.
   */
  multiply(scalar: number): Vector2D {
    return new Vector2D(this.x * scalar, this.y * scalar);
  }

  /**
   * Divides the vector by a scalar value and returns a new Vector2D instance.
   * Throws an Error if dividing by zero.
   */
  divide(scalar: number): Vector2D {
    if (scalar === 0) {
      throw new Error('Division by zero');
    }
    return new Vector2D(this.x / scalar, this.y / scalar);
  }

  /**
   * Computes Manhattan distance (|Δx| + |Δy|) to another vector.
   * Used for standard grid-based ghost distance heuristics.
   */
  manhattanDistanceTo(other: Vector2D): number {
    return Math.abs(this.x - other.x) + Math.abs(this.y - other.y);
  }

  /**
   * Computes Euclidean distance to another vector.
   */
  euclideanDistanceTo(other: Vector2D): number {
    return Math.sqrt(this.euclideanDistanceSquaredTo(other));
  }

  /**
   * Computes Euclidean distance squared to another vector.
   * Eliminates square root computations for performance-critical distance comparisons.
   */
  euclideanDistanceSquaredTo(other: Vector2D): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return dx * dx + dy * dy;
  }

  /**
   * Converts continuous pixel coordinates to discrete grid tile coordinates.
   */
  toTile(tileSize: number): Vector2D {
    return new Vector2D(Math.floor(this.x / tileSize), Math.floor(this.y / tileSize));
  }
}
