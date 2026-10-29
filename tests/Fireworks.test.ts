import { describe, expect, it } from 'vitest';
import { Fireworks } from '../src/render';

const createFireworks = (overrides = {}) =>
  new Fireworks({
    width: 200,
    height: 300,
    random: () => 0.5,
    particlesPerBurst: 10,
    ...overrides,
  });

describe('Fireworks', () => {
  it('starts with no particles', () => {
    expect(createFireworks().getParticles()).toHaveLength(0);
  });

  it('launches a burst on the first update', () => {
    const fireworks = createFireworks();
    fireworks.update(0.01);
    expect(fireworks.getParticles()).toHaveLength(10);
  });

  it('launches further bursts at the configured interval', () => {
    const fireworks = createFireworks({ burstIntervalSec: 0.5 });
    fireworks.update(0.01);
    fireworks.update(0.2);
    expect(fireworks.getParticles()).toHaveLength(10);
    fireworks.update(0.4);
    expect(fireworks.getParticles()).toHaveLength(20);
  });

  it('moves particles outward and pulls them down with gravity', () => {
    const fireworks = createFireworks({ gravity: 100, burstIntervalSec: 100 });
    fireworks.update(0.001);
    const before = fireworks.getParticles().map((p) => ({ x: p.x, y: p.y, vy: p.vy }));
    fireworks.update(0.1);
    const after = fireworks.getParticles();

    expect(after).toHaveLength(10);
    expect(after.some((p, i) => p.x !== before[i].x)).toBe(true);
    for (const [i, p] of after.entries()) {
      expect(p.vy).toBeCloseTo(before[i].vy + 10);
    }
  });

  it('removes particles once their lifetime is over', () => {
    const fireworks = createFireworks({ burstIntervalSec: 100 });
    fireworks.update(0.01);
    fireworks.update(5);
    expect(fireworks.getParticles()).toHaveLength(0);
  });

  it('ignores non-positive time steps', () => {
    const fireworks = createFireworks();
    fireworks.update(0);
    fireworks.update(-1);
    expect(fireworks.getParticles()).toHaveLength(0);
  });

  it('reset clears particles and launches a new burst on the next update', () => {
    const fireworks = createFireworks();
    fireworks.update(0.01);
    fireworks.reset();
    expect(fireworks.getParticles()).toHaveLength(0);
    fireworks.update(0.01);
    expect(fireworks.getParticles()).toHaveLength(10);
  });

  it('keeps bursts inside the playfield', () => {
    const fireworks = createFireworks({ random: () => 0.999 });
    fireworks.update(0.001);
    for (const p of fireworks.getParticles()) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(200 + 1);
    }
  });
});
