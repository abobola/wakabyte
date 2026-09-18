import { describe, it, expect, beforeEach } from 'vitest';
import { Direction } from '../src/core/Direction';
import { InputBuffer, DEFAULT_INPUT_BUFFER_TIMEOUT_MS } from '../src/core/InputBuffer';

describe('InputBuffer', () => {
  let buffer: InputBuffer;

  beforeEach(() => {
    buffer = new InputBuffer();
  });

  describe('initial state', () => {
    it('should initialize with default timeout and empty buffer', () => {
      expect(buffer.getTimeout()).toBe(DEFAULT_INPUT_BUFFER_TIMEOUT_MS);
      expect(buffer.isEmpty()).toBe(true);
      expect(buffer.peek()).toBe(Direction.NONE);
      expect(buffer.consume()).toBe(Direction.NONE);
    });

    it('should allow custom timeout in constructor and clamp negative values to zero', () => {
      const customBuffer = new InputBuffer(500);
      expect(customBuffer.getTimeout()).toBe(500);

      const clampedBuffer = new InputBuffer(-100);
      expect(clampedBuffer.getTimeout()).toBe(0);
    });
  });

  describe('enqueue and peek', () => {
    it('should store user directional intent', () => {
      buffer.enqueue(Direction.LEFT);
      expect(buffer.isEmpty()).toBe(false);
      expect(buffer.peek()).toBe(Direction.LEFT);
    });

    it('should not clear buffer on peek', () => {
      buffer.enqueue(Direction.UP);
      expect(buffer.peek()).toBe(Direction.UP);
      expect(buffer.peek()).toBe(Direction.UP);
      expect(buffer.isEmpty()).toBe(false);
    });

    it('should overwrite previously buffered direction with the latest input', () => {
      buffer.enqueue(Direction.UP);
      expect(buffer.peek()).toBe(Direction.UP);

      buffer.enqueue(Direction.RIGHT);
      expect(buffer.peek()).toBe(Direction.RIGHT);
    });

    it('should ignore Direction.NONE when enqueuing', () => {
      buffer.enqueue(Direction.DOWN);
      buffer.enqueue(Direction.NONE);
      expect(buffer.peek()).toBe(Direction.DOWN);
    });
  });

  describe('consume', () => {
    it('should return buffered direction and clear the buffer', () => {
      buffer.enqueue(Direction.DOWN);
      expect(buffer.consume()).toBe(Direction.DOWN);
      expect(buffer.isEmpty()).toBe(true);
      expect(buffer.peek()).toBe(Direction.NONE);
      expect(buffer.consume()).toBe(Direction.NONE);
    });
  });

  describe('clear', () => {
    it('should immediately clear buffered direction', () => {
      buffer.enqueue(Direction.LEFT);
      expect(buffer.isEmpty()).toBe(false);

      buffer.clear();
      expect(buffer.isEmpty()).toBe(true);
      expect(buffer.peek()).toBe(Direction.NONE);
    });
  });

  describe('timeout expiration via timestamps', () => {
    it('should retain input when queried within the timeout window', () => {
      buffer = new InputBuffer(200);
      buffer.enqueue(Direction.RIGHT, 1000);

      expect(buffer.peek(1050)).toBe(Direction.RIGHT);
      expect(buffer.peek(1200)).toBe(Direction.RIGHT);
      expect(buffer.isEmpty(1200)).toBe(false);
    });

    it('should expire and discard stale input after timeout window has passed', () => {
      buffer = new InputBuffer(200);
      buffer.enqueue(Direction.RIGHT, 1000);

      expect(buffer.peek(1201)).toBe(Direction.NONE);
      expect(buffer.isEmpty(1201)).toBe(true);
      expect(buffer.consume(1201)).toBe(Direction.NONE);
    });

    it('should reset expiration timestamp when new direction is enqueued', () => {
      buffer = new InputBuffer(200);
      buffer.enqueue(Direction.LEFT, 1000);

      // At 1150, enqueue UP with new timestamp
      buffer.enqueue(Direction.UP, 1150);

      // At 1250 (250ms after first, but 100ms after second), UP should still be valid
      expect(buffer.peek(1250)).toBe(Direction.UP);
      expect(buffer.consume(1250)).toBe(Direction.UP);
    });
  });

  describe('timeout expiration via delta-time updates', () => {
    it('should decay buffer lifetime over delta-time updates', () => {
      buffer = new InputBuffer(300);
      buffer.enqueue(Direction.DOWN);

      buffer.update(100);
      expect(buffer.isEmpty()).toBe(false);
      expect(buffer.peek()).toBe(Direction.DOWN);

      buffer.update(150);
      expect(buffer.isEmpty()).toBe(false);
      expect(buffer.peek()).toBe(Direction.DOWN);

      buffer.update(51);
      expect(buffer.isEmpty()).toBe(true);
      expect(buffer.peek()).toBe(Direction.NONE);
    });

    it('should ignore non-positive delta time updates', () => {
      buffer = new InputBuffer(300);
      buffer.enqueue(Direction.LEFT);

      buffer.update(0);
      buffer.update(-50);
      expect(buffer.isEmpty()).toBe(false);
      expect(buffer.peek()).toBe(Direction.LEFT);
    });
  });
});
