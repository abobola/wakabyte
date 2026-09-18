import { Direction } from '../core';

export interface TouchControllerOptions {
  onDirection?: (direction: Direction) => void;
  onPauseToggle?: () => void;
  onMuteToggle?: () => void;
  onInteraction?: () => void;
  dpadElement?: HTMLElement | null;
  dpadUp?: HTMLElement | null;
  dpadDown?: HTMLElement | null;
  dpadLeft?: HTMLElement | null;
  dpadRight?: HTMLElement | null;
  pauseButton?: HTMLElement | null;
  muteButton?: HTMLElement | null;
  swipeElement?: HTMLElement | null;
  swipeThreshold?: number;
}

export interface TouchPoint {
  x: number;
  y: number;
}

/**
 * Controller managing on-screen virtual D-Pad buttons, action buttons,
 * and swipe gesture inputs for touch-enabled devices.
 */
export class TouchController {
  private readonly options: TouchControllerOptions;
  private readonly swipeThreshold: number;
  private swipeStartPoint: TouchPoint | null = null;
  private isDpadTracking = false;
  private cleanups: (() => void)[] = [];

  constructor(options: TouchControllerOptions) {
    this.options = options;
    this.swipeThreshold = options.swipeThreshold ?? 24;
    this.attach();
  }

  /**
   * Attaches touch, pointer, and click listeners to DOM elements.
   */
  public attach(): void {
    this.destroy();

    this.attachDirectionButton(this.options.dpadUp, Direction.UP);
    this.attachDirectionButton(this.options.dpadDown, Direction.DOWN);
    this.attachDirectionButton(this.options.dpadLeft, Direction.LEFT);
    this.attachDirectionButton(this.options.dpadRight, Direction.RIGHT);

    this.attachActionButton(this.options.pauseButton, () => {
      this.options.onPauseToggle?.();
    });

    this.attachActionButton(this.options.muteButton, () => {
      this.options.onMuteToggle?.();
    });

    this.attachDpadDragTracking();
    this.attachSwipeGestures();
  }

  /**
   * Detaches all registered event listeners to prevent memory leaks.
   */
  public destroy(): void {
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.cleanups = [];
    this.swipeStartPoint = null;
    this.isDpadTracking = false;
  }

