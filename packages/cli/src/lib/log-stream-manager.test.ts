/**
 * LogStreamManager unit tests
 *
 * Tests for the WebSocket-based log streaming infrastructure
 * that manages file watchers and subscriptions for real-time log delivery.
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';
import { LogStreamManager, type LogsDataMessage } from './log-stream-manager.ts';
import { OUTPUT_DIR } from './sessions.ts';

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
      const _ws = createMockWebSocket();
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

  describe('file watcher (createWatcher)', () => {
    const testSessionName = 'test-watcher-session';
    const testOutputFile = join(OUTPUT_DIR, `${testSessionName}.out`);
    const testContent = 'Initial watcher test content\n';

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

    it('should create a watcher when first client subscribes', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);

      expect(manager.hasWatcher(testSessionName)).toBe(false);
      await manager.subscribe(testSessionName, ws);
      expect(manager.hasWatcher(testSessionName)).toBe(true);
    });

    it('should not create a new watcher when second client subscribes to same session', async () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);

      await manager.subscribe(testSessionName, ws1);
      const watcherCreatedAfterFirst = manager.hasWatcher(testSessionName);

      await manager.subscribe(testSessionName, ws2);
      const watcherCreatedAfterSecond = manager.hasWatcher(testSessionName);

      // Both should be true (watcher exists), but only one watcher should exist
      expect(watcherCreatedAfterFirst).toBe(true);
      expect(watcherCreatedAfterSecond).toBe(true);
    });

    it('should detect file changes via watcher', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);

      await manager.subscribe(testSessionName, ws);

      // Wait for watcher to fully initialize
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Clear the initial content message
      broadcastFn.mockClear();

      // Write new content to file (simulate append)
      const newContent = 'New appended line\n';
      const { appendFileSync } = await import('node:fs');
      appendFileSync(testOutputFile, newContent);

      // Wait for watcher to detect change and trigger callback
      // Use polling to check for updates rather than fixed timeout
      let attempts = 0;
      const maxAttempts = 20;
      while (attempts < maxAttempts && broadcastFn.mock.calls.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }

      // Should have received an incremental update
      expect(broadcastFn).toHaveBeenCalled();
      const calls = broadcastFn.mock.calls;
      const lastMessage = calls.at(-1)[1] as LogsDataMessage;
      expect(lastMessage.type).toBe('logs:data');
      expect(lastMessage.isInitial).toBe(false);
    }, 10_000); // Increase test timeout to 10 seconds

    it('should close watcher when dispose is called', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);

      await manager.subscribe(testSessionName, ws);
      expect(manager.hasWatcher(testSessionName)).toBe(true);

      await manager.dispose();
      expect(manager.hasWatcher(testSessionName)).toBe(false);
    });
  });

  describe('watcher cleanup with reference counting (t6)', () => {
    const testSessionName = 'test-cleanup-session';
    const testOutputFile = join(OUTPUT_DIR, `${testSessionName}.out`);
    const testContent = 'Cleanup test content\n';

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

    it('should close watcher when last client unsubscribes', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);

      await manager.subscribe(testSessionName, ws);
      expect(manager.hasWatcher(testSessionName)).toBe(true);

      manager.unsubscribe(testSessionName, ws);
      expect(manager.hasWatcher(testSessionName)).toBe(false);
    });

    it('should not close watcher when other clients are still subscribed', async () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);

      await manager.subscribe(testSessionName, ws1);
      await manager.subscribe(testSessionName, ws2);
      expect(manager.hasWatcher(testSessionName)).toBe(true);

      manager.unsubscribe(testSessionName, ws1);
      // Watcher should still exist since ws2 is still subscribed
      expect(manager.hasWatcher(testSessionName)).toBe(true);
    });

    it('should close watcher when second-to-last client unsubscribes and last client unsubscribes', async () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);

      await manager.subscribe(testSessionName, ws1);
      await manager.subscribe(testSessionName, ws2);

      manager.unsubscribe(testSessionName, ws1);
      expect(manager.hasWatcher(testSessionName)).toBe(true);

      manager.unsubscribe(testSessionName, ws2);
      expect(manager.hasWatcher(testSessionName)).toBe(false);
    });

    it('should clean up file position when watcher is closed', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);

      await manager.subscribe(testSessionName, ws);
      expect(manager.getFilePosition(testSessionName)).toBe(testContent.length);

      manager.unsubscribe(testSessionName, ws);
      expect(manager.getFilePosition(testSessionName)).toBe(0);
    });

    it('should close watcher when client disconnects and was the only subscriber', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);

      await manager.subscribe(testSessionName, ws);
      expect(manager.hasWatcher(testSessionName)).toBe(true);

      manager.handleClientDisconnect(ws);
      expect(manager.hasWatcher(testSessionName)).toBe(false);
    });

    it('should not close watcher when disconnected client was one of multiple subscribers', async () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);

      await manager.subscribe(testSessionName, ws1);
      await manager.subscribe(testSessionName, ws2);

      manager.handleClientDisconnect(ws1);
      expect(manager.hasWatcher(testSessionName)).toBe(true);
    });

    it('should close watchers for all sessions when last subscriber disconnects from each', async () => {
      const testSession2 = 'test-cleanup-session-2';
      const testOutputFile2 = join(OUTPUT_DIR, `${testSession2}.out`);
      writeFileSync(testOutputFile, testContent);
      writeFileSync(testOutputFile2, testContent);

      const ws = createMockWebSocket();
      await manager.subscribe(testSessionName, ws);
      await manager.subscribe(testSession2, ws);
      expect(manager.hasWatcher(testSessionName)).toBe(true);
      expect(manager.hasWatcher(testSession2)).toBe(true);

      manager.handleClientDisconnect(ws);
      expect(manager.hasWatcher(testSessionName)).toBe(false);
      expect(manager.hasWatcher(testSession2)).toBe(false);

      // Cleanup
      if (existsSync(testOutputFile2)) {
        rmSync(testOutputFile2);
      }
    });

    it('should clean up subscription set when watcher is closed', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);

      await manager.subscribe(testSessionName, ws);
      manager.unsubscribe(testSessionName, ws);

      // Subscription set should be cleaned up
      expect(manager.getSubscriptionCount(testSessionName)).toBe(0);
    });
  });

  describe('notifySessionCompleted (t7)', () => {
    const testSessionName = 'test-completion-session';
    const testOutputFile = join(OUTPUT_DIR, `${testSessionName}.out`);
    const testContent = 'Session completion test content\n';

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

    it('should have notifySessionCompleted method', () => {
      expect(typeof manager.notifySessionCompleted).toBe('function');
    });

    it('should return a promise from notifySessionCompleted', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);
      await manager.subscribe(testSessionName, ws);

      const result = manager.notifySessionCompleted(testSessionName);
      expect(result).toBeInstanceOf(Promise);
      await result;
    });

    it('should send final content with isComplete=true when session completes', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);
      await manager.subscribe(testSessionName, ws);
      broadcastFn.mockClear();

      await manager.notifySessionCompleted(testSessionName);

      expect(broadcastFn).toHaveBeenCalled();
      const message: LogsDataMessage = broadcastFn.mock.calls[0][1];
      expect(message.type).toBe('logs:data');
      expect(message.sessionName).toBe(testSessionName);
      expect(message.isComplete).toBe(true);
      expect(message.isInitial).toBe(false);
    });

    it('should send any remaining content that was appended after last read', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);
      await manager.subscribe(testSessionName, ws);

      // Append more content without triggering watcher (simulating race condition)
      const appendedContent = 'Final line\n';
      const { appendFileSync } = await import('node:fs');
      appendFileSync(testOutputFile, appendedContent);

      broadcastFn.mockClear();
      await manager.notifySessionCompleted(testSessionName);

      expect(broadcastFn).toHaveBeenCalled();
      const message: LogsDataMessage = broadcastFn.mock.calls[0][1];
      expect(message.data).toBe(appendedContent);
    });

    it('should send empty data if no new content since last read', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);
      await manager.subscribe(testSessionName, ws);
      broadcastFn.mockClear();

      // No new content appended
      await manager.notifySessionCompleted(testSessionName);

      expect(broadcastFn).toHaveBeenCalled();
      const message: LogsDataMessage = broadcastFn.mock.calls[0][1];
      expect(message.data).toBe('');
      expect(message.isComplete).toBe(true);
    });

    it('should close watcher after session completes', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);
      await manager.subscribe(testSessionName, ws);
      expect(manager.hasWatcher(testSessionName)).toBe(true);

      await manager.notifySessionCompleted(testSessionName);

      expect(manager.hasWatcher(testSessionName)).toBe(false);
    });

    it('should clean up file position after session completes', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);
      await manager.subscribe(testSessionName, ws);
      expect(manager.getFilePosition(testSessionName)).toBe(testContent.length);

      await manager.notifySessionCompleted(testSessionName);

      expect(manager.getFilePosition(testSessionName)).toBe(0);
    });

    it('should clean up subscriptions after session completes', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);
      await manager.subscribe(testSessionName, ws);
      expect(manager.getSubscriptionCount(testSessionName)).toBe(1);

      await manager.notifySessionCompleted(testSessionName);

      expect(manager.getSubscriptionCount(testSessionName)).toBe(0);
    });

    it('should send to all subscribed clients when session completes', async () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);
      await manager.subscribe(testSessionName, ws1);
      await manager.subscribe(testSessionName, ws2);
      broadcastFn.mockClear();

      await manager.notifySessionCompleted(testSessionName);

      // Should send to both clients
      expect(broadcastFn).toHaveBeenCalledTimes(2);

      // Verify each client received the message
      const clients = broadcastFn.mock.calls.map((call) => call[0]);
      expect(clients).toContain(ws1);
      expect(clients).toContain(ws2);

      // Verify message content for both
      for (const call of broadcastFn.mock.calls) {
        const message: LogsDataMessage = call[1];
        expect(message.isComplete).toBe(true);
      }
    });

    it('should not error when notifying completion for session with no subscribers', async () => {
      writeFileSync(testOutputFile, testContent);

      // No subscribers - should not throw
      await expect(manager.notifySessionCompleted(testSessionName)).resolves.not.toThrow();
      expect(broadcastFn).not.toHaveBeenCalled();
    });

    it('should not error when notifying completion for non-existent session', async () => {
      // Session never existed - should not throw
      await expect(manager.notifySessionCompleted('non-existent-session')).resolves.not.toThrow();
      expect(broadcastFn).not.toHaveBeenCalled();
    });

    it('should handle file read error gracefully when file was deleted', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);
      await manager.subscribe(testSessionName, ws);

      // Delete the file before completion
      rmSync(testOutputFile);
      broadcastFn.mockClear();

      // Should still send completion message (with empty data or error), and cleanup
      await manager.notifySessionCompleted(testSessionName);

      // Should clean up even if file is gone
      expect(manager.hasWatcher(testSessionName)).toBe(false);
      expect(manager.getSubscriptionCount(testSessionName)).toBe(0);
    });
  });
});
