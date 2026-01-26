/**
 * Tests for REST API endpoints
 *
 * Tests the three main endpoints:
 * - GET /api/epics - returns EpicSummary[]
 * - GET /api/epics/:slug - returns Epic with full story list
 * - GET /api/stories/:epicSlug/:storySlug - returns StoryDetail with parsed journal
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import request from 'supertest';
import { startServer, type ServerInstance } from '../index.js';
import type { EpicSummary, Epic, StoryDetail } from '../parser.js';

describe('routes', () => {
  let testDir: string;
  let server: ServerInstance;

  // Create test fixtures
  async function createTestFixtures() {
    const sagaDir = join(testDir, '.saga');
    const epicsDir = join(sagaDir, 'epics');
    const archiveDir = join(sagaDir, 'archive');

    // Create directories
    await mkdir(join(epicsDir, 'epic-one', 'stories', 'story-alpha'), { recursive: true });
    await mkdir(join(epicsDir, 'epic-one', 'stories', 'story-beta'), { recursive: true });
    await mkdir(join(epicsDir, 'epic-two', 'stories', 'story-gamma'), { recursive: true });
    await mkdir(join(archiveDir, 'epic-one', 'story-archived'), { recursive: true });

    // Create epic.md files
    await writeFile(
      join(epicsDir, 'epic-one', 'epic.md'),
      '# First Epic\n\nThis is the first epic.'
    );
    await writeFile(
      join(epicsDir, 'epic-two', 'epic.md'),
      '# Second Epic\n\nThis is the second epic.'
    );

    // Create story.md files
    await writeFile(
      join(epicsDir, 'epic-one', 'stories', 'story-alpha', 'story.md'),
      `---
id: story-alpha
title: Story Alpha
status: ready
tasks:
  - id: t1
    title: Task 1
    status: pending
  - id: t2
    title: Task 2
    status: completed
---

## Description
This is story alpha.
`
    );

    await writeFile(
      join(epicsDir, 'epic-one', 'stories', 'story-beta', 'story.md'),
      `---
id: story-beta
title: Story Beta
status: in_progress
tasks:
  - id: t1
    title: Task 1
    status: in_progress
---

## Description
This is story beta.
`
    );

    // Create journal for story-beta
    await writeFile(
      join(epicsDir, 'epic-one', 'stories', 'story-beta', 'journal.md'),
      `# Journal: story-beta

## Session: 2026-01-26T10:00:00Z

### Task: t1

**What was done:**
- Started working on task 1

## Blocker: Need API clarification

Waiting for API spec confirmation.

## Resolution: API spec confirmed

Got confirmation, proceeding with REST endpoints.
`
    );

    await writeFile(
      join(epicsDir, 'epic-two', 'stories', 'story-gamma', 'story.md'),
      `---
id: story-gamma
title: Story Gamma
status: completed
tasks:
  - id: t1
    title: Task 1
    status: completed
---

Completed story.
`
    );

    // Create archived story
    await writeFile(
      join(archiveDir, 'epic-one', 'story-archived', 'story.md'),
      `---
id: story-archived
title: Archived Story
status: completed
tasks:
  - id: t1
    title: Archive task
    status: completed
---

Archived.
`
    );
  }

  beforeAll(async () => {
    // Create temp directory
    testDir = join(tmpdir(), `saga-routes-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    await createTestFixtures();

    // Start server with random port
    const randomPort = 30000 + Math.floor(Math.random() * 20000);
    server = await startServer({ sagaRoot: testDir, port: randomPort });
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
    await rm(testDir, { recursive: true, force: true });
  });

  describe('GET /api/epics', () => {
    it('should return list of epic summaries', async () => {
      const res = await request(server.app).get('/api/epics');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    it('should return epic summaries with correct structure', async () => {
      const res = await request(server.app).get('/api/epics');

      const epic1 = res.body.find((e: EpicSummary) => e.slug === 'epic-one');
      expect(epic1).toBeDefined();
      expect(epic1.title).toBe('First Epic');
      expect(epic1.storyCounts).toBeDefined();
      expect(epic1.storyCounts.total).toBe(3); // 2 active + 1 archived
      expect(epic1.path).toBeDefined();
    });

    it('should calculate story counts correctly', async () => {
      const res = await request(server.app).get('/api/epics');

      const epic1 = res.body.find((e: EpicSummary) => e.slug === 'epic-one');
      expect(epic1.storyCounts.ready).toBe(1); // story-alpha
      expect(epic1.storyCounts.inProgress).toBe(1); // story-beta
      expect(epic1.storyCounts.completed).toBe(1); // archived
      expect(epic1.storyCounts.blocked).toBe(0);
    });

    it('should not include full story list in epic summaries', async () => {
      const res = await request(server.app).get('/api/epics');

      const epic1 = res.body.find((e: EpicSummary) => e.slug === 'epic-one');
      // EpicSummary should not have stories property
      expect(epic1).not.toHaveProperty('stories');
      expect(epic1).not.toHaveProperty('content');
    });

    it('should return empty array when no epics exist', async () => {
      // Create server with empty directory
      const emptyDir = join(tmpdir(), `saga-routes-empty-${Date.now()}`);
      await mkdir(emptyDir, { recursive: true });

      const randomPort = 30000 + Math.floor(Math.random() * 20000);
      const emptyServer = await startServer({ sagaRoot: emptyDir, port: randomPort });

      try {
        const res = await request(emptyServer.app).get('/api/epics');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
      } finally {
        await emptyServer.close();
        await rm(emptyDir, { recursive: true, force: true });
      }
    });
  });

  describe('GET /api/epics/:slug', () => {
    it('should return epic detail with full story list', async () => {
      const res = await request(server.app).get('/api/epics/epic-one');

      expect(res.status).toBe(200);
      expect(res.body.slug).toBe('epic-one');
      expect(res.body.title).toBe('First Epic');
      expect(Array.isArray(res.body.stories)).toBe(true);
      expect(res.body.stories.length).toBe(3);
    });

    it('should include epic content', async () => {
      const res = await request(server.app).get('/api/epics/epic-one');

      expect(res.body.content).toContain('# First Epic');
      expect(res.body.content).toContain('This is the first epic.');
    });

    it('should include story details with tasks', async () => {
      const res = await request(server.app).get('/api/epics/epic-one');

      const storyAlpha = res.body.stories.find((s: StoryDetail) => s.slug === 'story-alpha');
      expect(storyAlpha).toBeDefined();
      expect(storyAlpha.title).toBe('Story Alpha');
      expect(storyAlpha.status).toBe('ready');
      expect(storyAlpha.tasks).toHaveLength(2);
      expect(storyAlpha.tasks[0].id).toBe('t1');
    });

    it('should include archived stories with archived flag', async () => {
      const res = await request(server.app).get('/api/epics/epic-one');

      const archivedStory = res.body.stories.find((s: StoryDetail) => s.slug === 'story-archived');
      expect(archivedStory).toBeDefined();
      expect(archivedStory.archived).toBe(true);
    });

    it('should return 404 for non-existent epic', async () => {
      const res = await request(server.app).get('/api/epics/non-existent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });

    it('should use relative paths in story paths', async () => {
      const res = await request(server.app).get('/api/epics/epic-one');

      const storyAlpha = res.body.stories.find((s: StoryDetail) => s.slug === 'story-alpha');
      expect(storyAlpha.paths.storyMd).not.toContain(testDir);
      expect(storyAlpha.paths.storyMd).toMatch(/^\.saga\//);
    });
  });

  describe('GET /api/stories/:epicSlug/:storySlug', () => {
    it('should return story detail', async () => {
      const res = await request(server.app).get('/api/stories/epic-one/story-alpha');

      expect(res.status).toBe(200);
      expect(res.body.slug).toBe('story-alpha');
      expect(res.body.epicSlug).toBe('epic-one');
      expect(res.body.title).toBe('Story Alpha');
      expect(res.body.status).toBe('ready');
    });

    it('should include tasks', async () => {
      const res = await request(server.app).get('/api/stories/epic-one/story-alpha');

      expect(res.body.tasks).toHaveLength(2);
      expect(res.body.tasks[0]).toEqual({
        id: 't1',
        title: 'Task 1',
        status: 'pending',
      });
      expect(res.body.tasks[1]).toEqual({
        id: 't2',
        title: 'Task 2',
        status: 'completed',
      });
    });

    it('should include parsed journal when present', async () => {
      const res = await request(server.app).get('/api/stories/epic-one/story-beta');

      expect(res.body.journal).toBeDefined();
      expect(Array.isArray(res.body.journal)).toBe(true);
      expect(res.body.journal.length).toBe(3); // 1 session + 1 blocker + 1 resolution
    });

    it('should parse journal entries with correct types', async () => {
      const res = await request(server.app).get('/api/stories/epic-one/story-beta');

      const session = res.body.journal.find((e: { type: string }) => e.type === 'session');
      expect(session).toBeDefined();
      expect(session.timestamp).toBe('2026-01-26T10:00:00Z');
      expect(session.content).toContain('Started working on task 1');

      const blocker = res.body.journal.find((e: { type: string }) => e.type === 'blocker');
      expect(blocker).toBeDefined();
      expect(blocker.content).toContain('Need API clarification');

      const resolution = res.body.journal.find((e: { type: string }) => e.type === 'resolution');
      expect(resolution).toBeDefined();
      expect(resolution.content).toContain('API spec confirmed');
    });

    it('should not include journal property when no journal.md exists', async () => {
      const res = await request(server.app).get('/api/stories/epic-one/story-alpha');

      // Story without journal should not have journal property
      expect(res.body.journal).toBeUndefined();
    });

    it('should return 404 for non-existent story', async () => {
      const res = await request(server.app).get('/api/stories/epic-one/non-existent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });

    it('should return 404 for non-existent epic', async () => {
      const res = await request(server.app).get('/api/stories/non-existent/story-alpha');

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });

    it('should return archived story with archived flag', async () => {
      const res = await request(server.app).get('/api/stories/epic-one/story-archived');

      expect(res.status).toBe(200);
      expect(res.body.slug).toBe('story-archived');
      expect(res.body.archived).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should return 404 for unknown API routes', async () => {
      const res = await request(server.app).get('/api/unknown');

      expect(res.status).toBe(404);
    });

    it('should return JSON error responses', async () => {
      const res = await request(server.app).get('/api/epics/non-existent');

      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toHaveProperty('error');
    });
  });
});
