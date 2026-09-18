import { describe, expect, it } from 'vitest';
import { Direction, Vector2D } from '../src/core';
import { getTileLane, resolveEntityPosition } from '../src/entities/movement';

describe('resolveEntityPosition', () => {
  const tileSize = 8;

  it('clones and returns explicit Vector2D position if provided', () => {
    const inputPos = new Vector2D(12.5, 45.25);
    const resolved = resolveEntityPosition({ position: inputPos }, tileSize);

    expect(resolved.equals(inputPos)).toBe(true);
    expect(resolved).not.toBe(inputPos); // should be a cloned instance
  });

  it('computes tile center when tile coordinate is provided', () => {
    const tile = new Vector2D(3, 5);
    const resolved = resolveEntityPosition({ tile }, tileSize);

    // Tile (3, 5) with tileSize 8 center is (3*8 + 4, 5*8 + 4) = (28, 44)
    expect(resolved.x).toBe(28);
    expect(resolved.y).toBe(44);
  });

  it('falls back to (0, 0) tile center when options or position/tile are omitted', () => {
    const resolvedEmpty = resolveEntityPosition({}, tileSize);
    expect(resolvedEmpty.x).toBe(4);
    expect(resolvedEmpty.y).toBe(4);

    const resolvedUndefined = resolveEntityPosition(undefined, tileSize);
    expect(resolvedUndefined.x).toBe(4);
    expect(resolvedUndefined.y).toBe(4);
  });

  it('uses custom defaultTile when options are omitted', () => {
    const defaultTile = new Vector2D(10, 20);
    const resolved = resolveEntityPosition(undefined, tileSize, defaultTile);

    expect(resolved.x).toBe(10 * 8 + 4);
    expect(resolved.y).toBe(20 * 8 + 4);
  });
});

describe('getTileLane', () => {
  const tileSize = 8;

  it('returns null for Direction.NONE', () => {
    const lane = getTileLane(new Vector2D(4, 4), Direction.NONE, new Vector2D(0, 0), tileSize);
    expect(lane).toBeNull();
  });

  describe('Horizontal movement (RIGHT / LEFT)', () => {
    it('calculates lane geometry when moving RIGHT before tile center', () => {
      // Tile (1, 2) center is (12, 20). Position at (10, 20) is before center.
      const pos = new Vector2D(10, 20);
      const tile = new Vector2D(1, 2);
      const lane = getTileLane(pos, Direction.RIGHT, tile, tileSize);

      expect(lane).not.toBeNull();
      expect(lane!.dirVec.equals(new Vector2D(1, 0))).toBe(true);
      expect(lane!.stepSign).toBe(1);
      expect(lane!.centerAxisPos).toBe(12);
      expect(lane!.isBeforeCenter).toBe(true);
      expect(lane!.distToCenter).toBeCloseTo(2);
      expect(lane!.distToWaypoint).toBeCloseTo(2);

      const advanced = lane!.advance(1.5);
      expect(advanced.x).toBeCloseTo(11.5);
      expect(advanced.y).toBeCloseTo(20);

      const atCenter = lane!.makePosition(12);
      expect(atCenter.x).toBe(12);
      expect(atCenter.y).toBe(20);
    });

    it('calculates lane geometry when moving RIGHT after tile center', () => {
      // Tile (1, 2) center is (12, 20). Position at (13, 20) is past center.
      const pos = new Vector2D(13, 20);
      const tile = new Vector2D(1, 2);
      const lane = getTileLane(pos, Direction.RIGHT, tile, tileSize);

      expect(lane).not.toBeNull();
      expect(lane!.isBeforeCenter).toBe(false);
      expect(lane!.distToCenter).toBeLessThan(0);
      // Next waypoint is at 12 + 8 = 20. Distance from 13 to 20 is 7.
      expect(lane!.distToWaypoint).toBeCloseTo(7);

      const advanced = lane!.advance(3);
      expect(advanced.x).toBeCloseTo(16);
      expect(advanced.y).toBeCloseTo(20);
    });

    it('calculates lane geometry when moving LEFT before tile center', () => {
      // Tile (2, 0) center is (20, 4). Moving LEFT, pos (22, 4) is before center.
      const pos = new Vector2D(22, 4);
      const tile = new Vector2D(2, 0);
      const lane = getTileLane(pos, Direction.LEFT, tile, tileSize);

      expect(lane).not.toBeNull();
      expect(lane!.stepSign).toBe(-1);
      expect(lane!.isBeforeCenter).toBe(true);
      expect(lane!.distToCenter).toBeCloseTo(2);
      expect(lane!.distToWaypoint).toBeCloseTo(2);

      const advanced = lane!.advance(2);
      expect(advanced.x).toBeCloseTo(20);
      expect(advanced.y).toBeCloseTo(4);
    });
  });

  describe('Vertical movement (UP / DOWN)', () => {
    it('calculates lane geometry when moving UP before tile center', () => {
      // Tile (0, 2) center is (4, 20). Moving UP, pos (4, 23) is before center.
      const pos = new Vector2D(4, 23);
      const tile = new Vector2D(0, 2);
      const lane = getTileLane(pos, Direction.UP, tile, tileSize);

      expect(lane).not.toBeNull();
      expect(lane!.stepSign).toBe(-1);
      expect(lane!.centerAxisPos).toBe(20);
      expect(lane!.isBeforeCenter).toBe(true);
      expect(lane!.distToCenter).toBeCloseTo(3);
      expect(lane!.distToWaypoint).toBeCloseTo(3);

      const advanced = lane!.advance(3);
      expect(advanced.x).toBeCloseTo(4);
      expect(advanced.y).toBeCloseTo(20);
    });

    it('calculates lane geometry when moving DOWN after tile center', () => {
      // Tile (0, 1) center is (4, 12). Moving DOWN, pos (4, 14) is past center.
      const pos = new Vector2D(4, 14);
      const tile = new Vector2D(0, 1);
      const lane = getTileLane(pos, Direction.DOWN, tile, tileSize);

      expect(lane).not.toBeNull();
      expect(lane!.stepSign).toBe(1);
      expect(lane!.centerAxisPos).toBe(12);
      expect(lane!.isBeforeCenter).toBe(false);
      // Next waypoint is at 12 + 8 = 20. Distance from 14 to 20 is 6.
      expect(lane!.distToWaypoint).toBeCloseTo(6);

      const advanced = lane!.advance(2);
      expect(advanced.x).toBeCloseTo(4);
      expect(advanced.y).toBeCloseTo(16);
    });
  });
});
