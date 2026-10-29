import { GhostState, GhostType } from '../ai';
import { Direction } from '../core';
import type { CanvasTheme, RenderableGhost } from './CanvasRenderer';

/**
 * Resolves ghost body color based on state, flash cycle, and ghost type.
 */
export function getGhostBodyColor(
  theme: CanvasTheme,
  ghost: RenderableGhost,
  state: GhostState,
  animationTick: number,
): string {
  if (state === GhostState.FRIGHTENED) {
    if (ghost.isFlashing) {
      const flashCycle = Math.floor(animationTick * 8) % 2;
      return flashCycle === 0 ? theme.frightenedColor : theme.frightenedFlashColor;
    }
    return theme.frightenedColor;
  }

  switch (ghost.type) {
    case GhostType.PINKY:
      return theme.pinkyColor;
    case GhostType.INKY:
      return theme.inkyColor;
    case GhostType.CLYDE:
      return theme.clydeColor;
    default:
      return theme.blinkyColor;
  }
}

/**
 * Draws ghost dome head and animated wavy skirt tentacles.
 */
export function renderGhostBody(
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
export function renderFrightenedFace(
  ctx: CanvasRenderingContext2D,
  theme: CanvasTheme,
  centerX: number,
  centerY: number,
  radius: number,
): void {
  const eyeRadius = Math.max(1, radius * 0.16);
  ctx.fillStyle = theme.frightenedFaceColor;

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
export function renderGhostEyes(
  ctx: CanvasRenderingContext2D,
  theme: CanvasTheme,
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
  ctx.fillStyle = theme.eyeWhiteColor;

  ctx.beginPath();
  ctx.arc(centerX - eyeOffsetX, centerY + eyeOffsetY, scleraRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centerX + eyeOffsetX, centerY + eyeOffsetY, scleraRadius, 0, Math.PI * 2);
  ctx.fill();

  // Draw blue pupils
  ctx.fillStyle = theme.pupilColor;

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
