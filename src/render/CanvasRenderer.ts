import { GhostState, type GhostType } from '../ai';
import { Direction, type Grid, TileType, Vector2D } from '../core';
import type { FireworkParticle } from './Fireworks';
import {
  getGhostBodyColor,
  renderFrightenedFace,
  renderGhostBody,
  renderGhostEyes,
} from './ghostSprites';

/**
 * Visual styling theme for the arcade Canvas 2D renderer.
 */
export interface CanvasTheme {
  wallColor: string;
  wallBorderColor?: string;
  gateColor: string;
  pelletColor: string;
  energizerColor: string;
  pacmanColor: string;
  blinkyColor: string;
  pinkyColor: string;
  inkyColor: string;
  clydeColor: string;
  frightenedColor: string;
  frightenedFlashColor: string;
  frightenedFaceColor: string;
  eyeWhiteColor: string;
  pupilColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
}

/**
 * Authentic arcade default color palette.
 */
export const DEFAULT_CANVAS_THEME: CanvasTheme = {
  wallColor: '#2121DE',
  gateColor: '#FFB8FF',
  pelletColor: '#FFB8AE',
  energizerColor: '#FFB8AE',
  pacmanColor: '#FFFF00',
  blinkyColor: '#FF0000',
  pinkyColor: '#FFB8FF',
  inkyColor: '#00FFFF',
  clydeColor: '#FFB852',
  frightenedColor: '#2121DE',
  frightenedFlashColor: '#FFFFFF',
  frightenedFaceColor: '#FFB8AE',
  eyeWhiteColor: '#FFFFFF',
  pupilColor: '#2121DE',
  backgroundColor: '#000000',
  textColor: '#FFFFFF',
  fontFamily: 'monospace',
};

/**
 * Geometry and animation inputs handed to custom ghost sprite drawers.
 * The ghost occupies the square [centerX - radius, centerX + radius] x [centerY - radius, centerY + radius].
 */
export interface GhostSpriteParams {
  centerX: number;
  centerY: number;
  radius: number;
  animationTick: number;
  direction?: Direction;
  isFlashing: boolean;
}

export type GhostSpriteDrawer = (ctx: CanvasRenderingContext2D, params: GhostSpriteParams) => void;

/**
 * Geometry handed to custom pellet / energizer drawers.
 * `tileSize` is the on-screen tile edge in pixels; the item is centered in its tile.
 */
export interface TileSpriteParams {
  centerX: number;
  centerY: number;
  tileSize: number;
  animationTick: number;
}

export type TileSpriteDrawer = (ctx: CanvasRenderingContext2D, params: TileSpriteParams) => void;

/**
 * Optional sprite overrides (e.g. for seasonal editions).
 * Anything left undefined falls back to the default arcade sprite.
 */
export interface CanvasSprites {
  /** Replaces the whole frightened (blue) ghost: body and face. */
  drawFrightenedGhost?: GhostSpriteDrawer;
  /** Replaces the eyes of an eaten ghost returning to the ghost house. */
  drawEatenGhost?: GhostSpriteDrawer;
  /** Replaces the small round pellet. */
  drawPellet?: TileSpriteDrawer;
  /** Replaces the big flashing energizer. */
  drawEnergizer?: TileSpriteDrawer;
}

/**
 * Lightweight renderable representation of Pacman.
 */
export interface RenderablePacman {
  position: Vector2D;
  direction?: Direction;
  isMoving?: boolean;
  mouthAngle?: number;
  isDying?: boolean;
  deathProgress?: number;
}

/**
 * Lightweight renderable representation of a Ghost.
 */
export interface RenderableGhost {
  type?: GhostType | string;
  position: Vector2D;
  direction?: Direction;
  state?: GhostState;
  isFlashing?: boolean;
}

/**
 * Heads-Up Display (HUD) state.
 */
export interface RenderableHUD {
  score: number;
  highScore?: number;
  lives?: number;
  level?: number;
  statusText?: string;
  statusTextColor?: string;
  statusSubText?: string;
}

/**
 * Complete game frame state for batch rendering.
 */
export interface RenderGameState {
  grid: Grid;
  pacman: RenderablePacman;
  ghosts?: RenderableGhost[];
  hud?: RenderableHUD;
  energizerVisible?: boolean;
  animationTick?: number;
  /** Overrides the maze wall color, e.g. to flash the maze during the win celebration. */
  wallColor?: string;
  /** Firework sparks in game-pixel coordinates, drawn above the maze. */
  particles?: readonly FireworkParticle[];
}

/**
 * Options for configuring CanvasRenderer.
 */
export interface CanvasRendererOptions {
  context?: CanvasRenderingContext2D;
  canvas?: HTMLCanvasElement;
  tileSize?: number;
  scale?: number;
  theme?: Partial<CanvasTheme>;
  sprites?: CanvasSprites;
}

