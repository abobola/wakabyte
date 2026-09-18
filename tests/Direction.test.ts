import { describe, it, expect } from 'vitest';
import {
  Direction,
  getDirectionVector,
  getOppositeDirection,
  isOppositeDirection,
  isPerpendicularDirection,
  vectorToDirection,
  Vector2D,
} from '../src/core';

describe('Direction', () => {
  describe('enum values', () => {
    it('should define all cardinal directions and NONE', () => {
      expect(Direction.UP).toBe('UP');
      expect(Direction.DOWN).toBe('DOWN');
      expect(Direction.LEFT).toBe('LEFT');
      expect(Direction.RIGHT).toBe('RIGHT');
      expect(Direction.NONE).toBe('NONE');
    });
  });

  describe('getDirectionVector', () => {
    it('should return unit vectors matching standard 2D canvas coordinates (y-down)', () => {
      expect(getDirectionVector(Direction.UP).equals(new Vector2D(0, -1))).toBe(true);
      expect(getDirectionVector(Direction.DOWN).equals(new Vector2D(0, 1))).toBe(true);
      expect(getDirectionVector(Direction.LEFT).equals(new Vector2D(-1, 0))).toBe(true);
      expect(getDirectionVector(Direction.RIGHT).equals(new Vector2D(1, 0))).toBe(true);
      expect(getDirectionVector(Direction.NONE).equals(new Vector2D(0, 0))).toBe(true);
    });
  });

  describe('getOppositeDirection', () => {
    it('should return opposite cardinal direction', () => {
      expect(getOppositeDirection(Direction.UP)).toBe(Direction.DOWN);
      expect(getOppositeDirection(Direction.DOWN)).toBe(Direction.UP);
      expect(getOppositeDirection(Direction.LEFT)).toBe(Direction.RIGHT);
      expect(getOppositeDirection(Direction.RIGHT)).toBe(Direction.LEFT);
      expect(getOppositeDirection(Direction.NONE)).toBe(Direction.NONE);
    });
  });

  describe('isOppositeDirection', () => {
    it('should return true for opposing directions', () => {
      expect(isOppositeDirection(Direction.UP, Direction.DOWN)).toBe(true);
      expect(isOppositeDirection(Direction.DOWN, Direction.UP)).toBe(true);
      expect(isOppositeDirection(Direction.LEFT, Direction.RIGHT)).toBe(true);
      expect(isOppositeDirection(Direction.RIGHT, Direction.LEFT)).toBe(true);
    });

    it('should return false for non-opposing directions or NONE', () => {
      expect(isOppositeDirection(Direction.UP, Direction.LEFT)).toBe(false);
      expect(isOppositeDirection(Direction.UP, Direction.UP)).toBe(false);
      expect(isOppositeDirection(Direction.NONE, Direction.NONE)).toBe(false);
      expect(isOppositeDirection(Direction.UP, Direction.NONE)).toBe(false);
    });
  });

  describe('isPerpendicularDirection', () => {
    it('should identify perpendicular cardinal pairs', () => {
      expect(isPerpendicularDirection(Direction.UP, Direction.LEFT)).toBe(true);
      expect(isPerpendicularDirection(Direction.UP, Direction.RIGHT)).toBe(true);
      expect(isPerpendicularDirection(Direction.DOWN, Direction.LEFT)).toBe(true);
      expect(isPerpendicularDirection(Direction.DOWN, Direction.RIGHT)).toBe(true);

      expect(isPerpendicularDirection(Direction.LEFT, Direction.UP)).toBe(true);
      expect(isPerpendicularDirection(Direction.LEFT, Direction.DOWN)).toBe(true);
      expect(isPerpendicularDirection(Direction.RIGHT, Direction.UP)).toBe(true);
      expect(isPerpendicularDirection(Direction.RIGHT, Direction.DOWN)).toBe(true);
    });

    it('should return false for parallel, identical, or NONE directions', () => {
      expect(isPerpendicularDirection(Direction.UP, Direction.UP)).toBe(false);
      expect(isPerpendicularDirection(Direction.UP, Direction.DOWN)).toBe(false);
      expect(isPerpendicularDirection(Direction.LEFT, Direction.RIGHT)).toBe(false);
      expect(isPerpendicularDirection(Direction.NONE, Direction.UP)).toBe(false);
    });
  });

  describe('vectorToDirection', () => {
    it('should map unit vectors to corresponding Direction', () => {
      expect(vectorToDirection(new Vector2D(0, -1))).toBe(Direction.UP);
      expect(vectorToDirection(new Vector2D(0, 1))).toBe(Direction.DOWN);
      expect(vectorToDirection(new Vector2D(-1, 0))).toBe(Direction.LEFT);
      expect(vectorToDirection(new Vector2D(1, 0))).toBe(Direction.RIGHT);
      expect(vectorToDirection(new Vector2D(0, 0))).toBe(Direction.NONE);
    });

    it('should map scaled non-unit vectors based on dominant axis', () => {
      expect(vectorToDirection(new Vector2D(0, -5))).toBe(Direction.UP);
      expect(vectorToDirection(new Vector2D(0, 10))).toBe(Direction.DOWN);
      expect(vectorToDirection(new Vector2D(-3, 0))).toBe(Direction.LEFT);
      expect(vectorToDirection(new Vector2D(4, 0))).toBe(Direction.RIGHT);
    });
  });
});
