import { GhostState, GhostType } from '../ai';
import { Direction, type Grid, TileType, Vector2D } from '../core';

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
  public renderWalls(grid: Grid): void {
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
          ctx.fillStyle = this.theme.wallColor;
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
  public renderPellets(grid: Grid, energizerVisible: boolean = true): void {
    const ctx = this.context;
    if (!ctx) return;

    const effectiveTile = this.tileSize * this.scale;

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const tile = grid.getTileAt(col, row);
        if (!tile) continue;

        const centerX = col * effectiveTile + effectiveTile / 2;
        const centerY = row * effectiveTile + effectiveTile / 2;

        if (tile === TileType.PELLET) {
          const radius = Math.max(1, effectiveTile * 0.18);
          ctx.fillStyle = this.theme.pelletColor;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile === TileType.ENERGIZER && energizerVisible) {
          const radius = Math.max(2, effectiveTile * 0.42);
          ctx.fillStyle = this.theme.energizerColor;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
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

    if (state !== GhostState.EATEN) {
      const bodyColor = this.getGhostBodyColor(ghost, state, animationTick);
      this.renderGhostBody(ctx, centerX, centerY, radius, bodyColor, animationTick);
    }

    if (state === GhostState.FRIGHTENED) {
      this.renderFrightenedFace(ctx, centerX, centerY, radius);
    } else {
      this.renderGhostEyes(ctx, centerX, centerY, radius, ghost.direction);
    }
  }

  /**
   * Resolves ghost body color based on state, flash cycle, and ghost type.
   */
  private getGhostBodyColor(
    ghost: RenderableGhost,
    state: GhostState,
    animationTick: number,
  ): string {
    if (state === GhostState.FRIGHTENED) {
      if (ghost.isFlashing) {
        const flashCycle = Math.floor(animationTick * 8) % 2;
        return flashCycle === 0 ? this.theme.frightenedColor : this.theme.frightenedFlashColor;
      }
      return this.theme.frightenedColor;
    }

    switch (ghost.type) {
      case GhostType.PINKY:
        return this.theme.pinkyColor;
      case GhostType.INKY:
        return this.theme.inkyColor;
      case GhostType.CLYDE:
        return this.theme.clydeColor;
      default:
        return this.theme.blinkyColor;
    }
  }

  /**
   * Draws ghost dome head and animated wavy skirt tentacles.
   */
  private renderGhostBody(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    bodyColor: string,
    animationTick: number,
  ): void {
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    // Dome (top semicircle)
    ctx.arc(centerX, centerY, radius, Math.PI, 0, false);
    // Right vertical side
    ctx.lineTo(centerX + radius, centerY + radius);

    // Bottom animated wavy skirt
    const wavePhase = Math.sin(animationTick * 12);
    const skirtStep = (radius * 2) / 3;
    const waveOffset = wavePhase > 0 ? radius * 0.25 : 0;

    for (let i = 2; i >= 0; i--) {
      const segStartX = centerX - radius + (i + 1) * skirtStep;
      const segEndX = centerX - radius + i * skirtStep;
      const midX = (segStartX + segEndX) / 2;
      const peakY = centerY + radius - (i % 2 === 0 ? waveOffset : -waveOffset);
      ctx.quadraticCurveTo(midX, peakY, segEndX, centerY + radius);
    }

    // Left vertical side back to dome start
    ctx.lineTo(centerX - radius, centerY);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Draws frightened face dots (eyes).
   */
  private renderFrightenedFace(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
  ): void {
    const eyeRadius = Math.max(1, radius * 0.16);
    ctx.fillStyle = this.theme.frightenedFaceColor;

    // Left eye dot
    ctx.beginPath();
    ctx.arc(centerX - radius * 0.35, centerY - radius * 0.15, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    // Right eye dot
    ctx.beginPath();
    ctx.arc(centerX + radius * 0.35, centerY - radius * 0.15, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Draws normal or eaten ghost eyes with directional pupil displacement.
   */
  private renderGhostEyes(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    direction?: Direction,
  ): void {
    const scleraRadius = Math.max(1.5, radius * 0.28);
    const pupilRadius = Math.max(1, radius * 0.14);
    const eyeOffsetX = radius * 0.35;
    const eyeOffsetY = -radius * 0.15;
    const shift = radius * 0.14;

    let pupilDx = 0;
    let pupilDy = 0;

    switch (direction) {
      case Direction.UP:
        pupilDy = -shift;
        break;
      case Direction.DOWN:
        pupilDy = shift;
        break;
      case Direction.LEFT:
        pupilDx = -shift;
        break;
      case Direction.RIGHT:
        pupilDx = shift;
        break;
      default:
        break;
    }

    // Draw white scleras
    ctx.fillStyle = this.theme.eyeWhiteColor;

    ctx.beginPath();
    ctx.arc(centerX - eyeOffsetX, centerY + eyeOffsetY, scleraRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX + eyeOffsetX, centerY + eyeOffsetY, scleraRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw blue pupils
    ctx.fillStyle = this.theme.pupilColor;

    ctx.beginPath();
    ctx.arc(
      centerX - eyeOffsetX + pupilDx,
      centerY + eyeOffsetY + pupilDy,
      pupilRadius,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    ctx.beginPath();
    ctx.arc(
      centerX + eyeOffsetX + pupilDx,
      centerY + eyeOffsetY + pupilDy,
      pupilRadius,
      0,
      Math.PI * 2,
    );
    ctx.fill();
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
    }
  }

  /**
   * Unified composite render method drawing all visual game layers in correct z-order.
   */
  public render(state: RenderGameState): void {
    this.clear();
    this.renderWalls(state.grid);
    this.renderPellets(state.grid, state.energizerVisible ?? true);

    if (state.ghosts) {
      for (const ghost of state.ghosts) {
        this.renderGhost(ghost, state.animationTick ?? 0);
      }
    }

    this.renderPacman(state.pacman, state.animationTick ?? 0);

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
