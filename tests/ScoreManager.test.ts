import { beforeEach, describe, expect, it } from 'vitest';
import {
  type ConsumptionResult,
  ENERGIZER_POINTS,
  EXTRA_LIFE_THRESHOLD,
  GHOST_STREAK_POINTS,
  Grid,
  PELLET_POINTS,
  ScoreManager,
  TileType,
  Vector2D,
} from '../src/core';

describe('ScoreManager (Phase 5.1)', () => {
  describe('Constants & Default Initialization', () => {
    it('defines authentic arcade scoring point constants', () => {
      expect(PELLET_POINTS).toBe(10);
      expect(ENERGIZER_POINTS).toBe(50);
      expect(GHOST_STREAK_POINTS).toEqual([200, 400, 800, 1600]);
      expect(EXTRA_LIFE_THRESHOLD).toBe(10000);
    });

    it('initializes with default zero score, high score, and no pellets', () => {
      const manager = new ScoreManager();

      expect(manager.getScore()).toBe(0);
      expect(manager.getHighScore()).toBe(0);
      expect(manager.getTotalPellets()).toBe(0);
      expect(manager.getRemainingPellets()).toBe(0);
      expect(manager.getPelletsEaten()).toBe(0);
      expect(manager.getGhostStreak()).toBe(0);
      expect(manager.isLevelCleared()).toBe(false);
      expect(manager.hasAwardedExtraLife()).toBe(false);
    });

    it('accepts initial custom options for score, high score, and total pellets', () => {
      const manager = new ScoreManager({
        initialScore: 500,
        highScore: 2000,
        totalPellets: 244,
      });

      expect(manager.getScore()).toBe(500);
      expect(manager.getHighScore()).toBe(2000);
      expect(manager.getTotalPellets()).toBe(244);
      expect(manager.getRemainingPellets()).toBe(244);
      expect(manager.getPelletsEaten()).toBe(0);
    });

    it('sets high score equal to initial score if initial score is higher than high score', () => {
      const manager = new ScoreManager({
        initialScore: 3000,
        highScore: 1000,
      });

      expect(manager.getScore()).toBe(3000);
      expect(manager.getHighScore()).toBe(3000);
    });

    it('initializes total and remaining pellets automatically from a Grid instance', () => {
      const customMatrix = [
        [TileType.WALL, TileType.PELLET, TileType.PELLET],
        [TileType.ENERGIZER, TileType.EMPTY, TileType.PELLET],
      ];
      const grid = Grid.fromMatrix(customMatrix);
      const manager = new ScoreManager({ grid });

      // 3 pellets + 1 energizer = 4 total pellets
      expect(manager.getTotalPellets()).toBe(4);
      expect(manager.getRemainingPellets()).toBe(4);
      expect(manager.getPelletsEaten()).toBe(0);
    });

    it('correctly counts all pellets and energizers on the default arcade map', () => {
      const grid = Grid.createDefault();
      const manager = new ScoreManager({ grid });

      const pelletCount = grid.countTiles(TileType.PELLET);
      const energizerCount = grid.countTiles(TileType.ENERGIZER);

      expect(manager.getTotalPellets()).toBe(pelletCount + energizerCount);
      expect(manager.getRemainingPellets()).toBe(pelletCount + energizerCount);
      expect(manager.getTotalPellets()).toBe(244);
    });
  });

  describe('Pellet & Energizer Consumption', () => {
    let manager: ScoreManager;

    beforeEach(() => {
      manager = new ScoreManager({ totalPellets: 10, highScore: 100 });
    });

    it('awards 10 points when eating a regular pellet', () => {
      const points = manager.eatPellet();

      expect(points).toBe(10);
      expect(manager.getScore()).toBe(10);
      expect(manager.getRemainingPellets()).toBe(9);
      expect(manager.getPelletsEaten()).toBe(1);
    });

    it('awards 50 points when eating an energizer', () => {
      const points = manager.eatEnergizer();

      expect(points).toBe(50);
      expect(manager.getScore()).toBe(50);
      expect(manager.getRemainingPellets()).toBe(9);
      expect(manager.getPelletsEaten()).toBe(1);
    });

    it('updates high score dynamically when current score exceeds high score', () => {
      manager = new ScoreManager({ initialScore: 80, highScore: 100, totalPellets: 10 });

      manager.eatPellet(); // 90
      expect(manager.getScore()).toBe(90);
      expect(manager.getHighScore()).toBe(100);

      manager.eatPellet(); // 100
      expect(manager.getScore()).toBe(100);
      expect(manager.getHighScore()).toBe(100);

      manager.eatPellet(); // 110 -> exceeds high score
      expect(manager.getScore()).toBe(110);
      expect(manager.getHighScore()).toBe(110);

      manager.eatEnergizer(); // 160
      expect(manager.getScore()).toBe(160);
      expect(manager.getHighScore()).toBe(160);
    });

    it('prevents remaining pellets from dropping below zero', () => {
      manager = new ScoreManager({ totalPellets: 1 });

      manager.eatPellet();
      expect(manager.getRemainingPellets()).toBe(0);
      expect(manager.getPelletsEaten()).toBe(1);

      // Subsequent eats still award points but remaining count stays 0
      manager.eatPellet();
      expect(manager.getRemainingPellets()).toBe(0);
      expect(manager.getPelletsEaten()).toBe(2);
    });
  });

  describe('Consecutive Ghost Consumption Multiplier Streak', () => {
    let manager: ScoreManager;

    beforeEach(() => {
      manager = new ScoreManager({ totalPellets: 10 });
    });

    it('awards 200, 400, 800, 1600 points for consecutive ghost consumptions', () => {
      // 1st ghost: 200 pts
      const ghost1 = manager.eatGhost();
      expect(ghost1).toBe(200);
      expect(manager.getGhostStreak()).toBe(1);
      expect(manager.getScore()).toBe(200);

      // 2nd ghost: 400 pts
      const ghost2 = manager.eatGhost();
      expect(ghost2).toBe(400);
      expect(manager.getGhostStreak()).toBe(2);
      expect(manager.getScore()).toBe(600);

      // 3rd ghost: 800 pts
      const ghost3 = manager.eatGhost();
      expect(ghost3).toBe(800);
      expect(manager.getGhostStreak()).toBe(3);
      expect(manager.getScore()).toBe(1400);

      // 4th ghost: 1600 pts
      const ghost4 = manager.eatGhost();
      expect(ghost4).toBe(1600);
      expect(manager.getGhostStreak()).toBe(4);
      expect(manager.getScore()).toBe(3000);
    });

    it('caps consecutive ghost streak points at 1600 points if 5th ghost is eaten', () => {
      manager.eatGhost(); // 1st: 200
      manager.eatGhost(); // 2nd: 400
      manager.eatGhost(); // 3rd: 800
      manager.eatGhost(); // 4th: 1600

      const ghost5 = manager.eatGhost(); // 5th ghost
      expect(ghost5).toBe(1600);
      expect(manager.getGhostStreak()).toBe(5);
      expect(manager.getScore()).toBe(4600);
    });

    it('resets ghost streak to 0 when resetGhostStreak() is called', () => {
      manager.eatGhost(); // 200
      manager.eatGhost(); // 400
      expect(manager.getGhostStreak()).toBe(2);

      manager.resetGhostStreak();
      expect(manager.getGhostStreak()).toBe(0);

      // Next ghost is 1st in a new streak -> 200 pts
      const nextGhost = manager.eatGhost();
      expect(nextGhost).toBe(200);
      expect(manager.getGhostStreak()).toBe(1);
    });

    it('resets ghost streak to 0 when a new energizer is consumed', () => {
      manager.eatGhost(); // 200
      manager.eatGhost(); // 400
      expect(manager.getGhostStreak()).toBe(2);

      // Eat new energizer
      manager.eatEnergizer();
      expect(manager.getGhostStreak()).toBe(0);

      // Next ghost starts at 200 pts again
      const nextGhost = manager.eatGhost();
      expect(nextGhost).toBe(200);
      expect(manager.getGhostStreak()).toBe(1);
    });
  });

  describe('Level Clear Detection', () => {
    it('reports isLevelCleared as false when pellets remain', () => {
      const manager = new ScoreManager({ totalPellets: 3 });

      expect(manager.isLevelCleared()).toBe(false);
      manager.eatPellet();
      expect(manager.isLevelCleared()).toBe(false);
      manager.eatEnergizer();
      expect(manager.isLevelCleared()).toBe(false);
    });

    it('reports isLevelCleared as true when remaining pellets reach 0', () => {
      const manager = new ScoreManager({ totalPellets: 2 });

      manager.eatPellet();
      expect(manager.isLevelCleared()).toBe(false);

      manager.eatEnergizer();
      expect(manager.getRemainingPellets()).toBe(0);
      expect(manager.isLevelCleared()).toBe(true);
    });

    it('does not trigger level clear on uninitialized zero-pellet grid unless specified', () => {
      const manager = new ScoreManager({ totalPellets: 0 });
      expect(manager.isLevelCleared()).toBe(false);
    });
  });

  describe('Extra Life Milestone (10,000 pts)', () => {
    it('detects extra life milestone when score crosses 10,000 points', () => {
      const manager = new ScoreManager({ initialScore: 9900, totalPellets: 20 });
      expect(manager.hasAwardedExtraLife()).toBe(false);

      const awardedOnFirstPellet = manager.addScore(50); // 9950
      expect(awardedOnFirstPellet).toBe(false);
      expect(manager.hasAwardedExtraLife()).toBe(false);

      const awardedOnSecondPellet = manager.addScore(100); // 10050
      expect(awardedOnSecondPellet).toBe(true);
      expect(manager.hasAwardedExtraLife()).toBe(true);
      expect(manager.getScore()).toBe(10050);
    });

    it('awards extra life only once even when score increases further', () => {
      const manager = new ScoreManager({ initialScore: 9950, totalPellets: 20 });

      manager.addScore(100); // 10050 -> crosses 10000
      expect(manager.hasAwardedExtraLife()).toBe(true);

      manager.addScore(5000); // 15050
      expect(manager.hasAwardedExtraLife()).toBe(true);
    });

    it('allows configuring custom extra life threshold', () => {
      const manager = new ScoreManager({ extraLifeThreshold: 5000 });

      manager.addScore(4900);
      expect(manager.hasAwardedExtraLife()).toBe(false);

      manager.addScore(200); // 5100
      expect(manager.hasAwardedExtraLife()).toBe(true);
    });
  });

  describe('Tile Consumption & Grid Interaction Helpers', () => {
    let grid: Grid;
    let manager: ScoreManager;

    beforeEach(() => {
      const matrix = [
        [TileType.WALL, TileType.PELLET, TileType.ENERGIZER],
        [TileType.EMPTY, TileType.GATE, TileType.GHOST_HOUSE],
      ];
      grid = Grid.fromMatrix(matrix);
      manager = new ScoreManager({ grid });
    });

    it('consumes a PELLET tile from the grid, mutating it to EMPTY and scoring 10 pts', () => {
      const result = manager.consumeAt(grid, new Vector2D(1, 0));

      expect(result).toEqual<ConsumptionResult>({
        type: 'PELLET',
        points: 10,
        remainingPellets: 1,
        isLevelCleared: false,
        awardedExtraLife: false,
      });

      expect(grid.getTileAt(1, 0)).toBe(TileType.EMPTY);
      expect(manager.getScore()).toBe(10);
      expect(manager.getRemainingPellets()).toBe(1);
    });

    it('consumes an ENERGIZER tile from the grid, mutating it to EMPTY and scoring 50 pts', () => {
      const result = manager.consumeAt(grid, new Vector2D(2, 0));

      expect(result).toEqual<ConsumptionResult>({
        type: 'ENERGIZER',
        points: 50,
        remainingPellets: 1,
        isLevelCleared: false,
        awardedExtraLife: false,
      });

      expect(grid.getTileAt(2, 0)).toBe(TileType.EMPTY);
      expect(manager.getScore()).toBe(50);
      expect(manager.getRemainingPellets()).toBe(1);
    });

    it('returns NONE when consuming EMPTY, WALL, or other non-collectible tiles without mutating', () => {
      const resultEmpty = manager.consumeAt(grid, new Vector2D(0, 1));
      expect(resultEmpty.type).toBe('NONE');
      expect(resultEmpty.points).toBe(0);
      expect(manager.getScore()).toBe(0);

      const resultWall = manager.consumeAt(grid, 0, 0);
      expect(resultWall.type).toBe('NONE');
      expect(grid.getTileAt(0, 0)).toBe(TileType.WALL);
      expect(manager.getScore()).toBe(0);
    });

    it('handles out of bounds coordinates safely by returning NONE', () => {
      const result = manager.consumeAt(grid, new Vector2D(99, 99));
      expect(result.type).toBe('NONE');
      expect(result.points).toBe(0);
    });

    it('triggers isLevelCleared in ConsumptionResult when last pellet is consumed', () => {
      manager.consumeAt(grid, 1, 0); // eat pellet (1 remaining)
      const finalResult = manager.consumeAt(grid, 2, 0); // eat energizer (0 remaining)

      expect(finalResult.isLevelCleared).toBe(true);
      expect(finalResult.remainingPellets).toBe(0);
      expect(manager.isLevelCleared()).toBe(true);
    });

    it('supports direct consumeTile(tileType) without a grid instance', () => {
      const customManager = new ScoreManager({ totalPellets: 2 });

      const pelletResult = customManager.consumeTile(TileType.PELLET);
      expect(pelletResult.type).toBe('PELLET');
      expect(pelletResult.points).toBe(10);
      expect(customManager.getScore()).toBe(10);

      const energizerResult = customManager.consumeTile(TileType.ENERGIZER);
      expect(energizerResult.type).toBe('ENERGIZER');
      expect(energizerResult.points).toBe(50);
      expect(energizerResult.isLevelCleared).toBe(true);
      expect(customManager.getScore()).toBe(60);

      const emptyResult = customManager.consumeTile(TileType.EMPTY);
      expect(emptyResult.type).toBe('NONE');
      expect(emptyResult.points).toBe(0);
    });
  });

  describe('Reset and Level Progression', () => {
    it('resets level pellets and ghost streak while retaining current and high score', () => {
      const manager = new ScoreManager({ totalPellets: 10, highScore: 500 });
      manager.eatPellet(); // 10
      manager.eatGhost(); // 200
      expect(manager.getScore()).toBe(210);
      expect(manager.getRemainingPellets()).toBe(9);
      expect(manager.getGhostStreak()).toBe(1);

      // Reset level for next stage (e.g. 10 new pellets)
      manager.resetLevel(10);

      expect(manager.getScore()).toBe(210);
      expect(manager.getHighScore()).toBe(500);
      expect(manager.getTotalPellets()).toBe(10);
      expect(manager.getRemainingPellets()).toBe(10);
      expect(manager.getPelletsEaten()).toBe(0);
      expect(manager.getGhostStreak()).toBe(0);
      expect(manager.isLevelCleared()).toBe(false);
    });

    it('resets level using a Grid instance for total pellets', () => {
      const grid = Grid.fromMatrix([[TileType.PELLET, TileType.PELLET, TileType.ENERGIZER]]);
      const manager = new ScoreManager({ initialScore: 100, totalPellets: 1 });
      manager.eatPellet();
      expect(manager.isLevelCleared()).toBe(true);

      manager.resetLevel(grid);
      expect(manager.getTotalPellets()).toBe(3);
      expect(manager.getRemainingPellets()).toBe(3);
      expect(manager.isLevelCleared()).toBe(false);
    });

    it('resets entire game state to initial values while preserving high score', () => {
      const manager = new ScoreManager({ totalPellets: 10, highScore: 100 });
      manager.addScore(300);
      manager.eatPellet();
      manager.eatGhost();
      expect(manager.getHighScore()).toBe(510);

      manager.resetGame({ totalPellets: 10 });

      expect(manager.getScore()).toBe(0);
      expect(manager.getHighScore()).toBe(510);
      expect(manager.getTotalPellets()).toBe(10);
      expect(manager.getRemainingPellets()).toBe(10);
      expect(manager.getPelletsEaten()).toBe(0);
      expect(manager.getGhostStreak()).toBe(0);
      expect(manager.hasAwardedExtraLife()).toBe(false);
    });
  });
});
