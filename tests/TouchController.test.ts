import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TouchController } from '../src/controls';
import { Direction } from '../src/core';

type Listener = (event: unknown) => void;

class MockElement {
  public listeners: Record<string, Listener[]> = {};
  public rect = { left: 100, top: 100, width: 120, height: 120 };

  public addEventListener(type: string, listener: Listener): void {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(listener);
  }

  public removeEventListener(type: string, listener: Listener): void {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
  }

  public dispatch(type: string, event: Record<string, unknown> = {}): void {
    const fullEvent = {
      preventDefault: vi.fn(),
      ...event,
    };
    const list = this.listeners[type] ?? [];
    for (const listener of list) {
      listener(fullEvent);
    }
  }

  public getBoundingClientRect(): {
    left: number;
    top: number;
    width: number;
    height: number;
  } {
    return this.rect;
  }
}

describe('TouchController', () => {
  let mockDpad: MockElement;
  let mockBtnUp: MockElement;
  let mockBtnDown: MockElement;
  let mockBtnLeft: MockElement;
  let mockBtnRight: MockElement;
  let mockBtnPause: MockElement;
  let mockBtnMute: MockElement;
  let mockSwipeArea: MockElement;

  beforeEach(() => {
    mockDpad = new MockElement();
    mockBtnUp = new MockElement();
    mockBtnDown = new MockElement();
    mockBtnLeft = new MockElement();
    mockBtnRight = new MockElement();
    mockBtnPause = new MockElement();
    mockBtnMute = new MockElement();
    mockSwipeArea = new MockElement();
  });

  describe('Static Direction Calculators', () => {
    it('calculates direction from delta correctly with horizontal and vertical dominance', () => {
      expect(TouchController.calculateDirectionFromDelta(30, 5, 10)).toBe(Direction.RIGHT);
      expect(TouchController.calculateDirectionFromDelta(-30, 5, 10)).toBe(Direction.LEFT);
      expect(TouchController.calculateDirectionFromDelta(5, 30, 10)).toBe(Direction.DOWN);
      expect(TouchController.calculateDirectionFromDelta(5, -30, 10)).toBe(Direction.UP);
    });

    it('returns Direction.NONE if delta is below threshold', () => {
      expect(TouchController.calculateDirectionFromDelta(2, 2, 10)).toBe(Direction.NONE);
      expect(TouchController.calculateDirectionFromDelta(0, 0, 10)).toBe(Direction.NONE);
    });

    it('calculates direction relative to bounding rect center', () => {
      const rect = { left: 100, top: 100, width: 100, height: 100 }; // Center is (150, 150)
      expect(TouchController.calculateDirectionFromCenter(190, 150, rect, 10)).toBe(
        Direction.RIGHT,
      );
      expect(TouchController.calculateDirectionFromCenter(110, 150, rect, 10)).toBe(Direction.LEFT);
      expect(TouchController.calculateDirectionFromCenter(150, 190, rect, 10)).toBe(Direction.DOWN);
      expect(TouchController.calculateDirectionFromCenter(150, 110, rect, 10)).toBe(Direction.UP);
      expect(TouchController.calculateDirectionFromCenter(152, 152, rect, 10)).toBe(Direction.NONE);
    });
  });

  describe('Button Interactions', () => {
    it('triggers directional callback and interaction callback on D-Pad button press', () => {
      const onDirection = vi.fn();
      const onInteraction = vi.fn();

      const controller = new TouchController({
        dpadUp: mockBtnUp as unknown as HTMLElement,
        dpadDown: mockBtnDown as unknown as HTMLElement,
        dpadLeft: mockBtnLeft as unknown as HTMLElement,
        dpadRight: mockBtnRight as unknown as HTMLElement,
        onDirection,
        onInteraction,
      });

      mockBtnUp.dispatch('pointerdown');
      expect(onDirection).toHaveBeenCalledWith(Direction.UP);
      expect(onInteraction).toHaveBeenCalledTimes(1);

      mockBtnDown.dispatch('pointerdown');
      expect(onDirection).toHaveBeenCalledWith(Direction.DOWN);
      expect(onInteraction).toHaveBeenCalledTimes(2);

      mockBtnLeft.dispatch('pointerdown');
      expect(onDirection).toHaveBeenCalledWith(Direction.LEFT);
      expect(onInteraction).toHaveBeenCalledTimes(3);

      mockBtnRight.dispatch('pointerdown');
      expect(onDirection).toHaveBeenCalledWith(Direction.RIGHT);
      expect(onInteraction).toHaveBeenCalledTimes(4);

      controller.destroy();
    });

    it('triggers pause and mute toggle callbacks', () => {
      const onPauseToggle = vi.fn();
      const onMuteToggle = vi.fn();
      const onInteraction = vi.fn();

      const controller = new TouchController({
        pauseButton: mockBtnPause as unknown as HTMLElement,
        muteButton: mockBtnMute as unknown as HTMLElement,
        onPauseToggle,
        onMuteToggle,
        onInteraction,
      });

      mockBtnPause.dispatch('pointerdown');
      expect(onPauseToggle).toHaveBeenCalledTimes(1);
      expect(onInteraction).toHaveBeenCalledTimes(1);

      mockBtnMute.dispatch('pointerdown');
      expect(onMuteToggle).toHaveBeenCalledTimes(1);
      expect(onInteraction).toHaveBeenCalledTimes(2);

      controller.destroy();
    });

    it('handles missing optional elements gracefully', () => {
      expect(() => {
        const controller = new TouchController({});
        controller.destroy();
      }).not.toThrow();
    });
  });

  describe('D-Pad Continuous Drag Tracking', () => {
    it('tracks pointer dragging across the D-Pad container', () => {
      const onDirection = vi.fn();
      const onInteraction = vi.fn();

      const controller = new TouchController({
        dpadElement: mockDpad as unknown as HTMLElement,
        onDirection,
        onInteraction,
      });

      // D-Pad bounds: (100, 100, 120, 120) -> Center: (160, 160)
      mockDpad.dispatch('pointerdown', { clientX: 160, clientY: 120 }); // Up
      expect(onInteraction).toHaveBeenCalledTimes(1);
      expect(onDirection).toHaveBeenCalledWith(Direction.UP);

      // Pointer drag move on dpad (dx = 40, dy = 0) -> Right
      mockDpad.dispatch('pointermove', { clientX: 200, clientY: 160 });
      expect(onDirection).toHaveBeenCalledWith(Direction.RIGHT);

      // Pointer up releases tracking
      mockDpad.dispatch('pointerup', { clientX: 160, clientY: 160 });

      // Subsequent move ignored after pointerup
      mockDpad.dispatch('pointermove', { clientX: 160, clientY: 200 });
      expect(onDirection).toHaveBeenCalledTimes(2);

      controller.destroy();
    });
  });

  describe('Swipe Gestures', () => {
    it('detects swipe gestures on swipe element and triggers directions', () => {
      const onDirection = vi.fn();
      const onInteraction = vi.fn();

      const controller = new TouchController({
        swipeElement: mockSwipeArea as unknown as HTMLElement,
        swipeThreshold: 20,
        onDirection,
        onInteraction,
      });

      mockSwipeArea.dispatch('pointerdown', { clientX: 100, clientY: 100 });
      expect(onInteraction).toHaveBeenCalledTimes(1);

      // Move below threshold (dx=5, dy=5) -> no direction
      mockSwipeArea.dispatch('pointermove', { clientX: 105, clientY: 105 });
      expect(onDirection).not.toHaveBeenCalled();

      // Move past threshold (dx=30, dy=5) -> RIGHT
      mockSwipeArea.dispatch('pointermove', { clientX: 130, clientY: 105 });
      expect(onDirection).toHaveBeenCalledWith(Direction.RIGHT);

      // Continuous swipe up (from new anchor 130, 105 -> 130, 75: dy=-30) -> UP
      mockSwipeArea.dispatch('pointermove', { clientX: 130, clientY: 75 });
      expect(onDirection).toHaveBeenCalledWith(Direction.UP);

      mockSwipeArea.dispatch('pointerup');
      controller.destroy();
    });
  });

  describe('Lifecycle & Cleanup', () => {
    it('removes all event listeners on destroy()', () => {
      const onDirection = vi.fn();
      const controller = new TouchController({
        dpadUp: mockBtnUp as unknown as HTMLElement,
        pauseButton: mockBtnPause as unknown as HTMLElement,
        swipeElement: mockSwipeArea as unknown as HTMLElement,
        onDirection,
      });

      controller.destroy();

      mockBtnUp.dispatch('pointerdown');
      mockBtnPause.dispatch('pointerdown');
      mockSwipeArea.dispatch('pointerdown', { clientX: 100, clientY: 100 });

      expect(onDirection).not.toHaveBeenCalled();
    });
  });
});
