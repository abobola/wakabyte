import { Direction } from '../core';

export interface KeyboardActions {
  onDirection: (direction: Direction) => void;
  onPauseToggle: () => void;
  onMuteToggle: () => void;
  onRestart: () => void;
}

const KEY_DIRECTIONS: ReadonlyMap<string, Direction> = new Map([
  ['ArrowUp', Direction.UP],
  ['KeyW', Direction.UP],
  ['ArrowDown', Direction.DOWN],
  ['KeyS', Direction.DOWN],
  ['ArrowLeft', Direction.LEFT],
  ['KeyA', Direction.LEFT],
  ['ArrowRight', Direction.RIGHT],
  ['KeyD', Direction.RIGHT],
]);

/**
 * Builds a keydown handler for the game keys:
 * arrows / WASD steer, P / Space pause, M mutes, Enter restarts.
 * Handled keys have their default browser action prevented; other keys are ignored.
 */
export function createKeyboardHandler(actions: KeyboardActions): (event: KeyboardEvent) => void {
  return (event) => {
    const direction = KEY_DIRECTIONS.get(event.code);
    if (direction !== undefined) {
      actions.onDirection(direction);
      event.preventDefault();
      return;
    }

    switch (event.code) {
      case 'KeyP':
      case 'Space':
        actions.onPauseToggle();
        break;
      case 'KeyM':
        actions.onMuteToggle();
        break;
      case 'Enter':
        actions.onRestart();
        break;
      default:
        return;
    }
    event.preventDefault();
  };
}

/**
 * Listens for game keys on the given target (typically `window`).
 * Returns a function that removes the listener.
 */
export function attachKeyboardControls(target: EventTarget, actions: KeyboardActions): () => void {
  const handler = createKeyboardHandler(actions) as EventListener;
  target.addEventListener('keydown', handler);
  return () => target.removeEventListener('keydown', handler);
}
