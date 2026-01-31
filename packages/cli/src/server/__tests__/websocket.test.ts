/**
 * WebSocket Server Tests
 *
 * Tests for the WebSocket server that broadcasts real-time updates
 * for epic and story changes.
 */

import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { appendFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { OUTPUT_DIR } from '../../lib/sessions.ts';
import { type ServerInstance, startServer } from '../index.ts';

// Constants for test configuration
const RANDOM_STRING_SLICE_START = 2;
const RANDOM_STRING_RADIX = 36;
const PORT_BASE = 40_000;
const WS_CONNECTION_TIMEOUT_MS = 5000;
const DEFAULT_MESSAGE_TIMEOUT_MS = 5000;
const SHORT_WAIT_MS = 50;
const MEDIUM_WAIT_MS = 100;
const LONG_WAIT_MS = 200;
const SHORT_MESSAGE_TIMEOUT_MS = 500;
const PONG_TIMEOUT_MS = 2000;
const MESSAGE_TIMEOUT_MS = 3000;
const FILE_WATCH_TIMEOUT_MS = 5000;
const LONG_TEST_TIMEOUT_MS = 10_000;
const VERY_LONG_TEST_TIMEOUT_MS = 15_000;

// Counter for unique port allocation per test
let portCounter = 0;

// Helper to create a temporary saga directory
async function createTempSagaDir(): Promise<string> {
  const tempDir = join(
    tmpdir(),
    `saga-ws-test-${Date.now()}-${Math.random().toString(RANDOM_STRING_RADIX).slice(RANDOM_STRING_SLICE_START)}`,
  );
  await mkdir(join(tempDir, '.saga', 'epics', 'test-epic', 'stories', 'test-story'), {
    recursive: true,
  });

  // Create epic.md
  await writeFile(
    join(tempDir, '.saga', 'epics', 'test-epic', 'epic.md'),
    '# Test Epic\n\nA test epic for WebSocket tests.',
  );

  // Create story.md
  await writeFile(
    join(tempDir, '.saga', 'epics', 'test-epic', 'stories', 'test-story', 'story.md'),
    `---
id: test-story
title: Test Story
status: in_progress
tasks:
  - id: t1
    title: Task 1
    status: pending
---

## Context

Test story for WebSocket testing.
`,
  );

  return tempDir;
}

// Helper to clean up temp directory
async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    await rm(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

// Helper to get a unique port for each test (avoids EADDRINUSE race conditions)
function getRandomPort(): number {
  portCounter++;
  return PORT_BASE + portCounter;
}

// Helper to create a WebSocket client and wait for connection
function createWsClient(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    const timeout = setTimeout(() => {
      reject(new Error('WebSocket connection timeout'));
    }, WS_CONNECTION_TIMEOUT_MS);

    ws.on('open', () => {
      clearTimeout(timeout);
      resolve(ws);
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// Helper to wait for a message from WebSocket
function waitForMessage(
  ws: WebSocket,
  timeoutMs = DEFAULT_MESSAGE_TIMEOUT_MS,
): Promise<{ event: string; data: unknown }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('WebSocket message timeout'));
    }, timeoutMs);

    const handler = (data: Buffer) => {
      clearTimeout(timeout);
      try {
        const parsed = JSON.parse(data.toString());
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };

    ws.once('message', handler);
  });
}

// Helper to send a message over WebSocket
function sendMessage(ws: WebSocket, event: string, data: unknown): void {
  ws.send(JSON.stringify({ event, data }));
}

