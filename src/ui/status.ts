import { Direction } from '../core';
import type { RenderableHUD } from '../render';

export const DEFAULT_WIN_TEXT = 'YOU WIN!';
export const DEFAULT_CELEBRATION_COLORS: readonly string[] = [
  '#FFFF00',
  '#FF0000',
  '#FFB8FF',
  '#00FFFF',
  '#FFB852',
];
const PLAY_AGAIN_HINT = 'ENTER / TAP TO PLAY AGAIN';

export type StatusHUD = Pick<RenderableHUD, 'statusText' | 'statusTextColor' | 'statusSubText'>;

export interface GameStatus {
  isGameOver: boolean;
  isLevelCleared: boolean;
  isPaused: boolean;
  pacmanDirection: Direction;
  /** Drives the color cycling of the win headline. */
  animationTick: number;
}

export interface StatusOptions {
  /** Replaces the "YOU WIN!" headline. */
  winText?: string;
  /** Colors cycled by the win headline. */
  celebrationColors?: readonly string[];
}

/**
 * Picks the status message shown in the middle of the maze (empty while the game is running).
 * Game over wins over level cleared, which wins over pause, which wins over the ready prompt.
 */
export function resolveStatus(status: GameStatus, options: StatusOptions = {}): StatusHUD {
  if (status.isGameOver) {
    return { statusText: 'GAME OVER', statusSubText: PLAY_AGAIN_HINT };
  }
  if (status.isLevelCleared) {
    const colors =
      options.celebrationColors && options.celebrationColors.length > 0
        ? options.celebrationColors
        : DEFAULT_CELEBRATION_COLORS;
    return {
      statusText: options.winText ?? DEFAULT_WIN_TEXT,
      statusTextColor: colors[status.animationTick % colors.length],
      statusSubText: PLAY_AGAIN_HINT,
    };
  }
  if (status.isPaused) {
    return { statusText: 'PAUSED' };
  }
  if (status.pacmanDirection === Direction.NONE) {
    return { statusText: 'READY!' };
  }
  return {};
}