/**
 * HTML5 Canvas 2D Presentation Renderer for Wakabyte.
 * Renders deterministic grid tilemaps, animated Pacman & Ghost sprites,
 * sub-pixel interpolated positions, and arcade HUD.
 */
export class CanvasRenderer {
  private context: CanvasRenderingContext2D | null;
  private tileSize: number;
  private scale: number;
  private readonly theme: CanvasTheme;
  private readonly sprites: CanvasSprites;

  constructor(options: CanvasRendererOptions = {}) {
    if (options.context) {
      this.context = options.context;
    } else if (options.canvas && typeof options.canvas.getContext === 'function') {
      this.context = options.canvas.getContext('2d');
    } else {
      this.context = null;
    }

    this.tileSize = options.tileSize ?? 8;
    this.scale = options.scale ?? 1;
    this.theme = {
      ...DEFAULT_CANVAS_THEME,
      ...options.theme,
    };
    this.sprites = options.sprites ?? {};
  }

  /**
   * Returns active 2D rendering context.
   */
  public getContext(): CanvasRenderingContext2D | null {
    return this.context;
  }

  /**
   * Sets active 2D rendering context.
   */
  public setContext(context: CanvasRenderingContext2D): void {
    this.context = context;
  }

  /**
   * Returns base tile size in pixels (before scale).
   */
  public getTileSize(): number {
    return this.tileSize;
  }

  /**
   * Sets base tile size in pixels.
   */
  public setTileSize(tileSize: number): void {
    if (tileSize <= 0) {
      throw new Error('Tile size must be greater than zero');
    }
    this.tileSize = tileSize;
  }

  /**
   * Returns current render scale multiplier.
   */
  public getScale(): number {
    return this.scale;
  }

  /**
   * Sets render scale multiplier.
   */
  public setScale(scale: number): void {
    if (scale <= 0) {
      throw new Error('Scale must be greater than zero');
    }
    this.scale = scale;
  }

  /**
   * Returns active theme.
   */
  public getTheme(): CanvasTheme {
    return { ...this.theme };
  }

