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

  describe('unsubscribe', () => {
    const testSessionName = 'test-unsubscribe-session';
    const testOutputFile = join(OUTPUT_DIR, `${testSessionName}.out`);
    const testContent = 'Unsubscribe test content\n';

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

    it('should have unsubscribe method', () => {
      expect(typeof manager.unsubscribe).toBe('function');
    });

    it('should remove client from subscription set when unsubscribing', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);

      await manager.subscribe(testSessionName, ws);
      expect(manager.getSubscriptionCount(testSessionName)).toBe(1);

      manager.unsubscribe(testSessionName, ws);
      expect(manager.getSubscriptionCount(testSessionName)).toBe(0);
    });

    it('should not error when unsubscribing from a session not subscribed to', () => {
      const ws = createMockWebSocket();
      // Should not throw
      expect(() => manager.unsubscribe('unknown-session', ws)).not.toThrow();
    });

    it('should only remove the specific client when multiple clients are subscribed', async () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);

      await manager.subscribe(testSessionName, ws1);
      await manager.subscribe(testSessionName, ws2);
      expect(manager.getSubscriptionCount(testSessionName)).toBe(2);

      manager.unsubscribe(testSessionName, ws1);
      expect(manager.getSubscriptionCount(testSessionName)).toBe(1);
    });

    it('should not error when unsubscribing a client that was never subscribed', async () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);

      await manager.subscribe(testSessionName, ws1);
      // ws2 was never subscribed to this session
      expect(() => manager.unsubscribe(testSessionName, ws2)).not.toThrow();
      expect(manager.getSubscriptionCount(testSessionName)).toBe(1);
    });
  });

  describe('handleClientDisconnect', () => {
    const testSession1 = 'test-disconnect-session-1';
    const testSession2 = 'test-disconnect-session-2';
    const testOutputFile1 = join(OUTPUT_DIR, `${testSession1}.out`);
    const testOutputFile2 = join(OUTPUT_DIR, `${testSession2}.out`);
    const testContent = 'Disconnect test content\n';

    beforeEach(() => {
      // Ensure output directory exists
      if (!existsSync(OUTPUT_DIR)) {
        mkdirSync(OUTPUT_DIR, { recursive: true });
      }
    });

    afterEach(() => {
      // Clean up test files
      if (existsSync(testOutputFile1)) {
        rmSync(testOutputFile1);
      }
      if (existsSync(testOutputFile2)) {
        rmSync(testOutputFile2);
      }
    });

    it('should have handleClientDisconnect method', () => {
      expect(typeof manager.handleClientDisconnect).toBe('function');
    });

    it('should remove client from all sessions when client disconnects', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile1, testContent);
      writeFileSync(testOutputFile2, testContent);

      // Subscribe client to two sessions
      await manager.subscribe(testSession1, ws);
      await manager.subscribe(testSession2, ws);
      expect(manager.getSubscriptionCount(testSession1)).toBe(1);
      expect(manager.getSubscriptionCount(testSession2)).toBe(1);

      manager.handleClientDisconnect(ws);
      expect(manager.getSubscriptionCount(testSession1)).toBe(0);
      expect(manager.getSubscriptionCount(testSession2)).toBe(0);
    });

    it('should not affect other clients when one client disconnects', async () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      writeFileSync(testOutputFile1, testContent);

      await manager.subscribe(testSession1, ws1);
      await manager.subscribe(testSession1, ws2);
      expect(manager.getSubscriptionCount(testSession1)).toBe(2);

      manager.handleClientDisconnect(ws1);
      expect(manager.getSubscriptionCount(testSession1)).toBe(1);
    });

    it('should not error when disconnecting a client with no subscriptions', () => {
      const ws = createMockWebSocket();
      expect(() => manager.handleClientDisconnect(ws)).not.toThrow();
    });
  });
});
