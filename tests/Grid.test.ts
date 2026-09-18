import { beforeEach, describe, expect, it } from 'vitest';
import { MAP_HEIGHT, MAP_WIDTH, RAW_MAP_DATA } from '../src/config/mapData';
import { Direction, Grid, TileType, Vector2D } from '../src/core';

describe('Grid', () => {
  describe('TileType enum', () => {
    it('should define all required arcade tile classifications', () => {
      expect(TileType.WALL).toBe('WALL');
      expect(TileType.EMPTY).toBe('EMPTY');
      expect(TileType.PELLET).toBe('PELLET');
      expect(TileType.ENERGIZER).toBe('ENERGIZER');
      expect(TileType.GHOST_HOUSE).toBe('GHOST_HOUSE');
      expect(TileType.GATE).toBe('GATE');
    });
  });

  describe('Grid creation and matrix parsing', () => {
    it('should create grid from 2D TileType matrix', () => {
      const matrix: TileType[][] = [
        [TileType.WALL, TileType.WALL, TileType.WALL],
        [TileType.PELLET, TileType.EMPTY, TileType.ENERGIZER],
        [TileType.WALL, TileType.GATE, TileType.GHOST_HOUSE],
      ];
      const grid = new Grid(matrix);

      expect(grid.width).toBe(3);
      expect(grid.height).toBe(3);
      expect(grid.getTileAt(0, 0)).toBe(TileType.WALL);
      expect(grid.getTileAt(0, 1)).toBe(TileType.PELLET);
      expect(grid.getTileAt(1, 1)).toBe(TileType.EMPTY);
      expect(grid.getTileAt(2, 1)).toBe(TileType.ENERGIZER);
      expect(grid.getTileAt(1, 2)).toBe(TileType.GATE);
      expect(grid.getTileAt(2, 2)).toBe(TileType.GHOST_HOUSE);
    });

    it('should parse grid from string array with custom character mappings', () => {
      const stringMap = ['###', '. o', '#-G'];
      const grid = Grid.fromStringArray(stringMap);

      expect(grid.width).toBe(3);
      expect(grid.height).toBe(3);
      expect(grid.getTileAt(0, 0)).toBe(TileType.WALL);
      expect(grid.getTileAt(1, 0)).toBe(TileType.WALL);
      expect(grid.getTileAt(0, 1)).toBe(TileType.PELLET);
      expect(grid.getTileAt(1, 1)).toBe(TileType.EMPTY);
      expect(grid.getTileAt(2, 1)).toBe(TileType.ENERGIZER);
      expect(grid.getTileAt(1, 2)).toBe(TileType.GATE);
      expect(grid.getTileAt(2, 2)).toBe(TileType.GHOST_HOUSE);
    });

    it('should parse alternate character representations', () => {
      const stringMap = ['WWW', '.*E', 'W=H'];
      const grid = Grid.fromStringArray(stringMap);

      expect(grid.getTileAt(0, 0)).toBe(TileType.WALL);
      expect(grid.getTileAt(1, 1)).toBe(TileType.ENERGIZER);
      expect(grid.getTileAt(2, 1)).toBe(TileType.EMPTY);
      expect(grid.getTileAt(1, 2)).toBe(TileType.GATE);
      expect(grid.getTileAt(2, 2)).toBe(TileType.GHOST_HOUSE);
    });

    it('should throw an error for empty or uneven rows in string parsing', () => {
      expect(() => Grid.fromStringArray([])).toThrow('Grid matrix cannot be empty');
      expect(() => Grid.fromStringArray(['###', '##'])).toThrow('Inconsistent row length');
    });

    it('should throw an error for unknown characters', () => {
      expect(() => Grid.fromStringArray(['#?#'])).toThrow('Unknown tile character');
    });
  });

  describe('Tile coordinate lookups & boundaries', () => {
    let grid: Grid;

    beforeEach(() => {
      grid = Grid.fromStringArray(['#####', '#...#', '#.###', '#...#', '#####']);
    });

    it('should lookup tiles via numeric coordinates (x, y)', () => {
      expect(grid.getTileAt(1, 1)).toBe(TileType.PELLET);
      expect(grid.getTileAt(0, 0)).toBe(TileType.WALL);
    });

    it('should lookup tiles via Vector2D instances', () => {
      expect(grid.getTileAt(new Vector2D(1, 1))).toBe(TileType.PELLET);
      expect(grid.getTileAt(new Vector2D(0, 0))).toBe(TileType.WALL);
    });

    it('should return undefined for out-of-bounds coordinates', () => {
      expect(grid.getTileAt(-1, 0)).toBeUndefined();
      expect(grid.getTileAt(0, -1)).toBeUndefined();
      expect(grid.getTileAt(5, 2)).toBeUndefined();
      expect(grid.getTileAt(2, 5)).toBeUndefined();
      expect(grid.getTileAt(new Vector2D(10, 10))).toBeUndefined();
    });

    it('should correctly validate isInBounds', () => {
      expect(grid.isInBounds(0, 0)).toBe(true);
      expect(grid.isInBounds(4, 4)).toBe(true);
      expect(grid.isInBounds(-1, 2)).toBe(false);
      expect(grid.isInBounds(2, 5)).toBe(false);
      expect(grid.isInBounds(new Vector2D(2, 2))).toBe(true);
      expect(grid.isInBounds(new Vector2D(-1, 2))).toBe(false);
    });

    it('should allow mutating a tile via setTileAt', () => {
      expect(grid.getTileAt(1, 1)).toBe(TileType.PELLET);
      const success = grid.setTileAt(1, 1, TileType.EMPTY);
      expect(success).toBe(true);
      expect(grid.getTileAt(1, 1)).toBe(TileType.EMPTY);

      const fail = grid.setTileAt(-1, 0, TileType.EMPTY);
      expect(fail).toBe(false);
    });
  });

  describe('Walkability rules', () => {
    let grid: Grid;

    beforeEach(() => {
      grid = Grid.fromStringArray(['#######', '#. o -#', '#  G  #', '#######']);
    });

    it('should consider PELLET, ENERGIZER, and EMPTY tiles walkable by default', () => {
      expect(grid.isWalkable(1, 1)).toBe(true); // PELLET
      expect(grid.isWalkable(2, 1)).toBe(true); // EMPTY
      expect(grid.isWalkable(3, 1)).toBe(true); // ENERGIZER
    });

    it('should consider WALL tiles non-walkable', () => {
      expect(grid.isWalkable(0, 0)).toBe(false);
      expect(grid.isWalkable(0, 1)).toBe(false);
      expect(grid.isWalkable(6, 1)).toBe(false);
    });

    it('should consider out-of-bounds tiles non-walkable', () => {
      expect(grid.isWalkable(-1, 1)).toBe(false);
      expect(grid.isWalkable(10, 10)).toBe(false);
    });

    it('should treat GATE as non-walkable by default, but walkable when allowGate is true', () => {
      expect(grid.isWalkable(5, 1)).toBe(false);
      expect(grid.isWalkable(5, 1, { allowGate: true })).toBe(true);
    });

    it('should treat GHOST_HOUSE as non-walkable by default, but walkable when allowGhostHouse is true', () => {
      expect(grid.isWalkable(3, 2)).toBe(false);
      expect(grid.isWalkable(3, 2, { allowGhostHouse: true })).toBe(true);
    });
  });

  describe('Intersection detection & walkable directions', () => {
    it('should list all walkable cardinal directions from a given tile', () => {
      const grid = Grid.fromStringArray(['###', '. .', '#.#']);
      const directions = grid.getWalkableDirections(1, 1);
      expect(directions).toContain(Direction.LEFT);
      expect(directions).toContain(Direction.RIGHT);
      expect(directions).toContain(Direction.DOWN);
      expect(directions).not.toContain(Direction.UP);
      expect(directions).toHaveLength(3);
    });

    it('should identify a 3-way T-junction as an intersection', () => {
      const grid = Grid.fromStringArray(['###', '. .', '#.#']);
      expect(grid.isIntersection(1, 1)).toBe(true);
    });

    it('should identify a 4-way intersection', () => {
      const fourWayGrid = Grid.fromStringArray(['#####', '##.##', '#...#', '##.##', '#####']);
      expect(fourWayGrid.getWalkableDirections(2, 2)).toHaveLength(4);
      expect(fourWayGrid.isIntersection(2, 2)).toBe(true);
    });

    it('should NOT identify straight corridors, corners, dead ends, or walls as intersections', () => {
      const grid = Grid.fromStringArray(['#####', '#..##', '#.#.#', '#...#', '#####']);
      // Corner at (1, 1) - only RIGHT and DOWN are walkable
      expect(grid.isIntersection(1, 1)).toBe(false);

      // Straight corridor at (1, 2) - only UP and DOWN are walkable
      expect(grid.isIntersection(1, 2)).toBe(false);

      // Dead end at (3, 2) - only DOWN is walkable
      expect(grid.isIntersection(3, 2)).toBe(false);

      // Wall at (0, 0)
      expect(grid.isIntersection(0, 0)).toBe(false);
    });
  });

  describe('Tile queries and cloning', () => {
    it('should count total pellets and energizers accurately', () => {
      const grid = Grid.fromStringArray(['#####', '#o.o#', '#...#', '#####']);

      expect(grid.countTiles(TileType.PELLET)).toBe(4);
      expect(grid.countTiles(TileType.ENERGIZER)).toBe(2);
      expect(grid.countTiles(TileType.WALL)).toBe(14);
    });

    it('should find all coordinate positions of a given tile type', () => {
      const grid = Grid.fromStringArray(['#####', '#o.o#', '#####']);

      const energizers = grid.findTilePositions(TileType.ENERGIZER);
      expect(energizers).toHaveLength(2);
      expect(energizers.some((v) => v.equals(new Vector2D(1, 1)))).toBe(true);
      expect(energizers.some((v) => v.equals(new Vector2D(3, 1)))).toBe(true);
    });

    it('should create an independent deep clone with clone()', () => {
      const original = Grid.fromStringArray(['###', '#.#', '###']);
      const copy = original.clone();

      expect(copy.getTileAt(1, 1)).toBe(TileType.PELLET);
      copy.setTileAt(1, 1, TileType.EMPTY);
      expect(copy.getTileAt(1, 1)).toBe(TileType.EMPTY);
      expect(original.getTileAt(1, 1)).toBe(TileType.PELLET);
    });
  });

  describe('Authentic 28x36 Arcade Map (mapData.ts)', () => {
    let arcadeGrid: Grid;

    beforeEach(() => {
      arcadeGrid = Grid.fromStringArray(RAW_MAP_DATA);
    });

    it('should match authentic arcade dimensions (28 columns x 36 rows)', () => {
      expect(MAP_WIDTH).toBe(28);
      expect(MAP_HEIGHT).toBe(36);
      expect(arcadeGrid.width).toBe(28);
      expect(arcadeGrid.height).toBe(36);
    });

    it('should contain the authentic 240 pellets and 4 energizers (244 total items)', () => {
      const pellets = arcadeGrid.countTiles(TileType.PELLET);
      const energizers = arcadeGrid.countTiles(TileType.ENERGIZER);

      expect(pellets).toBe(240);
      expect(energizers).toBe(4);
    });

    it('should place energizers at authentic classic arcade corner coordinates', () => {
      // Top-left: (1, 6), Top-right: (26, 6)
      // Bottom-left: (1, 26), Bottom-right: (26, 26)
      expect(arcadeGrid.getTileAt(1, 6)).toBe(TileType.ENERGIZER);
      expect(arcadeGrid.getTileAt(26, 6)).toBe(TileType.ENERGIZER);
      expect(arcadeGrid.getTileAt(1, 26)).toBe(TileType.ENERGIZER);
      expect(arcadeGrid.getTileAt(26, 26)).toBe(TileType.ENERGIZER);
    });

    it('should place ghost house and gate at authentic coordinates', () => {
      // Gate is at row 15, columns 13 and 14
      expect(arcadeGrid.getTileAt(13, 15)).toBe(TileType.GATE);
      expect(arcadeGrid.getTileAt(14, 15)).toBe(TileType.GATE);

      // Ghost house interior tiles
      expect(arcadeGrid.getTileAt(13, 17)).toBe(TileType.GHOST_HOUSE);
      expect(arcadeGrid.getTileAt(14, 17)).toBe(TileType.GHOST_HOUSE);
    });

    it('should have open tunnel entrances at row 17 (0, 17) and (27, 17)', () => {
      expect(arcadeGrid.getTileAt(0, 17)).toBe(TileType.EMPTY);
      expect(arcadeGrid.getTileAt(27, 17)).toBe(TileType.EMPTY);
    });

    it('should have key classic intersections identified correctly', () => {
      // Classic top T-junction at (6, 4) and (21, 4)
      expect(arcadeGrid.isIntersection(6, 4)).toBe(true);
      expect(arcadeGrid.isIntersection(21, 4)).toBe(true);

      // Classic 4-way intersection at (6, 8) and (21, 8)
      expect(arcadeGrid.isIntersection(6, 8)).toBe(true);
      expect(arcadeGrid.isIntersection(21, 8)).toBe(true);

      // Classic row 8 T-junctions at outer walls (1, 8) and (26, 8)
      expect(arcadeGrid.isIntersection(1, 8)).toBe(true);
      expect(arcadeGrid.isIntersection(26, 8)).toBe(true);

      // Classic row 23 4-way intersections at (6, 23) and (21, 23)
      expect(arcadeGrid.isIntersection(6, 23)).toBe(true);
      expect(arcadeGrid.isIntersection(21, 23)).toBe(true);

      // Classic row 26 T-junctions at (12, 26) and (15, 26)
      expect(arcadeGrid.isIntersection(12, 26)).toBe(true);
      expect(arcadeGrid.isIntersection(15, 26)).toBe(true);
    });
  });

  describe('Tunnel Wrap-Around Mechanics (Milestone 2.2)', () => {
    let arcadeGrid: Grid;

    beforeEach(() => {
      arcadeGrid = Grid.createDefault();
    });

    describe('wrapTile', () => {
      it('should seamlessly wrap left tunnel exit (0, 17) moving left to (27, 17)', () => {
        const leftExit = new Vector2D(-1, 17);
        const wrapped = arcadeGrid.wrapTile(leftExit);

        expect(wrapped.x).toBe(27);
        expect(wrapped.y).toBe(17);
        expect(wrapped).toBeInstanceOf(Vector2D);
      });

      it('should seamlessly wrap right tunnel exit (27, 17) moving right to (0, 17)', () => {
        const rightExit = new Vector2D(28, 17);
        const wrapped = arcadeGrid.wrapTile(rightExit);

        expect(wrapped.x).toBe(0);
        expect(wrapped.y).toBe(17);
        expect(wrapped).toBeInstanceOf(Vector2D);
      });

      it('should keep in-bounds coordinates unchanged', () => {
        const inside = new Vector2D(14, 17);
        const wrapped = arcadeGrid.wrapTile(inside);

        expect(wrapped.x).toBe(14);
        expect(wrapped.y).toBe(17);
      });

      it('should wrap vertical screen-edges seamlessly', () => {
        const topExit = arcadeGrid.wrapTile(10, -1);
        expect(topExit.x).toBe(10);
        expect(topExit.y).toBe(35);

        const bottomExit = arcadeGrid.wrapTile(10, 36);
        expect(bottomExit.x).toBe(10);
        expect(bottomExit.y).toBe(0);
      });

      it('should wrap corner coordinates correctly', () => {
        const topLeft = arcadeGrid.wrapTile(-1, -1);
        expect(topLeft.x).toBe(27);
        expect(topLeft.y).toBe(35);

        const bottomRight = arcadeGrid.wrapTile(28, 36);
        expect(bottomRight.x).toBe(0);
        expect(bottomRight.y).toBe(0);
      });

      it('should support multi-screen wrap offsets deterministically', () => {
        const farLeft = arcadeGrid.wrapTile(-29, 17); // -29 = -1 - 28 -> 27
        expect(farLeft.x).toBe(27);
        expect(farLeft.y).toBe(17);

        const farRight = arcadeGrid.wrapTile(56, 17); // 56 = 2 * 28 -> 0
        expect(farRight.x).toBe(0);
        expect(farRight.y).toBe(17);
      });

      it('should support both Vector2D and numeric (x, y) arguments', () => {
        const fromVector = arcadeGrid.wrapTile(new Vector2D(-1, 17));
        const fromNumbers = arcadeGrid.wrapTile(-1, 17);

        expect(fromVector.equals(fromNumbers)).toBe(true);
      });
    });

    describe('wrapContinuous', () => {
      const tileSize = 8;
      const pixelWidth = MAP_WIDTH * tileSize; // 224
      const pixelHeight = MAP_HEIGHT * tileSize; // 288

      it('should wrap continuous sub-pixel coordinates exiting left screen boundary', () => {
        // Moving left past x = 0 by 0.5px (x = -0.5px) at y = 136px (row 17 * 8)
        const wrapped = arcadeGrid.wrapContinuous(new Vector2D(-0.5, 136), tileSize);

        expect(wrapped.x).toBeCloseTo(pixelWidth - 0.5);
        expect(wrapped.y).toBe(136);
      });

      it('should wrap continuous sub-pixel coordinates exiting right screen boundary', () => {
        // Moving right past x = 224 by 0.5px (x = 224.5px)
        const wrapped = arcadeGrid.wrapContinuous(new Vector2D(pixelWidth + 0.5, 136), tileSize);

        expect(wrapped.x).toBeCloseTo(0.5);
        expect(wrapped.y).toBe(136);
      });

      it('should keep in-bounds continuous sub-pixel coordinates unchanged', () => {
        const wrapped = arcadeGrid.wrapContinuous(new Vector2D(100.25, 136.75), tileSize);

        expect(wrapped.x).toBeCloseTo(100.25);
        expect(wrapped.y).toBeCloseTo(136.75);
      });

      it('should wrap vertical continuous sub-pixel coordinates', () => {
        const wrappedTop = arcadeGrid.wrapContinuous(100, -1.5, tileSize);
        expect(wrappedTop.x).toBe(100);
        expect(wrappedTop.y).toBeCloseTo(pixelHeight - 1.5);

        const wrappedBottom = arcadeGrid.wrapContinuous(100, pixelHeight + 2.5, tileSize);
        expect(wrappedBottom.x).toBe(100);
        expect(wrappedBottom.y).toBeCloseTo(2.5);
      });

      it('should support both Vector2D and numeric (x, y, tileSize) arguments', () => {
        const fromVector = arcadeGrid.wrapContinuous(new Vector2D(-2.5, 50), tileSize);
        const fromNumbers = arcadeGrid.wrapContinuous(-2.5, 50, tileSize);

        expect(fromVector.equals(fromNumbers)).toBe(true);
      });

      it('should throw an error if tileSize is zero or negative', () => {
        expect(() => arcadeGrid.wrapContinuous(new Vector2D(10, 10), 0)).toThrow(
          'Tile size must be greater than zero',
        );
        expect(() => arcadeGrid.wrapContinuous(10, 10, -8)).toThrow(
          'Tile size must be greater than zero',
        );
      });
    });

    describe('Wrapped tile lookups & walkability', () => {
      it('should lookup tile at wrapped coordinates via getTileAtWrapped', () => {
        // Exiting left at (-1, 17) wraps to (27, 17) which is EMPTY
        expect(arcadeGrid.getTileAtWrapped(-1, 17)).toBe(TileType.EMPTY);
        expect(arcadeGrid.getTileAtWrapped(new Vector2D(-1, 17))).toBe(TileType.EMPTY);

        // Exiting right at (28, 17) wraps to (0, 17) which is EMPTY
        expect(arcadeGrid.getTileAtWrapped(28, 17)).toBe(TileType.EMPTY);
        expect(arcadeGrid.getTileAtWrapped(new Vector2D(28, 17))).toBe(TileType.EMPTY);

        // Coordinate (-1, 0) wraps to (27, 0) which is EMPTY (top margin)
        expect(arcadeGrid.getTileAtWrapped(-1, 0)).toBe(TileType.EMPTY);
      });

      it('should verify walkability through wrap-around tunnel via isWalkableWrapped', () => {
        // Left tunnel exit (-1, 17) -> wraps to (27, 17) (EMPTY -> walkable)
        expect(arcadeGrid.isWalkableWrapped(-1, 17)).toBe(true);
        expect(arcadeGrid.isWalkableWrapped(new Vector2D(-1, 17))).toBe(true);

        // Right tunnel exit (28, 17) -> wraps to (0, 17) (EMPTY -> walkable)
        expect(arcadeGrid.isWalkableWrapped(28, 17)).toBe(true);
        expect(arcadeGrid.isWalkableWrapped(new Vector2D(28, 17))).toBe(true);

        // Row 3 (wall row): (-1, 3) wraps to (27, 3) which is WALL (not walkable)
        expect(arcadeGrid.isWalkableWrapped(-1, 3)).toBe(false);
      });
    });
  });
});
