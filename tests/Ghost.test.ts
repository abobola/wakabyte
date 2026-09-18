import { describe, it, expect, beforeEach } from 'vitest';
import { Grid, Vector2D, Direction, CollisionManager, CollisionType } from '../src/core';
import {
  Ghost,
  DEFAULT_GHOST_SPEED,
  DEFAULT_FRIGHTENED_SPEED,
  DEFAULT_EATEN_SPEED,
  Pacman,
} from '../src/entities';
import {
  GhostType,
  GhostState,
  GlobalWaveTimer,
  BlinkyStrategy,
  PinkyStrategy,
  InkyStrategy,
  ClydeStrategy,
} from '../src/ai';

describe('Ghost Controller Entity', () => {
  let grid: Grid;
  const tileSize = 8;

  // Test map:
  // Row 0: #####
  // Row 1: #...#
  // Row 2: #.###
  // Row 3: #...#
  // Row 4: #####
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
    it('should initialize with default speeds, tile size, and strategy matching ghost type', () => {
      const blinky = new Ghost({
        grid,
        type: GhostType.BLINKY,
        tile: new Vector2D(1, 1),
      });

      expect(blinky.getType()).toBe(GhostType.BLINKY);
      expect(blinky.getTileSize()).toBe(8);
      expect(blinky.getSpeed()).toBe(DEFAULT_GHOST_SPEED);
      expect(blinky.getBaseSpeed()).toBe(DEFAULT_GHOST_SPEED);
      expect(blinky.getFrightenedSpeed()).toBe(DEFAULT_FRIGHTENED_SPEED);
      expect(blinky.getEatenSpeed()).toBe(DEFAULT_EATEN_SPEED);
      expect(blinky.getState()).toBe(GhostState.SCATTER);
      expect(blinky.getStrategy()).toBeInstanceOf(BlinkyStrategy);
    });

    it('should assign appropriate default strategy for each GhostType', () => {
      const pinky = new Ghost({ grid, type: GhostType.PINKY });
      const inky = new Ghost({ grid, type: GhostType.INKY });
      const clyde = new Ghost({ grid, type: GhostType.CLYDE });

      expect(pinky.getStrategy()).toBeInstanceOf(PinkyStrategy);
      expect(inky.getStrategy()).toBeInstanceOf(InkyStrategy);
      expect(clyde.getStrategy()).toBeInstanceOf(ClydeStrategy);
    });

    it('should initialize position at tile center when tile is provided', () => {
      const ghost = new Ghost({
        grid,
        type: GhostType.BLINKY,
        tile: new Vector2D(1, 1),
      });

      const center = Vector2D.tileCenter(1, 1, tileSize); // (12, 12)
      expect(ghost.getPosition().x).toBe(center.x);
      expect(ghost.getPosition().y).toBe(center.y);
      expect(ghost.getTile().x).toBe(1);
      expect(ghost.getTile().y).toBe(1);
    });

    it('should accept custom position, direction, and speeds', () => {
      const ghost = new Ghost({
        grid,
        type: GhostType.BLINKY,
        position: new Vector2D(20, 20),
        direction: Direction.RIGHT,
        speed: 90,
        frightenedSpeed: 45,
        eatenSpeed: 180,
      });

      expect(ghost.getPosition().x).toBe(20);
      expect(ghost.getPosition().y).toBe(20);
      expect(ghost.getDirection()).toBe(Direction.RIGHT);
      expect(ghost.getBaseSpeed()).toBe(90);
      expect(ghost.getFrightenedSpeed()).toBe(45);
      expect(ghost.getEatenSpeed()).toBe(180);
    });
  });

  describe('Dynamic Speed Scaling by State', () => {
    it('returns normal speed during SCATTER and CHASE', () => {
      const waveTimer = new GlobalWaveTimer();
      const ghost = new Ghost({
        grid,
        type: GhostType.BLINKY,
        waveTimer,
        speed: 75,
        frightenedSpeed: 40,
        eatenSpeed: 150,
      });

      expect(ghost.getState()).toBe(GhostState.SCATTER);
      expect(ghost.getSpeed()).toBe(75);

      // Advance wave timer into CHASE mode (after 7s)
      waveTimer.update(7.1);
      ghost.update(0.1);
      expect(ghost.getState()).toBe(GhostState.CHASE);
      expect(ghost.getSpeed()).toBe(75);
    });

    it('returns frightenedSpeed when in FRIGHTENED mode', () => {
      const waveTimer = new GlobalWaveTimer();
      const ghost = new Ghost({
        grid,
        type: GhostType.BLINKY,
        waveTimer,
        speed: 75,
        frightenedSpeed: 40,
        eatenSpeed: 150,
      });

      waveTimer.triggerFrightened(5);
      ghost.update(0.1);

      expect(ghost.getState()).toBe(GhostState.FRIGHTENED);
      expect(ghost.getSpeed()).toBe(40);
    });

    it('returns eatenSpeed when in EATEN mode', () => {
      const ghost = new Ghost({
        grid,
        type: GhostType.BLINKY,
        speed: 75,
        frightenedSpeed: 40,
        eatenSpeed: 150,
      });

      ghost.eat();
      expect(ghost.getState()).toBe(GhostState.EATEN);
      expect(ghost.getSpeed()).toBe(150);
    });
  });

  describe('Movement & AI Navigation', () => {
    // 7x5 Corridor Map:
    // 0: #######
    // 1: #.....#
    // 2: #.###.#
    // 3: #.....#
    // 4: #######
    const corridorMap = [
      '#######',
      '#.....#',
      '#.###.#',
      '#.....#',
      '#######',
    ];

    let testGrid: Grid;

    beforeEach(() => {
      testGrid = Grid.fromStringArray(corridorMap);
    });

    it('moves continuously along current direction', () => {
      const ghost = new Ghost({
        grid: testGrid,
        type: GhostType.BLINKY,
        tile: new Vector2D(1, 1), // (12, 12)
        direction: Direction.RIGHT,
        speed: 80,
      });

      ghost.update(0.05, {
        pacmanTile: new Vector2D(5, 1),
        pacmanDirection: Direction.LEFT,
      });

      // 80 px/s * 0.05s = 4px -> (16, 12)
      expect(ghost.getPosition().x).toBeCloseTo(16);
      expect(ghost.getPosition().y).toBeCloseTo(12);
      expect(ghost.getTile().x).toBe(2);
    });

    it('evaluates target tile and turns at corner intersections towards target', () => {
      // Blinky starting at (1, 1), moving RIGHT. Corner is at (5, 1).
      // Pacman is at (5, 3). At (5, 1), Blinky should decide to turn DOWN towards Pacman.
      const ghost = new Ghost({
        grid: testGrid,
        type: GhostType.BLINKY,
        tile: new Vector2D(4, 1), // center = (36, 12)
        direction: Direction.RIGHT,
        speed: 80,
      });

      // Move 0.1s -> 8px -> reaches (5, 1) center at (44, 12)
      ghost.update(0.1, {
        pacmanTile: new Vector2D(5, 3),
        pacmanDirection: Direction.LEFT,
      });

      expect(ghost.getTile().x).toBe(5);
      expect(ghost.getTile().y).toBe(1);
      expect(ghost.getDirection()).toBe(Direction.DOWN);
    });

    it('reverses direction when requested by FSM mode change', () => {
      const waveTimer = new GlobalWaveTimer();
      const ghost = new Ghost({
        grid: testGrid,
        type: GhostType.BLINKY,
        waveTimer,
        tile: new Vector2D(2, 1),
        direction: Direction.RIGHT,
        speed: 80,
      });

      // Trigger wave transition from SCATTER to CHASE
      waveTimer.update(7.1);

      // Next update should execute direction reversal
      ghost.update(0.05, {
        pacmanTile: new Vector2D(5, 1),
        pacmanDirection: Direction.LEFT,
      });

      expect(ghost.getDirection()).toBe(Direction.LEFT);
    });

    it('chooses random valid non-reverse direction in FRIGHTENED mode using RNG', () => {
      // Intersection at (1, 1): right and down are walkable. Coming from (1, 2) moving UP.
      // RNG returns 0 -> chooses first candidate
      let rngValue = 0;
      const waveTimer = new GlobalWaveTimer();
      waveTimer.triggerFrightened(10);

      const ghost = new Ghost({
        grid: testGrid,
        type: GhostType.BLINKY,
        waveTimer,
        tile: new Vector2D(1, 2),
        direction: Direction.UP,
        speed: 80,
        rng: () => rngValue,
      });

      ghost.update(0.2); // reaches (1, 1) center at 40 px/s (8px distance)

      // At (1, 1), UP is blocked by wall, DOWN is forbidden reverse. Only RIGHT is valid.
      expect(ghost.getDirection()).toBe(Direction.RIGHT);
    });
  });

  describe('Eaten State & Revival', () => {
    // Map with Ghost House:
    // 0: #######
    // 1: #..-..#  (Gate '-' at (3, 1))
    // 2: #.GGG.#  (Ghost House at (3, 2))
    // 3: #######
    const houseMap = [
      '#######',
      '#..-..#',
      '#.GGG.#',
      '#######',
    ];

    let houseGrid: Grid;

    beforeEach(() => {
      houseGrid = Grid.fromStringArray(houseMap);
    });

    it('navigates towards ghost house target when eaten and revives on arrival', () => {
      const ghostHouseTarget = new Vector2D(3, 1);
      const ghost = new Ghost({
        grid: houseGrid,
        type: GhostType.BLINKY,
        tile: new Vector2D(1, 1),
        direction: Direction.RIGHT,
        houseTarget: ghostHouseTarget,
        speed: 80,
        eatenSpeed: 160,
      });

      ghost.eat();
      expect(ghost.getState()).toBe(GhostState.EATEN);
      expect(ghost.getSpeed()).toBe(160);

      // Move ghost towards house target at (3, 1)
      // Tile 1 center (12, 12) -> Tile 3 center (28, 12) = 16px distance
      // At 160 px/s, takes 0.1s
      ghost.update(0.1);

      expect(ghost.getTile().x).toBe(3);
      expect(ghost.getTile().y).toBe(1);
      // Upon reaching ghost house target, ghost should revive back to normal wave state
      expect(ghost.getState()).not.toBe(GhostState.EATEN);
      expect(ghost.getState()).toBe(GhostState.SCATTER);
    });
  });

  describe('Reset & Lifecycle', () => {
    it('resets position, direction, and revives if eaten', () => {
      const ghost = new Ghost({
        grid,
        type: GhostType.BLINKY,
        tile: new Vector2D(1, 1),
        direction: Direction.RIGHT,
      });

      ghost.setPosition(new Vector2D(30, 30));
      ghost.setDirection(Direction.DOWN);
      ghost.eat();

      expect(ghost.getState()).toBe(GhostState.EATEN);

      ghost.reset();

      const initialCenter = Vector2D.tileCenter(1, 1, tileSize);
      expect(ghost.getPosition().x).toBe(initialCenter.x);
      expect(ghost.getPosition().y).toBe(initialCenter.y);
      expect(ghost.getDirection()).toBe(Direction.RIGHT);
      expect(ghost.getState()).toBe(GhostState.SCATTER);
    });
  });

  describe('CollisionManager Integration', () => {
    it('works seamlessly as a GhostEntity in CollisionManager.resolveCollisions', () => {
      const pacman = new Pacman({
        grid,
        tile: new Vector2D(1, 1),
        direction: Direction.RIGHT,
      });

      const ghost = new Ghost({
        grid,
        type: GhostType.BLINKY,
        tile: new Vector2D(1, 1),
        direction: Direction.LEFT,
      });

      const collisionManager = new CollisionManager({ initialLives: 3 });

      // Normal state collision: lethal to Pacman
      const result = collisionManager.resolveCollisions(pacman, [ghost]);
      expect(result[0].type).toBe(CollisionType.PACMAN_DEATH);
      expect(result[0].remainingLives).toBe(2);

      // Frightened state collision: ghost is eaten
      ghost.getFSM().triggerFrightened(5);
      const frightenedResult = collisionManager.resolveCollisions(pacman, [ghost]);
      expect(frightenedResult[0].type).toBe(CollisionType.GHOST_EATEN);
      expect(ghost.getState()).toBe(GhostState.EATEN);
    });
  });
});
