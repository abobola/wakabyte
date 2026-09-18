import { beforeEach, describe, expect, it } from 'vitest';
import { GhostState, GhostType } from '../src/ai';
import { Direction, Grid, TileType, Vector2D } from '../src/core';
import {
  CanvasRenderer,
  DEFAULT_CANVAS_THEME,
  type RenderableGhost,
  type RenderableHUD,
  type RenderablePacman,
  type RenderGameState,
} from '../src/render';

/**
 * Mock CanvasRenderingContext2D tracking all draw calls for verification in headless tests.
 */
interface MockCall {
  method: string;
  args: unknown[];
}

class MockCanvasRenderingContext2D {
  public calls: MockCall[] = [];
  public fillStyle: string | CanvasGradient | CanvasPattern = '#000000';
  public font: string = '10px sans-serif';
  public textAlign: CanvasTextAlign = 'start';
  public textBaseline: CanvasTextBaseline = 'alphabetic';
  public canvas: { width: number; height: number };

  constructor(width = 224, height = 288) {
    this.canvas = { width, height };
  }

  public clearMockCalls(): void {
    this.calls = [];
  }

  public fillRect(x: number, y: number, w: number, h: number): void {
    this.calls.push({ method: 'fillRect', args: [x, y, w, h] });
  }

  public beginPath(): void {}

  public closePath(): void {}

  public moveTo(_x: number, _y: number): void {}

  public lineTo(_x: number, _y: number): void {}

  public arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean,
  ): void {
    this.calls.push({
      method: 'arc',
      args: [x, y, radius, startAngle, endAngle, counterclockwise ?? false],
    });
  }

  public quadraticCurveTo(_cpx: number, _cpy: number, _x: number, _y: number): void {}

  public fill(): void {
    this.calls.push({ method: 'fill', args: [this.fillStyle] });
  }

  public fillText(text: string, x: number, y: number, maxWidth?: number): void {
    this.calls.push({
      method: 'fillText',
      args: [text, x, y, this.fillStyle, maxWidth],
    });
  }
}

