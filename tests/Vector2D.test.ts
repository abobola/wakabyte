import { describe, it, expect } from 'vitest';
import { Vector2D } from '../src/core/Vector2D';

describe('Vector2D', () => {
  describe('creation and basic properties', () => {
    it('should initialize with x and y values', () => {
      const vec = new Vector2D(10, 20);
      expect(vec.x).toBe(10);
      expect(vec.y).toBe(20);
    });

    it('should default to (0, 0) when no arguments provided', () => {
      const vec = new Vector2D();
      expect(vec.x).toBe(0);
      expect(vec.y).toBe(0);
    });

    it('should create zero vector via Vector2D.zero()', () => {
      const vec = Vector2D.zero();
      expect(vec.x).toBe(0);
      expect(vec.y).toBe(0);
    });
  });

  describe('immutability and cloning', () => {
    it('should clone into a distinct instance with identical values', () => {
      const original = new Vector2D(5, 7);
      const copy = original.clone();

      expect(copy).not.toBe(original);
      expect(copy.x).toBe(original.x);
      expect(copy.y).toBe(original.y);
      expect(copy.equals(original)).toBe(true);
    });

    it('should correctly test equality with equals()', () => {
      const v1 = new Vector2D(3, 4);
      const v2 = new Vector2D(3, 4);
      const v3 = new Vector2D(3, 5);

      expect(v1.equals(v2)).toBe(true);
      expect(v1.equals(v3)).toBe(false);
    });
  });

  describe('arithmetic operations', () => {
    it('should add two vectors without mutating the originals', () => {
      const v1 = new Vector2D(2, 3);
      const v2 = new Vector2D(4, 5);
      const result = v1.add(v2);

      expect(result.x).toBe(6);
      expect(result.y).toBe(8);
      expect(v1.x).toBe(2);
      expect(v1.y).toBe(3);
    });

    it('should subtract two vectors without mutating the originals', () => {
      const v1 = new Vector2D(10, 15);
      const v2 = new Vector2D(4, 5);
      const result = v1.subtract(v2);

      expect(result.x).toBe(6);
      expect(result.y).toBe(10);
    });

    it('should multiply by a scalar', () => {
      const vec = new Vector2D(3, -4);
      const result = vec.multiply(2.5);

      expect(result.x).toBe(7.5);
      expect(result.y).toBe(-10);
    });

    it('should divide by a scalar', () => {
      const vec = new Vector2D(8, 12);
      const result = vec.divide(4);

      expect(result.x).toBe(2);
      expect(result.y).toBe(3);
    });

    it('should throw error when dividing by zero', () => {
      const vec = new Vector2D(5, 5);
      expect(() => vec.divide(0)).toThrow('Division by zero');
    });
  });

  describe('distance calculations', () => {
    it('should calculate Manhattan distance correctly', () => {
      const v1 = new Vector2D(1, 2);
      const v2 = new Vector2D(4, 6);

      // |1 - 4| + |2 - 6| = 3 + 4 = 7
      expect(v1.manhattanDistanceTo(v2)).toBe(7);
      expect(v2.manhattanDistanceTo(v1)).toBe(7);
    });

    it('should calculate Euclidean distance correctly', () => {
      const v1 = new Vector2D(0, 0);
      const v2 = new Vector2D(3, 4);

      // sqrt(3^2 + 4^2) = 5
      expect(v1.euclideanDistanceTo(v2)).toBe(5);
    });

    it('should calculate Euclidean distance squared for fast comparisons', () => {
      const v1 = new Vector2D(1, 1);
      const v2 = new Vector2D(4, 5);

      // (4 - 1)^2 + (5 - 1)^2 = 3^2 + 4^2 = 25
      expect(v1.euclideanDistanceSquaredTo(v2)).toBe(25);
    });
  });

  describe('tile coordinate conversions', () => {
    it('should convert continuous pixel coordinates to discrete tile coordinates', () => {
      const pixelPos = new Vector2D(25, 42);
      const tileSize = 16;
      const tilePos = pixelPos.toTile(tileSize);

      expect(tilePos.x).toBe(1); // floor(25 / 16) = 1
      expect(tilePos.y).toBe(2); // floor(42 / 16) = 2
    });

    it('should create a continuous pixel coordinate from tile coordinate', () => {
      const tilePos = new Vector2D(3, 5);
      const tileSize = 16;
      const pixelPos = Vector2D.fromTile(tilePos.x, tilePos.y, tileSize);

      expect(pixelPos.x).toBe(48); // 3 * 16 = 48
      expect(pixelPos.y).toBe(80); // 5 * 16 = 80
    });

    it('should calculate the center point of a tile', () => {
      const tilePos = new Vector2D(2, 3);
      const tileSize = 16;
      const center = Vector2D.tileCenter(tilePos.x, tilePos.y, tileSize);

      expect(center.x).toBe(40); // 2 * 16 + 8 = 40
      expect(center.y).toBe(56); // 3 * 16 + 8 = 56
    });
  });
});
