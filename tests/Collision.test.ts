import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  Vector2D,
  ScoreManager,
  Grid,
  checkProximity,
  CollisionType,
  CollisionManager,
  DEFAULT_COLLISION_DISTANCE,
  DEFAULT_INITIAL_LIVES,
  type GhostEntity,
  type PacmanEntity,
} from '../src/core';
import { GhostFSM, GhostState } from '../src/ai';
import { Pacman } from '../src/entities';

describe('Entity Collision System (Phase 5.2)', () => {
  describe('checkProximity Math Utility', () => {
    it('returns true when positions are identical (distance = 0)', () => {
      const posA = new Vector2D(32, 48);
      const posB = new Vector2D(32, 48);

      expect(checkProximity(posA, posB)).toBe(true);
    });

    it('returns true when distance is strictly within default collision threshold (4px)', () => {
      const posA = new Vector2D(32, 48);
      const posB = new Vector2D(34, 48); // 2px distance

      expect(checkProximity(posA, posB)).toBe(true);
    });

    it('returns true at exact boundary threshold', () => {
      const posA = new Vector2D(32, 48);
      const posB = new Vector2D(36, 48); // exactly 4px distance

      expect(checkProximity(posA, posB, DEFAULT_COLLISION_DISTANCE)).toBe(true);
    });

    it('returns false when distance exceeds collision threshold', () => {
      const posA = new Vector2D(32, 48);
      const posB = new Vector2D(36.1, 48); // > 4px distance

      expect(checkProximity(posA, posB, DEFAULT_COLLISION_DISTANCE)).toBe(false);
    });

    it('supports custom collision distance thresholds', () => {
      const posA = new Vector2D(10, 10);
      const posB = new Vector2D(16, 10); // 6px distance

      expect(checkProximity(posA, posB, 5)).toBe(false);
      expect(checkProximity(posA, posB, 6)).toBe(true);
      expect(checkProximity(posA, posB, 8)).toBe(true);
    });

    it('handles diagonal euclidean proximity accurately', () => {
      const posA = new Vector2D(0, 0);
      const posB = new Vector2D(3, 4); // Euclidean distance = 5

      expect(checkProximity(posA, posB, 4.9)).toBe(false);
      expect(checkProximity(posA, posB, 5.0)).toBe(true);
    });
  });

  describe('CollisionManager - Life Tracking & Game State', () => {
    let scoreManager: ScoreManager;
    let collisionManager: CollisionManager;

    beforeEach(() => {
      scoreManager = new ScoreManager();
      collisionManager = new CollisionManager({ scoreManager });
    });

    it('initializes with default 3 lives', () => {
      expect(collisionManager.getLives()).toBe(DEFAULT_INITIAL_LIVES);
      expect(collisionManager.getLives()).toBe(3);
      expect(collisionManager.isGameOver()).toBe(false);
    });

    it('allows configuring custom initial lives', () => {
      const custom = new CollisionManager({ initialLives: 5 });
      expect(custom.getLives()).toBe(5);
      expect(custom.isGameOver()).toBe(false);
    });

    it('decrements lives on loseLife and reports game over when lives reach 0', () => {
      expect(collisionManager.loseLife()).toBe(2);
      expect(collisionManager.getLives()).toBe(2);
      expect(collisionManager.isGameOver()).toBe(false);

      expect(collisionManager.loseLife()).toBe(1);
      expect(collisionManager.getLives()).toBe(1);
      expect(collisionManager.isGameOver()).toBe(false);

      expect(collisionManager.loseLife()).toBe(0);
      expect(collisionManager.getLives()).toBe(0);
      expect(collisionManager.isGameOver()).toBe(true);
    });

    it('does not allow lives to become negative', () => {
      collisionManager.setLives(0);
      expect(collisionManager.loseLife()).toBe(0);
      expect(collisionManager.getLives()).toBe(0);
      expect(collisionManager.isGameOver()).toBe(true);
    });

    it('allows incrementing lives via addLife (e.g. extra life milestone)', () => {
      expect(collisionManager.addLife()).toBe(4);
      expect(collisionManager.getLives()).toBe(4);
    });

    it('resets lives to default or specified count', () => {
      collisionManager.loseLife();
      collisionManager.loseLife();
      expect(collisionManager.getLives()).toBe(1);

      collisionManager.resetLives();
      expect(collisionManager.getLives()).toBe(3);

      collisionManager.resetLives(5);
      expect(collisionManager.getLives()).toBe(5);
    });
  });

  describe('CollisionManager - Entity Collisions', () => {
    let scoreManager: ScoreManager;
    let collisionManager: CollisionManager;

    const createMockGhost = (
      position: Vector2D,
      state: GhostState,
      spawnPosition: Vector2D = position.clone()
    ): GhostEntity => {
      let currentPos = position.clone();
      let currentState = state;
      return {
        getPosition: () => currentPos,
        getState: () => currentState,
        eat: vi.fn(() => {
          currentState = GhostState.EATEN;
        }),
        reset: vi.fn((pos?: Vector2D) => {
          currentPos = (pos ?? spawnPosition).clone();
        }),
      };
    };

    const createMockPacman = (
      position: Vector2D,
      spawnPosition: Vector2D = position.clone()
    ): PacmanEntity => {
      let currentPos = position.clone();
      return {
        getPosition: () => currentPos,
        reset: vi.fn((pos?: Vector2D) => {
          currentPos = (pos ?? spawnPosition).clone();
        }),
      };
    };

    beforeEach(() => {
      scoreManager = new ScoreManager();
      collisionManager = new CollisionManager({ scoreManager });
    });

    describe('Normal Ghost State Collision (SCATTER / CHASE)', () => {
      it('triggers PACMAN_DEATH, decrements life, and resets entities when colliding in SCATTER state', () => {
        const pacmanSpawn = new Vector2D(100, 100);
        const ghostSpawn = new Vector2D(200, 200);

        const pacman = createMockPacman(new Vector2D(100, 100), pacmanSpawn);
        const ghost = createMockGhost(new Vector2D(102, 100), GhostState.SCATTER, ghostSpawn);

        const onDeath = vi.fn();
        collisionManager = new CollisionManager({ scoreManager, onPacmanDeath: onDeath });

        const result = collisionManager.checkCollision(pacman, ghost);

        expect(result.type).toBe(CollisionType.PACMAN_DEATH);
        expect(result.pointsAwarded).toBe(0);
        expect(result.remainingLives).toBe(2);
        expect(result.isGameOver).toBe(false);
        expect(result.entitiesReset).toBe(true);

        // Verify entities were reset
        expect(pacman.reset).toHaveBeenCalled();
        expect(ghost.reset).toHaveBeenCalled();
        expect(onDeath).toHaveBeenCalledWith(2, false);
      });

      it('triggers PACMAN_DEATH and decrements life when colliding in CHASE state', () => {
        const pacman = createMockPacman(new Vector2D(50, 50));
        const ghost = createMockGhost(new Vector2D(52, 51), GhostState.CHASE);

        const result = collisionManager.checkCollision(pacman, ghost);

        expect(result.type).toBe(CollisionType.PACMAN_DEATH);
        expect(result.remainingLives).toBe(2);
        expect(result.isGameOver).toBe(false);
      });

      it('triggers Game Over and calls onGameOver when last life is lost', () => {
        const onGameOver = vi.fn();
        const onDeath = vi.fn();
        collisionManager = new CollisionManager({
          scoreManager,
          initialLives: 1,
          onPacmanDeath: onDeath,
          onGameOver,
        });

        const pacman = createMockPacman(new Vector2D(50, 50));
        const ghost = createMockGhost(new Vector2D(50, 50), GhostState.CHASE);

        const result = collisionManager.checkCollision(pacman, ghost);

        expect(result.type).toBe(CollisionType.PACMAN_DEATH);
        expect(result.remainingLives).toBe(0);
        expect(result.isGameOver).toBe(true);
        expect(onDeath).toHaveBeenCalledWith(0, true);
        expect(onGameOver).toHaveBeenCalled();
      });
    });

    describe('Frightened Ghost State Collision (FRIGHTENED)', () => {
      it('eats ghost, awards 200 points for first ghost, and transitions ghost to EATEN state', () => {
        const onGhostEaten = vi.fn();
        collisionManager = new CollisionManager({ scoreManager, onGhostEaten });

        const pacman = createMockPacman(new Vector2D(80, 80));
        const ghost = createMockGhost(new Vector2D(82, 80), GhostState.FRIGHTENED);

        const result = collisionManager.checkCollision(pacman, ghost);

        expect(result.type).toBe(CollisionType.GHOST_EATEN);
        expect(result.pointsAwarded).toBe(200);
        expect(scoreManager.getScore()).toBe(200);
        expect(ghost.eat).toHaveBeenCalled();
        expect(result.remainingLives).toBe(3);
        expect(result.isGameOver).toBe(false);
        expect(result.entitiesReset).toBe(false);
        expect(pacman.reset).not.toHaveBeenCalled();
        expect(onGhostEaten).toHaveBeenCalledWith(ghost, 200);
      });

      it('awards consecutive multiplier streak points for eating multiple frightened ghosts (200 -> 400 -> 800 -> 1600)', () => {
        const pacman = createMockPacman(new Vector2D(80, 80));
        const ghost1 = createMockGhost(new Vector2D(80, 80), GhostState.FRIGHTENED);
        const ghost2 = createMockGhost(new Vector2D(80, 80), GhostState.FRIGHTENED);
        const ghost3 = createMockGhost(new Vector2D(80, 80), GhostState.FRIGHTENED);
        const ghost4 = createMockGhost(new Vector2D(80, 80), GhostState.FRIGHTENED);

        const res1 = collisionManager.checkCollision(pacman, ghost1);
        expect(res1.type).toBe(CollisionType.GHOST_EATEN);
        expect(res1.pointsAwarded).toBe(200);

        const res2 = collisionManager.checkCollision(pacman, ghost2);
        expect(res2.type).toBe(CollisionType.GHOST_EATEN);
        expect(res2.pointsAwarded).toBe(400);

        const res3 = collisionManager.checkCollision(pacman, ghost3);
        expect(res3.type).toBe(CollisionType.GHOST_EATEN);
        expect(res3.pointsAwarded).toBe(800);

        const res4 = collisionManager.checkCollision(pacman, ghost4);
        expect(res4.type).toBe(CollisionType.GHOST_EATEN);
        expect(res4.pointsAwarded).toBe(1600);

        expect(scoreManager.getScore()).toBe(200 + 400 + 800 + 1600);
      });
    });

    describe('Eaten Ghost State Collision (EATEN)', () => {
      it('has no effect when colliding with an already eaten ghost (eyes returning)', () => {
        const pacman = createMockPacman(new Vector2D(80, 80));
        const ghost = createMockGhost(new Vector2D(80, 80), GhostState.EATEN);

        const result = collisionManager.checkCollision(pacman, ghost);

        expect(result.type).toBe(CollisionType.NONE);
        expect(result.pointsAwarded).toBe(0);
        expect(result.remainingLives).toBe(3);
        expect(result.isGameOver).toBe(false);
        expect(result.entitiesReset).toBe(false);
        expect(pacman.reset).not.toHaveBeenCalled();
        expect(ghost.eat).not.toHaveBeenCalled();
      });
    });

    describe('Distant Entities (No Proximity)', () => {
      it('returns CollisionType.NONE when distance is beyond collision threshold', () => {
        const pacman = createMockPacman(new Vector2D(20, 20));
        const ghost = createMockGhost(new Vector2D(100, 100), GhostState.CHASE);

        const result = collisionManager.checkCollision(pacman, ghost);

        expect(result.type).toBe(CollisionType.NONE);
        expect(result.pointsAwarded).toBe(0);
        expect(result.remainingLives).toBe(3);
        expect(result.entitiesReset).toBe(false);
      });
    });

    describe('resolveCollisions Multi-Ghost Batch Processing', () => {
      it('evaluates all ghosts and resolves interactions in priority order', () => {
        const pacman = createMockPacman(new Vector2D(50, 50));
        const farGhost = createMockGhost(new Vector2D(200, 200), GhostState.CHASE);
        const frightenedGhost = createMockGhost(new Vector2D(52, 50), GhostState.FRIGHTENED);

        const results = collisionManager.resolveCollisions(pacman, [farGhost, frightenedGhost]);

        expect(results.length).toBe(2);
        expect(results[0].type).toBe(CollisionType.NONE);
        expect(results[1].type).toBe(CollisionType.GHOST_EATEN);
        expect(results[1].pointsAwarded).toBe(200);
      });

      it('stops and resets all ghosts when a deadly collision occurs in batch', () => {
        const pacman = createMockPacman(new Vector2D(50, 50));
        const chaseGhost = createMockGhost(new Vector2D(51, 50), GhostState.CHASE);
        const otherGhost = createMockGhost(new Vector2D(150, 150), GhostState.SCATTER);

        const results = collisionManager.resolveCollisions(pacman, [chaseGhost, otherGhost]);

        expect(results[0].type).toBe(CollisionType.PACMAN_DEATH);
        expect(pacman.reset).toHaveBeenCalled();
        expect(chaseGhost.reset).toHaveBeenCalled();
        expect(otherGhost.reset).toHaveBeenCalled();
      });
    });
  });

  describe('Integration with Concrete Pacman and GhostFSM', () => {
    it('seamlessly integrates concrete Pacman entity and GhostFSM state machine', () => {
      const grid = Grid.fromStringArray([
        '.....',
        '.....',
        '.....',
      ]);

      const pacman = new Pacman({
        grid,
        tile: new Vector2D(1, 1),
      });

      const fsm = new GhostFSM();
      fsm.triggerFrightened(6);

      let ghostPos = Vector2D.tileCenter(1, 1, 8);
      const ghost: GhostEntity = {
        getPosition: () => ghostPos,
        getState: () => fsm.getState(),
        eat: () => fsm.eat(),
      };

      const scoreManager = new ScoreManager();
      const collisionManager = new CollisionManager({ scoreManager });

      expect(fsm.getState()).toBe(GhostState.FRIGHTENED);

      const result = collisionManager.checkCollision(pacman, ghost);

      expect(result.type).toBe(CollisionType.GHOST_EATEN);
      expect(result.pointsAwarded).toBe(200);
      expect(fsm.getState()).toBe(GhostState.EATEN);
      expect(scoreManager.getScore()).toBe(200);
    });
  });
});
