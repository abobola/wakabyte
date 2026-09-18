import { Vector2D } from './Vector2D';
import { Direction, getDirectionVector } from './Direction';
import { TileType, CHAR_TO_TILE_TYPE, RAW_MAP_DATA } from '../config/mapData';

export { TileType };

export interface WalkableOptions {
  allowGate?: boolean;
  allowGhostHouse?: boolean;
}

export class Grid {
  readonly width: number;
  readonly height: number;
  private readonly matrix: TileType[][];

  constructor(matrix: TileType[][]) {
    if (!matrix || matrix.length === 0 || matrix[0].length === 0) {
      throw new Error('Grid matrix cannot be empty');
    }

    const rowLength = matrix[0].length;
    for (let y = 0; y < matrix.length; y++) {
      if (matrix[y].length !== rowLength) {
        throw new Error(`Inconsistent row length at row ${y}: expected ${rowLength}, got ${matrix[y].length}`);
      }
    }

    this.height = matrix.length;
    this.width = rowLength;
    this.matrix = matrix.map((row) => [...row]);
  }

  /**
   * Parses a Grid from an array of ASCII strings using character mappings.
   */
  static fromStringArray(
    rows: readonly string[] | string[],
    charMap: Record<string, TileType> = CHAR_TO_TILE_TYPE
  ): Grid {
    if (!rows || rows.length === 0) {
      throw new Error('Grid matrix cannot be empty');
    }

    const expectedWidth = rows[0].length;
    if (expectedWidth === 0) {
      throw new Error('Grid matrix cannot be empty');
    }

    const matrix: TileType[][] = [];

    for (let y = 0; y < rows.length; y++) {
      const rowStr = rows[y];
      if (rowStr.length !== expectedWidth) {
        throw new Error(
          `Inconsistent row length at row ${y}: expected ${expectedWidth}, got ${rowStr.length}`
        );
      }

      const row: TileType[] = [];
      for (let x = 0; x < rowStr.length; x++) {
        const char = rowStr[x];
        const tileType = charMap[char];
        if (!tileType) {
          throw new Error(`Unknown tile character: '${char}' at row ${y}, col ${x}`);
        }
        row.push(tileType);
      }
      matrix.push(row);
    }

    return new Grid(matrix);
  }

  /**
   * Instantiates a grid from a 2D TileType matrix.
   */
  static fromMatrix(matrix: TileType[][]): Grid {
    return new Grid(matrix);
  }

  /**
   * Creates an authentic 28x36 arcade grid layout using default map data.
   */
  static createDefault(): Grid {
    return Grid.fromStringArray(RAW_MAP_DATA);
  }

