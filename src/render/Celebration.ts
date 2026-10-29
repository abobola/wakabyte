import { type FireworkParticle, Fireworks } from './Fireworks';

export interface CelebrationOptions {
  /** Playfield width in game pixels. */
  width: number;
  /** Playfield height in game pixels. */
  height: number;
  fireworksColors?: string[];
  /** Colors the maze walls alternate between while celebrating. */
  wallColors?: readonly string[];
  /** Animation ticks each wall color is held for. */
  wallColorTicks?: number;
}

export const DEFAULT_CELEBRATION_WALL_COLORS: readonly string[] = ['#2121DE', '#FFFFFF'];

/**
 * Owns the visual side of the win screen: fireworks, flashing walls and the ghosts leaving the stage.
 * Call `update` every frame; the other methods return the neutral (non-celebrating) values
 * until the celebration is active.
 */
export class Celebration {
  private readonly fireworks: Fireworks;
  private readonly wallColors: readonly string[];
  private readonly wallColorTicks: number;
  private active = false;

  constructor(options: CelebrationOptions) {
    this.fireworks = new Fireworks({
      width: options.width,
      height: options.height,
      colors: options.fireworksColors,
    });
    this.wallColors = options.wallColors?.length
      ? options.wallColors
      : DEFAULT_CELEBRATION_WALL_COLORS;
    this.wallColorTicks = options.wallColorTicks ?? 3;
  }

  public isActive(): boolean {
    return this.active;
  }

  /**
   * Advances the fireworks while celebrating; clears them as soon as the celebration ends.
   */
  public update(isActive: boolean, deltaSeconds: number): void {
    this.active = isActive;
    if (isActive) {
      this.fireworks.update(deltaSeconds);
    } else {
      this.fireworks.reset();
    }
  }

  /** Wall color override for the current animation tick, or undefined for the regular maze color. */
  public getWallColor(animationTick: number): string | undefined {
    if (!this.active) {
      return undefined;
    }
    const index = Math.floor(animationTick / this.wallColorTicks) % this.wallColors.length;
    return this.wallColors[index];
  }

  /** Firework sparks to draw, or undefined when not celebrating. */
  public getParticles(): readonly FireworkParticle[] | undefined {
    return this.active ? this.fireworks.getParticles() : undefined;
  }

  /** Ghosts that stay on stage: all of them normally, none while celebrating. */
  public filterGhosts<T>(ghosts: T[]): T[] {
    return this.active ? [] : ghosts;
  }
}
