import { describe, it, expect, beforeEach } from 'vitest';
import { Grid, Vector2D, Direction, InputBuffer } from '../src/core';
import { Pacman, DEFAULT_PACMAN_SPEED, DEFAULT_TILE_SIZE } from '../src/entities';

describe('Pacman Controller', () => {
  let grid: Grid;
  const tileSize = 8;

  // Simple test map:
  // 0: #####
  // 1: #...#
  // 2: #.###
  // 3: #...#
  // 4: #####
  const simpleMap = [
    '#####',
    '#...#',
    '#.###',
    '#...#',
    '#####',
  ];

  beforeEach(() => {
    grid = Grid.fromStringArray(simpleMap);
  });

  describe('Initialization & Configuration', () => {
    it('should initialize with default speed, tile size, and direction', () => {
      const pacman = new Pacman({ grid });

      expect(pacman.getTileSize()).toBe(DEFAULT_TILE_SIZE);
      expect(pacman.getSpeed()).toBe(DEFAULT_PACMAN_SPEED);
      expect(pacman.getDirection()).toBe(Direction.NONE);
      expect(pacman.getDesiredDirection()).toBe(Direction.NONE);
      expect(pacman.isMoving()).toBe(false);
    });

    it('should spawn at specified tile center when tile coordinate is given', () => {
      const pacman = new Pacman({
        grid,
        tileSize,
        tile: new Vector2D(1, 1),
      });

      const expectedPos = Vector2D.tileCenter(1, 1, tileSize); // (12, 12)
      expect(pacman.getPosition().x).toBe(expectedPos.x);
      expect(pacman.getPosition().y).toBe(expectedPos.y);
      expect(pacman.getTile().x).toBe(1);
      expect(pacman.getTile().y).toBe(1);
    });

    it('should spawn at exact continuous position when position vector is provided', () => {
      const customPos = new Vector2D(14.5, 12.0);
      const pacman = new Pacman({
        grid,
        tileSize,
        position: customPos,
      });

      expect(pacman.getPosition().x).toBe(14.5);
      expect(pacman.getPosition().y).toBe(12.0);
      expect(pacman.getTile().x).toBe(1);
      expect(pacman.getTile().y).toBe(1);
    });

    it('should accept custom movement speed and initial direction', () => {
      const pacman = new Pacman({
        grid,
        tileSize,
        speed: 100,
        direction: Direction.RIGHT,
      });

      expect(pacman.getSpeed()).toBe(100);
      expect(pacman.getDirection()).toBe(Direction.RIGHT);
    });
  });

  describe('Continuous Sub-pixel Movement', () => {
    it('should move smoothly along current direction by speed * deltaTime', () => {
      const pacman = new Pacman({
        grid,
        tileSize,
        tile: new Vector2D(1, 1), // center = (12, 12)
        direction: Direction.RIGHT,
        speed: 80, // 80 pixels per second
      });

      // Move for 0.05 seconds -> distance = 80 * 0.05 = 4 pixels
      pacman.update(0.05);

      expect(pacman.getPosition().x).toBeCloseTo(16);
      expect(pacman.getPosition().y).toBeCloseTo(12);
      expect(pacman.getTile().x).toBe(2);
      expect(pacman.getTile().y).toBe(1);
      expect(pacman.isMoving()).toBe(true);
    });

    it('should support updateMs with millisecond delta times', () => {
      const pacman = new Pacman({
        grid,
        tileSize,
        tile: new Vector2D(1, 1),
        direction: Direction.RIGHT,
        speed: 80,
      });

      // 50ms = 0.05s -> 4px
      pacman.updateMs(50);

      expect(pacman.getPosition().x).toBeCloseTo(16);
      expect(pacman.getPosition().y).toBeCloseTo(12);
    });

    it('should remain stationary when direction is NONE', () => {
      const pacman = new Pacman({
        grid,
        tileSize,
        tile: new Vector2D(1, 1),
        direction: Direction.NONE,
        speed: 80,
      });

      pacman.update(0.1);

      expect(pacman.getPosition().x).toBe(12);
      expect(pacman.getPosition().y).toBe(12);
      expect(pacman.isMoving()).toBe(false);
    });
  });

  describe('Wall Collision Blocking', () => {
    it('should stop at tile center when facing a wall and not penetrate it', () => {
      // Map row 1: #...# (col 0: wall, col 1: pellet, col 2: pellet, col 3: pellet, col 4: wall)
      // At col 3 (center = 28, 12), moving RIGHT towards col 4 (wall)
      const pacman = new Pacman({
        grid,
        tileSize,
        tile: new Vector2D(3, 1), // center = (28, 12)
        direction: Direction.RIGHT,
        speed: 80,
      });

      // Attempt to move right towards wall for 1 second (would be 80px)
      pacman.update(1.0);

      // Must stop exactly at tile center (28, 12)
      expect(pacman.getPosition().x).toBe(28);
      expect(pacman.getPosition().y).toBe(12);
      expect(pacman.getTile().x).toBe(3);
      expect(pacman.getTile().y).toBe(1);
      expect(pacman.isMoving()).toBe(false);
    });

    it('should allow moving up to the tile center before stopping against a wall', () => {
      // Start slightly before center at x = 26, moving RIGHT towards wall at col 4
      const pacman = new Pacman({
        grid,
        tileSize,
        position: new Vector2D(26, 12),
        direction: Direction.RIGHT,
        speed: 80,
      });

      // Move for 0.0125s (1px movement) -> x = 27 (not at center yet)
      pacman.update(0.0125);
      expect(pacman.getPosition().x).toBeCloseTo(27);
      expect(pacman.isMoving()).toBe(true);

      // Move for 0.1s (would move 8px, but clamped at center x = 28)
      pacman.update(0.1);
      expect(pacman.getPosition().x).toBe(28);
      expect(pacman.isMoving()).toBe(false);
    });

    it('should block movement into ghost house and gate when not permitted', () => {
      const houseGrid = Grid.fromStringArray([
        '#####',
        '#.-.#', // col 2 is GATE
        '#.G.#', // col 2 is GHOST_HOUSE
        '#####',
      ]);

      const pacman = new Pacman({
        grid: houseGrid,
        tileSize,
        tile: new Vector2D(1, 1), // (12, 12), moving RIGHT towards GATE at (2, 1)
        direction: Direction.RIGHT,
        speed: 80,
      });

      pacman.update(0.5);
      expect(pacman.getPosition().x).toBe(12); // Stopped at center of (1, 1)
      expect(pacman.isMoving()).toBe(false);
    });
  });

  describe('Instant 180° Direction Reversal', () => {
    it('should immediately reverse direction without waiting for tile center or intersection', () => {
      // Position at x = 22 (between tile centers (2,1) = 20 and (3,1) = 28), moving RIGHT
      // In simpleMap row 1: '#...#'
      // Tile (1,1) is at 12, Tile (2,1) is at 20, Tile (3,1) is at 28.
      // Moving LEFT moves towards tile (2,1) center at 20, then tile (1,1) center at 12.
      // Both (2,1) and (1,1) are open paths!
      const pacman = new Pacman({
        grid,
        tileSize,
        position: new Vector2D(22, 12),
        direction: Direction.RIGHT,
        speed: 80,
      });

      // Request immediate reversal to LEFT
      pacman.requestDirection(Direction.LEFT);
      expect(pacman.getDirection()).toBe(Direction.LEFT);

      // Next update moves left immediately: 22 - 4 = 18px
      pacman.update(0.05); // moves 4px left -> x = 18
      expect(pacman.getPosition().x).toBeCloseTo(18);
      expect(pacman.getDirection()).toBe(Direction.LEFT);
    });

    it('should reverse from vertical UP to DOWN immediately', () => {
      const pacman = new Pacman({
        grid,
        tileSize,
        position: new Vector2D(12, 22),
        direction: Direction.UP,
        speed: 80,
      });

      pacman.requestDirection(Direction.DOWN);
      expect(pacman.getDirection()).toBe(Direction.DOWN);

      pacman.update(0.05);
      expect(pacman.getPosition().y).toBeCloseTo(26);
    });
  });

  describe('Corner Snapping & Turning at Tile Centers', () => {
    it('should buffer perpendicular turn and execute when tile center is reached', () => {
      // Simple map:
      // Row 1: #...# -> (1, 1) is open right and open down to (1, 3)
      // Start at (10, 12) moving RIGHT towards tile center (12, 12)
      // Path DOWN into (1, 2) is walkable in simpleMap:
      // Row 0: #####
      // Row 1: #...#
      // Row 2: #.###  <- (1, 2) is '.' (walkable!)
      // Row 3: #...#  <- (1, 3) is '.' (walkable!)
      const pacman = new Pacman({
        grid,
        tileSize,
        position: new Vector2D(10, 12),
        direction: Direction.RIGHT,
        speed: 80,
      });

      // Buffer turn DOWN while still before the tile center
      pacman.requestDirection(Direction.DOWN);
      expect(pacman.getDirection()).toBe(Direction.RIGHT); // hasn't turned yet
      expect(pacman.getDesiredDirection()).toBe(Direction.DOWN);

      // Move 4px (0.05s * 80px/s = 4px).
      // Distance to center (12, 12) is 2px.
      // Pacman reaches center (12, 12), snaps turn to DOWN, and uses remaining 2px moving down!
      pacman.update(0.05);

      expect(pacman.getDirection()).toBe(Direction.DOWN);
      expect(pacman.getPosition().x).toBe(12); // snapped to column center
      expect(pacman.getPosition().y).toBeCloseTo(14); // 12 + 2px remaining
      expect(pacman.getDesiredDirection()).toBe(Direction.NONE); // consumed from buffer
    });

    it('should not turn into a wall even if requested at tile center', () => {
      // At (2, 1) (center = 20, 12), moving RIGHT.
      // Tile (2, 2) is WALL ('#') in simpleMap row 2: '#.###'
      const pacman = new Pacman({
        grid,
        tileSize,
        position: new Vector2D(18, 12),
        direction: Direction.RIGHT,
        speed: 80,
      });

      // Request DOWN (blocked by wall at (2, 2))
      pacman.requestDirection(Direction.DOWN);

      // Update passes center (20, 12)
      pacman.update(0.05); // 4px move -> passes center (20, 12) to (22, 12)

      // Pacman continues moving RIGHT because DOWN was blocked by wall
      expect(pacman.getDirection()).toBe(Direction.RIGHT);
      expect(pacman.getPosition().x).toBeCloseTo(22);
      expect(pacman.getPosition().y).toBe(12);
    });

    it('should turn immediately when already aligned at tile center and path is walkable', () => {
      const pacman = new Pacman({
        grid,
        tileSize,
        tile: new Vector2D(1, 1), // exact center (12, 12)
        direction: Direction.RIGHT,
        speed: 80,
      });

      pacman.requestDirection(Direction.DOWN);
      pacman.update(0.05); // 4px

      expect(pacman.getDirection()).toBe(Direction.DOWN);
      expect(pacman.getPosition().x).toBe(12);
      expect(pacman.getPosition().y).toBeCloseTo(16);
    });

    it('should start moving from stationary state when valid direction is requested', () => {
      const pacman = new Pacman({
        grid,
        tileSize,
        tile: new Vector2D(1, 1),
        direction: Direction.NONE,
        speed: 80,
      });

      pacman.requestDirection(Direction.RIGHT);
      expect(pacman.getDirection()).toBe(Direction.RIGHT);

      pacman.update(0.05);
      expect(pacman.getPosition().x).toBeCloseTo(16);
      expect(pacman.isMoving()).toBe(true);
    });
  });

  describe('Input Buffer Integration & Expiration', () => {
    it('should discard buffered turn if it expires before reaching an intersection', () => {
      // Buffer with short timeout of 50ms
      const buffer = new InputBuffer(50);
      const pacman = new Pacman({
        grid,
        tileSize,
        position: new Vector2D(10, 12),
        direction: Direction.RIGHT,
        speed: 10, // slow speed: 10px/s
        inputBuffer: buffer,
      });

      pacman.requestDirection(Direction.DOWN);

      // Advance by 60ms (buffer expires before reaching turn)
      pacman.update(0.06);

      expect(pacman.getDesiredDirection()).toBe(Direction.NONE);
      expect(pacman.getDirection()).toBe(Direction.RIGHT);
    });
  });

  describe('Tunnel Wrap-Around Movement', () => {
    let tunnelGrid: Grid;

    beforeEach(() => {
      // Map with horizontal tunnel at row 1:
      // Col 0 and Col 4 are open EMPTY spaces representing tunnel exits
      tunnelGrid = Grid.fromStringArray([
        '#####',
        ' ... ',
        '#####',
      ]);
    });

    it('should wrap continuous coordinates seamlessly when exiting left tunnel', () => {
      const pixelWidth = 5 * tileSize; // 40px
      const pacman = new Pacman({
        grid: tunnelGrid,
        tileSize,
        position: new Vector2D(1, 12), // moving LEFT near left boundary
        direction: Direction.LEFT,
        speed: 80,
      });

      // Move left for 0.05s -> 4px left -> x = 1 - 4 = -3 -> wrapped to 40 - 3 = 37px
      pacman.update(0.05);

      expect(pacman.getPosition().x).toBeCloseTo(pixelWidth - 3);
      expect(pacman.getPosition().y).toBe(12);
      expect(pacman.getTile().x).toBe(4);
    });

    it('should wrap continuous coordinates seamlessly when exiting right tunnel', () => {
      const pixelWidth = 5 * tileSize; // 40px
      const pacman = new Pacman({
        grid: tunnelGrid,
        tileSize,
        position: new Vector2D(pixelWidth - 1, 12), // 39px, moving RIGHT
        direction: Direction.RIGHT,
        speed: 80,
      });

      // Move right for 0.05s -> 4px right -> x = 39 + 4 = 43 -> wrapped to 3px
      pacman.update(0.05);

      expect(pacman.getPosition().x).toBeCloseTo(3);
      expect(pacman.getPosition().y).toBe(12);
      expect(pacman.getTile().x).toBe(0);
    });
  });

  describe('Reset and State Helpers', () => {
    it('should reset position, direction, and clear input buffer on reset()', () => {
      const pacman = new Pacman({
        grid,
        tileSize,
        tile: new Vector2D(1, 1),
        direction: Direction.RIGHT,
        speed: 80,
      });

      pacman.update(0.5);
      pacman.requestDirection(Direction.UP);

      pacman.reset({ tile: new Vector2D(3, 3), direction: Direction.LEFT });

      const expectedPos = Vector2D.tileCenter(3, 3, tileSize);
      expect(pacman.getPosition().x).toBe(expectedPos.x);
      expect(pacman.getPosition().y).toBe(expectedPos.y);
      expect(pacman.getDirection()).toBe(Direction.LEFT);
      expect(pacman.getDesiredDirection()).toBe(Direction.NONE);
    });

    it('should check tile center alignment via isAtTileCenter', () => {
      const pacman = new Pacman({
        grid,
        tileSize,
        tile: new Vector2D(1, 1), // (12, 12)
      });

      expect(pacman.isAtTileCenter()).toBe(true);

      pacman.setPosition(new Vector2D(13, 12));
      expect(pacman.isAtTileCenter()).toBe(false);
      expect(pacman.isAtTileCenter(1.5)).toBe(true); // with tolerance
    });

    it('should snap position to current tile center via snapToTileCenter()', () => {
      const pacman = new Pacman({
        grid,
        tileSize,
        position: new Vector2D(13.2, 11.8),
      });

      pacman.snapToTileCenter();

      expect(pacman.getPosition().x).toBe(12);
      expect(pacman.getPosition().y).toBe(12);
      expect(pacman.isAtTileCenter()).toBe(true);
    });
  });
});
