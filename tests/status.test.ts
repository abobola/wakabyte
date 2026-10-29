import { describe, expect, it } from 'vitest';
import { Direction } from '../src/core';
import {
  DEFAULT_CELEBRATION_COLORS,
  DEFAULT_WIN_TEXT,
  type GameStatus,
  resolveStatus,
} from '../src/ui';

const RUNNING: GameStatus = {
  isGameOver: false,
  isLevelCleared: false,
  isPaused: false,
  pacmanDirection: Direction.LEFT,
  animationTick: 0,
};

describe('resolveStatus', () => {
  it('shows nothing while the game is running', () => {
    expect(resolveStatus(RUNNING)).toEqual({});
  });

  it('shows READY! until Pac-Man starts moving', () => {
    expect(resolveStatus({ ...RUNNING, pacmanDirection: Direction.NONE })).toEqual({
      statusText: 'READY!',
    });
  });

  it('shows PAUSED while paused', () => {
    expect(resolveStatus({ ...RUNNING, isPaused: true })).toEqual({ statusText: 'PAUSED' });
  });

  it('shows GAME OVER with the restart hint', () => {
    expect(resolveStatus({ ...RUNNING, isGameOver: true })).toEqual({
      statusText: 'GAME OVER',
      statusSubText: 'ENTER / TAP TO PLAY AGAIN',
    });
  });

  it('shows the win headline with the restart hint when the level is cleared', () => {
    const status = resolveStatus({ ...RUNNING, isLevelCleared: true });
    expect(status.statusText).toBe(DEFAULT_WIN_TEXT);
    expect(status.statusSubText).toBe('ENTER / TAP TO PLAY AGAIN');
    expect(status.statusTextColor).toBe(DEFAULT_CELEBRATION_COLORS[0]);
  });

  it('cycles the win headline color with the animation tick and wraps around', () => {
    const colorAt = (animationTick: number) =>
      resolveStatus({ ...RUNNING, isLevelCleared: true, animationTick }).statusTextColor;
    const count = DEFAULT_CELEBRATION_COLORS.length;

    expect(colorAt(1)).toBe(DEFAULT_CELEBRATION_COLORS[1]);
    expect(colorAt(count)).toBe(DEFAULT_CELEBRATION_COLORS[0]);
    expect(colorAt(count + 2)).toBe(DEFAULT_CELEBRATION_COLORS[2]);
  });

  it('uses edition win text and colors when given', () => {
    const options = { winText: 'HAPPY HALLOWEEN!', celebrationColors: ['#111111', '#222222'] };
    const status = resolveStatus({ ...RUNNING, isLevelCleared: true, animationTick: 3 }, options);

    expect(status.statusText).toBe('HAPPY HALLOWEEN!');
    expect(status.statusTextColor).toBe('#222222');
  });

  it('falls back to the default colors when an edition gives an empty list', () => {
    const status = resolveStatus({ ...RUNNING, isLevelCleared: true }, { celebrationColors: [] });
    expect(status.statusTextColor).toBe(DEFAULT_CELEBRATION_COLORS[0]);
  });

  it('prefers game over over level cleared, pause and ready', () => {
    const status = resolveStatus({
      isGameOver: true,
      isLevelCleared: true,
      isPaused: true,
      pacmanDirection: Direction.NONE,
      animationTick: 0,
    });
    expect(status.statusText).toBe('GAME OVER');
  });

  it('prefers level cleared over pause and ready', () => {
    const status = resolveStatus({
      ...RUNNING,
      isLevelCleared: true,
      isPaused: true,
      pacmanDirection: Direction.NONE,
    });
    expect(status.statusText).toBe(DEFAULT_WIN_TEXT);
  });

  it('prefers pause over ready', () => {
    const status = resolveStatus({
      ...RUNNING,
      isPaused: true,
      pacmanDirection: Direction.NONE,
    });
    expect(status.statusText).toBe('PAUSED');
  });
});
