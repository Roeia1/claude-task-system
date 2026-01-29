/**
 * LogStreamManager unit tests
 *
 * Tests for the WebSocket-based log streaming infrastructure
 * that manages file watchers and subscriptions for real-time log delivery.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LogStreamManager, type LogsDataMessage, type LogsErrorMessage } from './log-stream-manager.js';
import type { WebSocket } from 'ws';
import * as fs from 'node:fs/promises';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { OUTPUT_DIR } from './sessions.js';

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

  describe('subscribe', () => {
    const testSessionName = 'test-subscribe-session';
    const testOutputFile = join(OUTPUT_DIR, `${testSessionName}.out`);
    const testContent = 'Line 1\nLine 2\nLine 3\n';

    beforeEach(() => {
      // Ensure output directory exists
      if (!existsSync(OUTPUT_DIR)) {
        mkdirSync(OUTPUT_DIR, { recursive: true });
      }
    });

    afterEach(() => {
      // Clean up test file
      if (existsSync(testOutputFile)) {
        rmSync(testOutputFile);
      }
    });

    it('should have subscribe method', () => {
      expect(typeof manager.subscribe).toBe('function');
    });

    it('should return a promise from subscribe', async () => {
      const ws = createMockWebSocket();
      // Create test file first
      writeFileSync(testOutputFile, testContent);

      const result = manager.subscribe(testSessionName, ws);
      expect(result).toBeInstanceOf(Promise);
      await result;
    });

    it('should send initial file content with isInitial=true when subscribing', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);

      await manager.subscribe(testSessionName, ws);

      expect(broadcastFn).toHaveBeenCalledTimes(1);
      const message: LogsDataMessage = broadcastFn.mock.calls[0][1];
      expect(message.type).toBe('logs:data');
      expect(message.sessionName).toBe(testSessionName);
      expect(message.data).toBe(testContent);
      expect(message.isInitial).toBe(true);
      expect(message.isComplete).toBe(false);
    });

    it('should add client to subscription set after subscribing', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);

      expect(manager.getSubscriptionCount(testSessionName)).toBe(0);
      await manager.subscribe(testSessionName, ws);
      expect(manager.getSubscriptionCount(testSessionName)).toBe(1);
    });

    it('should allow multiple clients to subscribe to the same session', async () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);

      await manager.subscribe(testSessionName, ws1);
      await manager.subscribe(testSessionName, ws2);

      expect(manager.getSubscriptionCount(testSessionName)).toBe(2);
    });

    it('should send error message when subscribing to non-existent file', async () => {
      const ws = createMockWebSocket();
      const nonExistentSession = 'non-existent-session';

      await manager.subscribe(nonExistentSession, ws);

      expect(broadcastFn).toHaveBeenCalledTimes(1);
      const message = broadcastFn.mock.calls[0][1];
      expect(message.type).toBe('logs:error');
      expect(message.sessionName).toBe(nonExistentSession);
      expect(message.error).toContain('not found');
    });

    it('should not add client to subscriptions when file does not exist', async () => {
      const ws = createMockWebSocket();
      const nonExistentSession = 'non-existent-session';

      await manager.subscribe(nonExistentSession, ws);

      expect(manager.getSubscriptionCount(nonExistentSession)).toBe(0);
    });

    it('should track file position after initial read', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);

      await manager.subscribe(testSessionName, ws);

      // File position should be at end of file (length of content)
      expect(manager.getFilePosition(testSessionName)).toBe(testContent.length);
    });

    it('should send content to the specific client via sendToClient function', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);

      await manager.subscribe(testSessionName, ws);

      // First argument to sendToClient should be the WebSocket
      expect(broadcastFn.mock.calls[0][0]).toBe(ws);
    });
  });
});
