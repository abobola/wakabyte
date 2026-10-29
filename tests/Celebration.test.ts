import { describe, expect, it } from 'vitest';
import { Celebration, DEFAULT_CELEBRATION_WALL_COLORS } from '../src/render';

function create(options: { wallColors?: string[]; wallColorTicks?: number } = {}) {
  return new Celebration({ width: 100, height: 100, ...options });
}

describe('Celebration', () => {
  it('is neutral until activated', () => {
    const celebration = create();
    celebration.update(false, 0.1);

    expect(celebration.isActive()).toBe(false);
    expect(celebration.getWallColor(0)).toBeUndefined();
    expect(celebration.getParticles()).toBeUndefined();
    expect(celebration.filterGhosts(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('launches fireworks, hides ghosts and flashes walls while active', () => {
    const celebration = create();
    celebration.update(true, 0.1);

    expect(celebration.isActive()).toBe(true);
    expect(celebration.getParticles()?.length).toBeGreaterThan(0);
    expect(celebration.filterGhosts(['a', 'b'])).toEqual([]);
    expect(celebration.getWallColor(0)).toBe(DEFAULT_CELEBRATION_WALL_COLORS[0]);
  });

  it('alternates wall colors every few ticks and wraps around', () => {
    const celebration = create({ wallColors: ['#111111', '#222222'], wallColorTicks: 3 });
    celebration.update(true, 0.1);

    expect(celebration.getWallColor(0)).toBe('#111111');
    expect(celebration.getWallColor(2)).toBe('#111111');
    expect(celebration.getWallColor(3)).toBe('#222222');
    expect(celebration.getWallColor(6)).toBe('#111111');
  });

  it('falls back to the default wall colors for an empty list', () => {
    const celebration = create({ wallColors: [] });
    celebration.update(true, 0.1);

    expect(celebration.getWallColor(0)).toBe(DEFAULT_CELEBRATION_WALL_COLORS[0]);
  });

  it('clears the fireworks when the celebration ends', () => {
    const celebration = create();
    celebration.update(true, 0.1);
    celebration.update(false, 0.1);

    expect(celebration.getParticles()).toBeUndefined();
    celebration.update(true, 0.016);
    expect(celebration.getParticles()?.length).toBeGreaterThan(0);
  });
});
