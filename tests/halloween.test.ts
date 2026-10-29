import { describe, expect, it } from 'vitest';
import { GhostState } from '../src/ai';
import { Grid, Vector2D } from '../src/core';
import { CanvasRenderer, type CanvasSprites, type GhostSpriteParams } from '../src/render';
import {
  drawBatGhost,
  drawCandyEnergizer,
  drawPumpkinGhost,
  HALLOWEEN_EDITION,
  HALLOWEEN_PAGE_TITLE,
  HALLOWEEN_SOUND,
  isHalloweenActive,
  isHalloweenSeason,
} from '../src/themes';

interface Call {
  method: string;
  fillStyle: string;
}

/**
 * Permissive 2D context that records every method call together with the active fill color.
 */
function createRecordingContext(): { ctx: CanvasRenderingContext2D; calls: Call[] } {
  const calls: Call[] = [];
  const state: { fillStyle: string } = { fillStyle: '' };
  const ctx = new Proxy(state, {
    get(target, prop) {
      if (prop === 'fillStyle') return target.fillStyle;
      return (..._args: unknown[]) => {
        calls.push({ method: String(prop), fillStyle: target.fillStyle });
      };
    },
    set(target, prop, value) {
      if (prop === 'fillStyle') target.fillStyle = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

const params = (overrides: Partial<GhostSpriteParams> = {}): GhostSpriteParams => ({
  centerX: 50,
  centerY: 50,
  radius: 14,
  animationTick: 0,
  isFlashing: false,
  ...overrides,
});

describe('Halloween edition', () => {
  describe('date window', () => {
    it('is active from 24 Oct 2026 through the end of 5 Nov 2026', () => {
      expect(isHalloweenSeason(new Date(2026, 9, 24, 0, 0, 0))).toBe(true);
      expect(isHalloweenSeason(new Date(2026, 9, 31, 12, 0, 0))).toBe(true);
      expect(isHalloweenSeason(new Date(2026, 10, 5, 23, 59, 59))).toBe(true);
    });

    it('is inactive before the start and after 5 Nov 2026', () => {
      expect(isHalloweenSeason(new Date(2026, 9, 23, 23, 59, 59))).toBe(false);
      expect(isHalloweenSeason(new Date(2026, 10, 6, 0, 0, 0))).toBe(false);
      expect(isHalloweenSeason(new Date(2027, 9, 31))).toBe(false);
    });

    it('follows the date when no URL override is given', () => {
      expect(isHalloweenActive(new Date(2026, 9, 29), '')).toBe(true);
      expect(isHalloweenActive(new Date(2026, 11, 1), '?other=1')).toBe(false);
    });

    it('lets ?halloween=1 force the edition on and ?halloween=0 force it off', () => {
      expect(isHalloweenActive(new Date(2026, 5, 1), '?halloween=1')).toBe(true);
      expect(isHalloweenActive(new Date(2026, 9, 29), '?halloween=0')).toBe(false);
    });
  });

  describe('edition content', () => {
    it('provides a theme, sprite overrides, win text and celebration colors', () => {
      expect(HALLOWEEN_EDITION.theme?.wallColor).toBeDefined();
      expect(HALLOWEEN_EDITION.sprites?.drawFrightenedGhost).toBe(drawPumpkinGhost);
      expect(HALLOWEEN_EDITION.sprites?.drawEatenGhost).toBe(drawBatGhost);
      expect(HALLOWEEN_EDITION.winText).toBe('HAPPY HALLOWEEN!');
      expect(HALLOWEEN_EDITION.fireworksColors?.length).toBeGreaterThan(0);
      expect(HALLOWEEN_EDITION.celebrationWallColors?.length).toBeGreaterThan(0);
    });
  });

  describe('sprites', () => {
    it('draws an orange pumpkin while frightened', () => {
      const { ctx, calls } = createRecordingContext();
      drawPumpkinGhost(ctx, params());
      expect(calls.some((c) => c.method === 'fill' && c.fillStyle === '#FF7518')).toBe(true);
    });

    it('flashes the pumpkin pale yellow on alternate flash phases', () => {
      const on = createRecordingContext();
      drawPumpkinGhost(on.ctx, params({ isFlashing: true, animationTick: 0.125 }));
      expect(on.calls.some((c) => c.fillStyle === '#FFF3A0')).toBe(true);

      const off = createRecordingContext();
      drawPumpkinGhost(off.ctx, params({ isFlashing: true, animationTick: 0 }));
      expect(off.calls.some((c) => c.fillStyle === '#FFF3A0')).toBe(false);
    });

    it('draws a bat with red eyes', () => {
      const { ctx, calls } = createRecordingContext();
      drawBatGhost(ctx, params());
      expect(calls.some((c) => c.method === 'arc' && c.fillStyle === '#FF3B30')).toBe(true);
    });

    it('moves the bat wings as the animation advances', () => {
      const wingPoints = (tick: number): string => {
        const points: number[] = [];
        const state = { fillStyle: '' };
        const ctx = new Proxy(state, {
          get(target, prop) {
            if (prop === 'fillStyle') return target.fillStyle;
            return (...args: unknown[]) => {
              if (prop === 'lineTo' && target.fillStyle === '#7A3EB1') {
                points.push(args[1] as number);
              }
            };
          },
          set(target, prop, value) {
            if (prop === 'fillStyle') target.fillStyle = value;
            return true;
          },
        }) as unknown as CanvasRenderingContext2D;
        drawBatGhost(ctx, params({ animationTick: tick }));
        return points.join(',');
      };

      expect(wingPoints(0)).not.toBe(wingPoints(0.0785));
    });
  });

  describe('pellets and energizers', () => {
    const tile = (overrides = {}) => ({
      centerX: 50,
      centerY: 50,
      tileSize: 16,
      animationTick: 0,
      ...overrides,
    });

    it('draws a candy energizer whose wrapper changes color with the animation', () => {
      const fills = (animationTick: number) => {
        const { ctx, calls } = createRecordingContext();
        drawCandyEnergizer(ctx, tile({ animationTick }));
        return calls.filter((c) => c.method === 'fill').map((c) => c.fillStyle);
      };
      expect(fills(0)).toContain('#B455FF');
      expect(fills(0)).not.toContain('#7CFF3A');
      expect(fills(0.25)).toContain('#7CFF3A');
      expect(fills(0.25)).not.toContain('#B455FF');
      expect(fills(0)).toContain('#FF7518');
    });

    it('keeps regular pellets and swaps only the energizer in the renderer', () => {
      expect(HALLOWEEN_EDITION.sprites?.drawPellet).toBeUndefined();
      const grid = Grid.fromStringArray(['####', '#.o#', '####']);
      const { ctx, calls } = createRecordingContext();
      const renderer = new CanvasRenderer({
        context: ctx,
        tileSize: 8,
        scale: 2,
        theme: HALLOWEEN_EDITION.theme,
        sprites: HALLOWEEN_EDITION.sprites,
      });
      renderer.renderPellets(grid, true, 0);
      const fills = calls.filter((c) => c.method === 'fill').map((c) => c.fillStyle);
      expect(fills).toContain('#B455FF');
      expect(calls.some((c) => c.method === 'arc')).toBe(true);
    });

    it('hides the energizer sprite on the blink-off frame', () => {
      const grid = Grid.fromStringArray(['####', '#.o#', '####']);
      const { ctx, calls } = createRecordingContext();
      const renderer = new CanvasRenderer({
        context: ctx,
        tileSize: 8,
        scale: 2,
        sprites: HALLOWEEN_EDITION.sprites,
      });
      renderer.renderPellets(grid, false, 0);
      expect(calls.some((c) => c.fillStyle === '#B455FF')).toBe(false);
    });
  });

  describe('edition extras', () => {
    it('ships a spooky sound profile and page title', () => {
      expect(HALLOWEEN_EDITION.sound).toBe(HALLOWEEN_SOUND);
      expect(HALLOWEEN_SOUND.sirenWaveform).toBe('triangle');
      expect(HALLOWEEN_EDITION.pageTitle).toBe(HALLOWEEN_PAGE_TITLE);
    });
  });

  describe('renderer integration', () => {
    const renderWith = (
      state: GhostState,
      sprites: CanvasSprites = HALLOWEEN_EDITION.sprites ?? {},
    ) => {
      const { ctx, calls } = createRecordingContext();
      const renderer = new CanvasRenderer({
        context: ctx,
        tileSize: 8,
        scale: 2,
        theme: HALLOWEEN_EDITION.theme,
        sprites,
      });
      renderer.renderGhost({ position: new Vector2D(40, 40), state }, 0);
      return calls;
    };

    it('uses the pumpkin for frightened ghosts and the bat for eaten ghosts', () => {
      expect(renderWith(GhostState.FRIGHTENED).some((c) => c.fillStyle === '#FF7518')).toBe(true);
      expect(renderWith(GhostState.EATEN).some((c) => c.fillStyle === '#7A3EB1')).toBe(true);
    });

    it('keeps the regular ghost sprite for chasing ghosts', () => {
      const calls = renderWith(GhostState.CHASE);
      expect(calls.some((c) => c.fillStyle === '#FF7518')).toBe(false);
      expect(calls.some((c) => c.fillStyle === '#7A3EB1')).toBe(false);
    });

    it('draws the default sprites when no overrides are configured', () => {
      const calls = renderWith(GhostState.FRIGHTENED, {});
      expect(calls.some((c) => c.fillStyle === '#2121DE')).toBe(true);
    });
  });
});
