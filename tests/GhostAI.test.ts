import { describe, it, expect, beforeEach } from 'vitest';
import { Vector2D, Direction, Grid } from '../src/core';
import {
  GhostState,
  GhostType,
  DEFAULT_SCATTER_TARGETS,
  DEFAULT_GHOST_HOUSE_TARGET,
  TargetingContext,
  chooseNextDirection,
  chooseFrightenedDirection,
  BlinkyStrategy,
  PinkyStrategy,
  InkyStrategy,
  ClydeStrategy,
} from '../src/ai';

describe('Ghost Targeting Strategies & AI Pathfinding (Phase 4.2)', () => {
  describe('BlinkyStrategy (Shadow / Red Ghost)', () => {
    let blinky: BlinkyStrategy;

    beforeEach(() => {
      blinky = new BlinkyStrategy();
    });

    it('has default top-right scatter target (25, 0)', () => {
      expect(blinky.getScatterTarget()).toEqual(new Vector2D(25, 0));
      expect(DEFAULT_SCATTER_TARGETS[GhostType.BLINKY]).toEqual(new Vector2D(25, 0));
    });

    it('directly targets Pacman tile in Chase mode', () => {
      const context: TargetingContext = {
        pacmanTile: new Vector2D(9, 15),
        pacmanDirection: Direction.LEFT,
        ghostTile: new Vector2D(13, 11),
      };

      const chaseTarget = blinky.getChaseTarget(context);
      expect(chaseTarget).toEqual(new Vector2D(9, 15));

      const stateTarget = blinky.getTargetTile({
        ...context,
        ghostState: GhostState.CHASE,
      });
      expect(stateTarget).toEqual(new Vector2D(9, 15));
    });

    it('returns scatter target when in Scatter state', () => {
      const context: TargetingContext = {
        pacmanTile: new Vector2D(9, 15),
        pacmanDirection: Direction.RIGHT,
        ghostTile: new Vector2D(13, 11),
        ghostState: GhostState.SCATTER,
      };

      expect(blinky.getTargetTile(context)).toEqual(new Vector2D(25, 0));
    });

    it('returns ghost house target when in Eaten state', () => {
      const context: TargetingContext = {
        pacmanTile: new Vector2D(9, 15),
        pacmanDirection: Direction.UP,
        ghostTile: new Vector2D(5, 5),
        ghostState: GhostState.EATEN,
      };

      expect(blinky.getTargetTile(context)).toEqual(DEFAULT_GHOST_HOUSE_TARGET);
    });

    it('supports custom scatter target via constructor', () => {
      const customBlinky = new BlinkyStrategy(new Vector2D(27, 0));
      expect(customBlinky.getScatterTarget()).toEqual(new Vector2D(27, 0));
    });
  });

  describe('PinkyStrategy (Speedy / Pink Ghost)', () => {
    let pinky: PinkyStrategy;

    beforeEach(() => {
      pinky = new PinkyStrategy();
    });

    it('has default top-left scatter target (2, 0)', () => {
      expect(pinky.getScatterTarget()).toEqual(new Vector2D(2, 0));
      expect(DEFAULT_SCATTER_TARGETS[GhostType.PINKY]).toEqual(new Vector2D(2, 0));
    });

    it('targets 4 tiles ahead when Pacman faces RIGHT', () => {
      const context: TargetingContext = {
        pacmanTile: new Vector2D(10, 15),
        pacmanDirection: Direction.RIGHT,
        ghostTile: new Vector2D(5, 5),
      };

      expect(pinky.getChaseTarget(context)).toEqual(new Vector2D(14, 15));
    });

    it('targets 4 tiles ahead when Pacman faces LEFT', () => {
      const context: TargetingContext = {
        pacmanTile: new Vector2D(10, 15),
        pacmanDirection: Direction.LEFT,
        ghostTile: new Vector2D(5, 5),
      };

      expect(pinky.getChaseTarget(context)).toEqual(new Vector2D(6, 15));
    });

    it('targets 4 tiles ahead when Pacman faces DOWN', () => {
      const context: TargetingContext = {
        pacmanTile: new Vector2D(10, 15),
        pacmanDirection: Direction.DOWN,
        ghostTile: new Vector2D(5, 5),
      };

      expect(pinky.getChaseTarget(context)).toEqual(new Vector2D(10, 19));
    });

    it('reproduces authentic arcade Up+Left overflow quirk (4 tiles UP and 4 tiles LEFT) when Pacman faces UP', () => {
      const context: TargetingContext = {
        pacmanTile: new Vector2D(10, 15),
        pacmanDirection: Direction.UP,
        ghostTile: new Vector2D(5, 5),
      };

      // In authentic arcade Z80 assembly, UP subtracts 4 from X and 4 from Y
      expect(pinky.getChaseTarget(context)).toEqual(new Vector2D(6, 11));
    });

    it('targets Pacman current tile when Pacman direction is NONE', () => {
      const context: TargetingContext = {
        pacmanTile: new Vector2D(10, 15),
        pacmanDirection: Direction.NONE,
        ghostTile: new Vector2D(5, 5),
      };

      expect(pinky.getChaseTarget(context)).toEqual(new Vector2D(10, 15));
    });

    it('returns scatter target when in Scatter state', () => {
      const context: TargetingContext = {
        pacmanTile: new Vector2D(10, 15),
        pacmanDirection: Direction.DOWN,
        ghostTile: new Vector2D(5, 5),
        ghostState: GhostState.SCATTER,
      };

      expect(pinky.getTargetTile(context)).toEqual(new Vector2D(2, 0));
    });

    it('returns ghost house target when in Eaten state', () => {
      const context: TargetingContext = {
        pacmanTile: new Vector2D(10, 15),
        pacmanDirection: Direction.DOWN,
        ghostTile: new Vector2D(5, 5),
        ghostState: GhostState.EATEN,
      };

      expect(pinky.getTargetTile(context)).toEqual(DEFAULT_GHOST_HOUSE_TARGET);
    });
  });

  describe('InkyStrategy (Bashful / Cyan Ghost)', () => {
    let inky: InkyStrategy;

    beforeEach(() => {
      inky = new InkyStrategy();
    });

    it('has default bottom-right scatter target (27, 35)', () => {
      expect(inky.getScatterTarget()).toEqual(new Vector2D(27, 35));
      expect(DEFAULT_SCATTER_TARGETS[GhostType.INKY]).toEqual(new Vector2D(27, 35));
    });

    it('doubles vector from Blinky tile through 2 tiles ahead of Pacman (facing RIGHT)', () => {
      // Pacman at (10, 10), facing RIGHT -> 2 tiles ahead = (12, 10)
      // Blinky at (8, 10) -> vector from Blinky to intermediate = (4, 0)
      // Doubled target = Blinky (8, 10) + (4, 0)*2 = (16, 10)
      const context: TargetingContext = {
        pacmanTile: new Vector2D(10, 10),
        pacmanDirection: Direction.RIGHT,
        ghostTile: new Vector2D(14, 14),
        blinkyTile: new Vector2D(8, 10),
      };

      expect(inky.getChaseTarget(context)).toEqual(new Vector2D(16, 10));
    });

    it('doubles vector from Blinky tile through 2 tiles ahead of Pacman (facing LEFT)', () => {
      // Pacman at (10, 10), facing LEFT -> 2 tiles ahead = (8, 10)
      // Blinky at (12, 14) -> vector from Blinky = (-4, -4)
      // Doubled target = Blinky (12, 14) + (-4, -4)*2 = (4, 6)
      const context: TargetingContext = {
        pacmanTile: new Vector2D(10, 10),
        pacmanDirection: Direction.LEFT,
        ghostTile: new Vector2D(14, 14),
        blinkyTile: new Vector2D(12, 14),
      };

      expect(inky.getChaseTarget(context)).toEqual(new Vector2D(4, 6));
    });

    it('doubles vector from Blinky tile through 2 tiles ahead of Pacman (facing DOWN)', () => {
      // Pacman at (10, 10), facing DOWN -> 2 tiles ahead = (10, 12)
      // Blinky at (6, 8) -> vector from Blinky = (4, 4)
      // Doubled target = Blinky (6, 8) + (4, 4)*2 = (14, 16)
      const context: TargetingContext = {
        pacmanTile: new Vector2D(10, 10),
        pacmanDirection: Direction.DOWN,
        ghostTile: new Vector2D(14, 14),
        blinkyTile: new Vector2D(6, 8),
      };

      expect(inky.getChaseTarget(context)).toEqual(new Vector2D(14, 16));
    });

    it('reproduces authentic arcade Up+Left quirk for intermediate offset (2 tiles UP and 2 tiles LEFT) when Pacman faces UP', () => {
      // Pacman at (10, 10), facing UP -> intermediate = (8, 8) (quirk: (-2, -2))
      // Blinky at (8, 10) -> vector from Blinky = (0, -2)
      // Doubled target = Blinky (8, 10) + (0, -2)*2 = (8, 6)
      const context: TargetingContext = {
        pacmanTile: new Vector2D(10, 10),
        pacmanDirection: Direction.UP,
        ghostTile: new Vector2D(14, 14),
        blinkyTile: new Vector2D(8, 10),
      };

      expect(inky.getChaseTarget(context)).toEqual(new Vector2D(8, 6));
    });

    it('falls back to intermediate tile if Blinky position is not provided', () => {
      const context: TargetingContext = {
        pacmanTile: new Vector2D(10, 10),
        pacmanDirection: Direction.RIGHT,
        ghostTile: new Vector2D(14, 14),
      };

      expect(inky.getChaseTarget(context)).toEqual(new Vector2D(12, 10));
    });

    it('returns scatter target when in Scatter state', () => {
      const context: TargetingContext = {
        pacmanTile: new Vector2D(10, 10),
        pacmanDirection: Direction.RIGHT,
        ghostTile: new Vector2D(14, 14),
        blinkyTile: new Vector2D(8, 10),
        ghostState: GhostState.SCATTER,
      };

      expect(inky.getTargetTile(context)).toEqual(new Vector2D(27, 35));
    });

    it('returns ghost house target when in Eaten state', () => {
      const context: TargetingContext = {
        pacmanTile: new Vector2D(10, 10),
        pacmanDirection: Direction.RIGHT,
        ghostTile: new Vector2D(14, 14),
        ghostState: GhostState.EATEN,
      };

      expect(inky.getTargetTile(context)).toEqual(DEFAULT_GHOST_HOUSE_TARGET);
    });
  });

  describe('ClydeStrategy (Pokey / Orange Ghost)', () => {
    let clyde: ClydeStrategy;

    beforeEach(() => {
      clyde = new ClydeStrategy();
    });

    it('has default bottom-left scatter target (0, 35)', () => {
      expect(clyde.getScatterTarget()).toEqual(new Vector2D(0, 35));
      expect(DEFAULT_SCATTER_TARGETS[GhostType.CLYDE]).toEqual(new Vector2D(0, 35));
    });

    it('targets Pacman tile when Clyde is strictly greater than 8 tiles away (> 8 tiles)', () => {
      // Clyde at (0, 0), Pacman at (10, 10) -> Euclidean distance = sqrt(200) ≈ 14.14 > 8
      const context: TargetingContext = {
        pacmanTile: new Vector2D(10, 10),
        pacmanDirection: Direction.UP,
        ghostTile: new Vector2D(0, 0),
      };

      expect(clyde.getChaseTarget(context)).toEqual(new Vector2D(10, 10));
      expect(clyde.getTargetTile({ ...context, ghostState: GhostState.CHASE })).toEqual(
        new Vector2D(10, 10)
      );
    });

    it('retreats to scatter corner (0, 35) when Clyde is within 8 tiles of Pacman (<= 8 tiles)', () => {
      // Clyde at (10, 6), Pacman at (10, 10) -> Euclidean distance = 4 <= 8
      const context: TargetingContext = {
        pacmanTile: new Vector2D(10, 10),
        pacmanDirection: Direction.RIGHT,
        ghostTile: new Vector2D(10, 6),
      };

      expect(clyde.getChaseTarget(context)).toEqual(new Vector2D(0, 35));
      expect(clyde.getTargetTile({ ...context, ghostState: GhostState.CHASE })).toEqual(
        new Vector2D(0, 35)
      );
    });

    it('retreats to scatter corner at the exact boundary of 8.0 tiles', () => {
      // Clyde at (10, 2), Pacman at (10, 10) -> Euclidean distance = 8.0 <= 8
      const context: TargetingContext = {
        pacmanTile: new Vector2D(10, 10),
        pacmanDirection: Direction.LEFT,
        ghostTile: new Vector2D(10, 2),
      };

      expect(clyde.getChaseTarget(context)).toEqual(new Vector2D(0, 35));
    });

    it('targets Pacman just past 8 tiles (e.g. 8.01 tiles)', () => {
      // Distance = sqrt(6^2 + 6^2) = sqrt(72) ≈ 8.485 > 8
      const context: TargetingContext = {
        pacmanTile: new Vector2D(16, 16),
        pacmanDirection: Direction.NONE,
        ghostTile: new Vector2D(10, 10),
      };

      expect(clyde.getChaseTarget(context)).toEqual(new Vector2D(16, 16));
    });

    it('returns scatter target when in Scatter state regardless of distance', () => {
      const context: TargetingContext = {
        pacmanTile: new Vector2D(20, 20),
        pacmanDirection: Direction.NONE,
        ghostTile: new Vector2D(0, 0),
        ghostState: GhostState.SCATTER,
      };

      expect(clyde.getTargetTile(context)).toEqual(new Vector2D(0, 35));
    });

    it('returns ghost house target when in Eaten state', () => {
      const context: TargetingContext = {
        pacmanTile: new Vector2D(20, 20),
        pacmanDirection: Direction.NONE,
        ghostTile: new Vector2D(5, 5),
        ghostState: GhostState.EATEN,
      };

      expect(clyde.getTargetTile(context)).toEqual(DEFAULT_GHOST_HOUSE_TARGET);
    });
  });

  describe('Intersection Decision-Making & Pathfinding (chooseNextDirection)', () => {
    let grid: Grid;

    beforeEach(() => {
      // Simple test maze:
      // ###
      // #.#
      // #.#####
      // #.....#
      // #.#####
      // ###
      const map = [
        '#######',
        '#.....#',
        '#.###.#',
        '#.....#',
        '#######',
      ];
      grid = Grid.fromStringArray(map);
    });

    it('forbids immediate 180-degree reverse turns during normal traversal', () => {
      // Ghost is at (2, 3), was moving RIGHT (from (1, 3))
      // Target is at (0, 3) (directly behind to the LEFT)
      // Path ahead to RIGHT (3, 3) is open, UP is wall, DOWN is wall, LEFT is reverse
      // Although LEFT is closer to target (0, 3), LEFT is forbidden reverse!
      // Must choose RIGHT.
      const currentTile = new Vector2D(2, 3);
      const currentDirection = Direction.RIGHT;
      const targetTile = new Vector2D(0, 3);

      const chosen = chooseNextDirection(grid, currentTile, currentDirection, targetTile);
      expect(chosen).toBe(Direction.RIGHT);
    });

    it('evaluates candidate directions minimizing Euclidean distance to target tile', () => {
      // Ghost at intersection (1, 1), was moving UP (from (1, 2))
      // Walkable neighbor tiles: RIGHT (2, 1) and DOWN (1, 2 - reverse)
      // Target is at (5, 1) (to the right)
      // Distance from (2, 1) to (5, 1) = 3; DOWN is reverse
      // Must choose RIGHT
      const currentTile = new Vector2D(1, 1);
      const currentDirection = Direction.UP;
      const targetTile = new Vector2D(5, 1);

      const chosen = chooseNextDirection(grid, currentTile, currentDirection, targetTile);
      expect(chosen).toBe(Direction.RIGHT);
    });

    it('strictly applies authentic arcade tie-breaking priority (UP > LEFT > DOWN > RIGHT)', () => {
      // Create a 4-way cross intersection map:
      //   #
      //  ###
      // #####
      //  ###
      //   #
      const crossMap = [
        '#####',
        '##.##',
        '#...#',
        '##.##',
        '#####',
      ];
      const crossGrid = Grid.fromStringArray(crossMap);
      const centerTile = new Vector2D(2, 2);

      // 1. Tie between UP (2, 1) and LEFT (1, 2) when target is at (1, 1)
      // distSq( (2,1), (1,1) ) = (2-1)^2 + (1-1)^2 = 1
      // distSq( (1,2), (1,1) ) = (1-1)^2 + (2-1)^2 = 1
      // Moving from NONE -> UP has priority over LEFT
      const targetUpLeft = new Vector2D(1, 1);
      const chosenUpLeft = chooseNextDirection(
        crossGrid,
        centerTile,
        Direction.NONE,
        targetUpLeft
      );
      expect(chosenUpLeft).toBe(Direction.UP);

      // 2. Tie between LEFT (1, 2) and DOWN (2, 3) when target is at (1, 3)
      // distSq( (1,2), (1,3) ) = 0 + 1 = 1
      // distSq( (2,3), (1,3) ) = 1 + 0 = 1
      // Moving RIGHT -> UP is wall, LEFT is reverse, DOWN vs RIGHT?
      // With Direction.NONE -> LEFT has priority over DOWN
      const targetLeftDown = new Vector2D(1, 3);
      const chosenLeftDown = chooseNextDirection(
        crossGrid,
        centerTile,
        Direction.NONE,
        targetLeftDown
      );
      expect(chosenLeftDown).toBe(Direction.LEFT);

      // 3. Tie between DOWN (2, 3) and RIGHT (3, 2) when target is at (3, 3)
      // distSq( (2,3), (3,3) ) = 1 + 0 = 1
      // distSq( (3,2), (3,3) ) = 0 + 1 = 1
      // DOWN has priority over RIGHT
      const targetDownRight = new Vector2D(3, 3);
      const chosenDownRight = chooseNextDirection(
        crossGrid,
        centerTile,
        Direction.NONE,
        targetDownRight
      );
      expect(chosenDownRight).toBe(Direction.DOWN);
    });

    it('avoids solid walls when making direction decisions', () => {
      // Ghost at (2, 3), was moving RIGHT (from (1, 3))
      // UP is WALL at (2, 2)
      // DOWN is WALL at (2, 4)
      // LEFT is reverse at (1, 3) (forbidden)
      // RIGHT is walkable at (3, 3)
      const currentTile = new Vector2D(2, 3);
      const targetTile = new Vector2D(2, 0); // Target is UP in the wall

      const chosen = chooseNextDirection(grid, currentTile, Direction.RIGHT, targetTile);
      expect(chosen).toBe(Direction.RIGHT);
    });

    it('permits reverse turn when allowReverse option is true (e.g. on mode transition)', () => {
      const currentTile = new Vector2D(2, 3);
      const currentDirection = Direction.RIGHT;
      const targetTile = new Vector2D(0, 3); // Behind to the left

      const chosen = chooseNextDirection(grid, currentTile, currentDirection, targetTile, {
        allowReverse: true,
      });
      expect(chosen).toBe(Direction.LEFT);
    });

    it('falls back to reverse if trapped at a dead end corridor', () => {
      // Corridor:
      // ###
      // #.#
      // #.#
      const deadEndMap = [
        '###',
        '#.#',
        '#.#',
        '###',
      ];
      const deadEndGrid = Grid.fromStringArray(deadEndMap);

      // Ghost is at (1, 1), moving UP into the top wall (1, 0)
      // The only walkable tile is DOWN (1, 2), which is reverse
      const chosen = chooseNextDirection(
        deadEndGrid,
        new Vector2D(1, 1),
        Direction.UP,
        new Vector2D(1, 0)
      );
      expect(chosen).toBe(Direction.DOWN);
    });

    it('handles stationary ghost (Direction.NONE) selecting optimal start path', () => {
      const currentTile = new Vector2D(1, 1);
      const targetTile = new Vector2D(5, 1);

      const chosen = chooseNextDirection(grid, currentTile, Direction.NONE, targetTile);
      expect(chosen).toBe(Direction.RIGHT);
    });

    it('handles tunnel screen-edge wrapping paths seamlessly', () => {
      // Tunnel row with empty wrap-around
      const tunnelMap = [
        '###',
        '   ',
        '###',
      ];
      const tunnelGrid = Grid.fromStringArray(tunnelMap);

      // Ghost at (0, 1), moving LEFT towards tunnel wrap
      // Target is at (2, 1) (right side of tunnel)
      const chosen = chooseNextDirection(
        tunnelGrid,
        new Vector2D(0, 1),
        Direction.LEFT,
        new Vector2D(2, 1)
      );
      expect(chosen).toBe(Direction.LEFT);
    });

    describe('chooseFrightenedDirection', () => {
      it('selects pseudorandom direction among walkable non-reverse paths using deterministic RNG', () => {
        // Cross intersection with UP, LEFT, DOWN, RIGHT walkable
        const crossMap = [
          '#####',
          '##.##',
          '#...#',
          '##.##',
          '#####',
        ];
        const crossGrid = Grid.fromStringArray(crossMap);
        const center = new Vector2D(2, 2);

        // Moving UP -> forbidden reverse is DOWN
        // Walkable non-reverse: UP (index 0), LEFT (index 1), RIGHT (index 2)
        // RNG returns 0.0 -> chooses index 0 (UP)
        const chosen0 = chooseFrightenedDirection(crossGrid, center, Direction.UP, () => 0.0);
        expect(chosen0).toBe(Direction.UP);

        // RNG returns 0.5 -> floor(0.5 * 3) = index 1 (LEFT)
        const chosen1 = chooseFrightenedDirection(crossGrid, center, Direction.UP, () => 0.5);
        expect(chosen1).toBe(Direction.LEFT);

        // RNG returns 0.99 -> floor(0.99 * 3) = index 2 (RIGHT)
        const chosen2 = chooseFrightenedDirection(crossGrid, center, Direction.UP, () => 0.99);
        expect(chosen2).toBe(Direction.RIGHT);
      });
    });
  });
});