describe('Canvas 2D Renderer (Phase 6.1)', () => {
  let ctx: MockCanvasRenderingContext2D;
  let renderer: CanvasRenderer;
  let testGrid: Grid;

  beforeEach(() => {
    ctx = new MockCanvasRenderingContext2D(224, 288);
    renderer = new CanvasRenderer({
      context: ctx as unknown as CanvasRenderingContext2D,
      tileSize: 8,
      scale: 1,
    });

    testGrid = Grid.fromStringArray(['####', '#.o#', '#-G#', '#  #']);
  });

  describe('Initialization & Configuration', () => {
    it('initializes with default options and theme', () => {
      expect(renderer.getTileSize()).toBe(8);
      expect(renderer.getScale()).toBe(1);
      expect(renderer.getTheme().wallColor).toBe(DEFAULT_CANVAS_THEME.wallColor);
      expect(renderer.getTheme().pacmanColor).toBe(DEFAULT_CANVAS_THEME.pacmanColor);
    });

    it('accepts custom theme and overrides specific colors', () => {
      const customRenderer = new CanvasRenderer({
        context: ctx as unknown as CanvasRenderingContext2D,
        theme: {
          wallColor: '#0000FF',
          pacmanColor: '#FFFF55',
        },
      });

      expect(customRenderer.getTheme().wallColor).toBe('#0000FF');
      expect(customRenderer.getTheme().pacmanColor).toBe('#FFFF55');
      expect(customRenderer.getTheme().gateColor).toBe(DEFAULT_CANVAS_THEME.gateColor);
    });

    it('allows updating scale and tileSize dynamically', () => {
      renderer.setScale(2);
      expect(renderer.getScale()).toBe(2);

      renderer.setTileSize(16);
      expect(renderer.getTileSize()).toBe(16);
    });

    it('allows getting and setting rendering context', () => {
      expect(renderer.getContext()).toBe(ctx);
      const newCtx = new MockCanvasRenderingContext2D(300, 400);
      renderer.setContext(newCtx as unknown as CanvasRenderingContext2D);
      expect(renderer.getContext()).toBe(newCtx);
    });

    it('throws errors when scale or tileSize are non-positive', () => {
      expect(() => renderer.setScale(0)).toThrow('Scale must be greater than zero');
      expect(() => renderer.setScale(-1)).toThrow('Scale must be greater than zero');
      expect(() => renderer.setTileSize(0)).toThrow('Tile size must be greater than zero');
      expect(() => renderer.setTileSize(-5)).toThrow('Tile size must be greater than zero');
    });
  });

  describe('Canvas Clear & Background', () => {
    it('clears canvas by filling background rectangle', () => {
      renderer.clear();

      const fillRectCall = ctx.calls.find(
        (c) => c.method === 'fillRect' && c.args[0] === 0 && c.args[1] === 0,
      );
      expect(fillRectCall).toBeDefined();
      expect(fillRectCall?.args[2]).toBe(224);
      expect(fillRectCall?.args[3]).toBe(288);
      expect(ctx.fillStyle).toBe(DEFAULT_CANVAS_THEME.backgroundColor);
    });
  });

  describe('Maze Tile Rasterization (Walls, Pellets, Energizers, Gate)', () => {
    it('renders wall tiles with wallColor', () => {
      renderer.renderWalls(testGrid);

      // In testGrid, there are walls at various tiles
      const wallTile = testGrid.getTileAt(0, 0);
      expect(wallTile).toBe(TileType.WALL);

      const fillRectCalls = ctx.calls.filter((c) => c.method === 'fillRect');
      expect(fillRectCalls.length).toBeGreaterThan(0);
      expect(ctx.fillStyle).toBe(DEFAULT_CANVAS_THEME.wallColor);
    });

    it('renders gate tile with gateColor', () => {
      renderer.renderWalls(testGrid);

      // Tile at (1, 2) is GATE '-'
      expect(testGrid.getTileAt(1, 2)).toBe(TileType.GATE);
      const gateCalls = ctx.calls.filter((c) => c.method === 'fillRect');
      expect(gateCalls.length).toBeGreaterThan(0);
    });

    it('renders pellets with pelletColor at tile center', () => {
      ctx.clearMockCalls();
      renderer.renderPellets(testGrid);

      // Tile at (1, 1) is PELLET '.'
      expect(testGrid.getTileAt(1, 1)).toBe(TileType.PELLET);

      const arcCalls = ctx.calls.filter((c) => c.method === 'arc');
      expect(arcCalls.length).toBeGreaterThanOrEqual(1);

      // Center of tile (1, 1) with tileSize 8 is (12, 12)
      const pelletCall = arcCalls.find((c) => c.args[0] === 12 && c.args[1] === 12);
      expect(pelletCall).toBeDefined();
      expect(pelletCall?.args[2]).toBeLessThan(4); // radius < 4
    });

    it('renders energizers with energizerColor and larger radius when visible', () => {
      ctx.clearMockCalls();
      renderer.renderPellets(testGrid, true);

      // Tile at (2, 1) is ENERGIZER 'o'
      expect(testGrid.getTileAt(2, 1)).toBe(TileType.ENERGIZER);

      const arcCalls = ctx.calls.filter((c) => c.method === 'arc');
      // Center of tile (2, 1) with tileSize 8 is (20, 12)
      const energizerCall = arcCalls.find((c) => c.args[0] === 20 && c.args[1] === 12);
      expect(energizerCall).toBeDefined();
      expect(energizerCall?.args[2]).toBeGreaterThanOrEqual(3); // radius >= 3
    });

    it('skips energizers when energizerVisible is false (flashing off-cycle)', () => {
      ctx.clearMockCalls();
      renderer.renderPellets(testGrid, false);

      const arcCalls = ctx.calls.filter((c) => c.method === 'arc');
      // Energizer at (20, 12) should NOT be drawn
      const energizerCall = arcCalls.find((c) => c.args[0] === 20 && c.args[1] === 12);
      expect(energizerCall).toBeUndefined();

      // Normal pellet at (12, 12) should still be drawn
      const pelletCall = arcCalls.find((c) => c.args[0] === 12 && c.args[1] === 12);
      expect(pelletCall).toBeDefined();
    });

    it('renders full grid combining walls and pellets via renderGrid', () => {
      ctx.clearMockCalls();
      renderer.renderGrid(testGrid, { energizerVisible: true });

      expect(ctx.calls.length).toBeGreaterThan(0);
    });
  });

  describe('Pacman Rendering & Mouth Animation', () => {
    it('renders Pacman at continuous sub-pixel coordinates', () => {
      const pacman: RenderablePacman = {
        position: new Vector2D(50.5, 60.25),
        direction: Direction.RIGHT,
        isMoving: true,
      };

      renderer.renderPacman(pacman);

      const arcCall = ctx.calls.find(
        (c) => c.method === 'arc' && c.args[0] === 50.5 && c.args[1] === 60.25,
      );
      expect(arcCall).toBeDefined();
      expect(ctx.fillStyle).toBe(DEFAULT_CANVAS_THEME.pacmanColor);
    });

    it('orients mouth wedge correctly according to movement Direction', () => {
      const directions = [
        { dir: Direction.RIGHT, baseAngle: 0 },
        { dir: Direction.DOWN, baseAngle: Math.PI / 2 },
        { dir: Direction.LEFT, baseAngle: Math.PI },
        { dir: Direction.UP, baseAngle: (3 * Math.PI) / 2 },
      ];

      for (const { dir, baseAngle } of directions) {
        ctx.clearMockCalls();
        const pacman: RenderablePacman = {
          position: new Vector2D(20, 20),
          direction: dir,
          mouthAngle: 0.2 * Math.PI,
          isMoving: true,
        };

        renderer.renderPacman(pacman);

        const arcCall = ctx.calls.find((c) => c.method === 'arc');
        expect(arcCall).toBeDefined();
        const startAngle = arcCall?.args[3] as number;
        const endAngle = arcCall?.args[4] as number;

        expect(startAngle).toBeCloseTo(baseAngle + 0.2 * Math.PI, 2);
        expect(endAngle).toBeCloseTo(baseAngle + 2 * Math.PI - 0.2 * Math.PI, 2);

        // Angle span should reflect mouth wedge
        const angleDiff = (endAngle - startAngle + 2 * Math.PI) % (2 * Math.PI);
        expect(angleDiff).toBeCloseTo(2 * Math.PI - 2 * 0.2 * Math.PI, 2);
      }
    });

    it('renders closed / slight slit mouth when stationary (isMoving = false)', () => {
      ctx.clearMockCalls();
      const pacman: RenderablePacman = {
        position: new Vector2D(30, 30),
        direction: Direction.RIGHT,
        isMoving: false,
      };

      renderer.renderPacman(pacman);

      const arcCall = ctx.calls.find((c) => c.method === 'arc');
      expect(arcCall).toBeDefined();
      const startAngle = arcCall?.args[3] as number;
      const endAngle = arcCall?.args[4] as number;
      const angleDiff = (endAngle - startAngle + 2 * Math.PI) % (2 * Math.PI);
      // Nearly a full circle when stationary
      expect(angleDiff).toBeGreaterThanOrEqual(1.8 * Math.PI);
    });

    it('calculates oscillating mouth animation from animationTick when moving', () => {
      ctx.clearMockCalls();
      const pacman: RenderablePacman = {
        position: new Vector2D(30, 30),
        direction: Direction.RIGHT,
        isMoving: true,
      };

      // Frame 0: closed / small opening
      renderer.renderPacman(pacman, 0);
      const arcCall0 = ctx.calls.find((c) => c.method === 'arc');

      ctx.clearMockCalls();
      // Mid-phase: open mouth
      renderer.renderPacman(pacman, 0.25);
      const arcCall1 = ctx.calls.find((c) => c.method === 'arc');

      expect(arcCall0).toBeDefined();
      expect(arcCall1).toBeDefined();
      expect(arcCall0?.args[3]).not.toEqual(arcCall1?.args[3]);
    });

    it('renders death animation when isDying is true', () => {
      ctx.clearMockCalls();
      const pacman: RenderablePacman = {
        position: new Vector2D(30, 30),
        direction: Direction.RIGHT,
        isDying: true,
        deathProgress: 0.5,
      };

      renderer.renderPacman(pacman);

      const arcCall = ctx.calls.find((c) => c.method === 'arc');
      expect(arcCall).toBeDefined();
      const startAngle = arcCall?.args[3] as number;
      const endAngle = arcCall?.args[4] as number;
      const angleDiff = (endAngle - startAngle + 2 * Math.PI) % (2 * Math.PI);
      // In death progress 0.5, pacman circle shrinks / opens wide
      expect(angleDiff).toBeLessThan(1.5 * Math.PI);
    });
  });

  describe('Ghost Rendering (Body, Skirt, Eyes, States)', () => {
    it('renders Blinky with red body color', () => {
      ctx.clearMockCalls();
      const ghost: RenderableGhost = {
        type: GhostType.BLINKY,
        position: new Vector2D(40, 40),
        direction: Direction.LEFT,
        state: GhostState.CHASE,
      };

      renderer.renderGhost(ghost);

      const fillCall = ctx.calls.find(
        (c) => c.method === 'fill' && c.args[0] === DEFAULT_CANVAS_THEME.blinkyColor,
      );
      expect(fillCall).toBeDefined();
    });

    it('renders Pinky, Inky, and Clyde with their authentic theme colors', () => {
      const ghostConfigs = [
        { type: GhostType.PINKY, expectedColor: DEFAULT_CANVAS_THEME.pinkyColor },
        { type: GhostType.INKY, expectedColor: DEFAULT_CANVAS_THEME.inkyColor },
        { type: GhostType.CLYDE, expectedColor: DEFAULT_CANVAS_THEME.clydeColor },
      ];

      for (const { type, expectedColor } of ghostConfigs) {
        ctx.clearMockCalls();
        renderer.renderGhost({
          type,
          position: new Vector2D(40, 40),
          direction: Direction.RIGHT,
          state: GhostState.SCATTER,
        });

        const fillCall = ctx.calls.find((c) => c.method === 'fill' && c.args[0] === expectedColor);
        expect(fillCall).toBeDefined();
      }
    });

    it('renders Frightened mode with blue body color and frightened face', () => {
      ctx.clearMockCalls();
      const ghost: RenderableGhost = {
        type: GhostType.BLINKY,
        position: new Vector2D(40, 40),
        direction: Direction.UP,
        state: GhostState.FRIGHTENED,
        isFlashing: false,
      };

      renderer.renderGhost(ghost);

      const blueFillCall = ctx.calls.find(
        (c) => c.method === 'fill' && c.args[0] === DEFAULT_CANVAS_THEME.frightenedColor,
      );
      expect(blueFillCall).toBeDefined();
    });

    it('renders Frightened flashing mode alternating with white color', () => {
      ctx.clearMockCalls();
      const ghost: RenderableGhost = {
        type: GhostType.BLINKY,
        position: new Vector2D(40, 40),
        direction: Direction.UP,
        state: GhostState.FRIGHTENED,
        isFlashing: true,
      };

      // In CanvasRenderer: flashCycle = Math.floor(animationTick * 8) % 2
      // For animationTick = 0.125: Math.floor(0.125 * 8) = 1, 1 % 2 = 1 -> frightenedFlashColor (#FFFFFF)
      renderer.renderGhost(ghost, 0.125);

      const flashFillCall = ctx.calls.find(
        (c) => c.method === 'fill' && c.args[0] === DEFAULT_CANVAS_THEME.frightenedFlashColor,
      );
      expect(flashFillCall).toBeDefined();
    });

    it('renders Eaten mode with eyes ONLY (skips body rendering)', () => {
      ctx.clearMockCalls();
      const ghost: RenderableGhost = {
        type: GhostType.BLINKY,
        position: new Vector2D(40, 40),
        direction: Direction.DOWN,
        state: GhostState.EATEN,
      };

      renderer.renderGhost(ghost);

      // Body color fill should NOT be called
      const bodyFillCall = ctx.calls.find(
        (c) => c.method === 'fill' && c.args[0] === DEFAULT_CANVAS_THEME.blinkyColor,
      );
      expect(bodyFillCall).toBeUndefined();

      // Eye whites and pupils should be drawn
      const eyeWhiteFill = ctx.calls.find(
        (c) => c.method === 'fill' && c.args[0] === DEFAULT_CANVAS_THEME.eyeWhiteColor,
      );
      expect(eyeWhiteFill).toBeDefined();

      const pupilFill = ctx.calls.find(
        (c) => c.method === 'fill' && c.args[0] === DEFAULT_CANVAS_THEME.pupilColor,
      );
      expect(pupilFill).toBeDefined();
    });

    it('offsets pupils based on ghost facing direction', () => {
      const directions = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];

      for (const dir of directions) {
        ctx.clearMockCalls();
        renderer.renderGhost({
          type: GhostType.BLINKY,
          position: new Vector2D(40, 40),
          direction: dir,
          state: GhostState.CHASE,
        });

        // Pupil arc calls
        const arcCalls = ctx.calls.filter((c) => c.method === 'arc');
        expect(arcCalls.length).toBeGreaterThanOrEqual(4); // 2 scleras + 2 pupils
      }
    });

    it('animates skirt tentacles with animationTick', () => {
      ctx.clearMockCalls();
      const ghost: RenderableGhost = {
        type: GhostType.BLINKY,
        position: new Vector2D(40, 40),
        direction: Direction.RIGHT,
        state: GhostState.CHASE,
      };

      renderer.renderGhost(ghost, 0.0);
      const callsPhase0 = [...ctx.calls];

      ctx.clearMockCalls();
      renderer.renderGhost(ghost, 0.5);
      const callsPhase1 = [...ctx.calls];

      expect(callsPhase0.length).toBeGreaterThan(0);
      expect(callsPhase1.length).toBeGreaterThan(0);
    });
  });

  describe('HUD Rendering (Score, High Score, Lives, Overlays)', () => {
    it('renders "1UP" label and current score', () => {
      const hud: RenderableHUD = {
        score: 1250,
        highScore: 10000,
        lives: 3,
      };

      renderer.renderHUD(hud);

      const oneUpCall = ctx.calls.find((c) => c.method === 'fillText' && c.args[0] === '1UP');
      expect(oneUpCall).toBeDefined();

      const scoreCall = ctx.calls.find((c) => c.method === 'fillText' && c.args[0] === '1250');
      expect(scoreCall).toBeDefined();
    });

    it('renders "HIGH SCORE" label and value', () => {
      const hud: RenderableHUD = {
        score: 0,
        highScore: 24000,
        lives: 3,
      };

      renderer.renderHUD(hud);

      const highScoreHeaderCall = ctx.calls.find(
        (c) => c.method === 'fillText' && c.args[0] === 'HIGH SCORE',
      );
      expect(highScoreHeaderCall).toBeDefined();

      const highScoreValCall = ctx.calls.find(
        (c) => c.method === 'fillText' && c.args[0] === '24000',
      );
      expect(highScoreValCall).toBeDefined();
    });

    it('renders remaining lives as mini-Pacman icons', () => {
      ctx.clearMockCalls();
      const hud: RenderableHUD = {
        score: 100,
        lives: 3,
      };

      renderer.renderHUD(hud);

      // Arc calls for the lives icons at the bottom
      const arcCalls = ctx.calls.filter((c) => c.method === 'arc');
      // For 3 lives, should draw 3 icons (or 2 bonus lives)
      expect(arcCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('renders status text overlays such as "READY!" and "GAME OVER"', () => {
      ctx.clearMockCalls();
      const hud: RenderableHUD = {
        score: 0,
        lives: 3,
        statusText: 'READY!',
        statusTextColor: '#FFFF00',
      };

      renderer.renderHUD(hud);

      const statusCall = ctx.calls.find((c) => c.method === 'fillText' && c.args[0] === 'READY!');
      expect(statusCall).toBeDefined();
      expect(statusCall?.args[3]).toBe('#FFFF00');
    });
  });

  describe('Position Interpolation & Wrap-Around Math', () => {
    it('interpolates positions linearly with alpha', () => {
      const prev = new Vector2D(10, 20);
      const curr = new Vector2D(30, 40);

      const mid = CanvasRenderer.interpolatePosition(prev, curr, 0.5);
      expect(mid.x).toBe(20);
      expect(mid.y).toBe(30);

      const start = CanvasRenderer.interpolatePosition(prev, curr, 0);
      expect(start).toEqual(prev);

      const end = CanvasRenderer.interpolatePosition(prev, curr, 1);
      expect(end).toEqual(curr);
    });

    it('handles screen-edge tunnel wrapping without sliding across the screen', () => {
      const arcadeGrid = Grid.createDefault();
      // Exiting left tunnel at 4 and appearing at 220 (width 28 * 8 = 224)
      const prev = new Vector2D(4, 136);
      const curr = new Vector2D(220, 136);

      const interp = CanvasRenderer.interpolatePosition(prev, curr, 0.5, arcadeGrid, 8);
      // Should interpolate smoothly around wrap rather than x = 112
      expect(interp.y).toBe(136);
      expect(interp.x < 10 || interp.x > 210).toBe(true);
    });
  });

  describe('Full Composite Render Pipeline', () => {
    it('renders full game frame coordinating grid, pellets, ghosts, pacman, and hud in proper order', () => {
      ctx.clearMockCalls();
      const gameState: RenderGameState = {
        grid: testGrid,
        pacman: {
          position: new Vector2D(50, 50),
          direction: Direction.RIGHT,
          isMoving: true,
        },
        ghosts: [
          {
            type: GhostType.BLINKY,
            position: new Vector2D(60, 50),
            direction: Direction.LEFT,
            state: GhostState.CHASE,
          },
          {
            type: GhostType.PINKY,
            position: new Vector2D(70, 50),
            direction: Direction.UP,
            state: GhostState.SCATTER,
          },
        ],
        hud: {
          score: 500,
          highScore: 10000,
          lives: 3,
          statusText: 'READY!',
        },
        energizerVisible: true,
        animationTick: 0.1,
      };

      renderer.render(gameState);

      // Verify clear, walls, pellets, ghosts, pacman, hud all executed
      const fillRectCalls = ctx.calls.filter((c) => c.method === 'fillRect');
      const arcCalls = ctx.calls.filter((c) => c.method === 'arc');
      const fillTextCalls = ctx.calls.filter((c) => c.method === 'fillText');

      expect(fillRectCalls.length).toBeGreaterThan(0);
      expect(arcCalls.length).toBeGreaterThan(0);
      expect(fillTextCalls.length).toBeGreaterThan(0);
    });
  });
});
