/**
 * A single spark of a firework burst, in game-pixel coordinates.
 */
export interface FireworkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  lifetime: number;
  color: string;
}

export interface FireworksOptions {
  /** Playfield width in game pixels. */
  width: number;
  /** Playfield height in game pixels. */
  height: number;
  colors?: string[];
  /** Seconds between automatic bursts. */
  burstIntervalSec?: number;
  particlesPerBurst?: number;
  /** Downward acceleration in game pixels per second squared. */
  gravity?: number;
  /** Random source returning values in [0, 1); injectable for deterministic tests. */
  random?: () => number;
}

const DEFAULT_COLORS = ['#FFFF00', '#FF0000', '#FFB8FF', '#00FFFF', '#FFB852', '#FFFFFF'];

/**
 * Headless firework particle simulation used for the win celebration.
 * Launches a burst right away, then keeps launching new ones at a fixed interval.
 */
export class Fireworks {
  private readonly width: number;
  private readonly height: number;
  private readonly colors: string[];
  private readonly burstIntervalSec: number;
  private readonly particlesPerBurst: number;
  private readonly gravity: number;
  private readonly random: () => number;

  private particles: FireworkParticle[] = [];
  private timeUntilNextBurst = 0;

  constructor(options: FireworksOptions) {
    this.width = options.width;
    this.height = options.height;
    this.colors = options.colors?.length ? options.colors : DEFAULT_COLORS;
    this.burstIntervalSec = options.burstIntervalSec ?? 0.45;
    this.particlesPerBurst = options.particlesPerBurst ?? 36;
    this.gravity = options.gravity ?? 60;
    this.random = options.random ?? Math.random;
  }

  public getParticles(): readonly FireworkParticle[] {
    return this.particles;
  }

  /**
   * Clears all sparks and schedules the next burst to happen on the next update.
   */
  public reset(): void {
    this.particles = [];
    this.timeUntilNextBurst = 0;
  }

  /**
   * Launches a burst of sparks at the given position.
   */
  public burst(x: number, y: number): void {
    const color = this.colors[Math.floor(this.random() * this.colors.length)];
    for (let i = 0; i < this.particlesPerBurst; i++) {
      const angle = (i / this.particlesPerBurst) * Math.PI * 2 + this.random() * 0.2;
      const speed = 30 + this.random() * 40;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        age: 0,
        lifetime: 0.8 + this.random() * 0.6,
        color,
      });
    }
  }

  /**
   * Advances the simulation: launches due bursts, moves sparks and drops the expired ones.
   */
  public update(deltaSeconds: number): void {
    if (deltaSeconds <= 0) return;

    this.timeUntilNextBurst -= deltaSeconds;
    if (this.timeUntilNextBurst <= 0) {
      this.burst(
        this.width * (0.15 + this.random() * 0.7),
        this.height * (0.1 + this.random() * 0.5),
      );
      this.timeUntilNextBurst = this.burstIntervalSec;
    }

    for (const particle of this.particles) {
      particle.age += deltaSeconds;
      particle.vy += this.gravity * deltaSeconds;
      particle.x += particle.vx * deltaSeconds;
      particle.y += particle.vy * deltaSeconds;
    }
    this.particles = this.particles.filter((particle) => particle.age < particle.lifetime);
  }
}