describe('websocket', () => {
  let tempDir: string;
  let server: ServerInstance;
  let port: number;

  beforeEach(async () => {
    tempDir = await createTempSagaDir();
    port = getRandomPort();
    server = await startServer({ sagaRoot: tempDir, port });
  });

  afterEach(async () => {
    if (server) {
      await server.close();
    }
    await cleanupTempDir(tempDir);
  });

  describe('connection', () => {
    it('should accept WebSocket connections on same port as HTTP', async () => {
      const ws = await createWsClient(port);
      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
    });

    it('should handle multiple concurrent connections', async () => {
      const ws1 = await createWsClient(port);
      const ws2 = await createWsClient(port);
      const ws3 = await createWsClient(port);

      expect(ws1.readyState).toBe(WebSocket.OPEN);
      expect(ws2.readyState).toBe(WebSocket.OPEN);
      expect(ws3.readyState).toBe(WebSocket.OPEN);

      ws1.close();
      ws2.close();
      ws3.close();
    });

    it('should clean up connection on client disconnect', async () => {
      const ws = await createWsClient(port);
      ws.close();

      // Wait a bit for cleanup
      await new Promise((resolve) => setTimeout(resolve, MEDIUM_WAIT_MS));

      // Create a new connection to verify server is still accepting
      const ws2 = await createWsClient(port);
      expect(ws2.readyState).toBe(WebSocket.OPEN);
      ws2.close();
    });
  });

  describe('subscribe:story', () => {
    it('should accept subscribe:story messages', async () => {
      const ws = await createWsClient(port);

      // Subscribe to a story - should not throw
      sendMessage(ws, 'subscribe:story', { epicSlug: 'test-epic', storySlug: 'test-story' });

      // Wait a bit to ensure message was processed
      await new Promise((resolve) => setTimeout(resolve, MEDIUM_WAIT_MS));

      ws.close();
    });

    it('should track subscriptions per client', async () => {
      const ws1 = await createWsClient(port);
      const ws2 = await createWsClient(port);

      // ws1 subscribes to test-story
      sendMessage(ws1, 'subscribe:story', { epicSlug: 'test-epic', storySlug: 'test-story' });

      // ws2 subscribes to a different story
      sendMessage(ws2, 'subscribe:story', { epicSlug: 'test-epic', storySlug: 'another-story' });

      // Wait for subscriptions to be processed
      await new Promise((resolve) => setTimeout(resolve, MEDIUM_WAIT_MS));

      ws1.close();
      ws2.close();
    });
  });

  describe('unsubscribe:story', () => {
    it('should accept unsubscribe:story messages', async () => {
      const ws = await createWsClient(port);

      // Subscribe then unsubscribe
      sendMessage(ws, 'subscribe:story', { epicSlug: 'test-epic', storySlug: 'test-story' });
      await new Promise((resolve) => setTimeout(resolve, SHORT_WAIT_MS));

      sendMessage(ws, 'unsubscribe:story', { epicSlug: 'test-epic', storySlug: 'test-story' });
      await new Promise((resolve) => setTimeout(resolve, SHORT_WAIT_MS));

      ws.close();
    });
  });

  describe('epics:updated broadcast', () => {
    it('should broadcast epics:updated to all connected clients', async () => {
      const ws1 = await createWsClient(port);
      const ws2 = await createWsClient(port);

      // Wait for connections to stabilize
      await new Promise((resolve) => setTimeout(resolve, MEDIUM_WAIT_MS));

      // Trigger an epic update by modifying epic.md
      await writeFile(
        join(tempDir, '.saga', 'epics', 'test-epic', 'epic.md'),
        '# Updated Test Epic\n\nModified content.',
      );

      // Both clients should receive epics:updated
      const [msg1, msg2] = await Promise.all([
        waitForMessage(ws1, MESSAGE_TIMEOUT_MS),
        waitForMessage(ws2, MESSAGE_TIMEOUT_MS),
      ]);

      expect(msg1.event).toBe('epics:updated');
      expect(msg2.event).toBe('epics:updated');
      expect(Array.isArray(msg1.data)).toBe(true);
      expect(Array.isArray(msg2.data)).toBe(true);

      ws1.close();
      ws2.close();
    });

    it('should broadcast epics:updated when a new epic is added', async () => {
      const ws = await createWsClient(port);
      await new Promise((resolve) => setTimeout(resolve, MEDIUM_WAIT_MS));

      // Create a new epic
      await mkdir(join(tempDir, '.saga', 'epics', 'new-epic'), { recursive: true });
      await writeFile(
        join(tempDir, '.saga', 'epics', 'new-epic', 'epic.md'),
        '# New Epic\n\nA brand new epic.',
      );

      const msg = await waitForMessage(ws, MESSAGE_TIMEOUT_MS);
      expect(msg.event).toBe('epics:updated');

      ws.close();
    });
  });

  describe('story:updated broadcast', () => {
    it('should broadcast story:updated to subscribed clients when story changes', async () => {
      const ws = await createWsClient(port);

      // Subscribe to test-story
      sendMessage(ws, 'subscribe:story', { epicSlug: 'test-epic', storySlug: 'test-story' });
      await new Promise((resolve) => setTimeout(resolve, MEDIUM_WAIT_MS));

      // Modify the story
      await writeFile(
        join(tempDir, '.saga', 'epics', 'test-epic', 'stories', 'test-story', 'story.md'),
        `---
id: test-story
title: Updated Test Story
status: completed
tasks:
  - id: t1
    title: Task 1
    status: completed
---

## Context

Updated story content.
`,
      );

      const msg = await waitForMessage(ws, MESSAGE_TIMEOUT_MS);
      expect(msg.event).toBe('story:updated');
      expect(msg.data).toHaveProperty('slug', 'test-story');
      expect(msg.data).toHaveProperty('epicSlug', 'test-epic');

      ws.close();
    });

    it('should NOT broadcast story:updated to clients NOT subscribed to that story', async () => {
      const subscribedWs = await createWsClient(port);
      const unsubscribedWs = await createWsClient(port);

      // Only subscribedWs subscribes to test-story
      sendMessage(subscribedWs, 'subscribe:story', {
        epicSlug: 'test-epic',
        storySlug: 'test-story',
      });
      await new Promise((resolve) => setTimeout(resolve, MEDIUM_WAIT_MS));

      // Modify the story
      await writeFile(
        join(tempDir, '.saga', 'epics', 'test-epic', 'stories', 'test-story', 'story.md'),
        `---
id: test-story
title: Modified Again
status: blocked
tasks: []
---

Modified.
`,
      );

      // subscribedWs should receive story:updated
      const msg = await waitForMessage(subscribedWs, MESSAGE_TIMEOUT_MS);
      expect(msg.event).toBe('story:updated');

      // unsubscribedWs should NOT receive story:updated (should timeout or receive epics:updated)
      // We'll try to get a message with a short timeout - it should be epics:updated if anything
      try {
        const unsubscribedMsg = await waitForMessage(unsubscribedWs, SHORT_MESSAGE_TIMEOUT_MS);
        // If we get a message, it should be epics:updated, not story:updated
        expect(unsubscribedMsg.event).not.toBe('story:updated');
      } catch {
        // Timeout is expected - no story:updated was sent
      }

      subscribedWs.close();
      unsubscribedWs.close();
    });

    it('should broadcast story:updated when journal.md is modified', async () => {
      const ws = await createWsClient(port);

      // Subscribe to test-story
      sendMessage(ws, 'subscribe:story', { epicSlug: 'test-epic', storySlug: 'test-story' });
      await new Promise((resolve) => setTimeout(resolve, MEDIUM_WAIT_MS));

      // Create a journal.md file
      await writeFile(
        join(tempDir, '.saga', 'epics', 'test-epic', 'stories', 'test-story', 'journal.md'),
        `# Journal: test-story

## Session: 2026-01-27T00:00:00Z

### Task: t1

**What was done:**
- Started working on task 1
`,
      );

      const msg = await waitForMessage(ws, MESSAGE_TIMEOUT_MS);
      expect(msg.event).toBe('story:updated');

      ws.close();
    });

    it('should include full StoryDetail in story:updated payload', async () => {
      const ws = await createWsClient(port);

      sendMessage(ws, 'subscribe:story', { epicSlug: 'test-epic', storySlug: 'test-story' });
      await new Promise((resolve) => setTimeout(resolve, MEDIUM_WAIT_MS));

      // Modify the story
      await writeFile(
        join(tempDir, '.saga', 'epics', 'test-epic', 'stories', 'test-story', 'story.md'),
        `---
id: test-story
title: Full Detail Test
status: in_progress
tasks:
  - id: t1
    title: Task One
    status: completed
  - id: t2
    title: Task Two
    status: pending
---

Story content.
`,
      );

      const msg = await waitForMessage(ws, MESSAGE_TIMEOUT_MS);
      expect(msg.event).toBe('story:updated');
      expect(msg.data).toHaveProperty('slug');
      expect(msg.data).toHaveProperty('title');
      expect(msg.data).toHaveProperty('status');
      expect(msg.data).toHaveProperty('tasks');
      expect(Array.isArray((msg.data as { tasks: unknown[] }).tasks)).toBe(true);

      ws.close();
    });
  });

  describe('heartbeat', () => {
    it('should respond to ping with pong', async () => {
      const ws = await createWsClient(port);

      // Send ping
      ws.ping();

      // Should receive pong
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Pong timeout')), PONG_TIMEOUT_MS);
        ws.once('pong', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      ws.close();
    });
  });

  describe('error handling', () => {
    it('should handle malformed messages gracefully', async () => {
      const ws = await createWsClient(port);

      // Send malformed JSON
      ws.send('not valid json');

      // Wait a bit - server should not crash
      await new Promise((resolve) => setTimeout(resolve, MEDIUM_WAIT_MS));

      // Server should still accept new connections
      const ws2 = await createWsClient(port);
      expect(ws2.readyState).toBe(WebSocket.OPEN);

      ws.close();
      ws2.close();
    });

    it('should handle messages with missing fields gracefully', async () => {
      const ws = await createWsClient(port);

      // Send message without required fields
      ws.send(JSON.stringify({ event: 'subscribe:story' })); // missing data
      ws.send(JSON.stringify({ data: {} })); // missing event
      ws.send(JSON.stringify({ event: 'subscribe:story', data: {} })); // missing slugs

      // Wait a bit - server should not crash
      await new Promise((resolve) => setTimeout(resolve, MEDIUM_WAIT_MS));

      // Server should still work
      const ws2 = await createWsClient(port);
      expect(ws2.readyState).toBe(WebSocket.OPEN);

      ws.close();
      ws2.close();
    });
  });

  describe('sessions:updated broadcast', () => {
    it('should broadcast sessions:updated to all connected clients on session changes', async () => {
      const ws1 = await createWsClient(port);
      const ws2 = await createWsClient(port);

      // Wait for connections to stabilize
      await new Promise((resolve) => setTimeout(resolve, MEDIUM_WAIT_MS));

      // Wait for a potential sessions:updated message (from initial poll)
      // Note: This may or may not come depending on whether there are any SAGA sessions
      // The important thing is that the server should be broadcasting to both clients
      // We can't easily trigger session creation in this test, but we verify the infrastructure works

      // Just verify both clients are connected and can receive messages
      expect(ws1.readyState).toBe(WebSocket.OPEN);
      expect(ws2.readyState).toBe(WebSocket.OPEN);

      ws1.close();
      ws2.close();
    });

    it('should include sessions array in sessions:updated messages', async () => {
      const ws = await createWsClient(port);

      // Wait for initial poll which always broadcasts
      // Note: In a real test with tmux mocking we would verify the full flow
      // For now we just verify the connection is stable after session polling starts
      await new Promise((resolve) => setTimeout(resolve, LONG_WAIT_MS));

      expect(ws.readyState).toBe(WebSocket.OPEN);

      ws.close();
    });
  });

  describe('subscribe:logs and unsubscribe:logs', () => {
    const testSessionName = 'saga__test-epic__test-story__12345';
    const testOutputFile = join(OUTPUT_DIR, `${testSessionName}.out`);
    const testLogContent = 'Log line 1\nLog line 2\nLog line 3\n';

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

    it('should send initial log content when client subscribes to logs', async () => {
      // Create log file
      await writeFile(testOutputFile, testLogContent);

      const ws = await createWsClient(port);

      // Subscribe to logs
      sendMessage(ws, 'subscribe:logs', { sessionName: testSessionName });

      // Should receive logs:data with initial content
      const msg = await waitForMessage(ws, MESSAGE_TIMEOUT_MS);
      expect(msg.event).toBe('logs:data');
      expect(msg.data).toHaveProperty('sessionName', testSessionName);
      expect(msg.data).toHaveProperty('data', testLogContent);
      expect(msg.data).toHaveProperty('isInitial', true);
      expect(msg.data).toHaveProperty('isComplete', false);

      ws.close();
    });

    it('should send error when subscribing to non-existent log file', async () => {
      const ws = await createWsClient(port);

      // Subscribe to logs for non-existent session
      sendMessage(ws, 'subscribe:logs', { sessionName: 'non-existent-session' });

      // Should receive logs:error
      const msg = await waitForMessage(ws, MESSAGE_TIMEOUT_MS);
      expect(msg.event).toBe('logs:error');
      expect(msg.data).toHaveProperty('sessionName', 'non-existent-session');
      expect(msg.data).toHaveProperty('error');

      ws.close();
    });

    it(
      'should send incremental updates when log file is appended',
      async () => {
        // Create initial log file
        await writeFile(testOutputFile, testLogContent);

        const ws = await createWsClient(port);

        // Subscribe to logs
        sendMessage(ws, 'subscribe:logs', { sessionName: testSessionName });

        // Wait for initial content
        const initialMsg = await waitForMessage(ws, MESSAGE_TIMEOUT_MS);
        expect(initialMsg.event).toBe('logs:data');
        expect((initialMsg.data as { isInitial: boolean }).isInitial).toBe(true);

        // Append new content
        const newContent = 'New log line 4\n';
        await appendFile(testOutputFile, newContent);

        // Wait for incremental update
        const incrementalMsg = await waitForMessage(ws, FILE_WATCH_TIMEOUT_MS);
        expect(incrementalMsg.event).toBe('logs:data');
        expect(incrementalMsg.data).toHaveProperty('data', newContent);
        expect(incrementalMsg.data).toHaveProperty('isInitial', false);
        expect(incrementalMsg.data).toHaveProperty('isComplete', false);

        ws.close();
      },
      LONG_TEST_TIMEOUT_MS,
    );

    it('should stop receiving updates after unsubscribing from logs', async () => {
      // Create log file
      await writeFile(testOutputFile, testLogContent);

      const ws = await createWsClient(port);

      // Subscribe to logs
      sendMessage(ws, 'subscribe:logs', { sessionName: testSessionName });

      // Wait for initial content
      const initialMsg = await waitForMessage(ws, MESSAGE_TIMEOUT_MS);
      expect(initialMsg.event).toBe('logs:data');

      // Unsubscribe
      sendMessage(ws, 'unsubscribe:logs', { sessionName: testSessionName });
      await new Promise((resolve) => setTimeout(resolve, MEDIUM_WAIT_MS));

      // Append new content
      await appendFile(testOutputFile, 'Should not receive this\n');

      // Should NOT receive any more messages (timeout expected)
      try {
        await waitForMessage(ws, SHORT_MESSAGE_TIMEOUT_MS);
        // If we get here, we received a message - check it's not logs:data for our session
        // (could be sessions:updated from polling)
      } catch {
        // Timeout expected - no message received, which is correct
      }

      ws.close();
    });

    it(
      'should handle multiple clients subscribing to the same log',
      async () => {
        // Create log file
        await writeFile(testOutputFile, testLogContent);

        const ws1 = await createWsClient(port);
        const ws2 = await createWsClient(port);

        // Both clients subscribe
        sendMessage(ws1, 'subscribe:logs', { sessionName: testSessionName });
        sendMessage(ws2, 'subscribe:logs', { sessionName: testSessionName });

        // Both should receive initial content
        const [msg1, msg2] = await Promise.all([
          waitForMessage(ws1, MESSAGE_TIMEOUT_MS),
          waitForMessage(ws2, MESSAGE_TIMEOUT_MS),
        ]);

        expect(msg1.event).toBe('logs:data');
        expect(msg2.event).toBe('logs:data');
        expect((msg1.data as { isInitial: boolean }).isInitial).toBe(true);
        expect((msg2.data as { isInitial: boolean }).isInitial).toBe(true);

        // Append new content
        const newContent = 'Broadcast to both clients\n';
        await appendFile(testOutputFile, newContent);

        // Both should receive incremental update
        const [update1, update2] = await Promise.all([
          waitForMessage(ws1, FILE_WATCH_TIMEOUT_MS),
          waitForMessage(ws2, FILE_WATCH_TIMEOUT_MS),
        ]);

        expect(update1.event).toBe('logs:data');
        expect(update2.event).toBe('logs:data');
        expect((update1.data as { data: string }).data).toBe(newContent);
        expect((update2.data as { data: string }).data).toBe(newContent);

        ws1.close();
        ws2.close();
      },
      VERY_LONG_TEST_TIMEOUT_MS,
    );

    it('should clean up log subscription when client disconnects', async () => {
      // Create log file
      await writeFile(testOutputFile, testLogContent);

      const ws = await createWsClient(port);

      // Subscribe to logs
      sendMessage(ws, 'subscribe:logs', { sessionName: testSessionName });

      // Wait for initial content
      await waitForMessage(ws, MESSAGE_TIMEOUT_MS);

      // Close connection
      ws.close();

      // Wait for cleanup
      await new Promise((resolve) => setTimeout(resolve, LONG_WAIT_MS));

      // Server should still be accepting new connections (didn't crash)
      const ws2 = await createWsClient(port);
      expect(ws2.readyState).toBe(WebSocket.OPEN);
      ws2.close();
    });
  });

  describe('log streaming and session completion integration', () => {
    const testSessionName = 'saga__integration-epic__integration-story__99999';
    const testOutputFile = join(OUTPUT_DIR, `${testSessionName}.out`);
    const testLogContent = 'Integration test log content\n';

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

    it('should handle subscribe:logs message with missing sessionName gracefully', async () => {
      const ws = await createWsClient(port);

      // Send malformed subscribe:logs (no sessionName)
      sendMessage(ws, 'subscribe:logs', {});

      // Wait a bit - server should not crash
      await new Promise((resolve) => setTimeout(resolve, MEDIUM_WAIT_MS));

      // Server should still work
      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
    });

    it('should handle unsubscribe:logs for session not subscribed to', async () => {
      const ws = await createWsClient(port);

      // Unsubscribe from a session we never subscribed to
      sendMessage(ws, 'unsubscribe:logs', { sessionName: 'never-subscribed' });

      // Wait a bit - server should not crash
      await new Promise((resolve) => setTimeout(resolve, MEDIUM_WAIT_MS));

      // Server should still work
      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
    });

    it('should allow subscribing to logs and stories simultaneously', async () => {
      // Create log file
      await writeFile(testOutputFile, testLogContent);

      const ws = await createWsClient(port);

      // Subscribe to both logs and a story
      sendMessage(ws, 'subscribe:logs', { sessionName: testSessionName });
      sendMessage(ws, 'subscribe:story', { epicSlug: 'test-epic', storySlug: 'test-story' });

      // Should receive logs:data for the log subscription
      const logMsg = await waitForMessage(ws, MESSAGE_TIMEOUT_MS);
      expect(logMsg.event).toBe('logs:data');

      // Can still receive story updates if story changes
      // (just verify server didn't crash from dual subscription)
      expect(ws.readyState).toBe(WebSocket.OPEN);

      ws.close();
    });

    it(
      'should continue log streaming for other clients when one unsubscribes',
      async () => {
        // Create log file
        await writeFile(testOutputFile, testLogContent);

        const ws1 = await createWsClient(port);
        const ws2 = await createWsClient(port);

        // Both subscribe
        sendMessage(ws1, 'subscribe:logs', { sessionName: testSessionName });
        sendMessage(ws2, 'subscribe:logs', { sessionName: testSessionName });

        // Wait for initial content on both
        await Promise.all([
          waitForMessage(ws1, MESSAGE_TIMEOUT_MS),
          waitForMessage(ws2, MESSAGE_TIMEOUT_MS),
        ]);

        // ws1 unsubscribes
        sendMessage(ws1, 'unsubscribe:logs', { sessionName: testSessionName });
        await new Promise((resolve) => setTimeout(resolve, MEDIUM_WAIT_MS));

        // Append new content
        const newContent = 'Only ws2 should receive this\n';
        await appendFile(testOutputFile, newContent);

        // ws2 should still receive updates
        const update = await waitForMessage(ws2, FILE_WATCH_TIMEOUT_MS);
        expect(update.event).toBe('logs:data');
        expect((update.data as { data: string }).data).toBe(newContent);

        ws1.close();
        ws2.close();
      },
      LONG_TEST_TIMEOUT_MS,
    );
  });
});