  /**
   * Calculates cardinal direction from a delta vector (dx, dy).
   * Returns Direction.NONE if delta does not exceed minimum threshold.
   */
  public static calculateDirectionFromDelta(dx: number, dy: number, threshold = 10): Direction {
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq < threshold * threshold) {
      return Direction.NONE;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? Direction.RIGHT : Direction.LEFT;
    }
    return dy > 0 ? Direction.DOWN : Direction.UP;
  }

  /**
   * Resolves cardinal direction relative to the center of a bounding rectangle.
   */
  public static calculateDirectionFromCenter(
    clientX: number,
    clientY: number,
    rect: { left: number; top: number; width: number; height: number },
    deadzone = 8,
  ): Direction {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;

    return TouchController.calculateDirectionFromDelta(dx, dy, deadzone);
  }

  private attachDirectionButton(
    element: HTMLElement | null | undefined,
    direction: Direction,
  ): void {
    if (!element) return;

    const handlePress = (event: Event): void => {
      event.preventDefault();
      this.options.onInteraction?.();
      this.options.onDirection?.(direction);
    };

    element.addEventListener('pointerdown', handlePress);
    this.cleanups.push(() => element.removeEventListener('pointerdown', handlePress));
  }

  private attachActionButton(element: HTMLElement | null | undefined, action: () => void): void {
    if (!element) return;

    const handlePress = (event: Event): void => {
      event.preventDefault();
      this.options.onInteraction?.();
      action();
    };

    element.addEventListener('pointerdown', handlePress);
    this.cleanups.push(() => element.removeEventListener('pointerdown', handlePress));
  }

  private attachDpadDragTracking(): void {
    const dpad = this.options.dpadElement;
    if (!dpad) return;

    const handlePointerDown = (event: PointerEvent): void => {
      event.preventDefault();
      this.isDpadTracking = true;
      this.options.onInteraction?.();

      if (typeof dpad.setPointerCapture === 'function' && event.pointerId !== undefined) {
        try {
          dpad.setPointerCapture(event.pointerId);
        } catch {
          // Ignore capture failures in unsupported mock environments
        }
      }

      this.updateDirectionFromDpadPointer(event.clientX, event.clientY);
    };

    const handlePointerMove = (event: PointerEvent): void => {
      if (!this.isDpadTracking) return;
      event.preventDefault();
      this.updateDirectionFromDpadPointer(event.clientX, event.clientY);
    };

    const handlePointerUp = (event: PointerEvent): void => {
      this.isDpadTracking = false;
      if (typeof dpad.releasePointerCapture === 'function' && event.pointerId !== undefined) {
        try {
          dpad.releasePointerCapture(event.pointerId);
        } catch {
          // Ignore release failures in unsupported mock environments
        }
      }
    };

    dpad.addEventListener('pointerdown', handlePointerDown);
    dpad.addEventListener('pointermove', handlePointerMove);
    dpad.addEventListener('pointerup', handlePointerUp);
    dpad.addEventListener('pointercancel', handlePointerUp);

    this.cleanups.push(
      () => dpad.removeEventListener('pointerdown', handlePointerDown),
      () => dpad.removeEventListener('pointermove', handlePointerMove),
      () => dpad.removeEventListener('pointerup', handlePointerUp),
      () => dpad.removeEventListener('pointercancel', handlePointerUp),
    );

    if (typeof window !== 'undefined') {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);

      this.cleanups.push(
        () => window.removeEventListener('pointermove', handlePointerMove),
        () => window.removeEventListener('pointerup', handlePointerUp),
        () => window.removeEventListener('pointercancel', handlePointerUp),
      );
    }
  }

  private updateDirectionFromDpadPointer(clientX: number, clientY: number): void {
    const dpad = this.options.dpadElement;
    if (!dpad) return;

    const rect = dpad.getBoundingClientRect();
    const direction = TouchController.calculateDirectionFromCenter(clientX, clientY, rect);

    if (direction !== Direction.NONE) {
      this.options.onDirection?.(direction);
    }
  }

  private attachSwipeGestures(): void {
    const element = this.options.swipeElement;
    if (!element) return;

    const handlePointerDown = (event: PointerEvent): void => {
      this.options.onInteraction?.();
      this.swipeStartPoint = { x: event.clientX, y: event.clientY };
    };

    const handlePointerMove = (event: PointerEvent): void => {
      if (!this.swipeStartPoint) return;

      const dx = event.clientX - this.swipeStartPoint.x;
      const dy = event.clientY - this.swipeStartPoint.y;
      const direction = TouchController.calculateDirectionFromDelta(dx, dy, this.swipeThreshold);

      if (direction !== Direction.NONE) {
        event.preventDefault();
        this.options.onDirection?.(direction);
        // Reset anchor point to allow continuous direction changes during single drag
        this.swipeStartPoint = { x: event.clientX, y: event.clientY };
      }
    };

    const handlePointerEnd = (): void => {
      this.swipeStartPoint = null;
    };

    element.addEventListener('pointerdown', handlePointerDown);
    element.addEventListener('pointermove', handlePointerMove);
    element.addEventListener('pointerup', handlePointerEnd);
    element.addEventListener('pointercancel', handlePointerEnd);

    this.cleanups.push(
      () => element.removeEventListener('pointerdown', handlePointerDown),
      () => element.removeEventListener('pointermove', handlePointerMove),
      () => element.removeEventListener('pointerup', handlePointerEnd),
      () => element.removeEventListener('pointercancel', handlePointerEnd),
    );
  }
}