  /**
   * Checks whether coordinates are strictly within grid boundaries.
   */
  isInBounds(coords: Vector2D): boolean;
  isInBounds(x: number, y: number): boolean;
  isInBounds(xOrCoords: number | Vector2D, maybeY?: number): boolean {
    const x = typeof xOrCoords === 'number' ? xOrCoords : xOrCoords.x;
    const y = typeof xOrCoords === 'number' ? (maybeY as number) : xOrCoords.y;

    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /**
   * Wraps discrete tile coordinates around grid boundaries (toroidal wrap-around).
   */
  wrapTile(coords: Vector2D): Vector2D;
  wrapTile(x: number, y: number): Vector2D;
  wrapTile(xOrCoords: number | Vector2D, maybeY?: number): Vector2D {
    const x = typeof xOrCoords === 'number' ? xOrCoords : xOrCoords.x;
    const y = typeof xOrCoords === 'number' ? (maybeY as number) : xOrCoords.y;

    const wrappedX = ((x % this.width) + this.width) % this.width;
    const wrappedY = ((y % this.height) + this.height) % this.height;

    return new Vector2D(wrappedX === 0 ? 0 : wrappedX, wrappedY === 0 ? 0 : wrappedY);
  }

  /**
   * Wraps continuous sub-pixel coordinates around grid pixel boundaries.
   */
  wrapContinuous(coords: Vector2D, tileSize: number): Vector2D;
  wrapContinuous(x: number, y: number, tileSize: number): Vector2D;
  wrapContinuous(
    xOrCoords: number | Vector2D,
    yOrTileSize: number,
    maybeTileSize?: number
  ): Vector2D {
    let x: number;
    let y: number;
    let tileSize: number;

    if (typeof xOrCoords === 'number') {
      x = xOrCoords;
      y = yOrTileSize;
      tileSize = maybeTileSize as number;
    } else {
      x = xOrCoords.x;
      y = xOrCoords.y;
      tileSize = yOrTileSize;
    }

    if (tileSize <= 0) {
      throw new Error('Tile size must be greater than zero');
    }

    const pixelWidth = this.width * tileSize;
    const pixelHeight = this.height * tileSize;

    const wrappedX = ((x % pixelWidth) + pixelWidth) % pixelWidth;
    const wrappedY = ((y % pixelHeight) + pixelHeight) % pixelHeight;

    return new Vector2D(wrappedX === 0 ? 0 : wrappedX, wrappedY === 0 ? 0 : wrappedY);
  }

  /**
   * Returns the tile type at the specified coordinate, or undefined if out of bounds.
   */
  getTileAt(coords: Vector2D): TileType | undefined;
  getTileAt(x: number, y: number): TileType | undefined;
  getTileAt(xOrCoords: number | Vector2D, maybeY?: number): TileType | undefined {
    const x = typeof xOrCoords === 'number' ? xOrCoords : xOrCoords.x;
    const y = typeof xOrCoords === 'number' ? (maybeY as number) : xOrCoords.y;

    if (!this.isInBounds(x, y)) {
      return undefined;
    }
    return this.matrix[y][x];
  }

  /**
   * Returns the tile type at the specified coordinate after applying wrap-around logic.
   */
  getTileAtWrapped(coords: Vector2D): TileType;
  getTileAtWrapped(x: number, y: number): TileType;
  getTileAtWrapped(xOrCoords: number | Vector2D, maybeY?: number): TileType {
    const wrapped =
      typeof xOrCoords === 'number'
        ? this.wrapTile(xOrCoords, maybeY as number)
        : this.wrapTile(xOrCoords);
    return this.getTileAt(wrapped)!;
  }

  /**
   * Mutates a tile at given coordinates. Returns true if successful, false if out of bounds.
   */
  setTileAt(x: number, y: number, tile: TileType): boolean {
    if (!this.isInBounds(x, y)) {
      return false;
    }
    this.matrix[y][x] = tile;
    return true;
  }

  /**
   * Determines if a tile is walkable according to entity permissions.
   */
  isWalkable(coords: Vector2D, options?: WalkableOptions): boolean;
  isWalkable(x: number, y: number, options?: WalkableOptions): boolean;
  isWalkable(
    xOrCoords: number | Vector2D,
    yOrOptions?: number | WalkableOptions,
    maybeOptions?: WalkableOptions
  ): boolean {
    let x: number;
    let y: number;
    let options: WalkableOptions | undefined;

    if (typeof xOrCoords === 'number') {
      x = xOrCoords;
      y = yOrOptions as number;
      options = maybeOptions;
    } else {
      x = xOrCoords.x;
      y = xOrCoords.y;
      options = yOrOptions as WalkableOptions | undefined;
    }

    const tile = this.getTileAt(x, y);
    if (!tile) {
      return false;
    }

    switch (tile) {
      case TileType.EMPTY:
      case TileType.PELLET:
      case TileType.ENERGIZER:
        return true;
      case TileType.GATE:
        return options?.allowGate ?? false;
      case TileType.GHOST_HOUSE:
        return options?.allowGhostHouse ?? false;
      case TileType.WALL:
      default:
        return false;
    }
  }

  /**
   * Determines if a tile is walkable after applying wrap-around logic.
   */
  isWalkableWrapped(coords: Vector2D, options?: WalkableOptions): boolean;
  isWalkableWrapped(x: number, y: number, options?: WalkableOptions): boolean;
  isWalkableWrapped(
    xOrCoords: number | Vector2D,
    yOrOptions?: number | WalkableOptions,
    maybeOptions?: WalkableOptions
  ): boolean {
    if (typeof xOrCoords === 'number') {
      const wrapped = this.wrapTile(xOrCoords, yOrOptions as number);
      return this.isWalkable(wrapped, maybeOptions);
    } else {
      const wrapped = this.wrapTile(xOrCoords);
      return this.isWalkable(wrapped, yOrOptions as WalkableOptions | undefined);
    }
  }

  /**
   * Returns all walkable cardinal directions from the given tile position.
   */
  getWalkableDirections(x: number, y: number, options?: WalkableOptions): Direction[];
  getWalkableDirections(coords: Vector2D, options?: WalkableOptions): Direction[];
  getWalkableDirections(
    xOrCoords: number | Vector2D,
    yOrOptions?: number | WalkableOptions,
    maybeOptions?: WalkableOptions
  ): Direction[] {
    let x: number;
    let y: number;
    let options: WalkableOptions | undefined;

    if (typeof xOrCoords === 'number') {
      x = xOrCoords;
      y = yOrOptions as number;
      options = maybeOptions;
    } else {
      x = xOrCoords.x;
      y = xOrCoords.y;
      options = yOrOptions as WalkableOptions | undefined;
    }

    const cardinalDirections = [
      Direction.UP,
      Direction.DOWN,
      Direction.LEFT,
      Direction.RIGHT,
    ];

    const walkable: Direction[] = [];
    for (const dir of cardinalDirections) {
      const offset = getDirectionVector(dir);
      const targetX = x + offset.x;
      const targetY = y + offset.y;

      if (this.isWalkable(targetX, targetY, options)) {
        walkable.push(dir);
      }
    }

    return walkable;
  }

  /**
   * Determines if a tile is an intersection (walkable tile with 3 or more walkable cardinal paths).
   */
  isIntersection(coords: Vector2D, options?: WalkableOptions): boolean;
  isIntersection(x: number, y: number, options?: WalkableOptions): boolean;
  isIntersection(
    xOrCoords: number | Vector2D,
    yOrOptions?: number | WalkableOptions,
    maybeOptions?: WalkableOptions
  ): boolean {
    let x: number;
    let y: number;
    let options: WalkableOptions | undefined;

    if (typeof xOrCoords === 'number') {
      x = xOrCoords;
      y = yOrOptions as number;
      options = maybeOptions;
    } else {
      x = xOrCoords.x;
      y = xOrCoords.y;
      options = yOrOptions as WalkableOptions | undefined;
    }

    if (!this.isWalkable(x, y, options)) {
      return false;
    }

    const walkableDirections = this.getWalkableDirections(x, y, options);
    return walkableDirections.length >= 3;
  }

  /**
   * Counts the total number of tiles of a specified type across the grid.
   */
  countTiles(tileType: TileType): number {
    let count = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.matrix[y][x] === tileType) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Finds all coordinate vectors for tiles matching a specific classification.
   */
  findTilePositions(tileType: TileType): Vector2D[] {
    const positions: Vector2D[] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.matrix[y][x] === tileType) {
          positions.push(new Vector2D(x, y));
        }
      }
    }
    return positions;
  }

  /**
   * Creates an independent deep clone of the grid.
   */
  clone(): Grid {
    return new Grid(this.matrix);
  }

  /**
   * Returns a copy of the underlying 2D matrix.
   */
  getRawMatrix(): TileType[][] {
    return this.matrix.map((row) => [...row]);
  }
}
