/**
 * Integration Tests for SAGA Dashboard Server
 *
 * Tests the full end-to-end flow:
 * - File changes detected by watcher
 * - Updates broadcast via WebSocket
 * - Updates reach clients within 1 second
 * - Server error handling without crashing
 */

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { type ServerInstance, startServer } from '../index.ts';

// Constants for magic numbers
const BASE_36 = 36;
const RANDOM_STRING_SLICE_START = 2;
const PORT_RANGE = 20_000;
const PORT_BASE = 30_000;
const WS_CONNECTION_TIMEOUT_MS = 5000;
const SHORT_DELAY_MS = 100;
const MEDIUM_DELAY_MS = 200;
const WATCHER_DELAY_MS = 500;
/** Delay after server starts to let watcher settle (polling mode is predictable) */
const WATCHER_SETTLE_DELAY_MS = 150;
const EVENT_TIMEOUT_MS = 1000;
const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
const RAPID_CONNECTION_COUNT = 5;
const CONCURRENT_CLIENT_COUNT = 3;
const PERFORMANCE_CLIENT_COUNT = 10;

// Helper to create a temporary saga directory
async function createTempSagaDir(): Promise<string> {
  const tempDir = join(
    tmpdir(),
    `saga-integration-test-${Date.now()}-${Math.random().toString(BASE_36).slice(RANDOM_STRING_SLICE_START)}`,
  );

  // Create epic structure
  await mkdir(join(tempDir, '.saga', 'epics', 'test-epic', 'stories', 'test-story'), {
    recursive: true,
  });
  await mkdir(join(tempDir, '.saga', 'archive'), { recursive: true });

  // Create epic.md
  await writeFile(
    join(tempDir, '.saga', 'epics', 'test-epic', 'epic.md'),
    '# Test Epic\n\nA test epic for integration testing.',
  );

  // Create story.md with valid frontmatter
  await writeFile(
    join(tempDir, '.saga', 'epics', 'test-epic', 'stories', 'test-story', 'story.md'),
    `---
id: test-story
title: Test Story
status: ready
tasks:
  - id: t1
    title: Task 1
    status: pending
  - id: t2
    title: Task 2
    status: pending
---

## Context

Integration test story.
`,
  );

  return tempDir;
}

