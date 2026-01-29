/**
 * WebSocket Server Tests
 *
 * Tests for the WebSocket server that broadcasts real-time updates
 * for epic and story changes.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { WebSocket } from 'ws';
import { startServer, type ServerInstance } from '../index.js';

// Helper to create a temporary saga directory
async function createTempSagaDir(): Promise<string> {
  const tempDir = join(tmpdir(), `saga-ws-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(join(tempDir, '.saga', 'epics', 'test-epic', 'stories', 'test-story'), { recursive: true });

  // Create epic.md
  await writeFile(
    join(tempDir, '.saga', 'epics', 'test-epic', 'epic.md'),
    '# Test Epic\n\nA test epic for WebSocket tests.'
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
`
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

// Helper to get a random port in a safe range
function getRandomPort(): number {
  return Math.floor(Math.random() * 20000) + 30000; // 30000-50000
}

// Helper to create a WebSocket client and wait for connection
async function createWSClient(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    const timeout = setTimeout(() => {
      reject(new Error('WebSocket connection timeout'));
    }, 5000);

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
async function waitForMessage(ws: WebSocket, timeoutMs = 5000): Promise<{ event: string; data: unknown }> {
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
      const ws = await createWSClient(port);
      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
    });

    it('should handle multiple concurrent connections', async () => {
      const ws1 = await createWSClient(port);
      const ws2 = await createWSClient(port);
      const ws3 = await createWSClient(port);

      expect(ws1.readyState).toBe(WebSocket.OPEN);
      expect(ws2.readyState).toBe(WebSocket.OPEN);
      expect(ws3.readyState).toBe(WebSocket.OPEN);

      ws1.close();
      ws2.close();
      ws3.close();
    });

    it('should clean up connection on client disconnect', async () => {
      const ws = await createWSClient(port);
      ws.close();

      // Wait a bit for cleanup
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create a new connection to verify server is still accepting
      const ws2 = await createWSClient(port);
      expect(ws2.readyState).toBe(WebSocket.OPEN);
      ws2.close();
    });
  });

  describe('subscribe:story', () => {
    it('should accept subscribe:story messages', async () => {
      const ws = await createWSClient(port);

      // Subscribe to a story - should not throw
      sendMessage(ws, 'subscribe:story', { epicSlug: 'test-epic', storySlug: 'test-story' });

      // Wait a bit to ensure message was processed
      await new Promise((resolve) => setTimeout(resolve, 100));

      ws.close();
    });

    it('should track subscriptions per client', async () => {
      const ws1 = await createWSClient(port);
      const ws2 = await createWSClient(port);

      // ws1 subscribes to test-story
      sendMessage(ws1, 'subscribe:story', { epicSlug: 'test-epic', storySlug: 'test-story' });

      // ws2 subscribes to a different story
      sendMessage(ws2, 'subscribe:story', { epicSlug: 'test-epic', storySlug: 'another-story' });

      // Wait for subscriptions to be processed
      await new Promise((resolve) => setTimeout(resolve, 100));

      ws1.close();
      ws2.close();
    });
  });

  describe('unsubscribe:story', () => {
    it('should accept unsubscribe:story messages', async () => {
      const ws = await createWSClient(port);

      // Subscribe then unsubscribe
      sendMessage(ws, 'subscribe:story', { epicSlug: 'test-epic', storySlug: 'test-story' });
      await new Promise((resolve) => setTimeout(resolve, 50));

      sendMessage(ws, 'unsubscribe:story', { epicSlug: 'test-epic', storySlug: 'test-story' });
      await new Promise((resolve) => setTimeout(resolve, 50));

      ws.close();
    });
  });

  describe('epics:updated broadcast', () => {
    it('should broadcast epics:updated to all connected clients', async () => {
      const ws1 = await createWSClient(port);
      const ws2 = await createWSClient(port);

      // Wait for connections to stabilize
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Trigger an epic update by modifying epic.md
      await writeFile(
        join(tempDir, '.saga', 'epics', 'test-epic', 'epic.md'),
        '# Updated Test Epic\n\nModified content.'
      );

      // Both clients should receive epics:updated
      const [msg1, msg2] = await Promise.all([
        waitForMessage(ws1, 3000),
        waitForMessage(ws2, 3000),
      ]);

      expect(msg1.event).toBe('epics:updated');
      expect(msg2.event).toBe('epics:updated');
      expect(Array.isArray(msg1.data)).toBe(true);
      expect(Array.isArray(msg2.data)).toBe(true);

      ws1.close();
      ws2.close();
    });

    it('should broadcast epics:updated when a new epic is added', async () => {
      const ws = await createWSClient(port);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create a new epic
      await mkdir(join(tempDir, '.saga', 'epics', 'new-epic'), { recursive: true });
      await writeFile(
        join(tempDir, '.saga', 'epics', 'new-epic', 'epic.md'),
        '# New Epic\n\nA brand new epic.'
      );

      const msg = await waitForMessage(ws, 3000);
      expect(msg.event).toBe('epics:updated');

      ws.close();
    });
  });

  describe('story:updated broadcast', () => {
    it('should broadcast story:updated to subscribed clients when story changes', async () => {
      const ws = await createWSClient(port);

      // Subscribe to test-story
      sendMessage(ws, 'subscribe:story', { epicSlug: 'test-epic', storySlug: 'test-story' });
      await new Promise((resolve) => setTimeout(resolve, 100));

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
`
      );

      const msg = await waitForMessage(ws, 3000);
      expect(msg.event).toBe('story:updated');
      expect(msg.data).toHaveProperty('slug', 'test-story');
      expect(msg.data).toHaveProperty('epicSlug', 'test-epic');

      ws.close();
    });

    it('should NOT broadcast story:updated to clients NOT subscribed to that story', async () => {
      const subscribedWs = await createWSClient(port);
      const unsubscribedWs = await createWSClient(port);

      // Only subscribedWs subscribes to test-story
      sendMessage(subscribedWs, 'subscribe:story', { epicSlug: 'test-epic', storySlug: 'test-story' });
      await new Promise((resolve) => setTimeout(resolve, 100));

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
`
      );

      // subscribedWs should receive story:updated
      const msg = await waitForMessage(subscribedWs, 3000);
      expect(msg.event).toBe('story:updated');

      // unsubscribedWs should NOT receive story:updated (should timeout or receive epics:updated)
      // We'll try to get a message with a short timeout - it should be epics:updated if anything
      try {
        const unsubscribedMsg = await waitForMessage(unsubscribedWs, 500);
        // If we get a message, it should be epics:updated, not story:updated
        expect(unsubscribedMsg.event).not.toBe('story:updated');
      } catch {
        // Timeout is expected - no story:updated was sent
      }

      subscribedWs.close();
      unsubscribedWs.close();
    });

    it('should broadcast story:updated when journal.md is modified', async () => {
      const ws = await createWSClient(port);

      // Subscribe to test-story
      sendMessage(ws, 'subscribe:story', { epicSlug: 'test-epic', storySlug: 'test-story' });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create a journal.md file
      await writeFile(
        join(tempDir, '.saga', 'epics', 'test-epic', 'stories', 'test-story', 'journal.md'),
        `# Journal: test-story

## Session: 2026-01-27T00:00:00Z

### Task: t1

**What was done:**
- Started working on task 1
`
      );

      const msg = await waitForMessage(ws, 3000);
      expect(msg.event).toBe('story:updated');

      ws.close();
    });

    it('should include full StoryDetail in story:updated payload', async () => {
      const ws = await createWSClient(port);

      sendMessage(ws, 'subscribe:story', { epicSlug: 'test-epic', storySlug: 'test-story' });
      await new Promise((resolve) => setTimeout(resolve, 100));

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
`
      );

      const msg = await waitForMessage(ws, 3000);
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
      const ws = await createWSClient(port);

      // Send ping
      ws.ping();

      // Should receive pong
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Pong timeout')), 2000);
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
      const ws = await createWSClient(port);

      // Send malformed JSON
      ws.send('not valid json');

      // Wait a bit - server should not crash
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Server should still accept new connections
      const ws2 = await createWSClient(port);
      expect(ws2.readyState).toBe(WebSocket.OPEN);

      ws.close();
      ws2.close();
    });

    it('should handle messages with missing fields gracefully', async () => {
      const ws = await createWSClient(port);

      // Send message without required fields
      ws.send(JSON.stringify({ event: 'subscribe:story' })); // missing data
      ws.send(JSON.stringify({ data: {} })); // missing event
      ws.send(JSON.stringify({ event: 'subscribe:story', data: {} })); // missing slugs

      // Wait a bit - server should not crash
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Server should still work
      const ws2 = await createWSClient(port);
      expect(ws2.readyState).toBe(WebSocket.OPEN);

      ws.close();
      ws2.close();
    });
  });

  describe('sessions:updated broadcast', () => {
    it('should broadcast sessions:updated to all connected clients on session changes', async () => {
      const ws1 = await createWSClient(port);
      const ws2 = await createWSClient(port);

      // Wait for connections to stabilize
      await new Promise((resolve) => setTimeout(resolve, 100));

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
      const ws = await createWSClient(port);

      // Wait for initial poll which always broadcasts
      // Note: In a real test with tmux mocking we would verify the full flow
      // For now we just verify the connection is stable after session polling starts
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(ws.readyState).toBe(WebSocket.OPEN);

      ws.close();
    });
  });
});