  /**
   * Clears canvas with background color.
   */
  public clear(): void {
    const ctx = this.context;
    if (!ctx) return;

    const width = ctx.canvas?.width ?? 224 * this.scale;
    const height = ctx.canvas?.height ?? 288 * this.scale;

    ctx.fillStyle = this.theme.backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  /**
   * Renders walls and gate barriers across the grid.
   */
  public renderWalls(grid: Grid, wallColor: string = this.theme.wallColor): void {
    const ctx = this.context;
    if (!ctx) return;

    const effectiveTile = this.tileSize * this.scale;

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const tile = grid.getTileAt(col, row);
        if (!tile) continue;

        const x = col * effectiveTile;
        const y = row * effectiveTile;

        if (tile === TileType.WALL) {
          ctx.fillStyle = wallColor;
          ctx.fillRect(x, y, effectiveTile, effectiveTile);
        } else if (tile === TileType.GATE) {
          ctx.fillStyle = this.theme.gateColor;
          const gateHeight = Math.max(1, Math.floor(effectiveTile * 0.35));
          const gateY = y + Math.floor((effectiveTile - gateHeight) / 2);
          ctx.fillRect(x, gateY, effectiveTile, gateHeight);
        }
      }
    }
  }

  /**
   * Renders normal pellets and flashing energizers across the grid.
   */
  public renderPellets(
    grid: Grid,
    energizerVisible: boolean = true,
    animationTick: number = 0,
  ): void {
    const ctx = this.context;
    if (!ctx) return;

    const effectiveTile = this.tileSize * this.scale;

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const tile = grid.getTileAt(col, row);
        if (!tile) continue;

        const centerX = col * effectiveTile + effectiveTile / 2;
        const centerY = row * effectiveTile + effectiveTile / 2;

        const spot = { centerX, centerY, tileSize: effectiveTile, animationTick };
        if (tile === TileType.PELLET) {
          this.renderPellet(ctx, spot);
        } else if (tile === TileType.ENERGIZER && energizerVisible) {
          this.renderEnergizer(ctx, spot);
        }
      }
    }
  }

  private renderPellet(ctx: CanvasRenderingContext2D, spot: TileSpriteParams): void {
    if (this.sprites.drawPellet) {
      this.sprites.drawPellet(ctx, spot);
      return;
    }
    ctx.fillStyle = this.theme.pelletColor;
    ctx.beginPath();
    ctx.arc(spot.centerX, spot.centerY, Math.max(1, spot.tileSize * 0.18), 0, Math.PI * 2);
    ctx.fill();
  }

  private renderEnergizer(ctx: CanvasRenderingContext2D, spot: TileSpriteParams): void {
    if (this.sprites.drawEnergizer) {
      this.sprites.drawEnergizer(ctx, spot);
      return;
    }
    ctx.fillStyle = this.theme.energizerColor;
    ctx.beginPath();
    ctx.arc(spot.centerX, spot.centerY, Math.max(2, spot.tileSize * 0.42), 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Renders complete grid (walls, gate, pellets, energizers).
   */
  public renderGrid(grid: Grid, options?: { energizerVisible?: boolean }): void {
    this.renderWalls(grid);
    this.renderPellets(grid, options?.energizerVisible ?? true);
  }

  /**
   * Renders Pacman player sprite with directional mouth orientation and chomp/death animation.
   */
  public renderPacman(pacman: RenderablePacman, animationTick: number = 0): void {
    const ctx = this.context;
    if (!ctx) return;

    const centerX = pacman.position.x * this.scale;
    const centerY = pacman.position.y * this.scale;
    const radius = Math.max(2, this.tileSize * 0.8 * this.scale);

    let baseAngle: number;
    switch (pacman.direction) {
      case Direction.DOWN:
        baseAngle = Math.PI / 2;
        break;
      case Direction.LEFT:
        baseAngle = Math.PI;
        break;
      case Direction.UP:
        baseAngle = (3 * Math.PI) / 2;
        break;
      default:
        baseAngle = 0;
        break;
    }

    let mouthWedge = 0.05 * Math.PI;

    if (pacman.isDying) {
      const progress = Math.min(1, Math.max(0, pacman.deathProgress ?? 0));
      mouthWedge = 0.05 * Math.PI + progress * 0.95 * Math.PI;
    } else if (pacman.mouthAngle !== undefined) {
      mouthWedge = pacman.mouthAngle;
    } else if (pacman.isMoving !== false) {
      // Oscillate mouth between closed (0.05 * PI) and wide open (0.32 * PI)
      const chomp = Math.abs(Math.sin(animationTick * 16));
      mouthWedge = 0.05 * Math.PI + chomp * 0.27 * Math.PI;
    }

    const startAngle = baseAngle + mouthWedge;
    const endAngle = baseAngle + 2 * Math.PI - mouthWedge;

    ctx.fillStyle = this.theme.pacmanColor;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle, false);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Renders an individual ghost sprite with dome head, wavy skirt tentacles, and directional eyes.
   */
  public renderGhost(ghost: RenderableGhost, animationTick: number = 0): void {
    const ctx = this.context;
    if (!ctx) return;

    const centerX = ghost.position.x * this.scale;
    const centerY = ghost.position.y * this.scale;
    const radius = Math.max(2, this.tileSize * 0.85 * this.scale);
    const state = ghost.state ?? GhostState.CHASE;

    const spriteDrawer = this.getGhostSpriteOverride(state);
    if (spriteDrawer) {
      spriteDrawer(ctx, {
        centerX,
        centerY,
        radius,
        animationTick,
        direction: ghost.direction,
        isFlashing: ghost.isFlashing ?? false,
      });
      return;
    }

    if (state !== GhostState.EATEN) {
      const bodyColor = getGhostBodyColor(this.theme, ghost, state, animationTick);
      renderGhostBody(ctx, centerX, centerY, radius, bodyColor, animationTick);
    }

    if (state === GhostState.FRIGHTENED) {
      renderFrightenedFace(ctx, this.theme, centerX, centerY, radius);
    } else {
      renderGhostEyes(ctx, this.theme, centerX, centerY, radius, ghost.direction);
    }
  }

  /**
   * Returns the custom sprite drawer for a ghost state, if one is configured.
   */
  private getGhostSpriteOverride(state: GhostState): GhostSpriteDrawer | undefined {
    if (state === GhostState.FRIGHTENED) return this.sprites.drawFrightenedGhost;
    if (state === GhostState.EATEN) return this.sprites.drawEatenGhost;
    return undefined;
  }

  /**
   * Renders arcade Head-Up Display (Score, High Score, Lives icons, Status text).
   */
  public renderHUD(hud: RenderableHUD): void {
    const ctx = this.context;
    if (!ctx) return;

    const effectiveTile = this.tileSize * this.scale;
    const fontSize = Math.max(8, Math.floor(effectiveTile * 0.95));

    ctx.font = `${fontSize}px ${this.theme.fontFamily}`;
    ctx.textBaseline = 'top';

    // 1UP header and score
    ctx.fillStyle = this.theme.textColor;
    ctx.textAlign = 'left';
    ctx.fillText('1UP', 3 * effectiveTile, effectiveTile);
    ctx.fillText(hud.score.toString(), 3 * effectiveTile, 2 * effectiveTile);

    // HIGH SCORE header and value
    ctx.fillText('HIGH SCORE', 10 * effectiveTile, effectiveTile);
    const highScore = hud.highScore ?? 0;
    ctx.fillText(highScore.toString(), 10 * effectiveTile, 2 * effectiveTile);

    // Remaining lives (rendered as mini-Pacman icons at bottom)
    const lives = hud.lives ?? 0;
    const livesRadius = Math.max(2, effectiveTile * 0.65);
    const livesY = 34.5 * effectiveTile;

    ctx.fillStyle = this.theme.pacmanColor;
    for (let i = 0; i < Math.min(lives, 5); i++) {
      const livesX = (2 + i * 2) * effectiveTile + effectiveTile / 2;
      const baseAngle = Math.PI; // Facing left
      const mouthWedge = 0.25 * Math.PI;

      ctx.beginPath();
      ctx.moveTo(livesX, livesY);
      ctx.arc(
        livesX,
        livesY,
        livesRadius,
        baseAngle + mouthWedge,
        baseAngle + 2 * Math.PI - mouthWedge,
        false,
      );
      ctx.closePath();
      ctx.fill();
    }

    // Status text overlay (e.g. "READY!", "GAME OVER", "PAUSED")
    if (hud.statusText) {
      const canvasWidth = ctx.canvas?.width ?? 28 * effectiveTile;
      ctx.fillStyle =
        hud.statusTextColor ??
        (hud.statusText === 'GAME OVER' ? this.theme.blinkyColor : this.theme.pacmanColor);
      ctx.textAlign = 'center';
      ctx.fillText(hud.statusText, canvasWidth / 2, 20 * effectiveTile);

      if (hud.statusSubText) {
        ctx.fillStyle = this.theme.textColor;
        ctx.fillText(hud.statusSubText, canvasWidth / 2, 22 * effectiveTile);
      }
    }
  }

  /**
   * Renders firework sparks, fading out as they approach the end of their lifetime.
   */
  public renderParticles(particles: readonly FireworkParticle[]): void {
    const ctx = this.context;
    if (!ctx) return;

    const size = Math.max(1, this.scale * 1.5);
    for (const particle of particles) {
      ctx.globalAlpha = Math.max(0, 1 - particle.age / particle.lifetime);
      ctx.fillStyle = particle.color;
      ctx.fillRect(
        particle.x * this.scale - size / 2,
        particle.y * this.scale - size / 2,
        size,
        size,
      );
    }
    ctx.globalAlpha = 1;
  }

  /**
   * Unified composite render method drawing all visual game layers in correct z-order.
   */
  public render(state: RenderGameState): void {
    this.clear();
    this.renderWalls(state.grid, state.wallColor);
    this.renderPellets(state.grid, state.energizerVisible ?? true, state.animationTick ?? 0);

    if (state.ghosts) {
      for (const ghost of state.ghosts) {
        this.renderGhost(ghost, state.animationTick ?? 0);
      }
    }

    this.renderPacman(state.pacman, state.animationTick ?? 0);

    if (state.particles) {
      this.renderParticles(state.particles);
    }

    if (state.hud) {
      this.renderHUD(state.hud);
    }
  }

  /**
   * Interpolates a single 1D coordinate with optional toroidal wrap-around.
   */
  private static interpolateAxis(
    prev: number,
    curr: number,
    alpha: number,
    bound?: number,
  ): number {
    let delta = curr - prev;

    if (bound && bound > 0) {
      if (Math.abs(delta) > bound / 2) {
        delta -= Math.sign(delta) * bound;
      }
      const wrapped = (((prev + delta * alpha) % bound) + bound) % bound;
      return wrapped === 0 ? 0 : wrapped;
    }

    return prev + delta * alpha;
  }

  /**
   * Deterministic sub-pixel position interpolation utility.
   * Smoothly interpolates between previous and current positions, handling screen-edge tunnel wrap-around.
   */
  public static interpolatePosition(
    prev: Vector2D,
    curr: Vector2D,
    alpha: number,
    grid?: Grid,
    tileSize?: number,
  ): Vector2D {
    const clampedAlpha = Math.max(0, Math.min(1, alpha));
    const hasBounds = Boolean(grid && tileSize && tileSize > 0);
    const pixelWidth = hasBounds && grid && tileSize ? grid.width * tileSize : undefined;
    const pixelHeight = hasBounds && grid && tileSize ? grid.height * tileSize : undefined;

    return new Vector2D(
      CanvasRenderer.interpolateAxis(prev.x, curr.x, clampedAlpha, pixelWidth),
      CanvasRenderer.interpolateAxis(prev.y, curr.y, clampedAlpha, pixelHeight),
    );
  }
}
