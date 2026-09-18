import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GameLoop,
  Grid,
  Vector2D,
  Direction,
  TileType,
  ScoreManager,
  CollisionManager,
  PELLET_POINTS,
  ENERGIZER_POINTS,
} from '../src/core';
import { Pacman, Ghost } from '../src/entities';
import { GhostType, GlobalWaveTimer, GhostState } from '../src/ai';

describe('GameLoop Engine & Simulation Coordinator', () => {
  const tileSize = 8;
  let simpleGrid: Grid;
  let scoreManager: ScoreManager;
  let waveTimer: GlobalWaveTimer;
  let collisionManager: CollisionManager;
  let pacman: Pacman;
  let blinky: Ghost;
  let pinky: Ghost;
  let gameLoop: GameLoop;

  beforeEach(() => {
    // 5x5 test grid:
    // W W W W W
    // W . . o W   (. = PELLET, o = ENERGIZER)
    // W . W . W
    // W . . . W
    // W W W W W
    const testMap = [
      'WWWWW',
      'W..oW',
      'W.W.W',
      'W...W',
      'WWWWW',
    ];

    simpleGrid = Grid.fromStringArray(testMap);
    scoreManager = new ScoreManager({ grid: simpleGrid });
    waveTimer = new GlobalWaveTimer({
      frightenedDuration: 6,
    });
    collisionManager = new CollisionManager({ scoreManager, initialLives: 3 });

    pacman = new Pacman({
      grid: simpleGrid,
      tileSize,
      position: Vector2D.tileCenter(1, 1, tileSize),
      direction: Direction.NONE,
      speed: 80,
    });

    blinky = new Ghost({
      grid: simpleGrid,
      type: GhostType.BLINKY,
      waveTimer,
      tileSize,
      position: Vector2D.tileCenter(3, 3, tileSize),
      direction: Direction.LEFT,
      speed: 75,
    });

    pinky = new Ghost({
      grid: simpleGrid,
      type: GhostType.PINKY,
      waveTimer,
      tileSize,
      position: Vector2D.tileCenter(1, 3, tileSize),
      direction: Direction.RIGHT,
      speed: 75,
    });

    gameLoop = new GameLoop({
      grid: simpleGrid,
      pacman,
      ghosts: [blinky, pinky],
      scoreManager,
      waveTimer,
      collisionManager,
      tileSize,
    });
  });

  describe('Initialization & State Accessors', () => {
    it('initializes with provided components and default states', () => {
      expect(gameLoop.getGrid()).toBe(simpleGrid);
      expect(gameLoop.getPacman()).toBe(pacman);
      expect(gameLoop.getGhosts()).toEqual([blinky, pinky]);
      expect(gameLoop.getBlinky()).toBe(blinky);
      expect(gameLoop.getScoreManager()).toBe(scoreManager);
      expect(gameLoop.getWaveTimer()).toBe(waveTimer);
      expect(gameLoop.getCollisionManager()).toBe(collisionManager);
      expect(gameLoop.isGameOver()).toBe(false);
      expect(gameLoop.isLevelCleared()).toBe(false);
      expect(gameLoop.isPaused()).toBe(false);
    });

    it('creates default factory instance with arcade map layout', () => {
      const defaultLoop = GameLoop.createDefault();
      expect(defaultLoop.getGrid()).toBeDefined();
      expect(defaultLoop.getPacman()).toBeDefined();
      expect(defaultLoop.getGhosts()).toHaveLength(4);
      expect(defaultLoop.getBlinky()?.getType()).toBe(GhostType.BLINKY);
      expect(defaultLoop.getScoreManager().getHighScore()).toBe(10000);
      expect(defaultLoop.getCollisionManager().getLives()).toBe(3);
      expect(defaultLoop.isGameOver()).toBe(false);
    });
  });

  describe('Simulation Stepping (update)', () => {
    it('advances wave timer and entity movement when updated', () => {
      pacman.setDirection(Direction.RIGHT);
      const initialPacmanX = pacman.getPosition().x;

      gameLoop.update(0.1);

      expect(waveTimer.getTimeInCurrentPhase()).toBeCloseTo(0.1, 4);
      expect(pacman.getPosition().x).toBeGreaterThan(initialPacmanX);
      expect(blinky.getPosition().x).toBeLessThan(Vector2D.tileCenter(3, 3, tileSize).x);
    });

    it('consumes pellets, adds score, clears grid tile, and fires onPelletEaten callback', () => {
      const onPelletEaten = vi.fn();
      const customLoop = new GameLoop({
        grid: simpleGrid,
        pacman,
        ghosts: [blinky],
        scoreManager,
        waveTimer,
        collisionManager,
        tileSize,
        onPelletEaten,
      });

      // (1, 1) currently has a PELLET
      expect(simpleGrid.getTileAt(1, 1)).toBe(TileType.PELLET);
      const initialScore = scoreManager.getScore();

      customLoop.update(0.01);

      expect(simpleGrid.getTileAt(1, 1)).toBe(TileType.EMPTY);
      expect(scoreManager.getScore()).toBe(initialScore + PELLET_POINTS);
      expect(onPelletEaten).toHaveBeenCalledWith(
        expect.objectContaining({ x: 1, y: 1 }),
        PELLET_POINTS
      );
    });

    it('consumes energizers, triggers frightened mode, and fires onEnergizerEaten callback', () => {
      const onEnergizerEaten = vi.fn();
      // Move pacman to (3, 1) where energizer 'o' is located
      pacman.setPosition(Vector2D.tileCenter(3, 1, tileSize));
      expect(simpleGrid.getTileAt(3, 1)).toBe(TileType.ENERGIZER);

      const customLoop = new GameLoop({
        grid: simpleGrid,
        pacman,
        ghosts: [blinky],
        scoreManager,
        waveTimer,
        collisionManager,
        tileSize,
        onEnergizerEaten,
      });

      customLoop.update(0.01);

      expect(simpleGrid.getTileAt(3, 1)).toBe(TileType.EMPTY);
      expect(scoreManager.getScore()).toBe(ENERGIZER_POINTS);
      expect(waveTimer.isFrightened()).toBe(true);
      expect(blinky.getState()).toBe(GhostState.FRIGHTENED);
      expect(onEnergizerEaten).toHaveBeenCalledWith(
        expect.objectContaining({ x: 3, y: 1 }),
        ENERGIZER_POINTS
      );
    });

    it('passes targeting context (pacman tile, pacman direction, blinky tile) to ghost updates', () => {
      const ghostSpy = vi.spyOn(blinky, 'update');
      pacman.setDirection(Direction.RIGHT);

      gameLoop.update(0.05);

      expect(ghostSpy).toHaveBeenCalledWith(
        0.05,
        expect.objectContaining({
          pacmanTile: expect.objectContaining({ x: 2, y: 1 }),
          pacmanDirection: Direction.RIGHT,
          blinkyTile: expect.objectContaining({ x: 3, y: 3 }),
        })
      );
    });

    it('clamps excessively large delta times to maxDeltaTimeSec', () => {
      const waveTimerSpy = vi.spyOn(waveTimer, 'update');

      // Pass 2.5 seconds (e.g. browser tab backgrounded)
      gameLoop.update(2.5);

      // Should be clamped to 0.1s default maxDeltaTimeSec
      expect(waveTimerSpy).toHaveBeenCalledWith(0.1);
    });

    it('fires onTick callback with applied delta seconds', () => {
      const onTick = vi.fn();
      const customLoop = new GameLoop({
        grid: simpleGrid,
        pacman,
        ghosts: [blinky],
        scoreManager,
        waveTimer,
        collisionManager,
        tileSize,
        onTick,
      });

      customLoop.update(0.033);
      expect(onTick).toHaveBeenCalledWith(0.033);
    });
  });

  describe('Collision Interactions & Game Over', () => {
    it('resolves lethal ghost collision: loses life, resets entities, and fires onPacmanDeath', () => {
      const onPacmanDeath = vi.fn();
      // Place blinky directly on Pacman
      blinky.setPosition(pacman.getPosition());

      const customLoop = new GameLoop({
        grid: simpleGrid,
        pacman,
        ghosts: [blinky],
        scoreManager,
        waveTimer,
        collisionManager,
        tileSize,
        onPacmanDeath,
      });

      customLoop.update(0.01);

      expect(collisionManager.getLives()).toBe(2);
      expect(onPacmanDeath).toHaveBeenCalledWith(2, false);
    });

    it('resolves frightened ghost collision: eats ghost, adds points, and fires onGhostEaten', () => {
      const onGhostEaten = vi.fn();
      waveTimer.triggerFrightened();
      blinky.setPosition(pacman.getPosition());

      const customLoop = new GameLoop({
        grid: simpleGrid,
        pacman,
        ghosts: [blinky],
        scoreManager,
        waveTimer,
        collisionManager,
        tileSize,
        onGhostEaten,
      });

      customLoop.update(0.01);

      expect(blinky.getState()).toBe(GhostState.EATEN);
      // 10 pts for pellet at (1, 1) + 200 pts for 1st frightened ghost
      expect(scoreManager.getScore()).toBe(210);
      expect(onGhostEaten).toHaveBeenCalledWith(blinky, 200);
      expect(collisionManager.getLives()).toBe(3); // lives unchanged
    });

    it('stops advancing simulation and triggers onGameOver when lives reach 0', () => {
      const onGameOver = vi.fn();
      collisionManager.setLives(1);
      blinky.setPosition(pacman.getPosition());

      const customLoop = new GameLoop({
        grid: simpleGrid,
        pacman,
        ghosts: [blinky],
        scoreManager,
        waveTimer,
        collisionManager,
        tileSize,
        onGameOver,
      });

      customLoop.update(0.01);

      expect(collisionManager.getLives()).toBe(0);
      expect(customLoop.isGameOver()).toBe(true);
      expect(onGameOver).toHaveBeenCalled();

      // Subsequent updates should not advance pacman position or timer
      const pacmanPos = pacman.getPosition().clone();
      const elapsedWave = waveTimer.getTimeInCurrentPhase();
      customLoop.update(0.1);

      expect(pacman.getPosition().equals(pacmanPos)).toBe(true);
      expect(waveTimer.getTimeInCurrentPhase()).toBe(elapsedWave);
    });

    it('detects level cleared when all pellets are consumed and calls onLevelCleared', () => {
      const onLevelCleared = vi.fn();
      const customLoop = new GameLoop({
        grid: simpleGrid,
        pacman,
        ghosts: [],
        scoreManager,
        waveTimer,
        collisionManager,
        tileSize,
        onLevelCleared,
      });

      // Clear all pellets manually from grid except the one pacman is on (1, 1)
      for (let y = 0; y < simpleGrid.height; y++) {
        for (let x = 0; x < simpleGrid.width; x++) {
          if (x !== 1 || y !== 1) {
            const tile = simpleGrid.getTileAt(x, y);
            if (tile === TileType.PELLET || tile === TileType.ENERGIZER) {
              scoreManager.consumeTile(tile);
              simpleGrid.setTileAt(x, y, TileType.EMPTY);
            }
          }
        }
      }

      expect(customLoop.isLevelCleared()).toBe(false);

      // Now pacman consumes the last pellet at (1, 1)
      customLoop.update(0.01);

      expect(customLoop.isLevelCleared()).toBe(true);
      expect(onLevelCleared).toHaveBeenCalled();
    });
  });

  describe('Pause & Lifecycle Controls', () => {
    it('pauses, resumes, and toggles pause state', () => {
      expect(gameLoop.isPaused()).toBe(false);

      gameLoop.pause();
      expect(gameLoop.isPaused()).toBe(true);

      gameLoop.resume();
      expect(gameLoop.isPaused()).toBe(false);

      const toggled = gameLoop.togglePause();
      expect(toggled).toBe(true);
      expect(gameLoop.isPaused()).toBe(true);

      const toggledBack = gameLoop.togglePause();
      expect(toggledBack).toBe(false);
      expect(gameLoop.isPaused()).toBe(false);
    });

    it('does not advance simulation when paused', () => {
      gameLoop.pause();
      pacman.setDirection(Direction.RIGHT);
      const initialPacmanX = pacman.getPosition().x;
      const initialWaveElapsed = waveTimer.getTimeInCurrentPhase();

      gameLoop.update(0.1);

      expect(pacman.getPosition().x).toBe(initialPacmanX);
      expect(waveTimer.getTimeInCurrentPhase()).toBe(initialWaveElapsed);
    });

    it('resets entity positions on reset()', () => {
      pacman.setPosition(new Vector2D(100, 100));
      blinky.setPosition(new Vector2D(120, 120));

      gameLoop.reset();

      expect(pacman.getPosition().x).toBe(Vector2D.tileCenter(1, 1, tileSize).x);
      expect(blinky.getPosition().x).toBe(Vector2D.tileCenter(3, 3, tileSize).x);
    });

    it('restarts full game state on restartGame()', () => {
      // Eat a pellet
      gameLoop.update(0.01);
      collisionManager.loseLife();

      expect(scoreManager.getScore()).toBeGreaterThan(0);
      expect(collisionManager.getLives()).toBe(2);

      gameLoop.restartGame();

      expect(scoreManager.getScore()).toBe(0);
      expect(collisionManager.getLives()).toBe(3);
      expect(simpleGrid.getTileAt(1, 1)).toBe(TileType.PELLET);
      expect(gameLoop.isGameOver()).toBe(false);
    });
  });
});
