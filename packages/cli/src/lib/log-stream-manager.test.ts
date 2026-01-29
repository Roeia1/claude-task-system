/**
 * LogStreamManager unit tests
 *
 * Tests for the WebSocket-based log streaming infrastructure
 * that manages file watchers and subscriptions for real-time log delivery.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LogStreamManager } from './log-stream-manager.js';
import type { WebSocket } from 'ws';

/**
 * Create a mock WebSocket instance for testing
 */
function createMockWebSocket(): WebSocket {
  return {
    readyState: 1, // WebSocket.OPEN
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    terminate: vi.fn(),
  } as unknown as WebSocket;
}

describe('LogStreamManager', () => {
  let manager: LogStreamManager;
  let broadcastFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    broadcastFn = vi.fn();
    manager = new LogStreamManager(broadcastFn);
  });

  afterEach(async () => {
    // Clean up any watchers
    await manager.dispose();
  });

  describe('instantiation', () => {
    it('should create instance with broadcast function', () => {
      expect(manager).toBeInstanceOf(LogStreamManager);
    });

    it('should accept broadcast function in constructor', () => {
      const fn = vi.fn();
      const instance = new LogStreamManager(fn);
      expect(instance).toBeInstanceOf(LogStreamManager);
    });

    it('should initialize with empty internal state', () => {
      // A fresh manager should have no subscriptions
      const ws = createMockWebSocket();
      expect(manager.getSubscriptionCount('test-session')).toBe(0);
      expect(manager.hasWatcher('test-session')).toBe(false);
    });
  });

  describe('internal state tracking', () => {
    it('should expose method to check subscription count per session', () => {
      expect(typeof manager.getSubscriptionCount).toBe('function');
    });

    it('should expose method to check if watcher exists', () => {
      expect(typeof manager.hasWatcher).toBe('function');
    });

    it('should expose method to get file position for a session', () => {
      expect(typeof manager.getFilePosition).toBe('function');
      // Fresh manager should return 0 or undefined for unknown session
      expect(manager.getFilePosition('unknown-session')).toBe(0);
    });
  });

  describe('dispose', () => {
    it('should have dispose method for cleanup', () => {
      expect(typeof manager.dispose).toBe('function');
    });

    it('should return a promise from dispose', async () => {
      const result = manager.dispose();
      expect(result).toBeInstanceOf(Promise);
      await result;
    });
  });
});
