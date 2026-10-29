import type { CanvasSprites, CanvasTheme, GhostSpriteParams } from '../render';
import type { Edition } from './Edition';

/**
 * Halloween edition. Removing it = delete this file (and its test) plus the few
 * `halloween`/`edition` lines in `src/main.ts`.
 */

/** First day of the Halloween edition (local time, inclusive). */
export const HALLOWEEN_START = new Date(2026, 9, 24);
/** Last day of the Halloween edition (local time, inclusive): 5 November 2026. */
export const HALLOWEEN_END = new Date(2026, 10, 5);

/**
 * True while `now` falls between the start and end day, both inclusive.
 */
export function isHalloweenSeason(now: Date): boolean {
  const endExclusive = new Date(
    HALLOWEEN_END.getFullYear(),
    HALLOWEEN_END.getMonth(),
    HALLOWEEN_END.getDate() + 1,
  );
  return now.getTime() >= HALLOWEEN_START.getTime() && now.getTime() < endExclusive.getTime();
}

/**
 * Decides whether the edition is on. `?halloween=1` forces it on and `?halloween=0` forces
 * it off (handy for testing); otherwise it follows the date window.
 */
export function isHalloweenActive(now: Date, search = ''): boolean {
  const override = new URLSearchParams(search).get('halloween');
  if (override === '1') return true;
  if (override === '0') return false;
  return isHalloweenSeason(now);
}

const PUMPKIN_ORANGE = '#FF7518';
const PUMPKIN_RIB = '#D45500';
const PUMPKIN_FLASH = '#FFF3A0';
const PUMPKIN_FLASH_RIB = '#E6D98A';
const PUMPKIN_STEM = '#3FA34D';
const CARVING = '#2B0A00';
const BAT_WING = '#7A3EB1';
const BAT_BODY = '#4B1D73';
const BAT_EYE = '#FF3B30';

type Point = readonly [number, number];

function fillEllipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Fills a polygon whose points are expressed in units of `radius` around the center.
 */
function fillPolygon(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  points: readonly Point[],
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([px, py], index) => {
    const x = centerX + px * radius;
    const y = centerY + py * radius;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.closePath();
  ctx.fill();
}

const MIRRORED = [1, -1] as const;

/**
 * Frightened ghost drawn as a jack-o'-lantern. While flashing it alternates orange and pale yellow.
 */
export function drawPumpkinGhost(
  ctx: CanvasRenderingContext2D,
  { centerX, centerY, radius, animationTick, isFlashing }: GhostSpriteParams,
): void {
  const flashOn = isFlashing && Math.floor(animationTick * 8) % 2 === 1;
  const body = flashOn ? PUMPKIN_FLASH : PUMPKIN_ORANGE;
  const rib = flashOn ? PUMPKIN_FLASH_RIB : PUMPKIN_RIB;

  ctx.fillStyle = PUMPKIN_STEM;
  ctx.fillRect(centerX - radius * 0.12, centerY - radius * 1.05, radius * 0.24, radius * 0.35);

  fillEllipse(ctx, centerX, centerY + radius * 0.05, radius, radius * 0.85, rib);
  fillEllipse(ctx, centerX, centerY + radius * 0.05, radius * 0.62, radius * 0.9, body);

  for (const side of MIRRORED) {
    fillPolygon(
      ctx,
      centerX,
      centerY,
      radius,
      [
        [side * 0.55, -0.05],
        [side * 0.15, -0.05],
        [side * 0.35, -0.45],
      ],
      CARVING,
    );
  }

  fillPolygon(
    ctx,
    centerX,
    centerY,
    radius,
    [
      [0, 0.05],
      [-0.1, 0.25],
      [0.1, 0.25],
    ],
    CARVING,
  );

  fillPolygon(
    ctx,
    centerX,
    centerY,
    radius,
    [
      [-0.6, 0.35],
      [-0.3, 0.5],
      [-0.15, 0.35],
      [0.15, 0.5],
      [0.3, 0.35],
      [0.6, 0.35],
      [0.4, 0.7],
      [0, 0.55],
      [-0.4, 0.7],
    ],
    CARVING,
  );
}

/**
 * Eaten ghost drawn as a small flapping bat flying back to the ghost house.
 */
export function drawBatGhost(
  ctx: CanvasRenderingContext2D,
  { centerX, centerY, radius, animationTick }: GhostSpriteParams,
): void {
  const lift = Math.sin(animationTick * 20);

  for (const side of MIRRORED) {
    fillPolygon(
      ctx,
      centerX,
      centerY,
      radius,
      [
        [side * 0.15, -0.1],
        [side * 0.6, -0.45 - lift * 0.3],
        [side * 1.1, -0.6 - lift * 0.55],
        [side * 0.95, -0.1 - lift * 0.3],
        [side * 0.75, 0.15 - lift * 0.15],
        [side * 0.55, 0],
        [side * 0.4, 0.25],
      ],
      BAT_WING,
    );
  }

  for (const side of MIRRORED) {
    fillPolygon(
      ctx,
      centerX,
      centerY,
      radius,
      [
        [side * 0.25, -0.3],
        [side * 0.25, -0.7],
        [side * 0.05, -0.4],
      ],
      BAT_BODY,
    );
  }

  fillEllipse(ctx, centerX, centerY, radius * 0.3, radius * 0.42, BAT_BODY);

  ctx.fillStyle = BAT_EYE;
  for (const side of MIRRORED) {
    ctx.beginPath();
    ctx.arc(centerX + side * radius * 0.12, centerY - radius * 0.12, radius * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const HALLOWEEN_THEME: Partial<CanvasTheme> = {
  wallColor: '#6B2FBF',
  gateColor: PUMPKIN_ORANGE,
  pelletColor: '#FF9A3C',
  energizerColor: PUMPKIN_ORANGE,
  backgroundColor: '#0A0012',
  pupilColor: '#5A1E8C',
};

export const HALLOWEEN_SPRITES: CanvasSprites = {
  drawFrightenedGhost: drawPumpkinGhost,
  drawEatenGhost: drawBatGhost,
};

const HALLOWEEN_FIREWORK_COLORS = ['#FF7518', '#B455FF', '#7CFF3A', '#FFB347', '#FFFFFF'];

export const HALLOWEEN_EDITION: Edition = {
  name: 'halloween',
  theme: HALLOWEEN_THEME,
  sprites: HALLOWEEN_SPRITES,
  winText: 'HAPPY HALLOWEEN!',
  celebrationColors: HALLOWEEN_FIREWORK_COLORS,
  celebrationWallColors: ['#6B2FBF', PUMPKIN_ORANGE],
  fireworksColors: HALLOWEEN_FIREWORK_COLORS,
};