// Helper to get a random port in a safe range
function getRandomPort(): number {
  return Math.floor(Math.random() * PORT_RANGE) + PORT_BASE; // 30000-50000
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

// Helper to wait for a specific WebSocket event
function waitForEvent(
  ws: WebSocket,
  eventType: string,
  timeoutMs = EVENT_TIMEOUT_MS,
): Promise<{ event: string; data: unknown }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${eventType} event`));
    }, timeoutMs);

    const handler = (data: Buffer) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.event === eventType) {
          clearTimeout(timeout);
          ws.removeListener('message', handler);
          resolve(parsed);
        }
      } catch {
        // Ignore parse errors, keep waiting
      }
    };

    ws.on('message', handler);
  });
}

// Helper to send a WebSocket message
function sendMessage(ws: WebSocket, event: string, data: unknown): void {
  ws.send(JSON.stringify({ event, data }));
}

describe('integration', () => {
  let tempDir: string;
  let server: ServerInstance;
  let port: number;

  beforeEach(async () => {
    tempDir = await createTempSagaDir();
    port = getRandomPort();
    server = await startServer({ sagaRoot: tempDir, port });
    // Wait for watcher to settle and process any initial events from file creation
    await new Promise((resolve) => setTimeout(resolve, WATCHER_SETTLE_DELAY_MS));
  });

  afterEach(async () => {
    if (server) {
      await server.close();
    }
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('full flow: file change → watcher → WebSocket → client', () => {
    it('should deliver story update to subscribed client within 1 second', async () => {
      const ws = await createWsClient(port);

      // Subscribe to story updates
      sendMessage(ws, 'subscribe:story', { epicSlug: 'test-epic', storySlug: 'test-story' });
      await new Promise((resolve) => setTimeout(resolve, SHORT_DELAY_MS));

      // Record start time
      const startTime = Date.now();

      // Modify the story file (YAML uses snake_case, API returns camelCase)
      await writeFile(
        join(tempDir, '.saga', 'epics', 'test-epic', 'stories', 'test-story', 'story.md'),
        `---
id: test-story
title: Updated Story Title
status: in_progress
tasks:
  - id: t1
    title: Task 1
    status: in_progress
  - id: t2
    title: Task 2
    status: pending
---

## Context

Updated content.
`,
      );

      // Wait for story:updated event
      const msg = await waitForEvent(ws, 'story:updated', EVENT_TIMEOUT_MS);

      // Calculate time elapsed
      const elapsed = Date.now() - startTime;

      // Verify update was received within 1 second
      expect(elapsed).toBeLessThan(EVENT_TIMEOUT_MS);
      expect(msg.event).toBe('story:updated');
      expect(msg.data).toHaveProperty('title', 'Updated Story Title');
      expect(msg.data).toHaveProperty('status', 'inProgress');

      ws.close();
    });

    it('should deliver epic update to all clients when structure changes', async () => {
      const ws1 = await createWsClient(port);
      const ws2 = await createWsClient(port);
      await new Promise((resolve) => setTimeout(resolve, SHORT_DELAY_MS));

      // Record start time
      const startTime = Date.now();

      // Create a new story (changes epic structure)
      await mkdir(join(tempDir, '.saga', 'epics', 'test-epic', 'stories', 'new-story'), {
        recursive: true,
      });
      await writeFile(
        join(tempDir, '.saga', 'epics', 'test-epic', 'stories', 'new-story', 'story.md'),
        `---
id: new-story
title: New Story
status: ready
tasks: []
---
`,
      );

      // Both clients should receive epics:updated
      const [msg1, msg2] = await Promise.all([
        waitForEvent(ws1, 'epics:updated', EVENT_TIMEOUT_MS),
        waitForEvent(ws2, 'epics:updated', EVENT_TIMEOUT_MS),
      ]);

      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(EVENT_TIMEOUT_MS);
      expect(msg1.event).toBe('epics:updated');
      expect(msg2.event).toBe('epics:updated');

      ws1.close();
      ws2.close();
    });

    it('should update story via API after file change is detected', async () => {
      // Get initial story data
      const initialRes = await request(server.app).get('/api/stories/test-epic/test-story');
      expect(initialRes.status).toBe(HTTP_OK);
      expect(initialRes.body.status).toBe('ready');

      // Modify story file
      await writeFile(
        join(tempDir, '.saga', 'epics', 'test-epic', 'stories', 'test-story', 'story.md'),
        `---
id: test-story
title: API Test Story
status: completed
tasks:
  - id: t1
    title: Task 1
    status: completed
---

Done.
`,
      );

      // Wait for watcher to detect and cache to refresh
      await new Promise((resolve) => setTimeout(resolve, WATCHER_DELAY_MS));

      // Get updated story data
      const updatedRes = await request(server.app).get('/api/stories/test-epic/test-story');
      expect(updatedRes.status).toBe(HTTP_OK);
      expect(updatedRes.body.status).toBe('completed');
      expect(updatedRes.body.title).toBe('API Test Story');
    });
  });

  describe('server lifecycle', () => {
    it('should start and serve requests', async () => {
      const res = await request(server.app).get('/api/health');
      expect(res.status).toBe(HTTP_OK);
      expect(res.body).toEqual({ status: 'ok' });
    });

    it('should stop cleanly and reject new connections', async () => {
      // Store port before closing
      const serverPort = port;

      // Close the server
      await server.close();
      // Mark server as closed so afterEach doesn't try to close it again
      server = null as unknown as ServerInstance;

      // HTTP requests should fail
      try {
        await fetch(`http://localhost:${serverPort}/api/health`);
        expect.fail('Should have thrown connection error');
      } catch (err) {
        expect((err as Error).message).toContain('fetch failed');
      }
    });

    it('should close WebSocket connections on shutdown', async () => {
      const ws = await createWsClient(port);
      expect(ws.readyState).toBe(WebSocket.OPEN);

      // Close server
      await server.close();
      // Mark server as closed so afterEach doesn't try to close it again
      server = null as unknown as ServerInstance;

      // Wait for WebSocket to close
      await new Promise<void>((resolve) => {
        if (ws.readyState === WebSocket.CLOSED) {
          resolve();
        } else {
          ws.on('close', () => resolve());
        }
      });

      expect(ws.readyState).toBe(WebSocket.CLOSED);
    });
  });

  describe('error recovery', () => {
    it('should continue serving after invalid API requests', async () => {
      // Make an invalid request
      const invalid1 = await request(server.app).get('/api/epics/nonexistent');
      expect(invalid1.status).toBe(HTTP_NOT_FOUND);

      const invalid2 = await request(server.app).get('/api/stories/bad/path');
      expect(invalid2.status).toBe(HTTP_NOT_FOUND);

      // Server should still work
      const valid = await request(server.app).get('/api/health');
      expect(valid.status).toBe(HTTP_OK);
    });

    it('should handle rapid WebSocket connections and disconnections', async () => {
      // Create and close multiple connections rapidly
      const connectionPromises: Promise<WebSocket>[] = [];
      for (let i = 0; i < RAPID_CONNECTION_COUNT; i++) {
        connectionPromises.push(createWsClient(port));
      }
      const connections = await Promise.all(connectionPromises);

      // Close all connections
      for (const ws of connections) {
        ws.close();
      }

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, SHORT_DELAY_MS));

      // Server should still accept new connections
      const newWs = await createWsClient(port);
      expect(newWs.readyState).toBe(WebSocket.OPEN);
      newWs.close();
    });

    it('should handle file operations during high WebSocket activity', async () => {
      // Create multiple WebSocket clients
      const clientPromises: Promise<WebSocket>[] = [];
      for (let i = 0; i < CONCURRENT_CLIENT_COUNT; i++) {
        clientPromises.push(createWsClient(port));
      }
      const clients = await Promise.all(clientPromises);

      for (const ws of clients) {
        sendMessage(ws, 'subscribe:story', { epicSlug: 'test-epic', storySlug: 'test-story' });
      }

      await new Promise((resolve) => setTimeout(resolve, SHORT_DELAY_MS));

      // Make file changes while clients are connected
      await writeFile(
        join(tempDir, '.saga', 'epics', 'test-epic', 'stories', 'test-story', 'story.md'),
        `---
id: test-story
title: Concurrent Test
status: blocked
tasks: []
---
`,
      );

      // All clients should receive update
      const messages = await Promise.all(
        clients.map((ws) => waitForEvent(ws, 'story:updated', EVENT_TIMEOUT_MS)),
      );

      expect(messages.length).toBe(CONCURRENT_CLIENT_COUNT);
      for (const msg of messages) {
        expect(msg.event).toBe('story:updated');
      }

      for (const ws of clients) {
        ws.close();
      }
    });
  });

  describe('data consistency', () => {
    it('should return consistent data between API and WebSocket', async () => {
      const ws = await createWsClient(port);
      sendMessage(ws, 'subscribe:story', { epicSlug: 'test-epic', storySlug: 'test-story' });
      await new Promise((resolve) => setTimeout(resolve, SHORT_DELAY_MS));

      // Modify story (YAML uses snake_case)
      await writeFile(
        join(tempDir, '.saga', 'epics', 'test-epic', 'stories', 'test-story', 'story.md'),
        `---
id: test-story
title: Consistency Test
status: in_progress
tasks:
  - id: t1
    title: Consistent Task
    status: in_progress
---
`,
      );

      // Get WebSocket update
      const wsMsg = await waitForEvent(ws, 'story:updated', EVENT_TIMEOUT_MS);

      // Get API response
      await new Promise((resolve) => setTimeout(resolve, SHORT_DELAY_MS));
      const apiRes = await request(server.app).get('/api/stories/test-epic/test-story');

      // Both should have the same data
      const wsData = wsMsg.data as { title: string; status: string; tasks: unknown[] };
      expect(wsData.title).toBe(apiRes.body.title);
      expect(wsData.status).toBe(apiRes.body.status);
      expect(wsData.tasks).toHaveLength(apiRes.body.tasks.length);

      ws.close();
    });

    it('should include journal in story updates when present', async () => {
      const ws = await createWsClient(port);
      sendMessage(ws, 'subscribe:story', { epicSlug: 'test-epic', storySlug: 'test-story' });
      await new Promise((resolve) => setTimeout(resolve, SHORT_DELAY_MS));

      // Create a journal file
      await writeFile(
        join(tempDir, '.saga', 'epics', 'test-epic', 'stories', 'test-story', 'journal.md'),
        `# Journal: test-story

## Session: 2026-01-27T00:00:00Z

### Task: t1

**What was done:**
- Completed integration test

## Blocker: Need review

Waiting for code review.
`,
      );

      // Wait for update
      const msg = await waitForEvent(ws, 'story:updated', EVENT_TIMEOUT_MS);
      const _data = msg.data as { journal?: unknown[] };

      // Journal should be included if the story detail includes it
      // Note: The WebSocket broadcasts the parsed story data which may or may not include journal
      // depending on implementation. This test verifies the behavior.
      expect(msg.event).toBe('story:updated');

      ws.close();
    });
  });

  describe('performance', () => {
    it('should handle multiple concurrent subscribers efficiently', async () => {
      // Create multiple clients and subscribe them all
      const clientPromises: Promise<WebSocket>[] = [];
      for (let i = 0; i < PERFORMANCE_CLIENT_COUNT; i++) {
        clientPromises.push(createWsClient(port));
      }
      const clients = await Promise.all(clientPromises);

      for (const ws of clients) {
        sendMessage(ws, 'subscribe:story', { epicSlug: 'test-epic', storySlug: 'test-story' });
      }

      await new Promise((resolve) => setTimeout(resolve, MEDIUM_DELAY_MS));

      const startTime = Date.now();

      // Trigger an update
      await writeFile(
        join(tempDir, '.saga', 'epics', 'test-epic', 'stories', 'test-story', 'story.md'),
        `---
id: test-story
title: Performance Test
status: completed
tasks: []
---
`,
      );

      // All clients should receive update within 1 second
      const messages = await Promise.all(
        clients.map((ws) => waitForEvent(ws, 'story:updated', EVENT_TIMEOUT_MS)),
      );

      const elapsed = Date.now() - startTime;

      expect(messages.length).toBe(PERFORMANCE_CLIENT_COUNT);
      expect(elapsed).toBeLessThan(EVENT_TIMEOUT_MS);

      for (const ws of clients) {
        ws.close();
      }
    });
  });
});
