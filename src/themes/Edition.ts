import type { SoundProfile } from '../audio';
import type { CanvasSprites, CanvasTheme } from '../render';

/**
 * A seasonal "edition" of the game: purely visual overrides layered on top of the default look.
 * Anything left undefined falls back to the regular arcade presentation.
 */
export interface Edition {
  name: string;
  theme?: Partial<CanvasTheme>;
  sprites?: CanvasSprites;
  /** Tweaks to the synthesized sound effects and siren. */
  sound?: SoundProfile;
  /** Replaces the browser tab title. */
  pageTitle?: string;
  /** Replaces the "YOU WIN!" headline. */
  winText?: string;
  /** Colors cycled by the win headline. */
  celebrationColors?: string[];
  /** Colors the maze walls alternate between during the win celebration. */
  celebrationWallColors?: string[];
  /** Colors of the win fireworks. */
  fireworksColors?: string[];
}
