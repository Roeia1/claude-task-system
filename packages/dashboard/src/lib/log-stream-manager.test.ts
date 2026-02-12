/**
 * LogStreamManager unit tests
 *
 * Tests for the WebSocket-based log streaming infrastructure
 * that manages file watchers and subscriptions for real-time log delivery.
 * Updated for JSONL-based message parsing.
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';
import { LogStreamManager, type LogsDataMessage } from './log-stream-manager.ts';
import { OUTPUT_DIR } from './sessions.ts';

/** Delay for watcher initialization in ms */
const WATCHER_INIT_DELAY_MS = 100;

/** Test timeout for long-running tests in ms */
const LONG_TEST_TIMEOUT_MS = 10_000;

/** Number of JSONL lines in the standard test content */
const STANDARD_JSONL_LINE_COUNT = 3;

/** Number of valid JSONL messages when content includes invalid lines */
const VALID_MESSAGES_WITH_INVALID_LINES = 2;

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

/** Sample JSONL messages for testing */
const sampleMessages = {
  pipelineStart: JSON.stringify({
    type: 'saga_worker',
    subtype: 'pipeline_start',
    timestamp: '2026-02-13T01:00:00Z',
    storyId: 'test-story',
  }),
  pipelineStep: JSON.stringify({
    type: 'saga_worker',
    subtype: 'pipeline_step',
    timestamp: '2026-02-13T01:00:01Z',
    step: 1,
    message: 'Running tests',
  }),
  pipelineEnd: JSON.stringify({
    type: 'saga_worker',
    subtype: 'pipeline_end',
    timestamp: '2026-02-13T01:00:02Z',
    storyId: 'test-story',
    status: 'completed',
    exitCode: 0,
    cycles: 3,
    elapsedMinutes: 5,
  }),
  cycleStart: JSON.stringify({
    type: 'saga_worker',
    subtype: 'cycle_start',
    timestamp: '2026-02-13T01:00:01Z',
    cycle: 1,
    maxCycles: 5,
  }),
  sdkAssistant: JSON.stringify({
    type: 'assistant',
    message: { role: 'assistant', content: 'Hello' },
  }),
};

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

    it('should expose method to get line count for a session', () => {
      expect(typeof manager.getLineCount).toBe('function');
      // Fresh manager should return 0 for unknown session
      expect(manager.getLineCount('unknown-session')).toBe(0);
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
    const testOutputFile = join(OUTPUT_DIR, `${testSessionName}.jsonl`);
    const testJsonlContent = `${sampleMessages.pipelineStart}\n${sampleMessages.pipelineStep}\n${sampleMessages.cycleStart}\n`;

    beforeEach(() => {
      if (!existsSync(OUTPUT_DIR)) {
        mkdirSync(OUTPUT_DIR, { recursive: true });
      }
    });

    afterEach(() => {
      if (existsSync(testOutputFile)) {
        rmSync(testOutputFile);
      }
    });

    it('should have subscribe method', () => {
      expect(typeof manager.subscribe).toBe('function');
    });

    it('should return a promise from subscribe', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testJsonlContent);

      const result = manager.subscribe(testSessionName, ws);
      expect(result).toBeInstanceOf(Promise);
      await result;
    });

    it('should send initial parsed JSONL messages with isInitial=true when subscribing', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testJsonlContent);

      await manager.subscribe(testSessionName, ws);

      expect(broadcastFn).toHaveBeenCalledTimes(1);
      const message: LogsDataMessage = broadcastFn.mock.calls[0][1];
      expect(message.type).toBe('logs:data');
      expect(message.sessionName).toBe(testSessionName);
      expect(message.isInitial).toBe(true);
      expect(message.isComplete).toBe(false);
      // Messages should be an array of parsed JSON objects
      expect(Array.isArray(message.messages)).toBe(true);
      expect(message.messages).toHaveLength(STANDARD_JSONL_LINE_COUNT);
      expect(message.messages[0]).toEqual(JSON.parse(sampleMessages.pipelineStart));
      expect(message.messages[1]).toEqual(JSON.parse(sampleMessages.pipelineStep));
      expect(message.messages[2]).toEqual(JSON.parse(sampleMessages.cycleStart));
    });

    it('should add client to subscription set after subscribing', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testJsonlContent);

      expect(manager.getSubscriptionCount(testSessionName)).toBe(0);
      await manager.subscribe(testSessionName, ws);
      expect(manager.getSubscriptionCount(testSessionName)).toBe(1);
    });

    it('should allow multiple clients to subscribe to the same session', async () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      writeFileSync(testOutputFile, testJsonlContent);

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

    it('should track line count after initial read', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testJsonlContent);

      await manager.subscribe(testSessionName, ws);

      // Line count should match the number of JSONL lines in test content
      expect(manager.getLineCount(testSessionName)).toBe(STANDARD_JSONL_LINE_COUNT);
    });

    it('should send content to the specific client via sendToClient function', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testJsonlContent);

      await manager.subscribe(testSessionName, ws);

      // First argument to sendToClient should be the WebSocket
      expect(broadcastFn.mock.calls[0][0]).toBe(ws);
    });

    it('should skip empty lines in JSONL file', async () => {
      const ws = createMockWebSocket();
      const contentWithEmptyLines = `${sampleMessages.pipelineStart}\n\n${sampleMessages.pipelineStep}\n\n`;
      writeFileSync(testOutputFile, contentWithEmptyLines);

      await manager.subscribe(testSessionName, ws);

      const message: LogsDataMessage = broadcastFn.mock.calls[0][1];
      expect(message.messages).toHaveLength(VALID_MESSAGES_WITH_INVALID_LINES);
    });

    it('should handle invalid JSON lines gracefully', async () => {
      const ws = createMockWebSocket();
      const contentWithBadLine = `${sampleMessages.pipelineStart}\nnot valid json\n${sampleMessages.pipelineStep}\n`;
      writeFileSync(testOutputFile, contentWithBadLine);

      await manager.subscribe(testSessionName, ws);

      const message: LogsDataMessage = broadcastFn.mock.calls[0][1];
      // Invalid JSON lines should be skipped
      expect(message.messages).toHaveLength(VALID_MESSAGES_WITH_INVALID_LINES);
    });
  });

  describe('unsubscribe', () => {
    const testSessionName = 'test-unsubscribe-session';
    const testOutputFile = join(OUTPUT_DIR, `${testSessionName}.jsonl`);
    const testContent = `${sampleMessages.pipelineStart}\n`;

    beforeEach(() => {
      if (!existsSync(OUTPUT_DIR)) {
        mkdirSync(OUTPUT_DIR, { recursive: true });
      }
    });

    afterEach(() => {
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
      expect(() => manager.unsubscribe(testSessionName, ws2)).not.toThrow();
      expect(manager.getSubscriptionCount(testSessionName)).toBe(1);
    });
  });

  describe('handleClientDisconnect', () => {
    const testSession1 = 'test-disconnect-session-1';
    const testSession2 = 'test-disconnect-session-2';
    const testOutputFile1 = join(OUTPUT_DIR, `${testSession1}.jsonl`);
    const testOutputFile2 = join(OUTPUT_DIR, `${testSession2}.jsonl`);
    const testContent = `${sampleMessages.pipelineStart}\n`;

    beforeEach(() => {
      if (!existsSync(OUTPUT_DIR)) {
        mkdirSync(OUTPUT_DIR, { recursive: true });
      }
    });

    afterEach(() => {
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
    const testOutputFile = join(OUTPUT_DIR, `${testSessionName}.jsonl`);
    const testContent = `${sampleMessages.pipelineStart}\n`;

    beforeEach(() => {
      if (!existsSync(OUTPUT_DIR)) {
        mkdirSync(OUTPUT_DIR, { recursive: true });
      }
    });

    afterEach(() => {
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

      expect(watcherCreatedAfterFirst).toBe(true);
      expect(watcherCreatedAfterSecond).toBe(true);
    });

    it(
      'should detect file changes and send new JSONL messages via watcher',
      async () => {
        const ws = createMockWebSocket();
        writeFileSync(testOutputFile, testContent);

        await manager.subscribe(testSessionName, ws);

        // Wait for watcher to fully initialize
        await new Promise((resolve) => setTimeout(resolve, WATCHER_INIT_DELAY_MS));

        // Clear the initial content message
        broadcastFn.mockClear();

        // Append new JSONL line
        const { appendFileSync } = await import('node:fs');
        appendFileSync(testOutputFile, `${sampleMessages.pipelineStep}\n`);

        // Wait for watcher to detect change
        await vi.waitFor(
          () => {
            expect(broadcastFn.mock.calls.length).toBeGreaterThan(0);
          },
          { timeout: LONG_TEST_TIMEOUT_MS, interval: WATCHER_INIT_DELAY_MS },
        );

        // Should have received an incremental update with parsed messages
        const calls = broadcastFn.mock.calls;
        const lastMessage = calls.at(-1)[1] as LogsDataMessage;
        expect(lastMessage.type).toBe('logs:data');
        expect(lastMessage.isInitial).toBe(false);
        expect(Array.isArray(lastMessage.messages)).toBe(true);
        expect(lastMessage.messages.length).toBeGreaterThan(0);
        expect(lastMessage.messages[0]).toEqual(JSON.parse(sampleMessages.pipelineStep));
      },
      LONG_TEST_TIMEOUT_MS,
    );

    it('should close watcher when dispose is called', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);

      await manager.subscribe(testSessionName, ws);
      expect(manager.hasWatcher(testSessionName)).toBe(true);

      await manager.dispose();
      expect(manager.hasWatcher(testSessionName)).toBe(false);
    });
  });

  describe('watcher cleanup with reference counting', () => {
    const testSessionName = 'test-cleanup-session';
    const testOutputFile = join(OUTPUT_DIR, `${testSessionName}.jsonl`);
    const testContent = `${sampleMessages.pipelineStart}\n`;

    beforeEach(() => {
      if (!existsSync(OUTPUT_DIR)) {
        mkdirSync(OUTPUT_DIR, { recursive: true });
      }
    });

    afterEach(() => {
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

    it('should clean up line count when watcher is closed', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);

      await manager.subscribe(testSessionName, ws);
      expect(manager.getLineCount(testSessionName)).toBe(1);

      manager.unsubscribe(testSessionName, ws);
      expect(manager.getLineCount(testSessionName)).toBe(0);
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
      const testOutputFile2 = join(OUTPUT_DIR, `${testSession2}.jsonl`);
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

      if (existsSync(testOutputFile2)) {
        rmSync(testOutputFile2);
      }
    });

    it('should clean up subscription set when watcher is closed', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);

      await manager.subscribe(testSessionName, ws);
      manager.unsubscribe(testSessionName, ws);

      expect(manager.getSubscriptionCount(testSessionName)).toBe(0);
    });
  });

  describe('notifySessionCompleted', () => {
    const testSessionName = 'test-completion-session';
    const testOutputFile = join(OUTPUT_DIR, `${testSessionName}.jsonl`);
    const testContent = `${sampleMessages.pipelineStart}\n`;

    beforeEach(() => {
      if (!existsSync(OUTPUT_DIR)) {
        mkdirSync(OUTPUT_DIR, { recursive: true });
      }
    });

    afterEach(() => {
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

    it('should send final messages with isComplete=true when session completes', async () => {
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
      expect(Array.isArray(message.messages)).toBe(true);
    });

    it('should send any remaining JSONL messages that were appended after last read', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);
      await manager.subscribe(testSessionName, ws);

      // Append more content without triggering watcher
      const { appendFileSync } = await import('node:fs');
      appendFileSync(testOutputFile, `${sampleMessages.pipelineEnd}\n`);

      broadcastFn.mockClear();
      await manager.notifySessionCompleted(testSessionName);

      expect(broadcastFn).toHaveBeenCalled();
      const message: LogsDataMessage = broadcastFn.mock.calls[0][1];
      expect(message.messages).toHaveLength(1);
      expect(message.messages[0]).toEqual(JSON.parse(sampleMessages.pipelineEnd));
    });

    it('should send empty messages array if no new content since last read', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);
      await manager.subscribe(testSessionName, ws);
      broadcastFn.mockClear();

      await manager.notifySessionCompleted(testSessionName);

      expect(broadcastFn).toHaveBeenCalled();
      const message: LogsDataMessage = broadcastFn.mock.calls[0][1];
      expect(message.messages).toEqual([]);
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

    it('should clean up line count after session completes', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);
      await manager.subscribe(testSessionName, ws);
      expect(manager.getLineCount(testSessionName)).toBe(1);

      await manager.notifySessionCompleted(testSessionName);

      expect(manager.getLineCount(testSessionName)).toBe(0);
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

      expect(broadcastFn).toHaveBeenCalledTimes(2);

      const clients = broadcastFn.mock.calls.map((call) => call[0]);
      expect(clients).toContain(ws1);
      expect(clients).toContain(ws2);

      for (const call of broadcastFn.mock.calls) {
        const message: LogsDataMessage = call[1];
        expect(message.isComplete).toBe(true);
      }
    });

    it('should not error when notifying completion for session with no subscribers', async () => {
      writeFileSync(testOutputFile, testContent);

      await expect(manager.notifySessionCompleted(testSessionName)).resolves.not.toThrow();
      expect(broadcastFn).not.toHaveBeenCalled();
    });

    it('should not error when notifying completion for non-existent session', async () => {
      await expect(manager.notifySessionCompleted('non-existent-session')).resolves.not.toThrow();
      expect(broadcastFn).not.toHaveBeenCalled();
    });

    it('should handle file read error gracefully when file was deleted', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, testContent);
      await manager.subscribe(testSessionName, ws);

      rmSync(testOutputFile);
      broadcastFn.mockClear();

      await manager.notifySessionCompleted(testSessionName);

      expect(manager.hasWatcher(testSessionName)).toBe(false);
      expect(manager.getSubscriptionCount(testSessionName)).toBe(0);
    });
  });

  describe('JSONL parsing', () => {
    const testSessionName = 'test-jsonl-parsing-session';
    const testOutputFile = join(OUTPUT_DIR, `${testSessionName}.jsonl`);

    beforeEach(() => {
      if (!existsSync(OUTPUT_DIR)) {
        mkdirSync(OUTPUT_DIR, { recursive: true });
      }
    });

    afterEach(() => {
      if (existsSync(testOutputFile)) {
        rmSync(testOutputFile);
      }
    });

    it('should parse SagaWorkerMessage types correctly', async () => {
      const ws = createMockWebSocket();
      const content = `${sampleMessages.pipelineStart}\n${sampleMessages.cycleStart}\n${sampleMessages.pipelineEnd}\n`;
      writeFileSync(testOutputFile, content);

      await manager.subscribe(testSessionName, ws);

      const message: LogsDataMessage = broadcastFn.mock.calls[0][1];
      expect(message.messages[0].type).toBe('saga_worker');
      expect(message.messages[0].subtype).toBe('pipeline_start');
      expect(message.messages[1].type).toBe('saga_worker');
      expect(message.messages[1].subtype).toBe('cycle_start');
      expect(message.messages[2].type).toBe('saga_worker');
      expect(message.messages[2].subtype).toBe('pipeline_end');
    });

    it('should parse SDK messages correctly', async () => {
      const ws = createMockWebSocket();
      const content = `${sampleMessages.sdkAssistant}\n`;
      writeFileSync(testOutputFile, content);

      await manager.subscribe(testSessionName, ws);

      const message: LogsDataMessage = broadcastFn.mock.calls[0][1];
      expect(message.messages).toHaveLength(1);
      expect(message.messages[0].type).toBe('assistant');
    });

    it('should handle mixed message types', async () => {
      const ws = createMockWebSocket();
      const content = `${sampleMessages.pipelineStart}\n${sampleMessages.sdkAssistant}\n${sampleMessages.pipelineStep}\n`;
      writeFileSync(testOutputFile, content);

      await manager.subscribe(testSessionName, ws);

      const message: LogsDataMessage = broadcastFn.mock.calls[0][1];
      expect(message.messages).toHaveLength(STANDARD_JSONL_LINE_COUNT);
      expect(message.messages[0].type).toBe('saga_worker');
      expect(message.messages[1].type).toBe('assistant');
      expect(message.messages[2].type).toBe('saga_worker');
    });

    it('should handle empty JSONL file', async () => {
      const ws = createMockWebSocket();
      writeFileSync(testOutputFile, '');

      await manager.subscribe(testSessionName, ws);

      const message: LogsDataMessage = broadcastFn.mock.calls[0][1];
      expect(message.messages).toEqual([]);
    });
  });
});
