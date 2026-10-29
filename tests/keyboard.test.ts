import { describe, expect, it, vi } from 'vitest';
import { attachKeyboardControls, createKeyboardHandler } from '../src/controls';
import { Direction } from '../src/core';

function createActions() {
  return {
    onDirection: vi.fn(),
    onPauseToggle: vi.fn(),
    onMuteToggle: vi.fn(),
    onRestart: vi.fn(),
  };
}

function press(handler: (event: KeyboardEvent) => void, code: string) {
  const event = { code, preventDefault: vi.fn() };
  handler(event as unknown as KeyboardEvent);
  return event;
}

describe('createKeyboardHandler', () => {
  it.each([
    ['ArrowUp', Direction.UP],
    ['KeyW', Direction.UP],
    ['ArrowDown', Direction.DOWN],
    ['KeyS', Direction.DOWN],
    ['ArrowLeft', Direction.LEFT],
    ['KeyA', Direction.LEFT],
    ['ArrowRight', Direction.RIGHT],
    ['KeyD', Direction.RIGHT],
  ])('maps %s to a direction request', (code, direction) => {
    const actions = createActions();
    const event = press(createKeyboardHandler(actions), code);

    expect(actions.onDirection).toHaveBeenCalledTimes(1);
    expect(actions.onDirection).toHaveBeenCalledWith(direction);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it.each(['KeyP', 'Space'])('toggles pause on %s', (code) => {
    const actions = createActions();
    const event = press(createKeyboardHandler(actions), code);

    expect(actions.onPauseToggle).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('toggles sound on KeyM', () => {
    const actions = createActions();
    const event = press(createKeyboardHandler(actions), 'KeyM');

    expect(actions.onMuteToggle).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('restarts on Enter', () => {
    const actions = createActions();
    const event = press(createKeyboardHandler(actions), 'Enter');

    expect(actions.onRestart).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it.each(['KeyQ', 'Tab', 'F5', 'toString'])(
    'ignores %s and leaves the browser default alone',
    (code) => {
      const actions = createActions();
      const event = press(createKeyboardHandler(actions), code);

      expect(event.preventDefault).not.toHaveBeenCalled();
      for (const action of Object.values(actions)) {
        expect(action).not.toHaveBeenCalled();
      }
    },
  );
});

describe('attachKeyboardControls', () => {
  it('listens for keydown on the target and can be detached', () => {
    const target = new EventTarget();
    const actions = createActions();
    const keydown = () => {
      const event = new Event('keydown') as Event & { code: string };
      event.code = 'KeyP';
      target.dispatchEvent(event);
    };

    const detach = attachKeyboardControls(target, actions);
    keydown();
    expect(actions.onPauseToggle).toHaveBeenCalledTimes(1);

    detach();
    keydown();
    expect(actions.onPauseToggle).toHaveBeenCalledTimes(1);
  });
});
