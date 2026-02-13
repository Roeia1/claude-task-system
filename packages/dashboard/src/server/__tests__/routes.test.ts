/**
 * Tests for REST API endpoints
 *
 * Tests the main endpoints:
 * - GET /api/epics - returns EpicSummary[]
 * - GET /api/epics/:epicId - returns ParsedEpic with full story list
 * - GET /api/stories/:storyId - returns StoryDetail with parsed journal
 * - GET /api/stories - returns standalone stories (no epic)
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type ServerInstance, startServer } from '../index.ts';
import type { EpicSummary, StoryDetail } from '../parser.ts';

// HTTP status codes
const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;

// Port range constants for random port generation
const PORT_BASE = 30_000;
const PORT_RANGE = 20_000;

// Expected counts in test data
const EXPECTED_EPIC_COUNT = 2;
const EXPECTED_EPIC_ONE_STORY_COUNT = 2; // story-alpha + story-beta
const EXPECTED_JOURNAL_ENTRIES = 3; // 1 session + 1 blocker + 1 resolution

// Regex patterns for content type validation
const JSON_CONTENT_TYPE_PATTERN = /application\/json/;

/**
 * Generate a random port within the test range
 */
function getRandomPort(): number {
  return PORT_BASE + Math.floor(Math.random() * PORT_RANGE);
}

describe('routes', () => {
  let testDir: string;
  let server: ServerInstance;

  /**
   * Create test fixtures using JSON format:
   * - .saga/epics/<epic-id>.json
   * - .saga/stories/<story-id>/story.json + <task-id>.json
   */
  function createTestFixtures() {
    const sagaDir = join(testDir, '.saga');
    const epicsDir = join(sagaDir, 'epics');
    const storiesDir = join(sagaDir, 'stories');

    // Create directories
    mkdirSync(join(storiesDir, 'story-alpha'), { recursive: true });
    mkdirSync(join(storiesDir, 'story-beta'), { recursive: true });
    mkdirSync(join(storiesDir, 'story-gamma'), { recursive: true });
    mkdirSync(join(storiesDir, 'story-standalone'), { recursive: true });
    mkdirSync(epicsDir, { recursive: true });

    // Create epic JSON files
    writeFileSync(
      join(epicsDir, 'epic-one.json'),
      JSON.stringify({
        id: 'epic-one',
        title: 'First Epic',
        description: 'This is the first epic.',
        children: [
          { id: 'story-alpha', blockedBy: [] },
          { id: 'story-beta', blockedBy: ['story-alpha'] },
        ],
      }),
    );
    writeFileSync(
      join(epicsDir, 'epic-two.json'),
      JSON.stringify({
        id: 'epic-two',
        title: 'Second Epic',
        description: 'This is the second epic.',
        children: [{ id: 'story-gamma', blockedBy: [] }],
      }),
    );

    // Create story-alpha (belongs to epic-one, has mixed task statuses → pending)
    writeFileSync(
      join(storiesDir, 'story-alpha', 'story.json'),
      JSON.stringify({
        id: 'story-alpha',
        title: 'Story Alpha',
        description: 'This is story alpha.',
        epic: 'epic-one',
        guidance: 'Follow the alpha pattern',
        doneWhen: 'Alpha is complete',
      }),
    );
    writeFileSync(
      join(storiesDir, 'story-alpha', 't1.json'),
      JSON.stringify({
        id: 't1',
        subject: 'Task 1',
        description: 'First task',
        status: 'pending',
        blockedBy: [],
      }),
    );
    writeFileSync(
      join(storiesDir, 'story-alpha', 't2.json'),
      JSON.stringify({
        id: 't2',
        subject: 'Task 2',
        description: 'Second task',
        status: 'completed',
        blockedBy: [],
        guidance: 'Some guidance for t2',
        doneWhen: 'When t2 passes',
        activeForm: 'Working on task 2',
      }),
    );

    // Create story-beta (belongs to epic-one, in_progress task → in_progress)
    writeFileSync(
      join(storiesDir, 'story-beta', 'story.json'),
      JSON.stringify({
        id: 'story-beta',
        title: 'Story Beta',
        description: 'This is story beta.',
        epic: 'epic-one',
      }),
    );
    writeFileSync(
      join(storiesDir, 'story-beta', 't1.json'),
      JSON.stringify({
        id: 't1',
        subject: 'Task 1',
        description: 'Beta task 1',
        status: 'in_progress',
        blockedBy: [],
      }),
    );

    // Create journal for story-beta
    writeFileSync(
      join(storiesDir, 'story-beta', 'journal.md'),
      `# Journal: story-beta

## Session: 2026-01-26T10:00:00Z

### Task: t1

**What was done:**
- Started working on task 1

## Blocker: Need API clarification

Waiting for API spec confirmation.

## Resolution: API spec confirmed

Got confirmation, proceeding with REST endpoints.
`,
    );

    // Create story-gamma (belongs to epic-two, completed)
    writeFileSync(
      join(storiesDir, 'story-gamma', 'story.json'),
      JSON.stringify({
        id: 'story-gamma',
        title: 'Story Gamma',
        description: 'Completed story.',
        epic: 'epic-two',
      }),
    );
    writeFileSync(
      join(storiesDir, 'story-gamma', 't1.json'),
      JSON.stringify({
        id: 't1',
        subject: 'Task 1',
        description: 'Gamma task',
        status: 'completed',
        blockedBy: [],
      }),
    );

    // Create standalone story (no epic)
    writeFileSync(
      join(storiesDir, 'story-standalone', 'story.json'),
      JSON.stringify({
        id: 'story-standalone',
        title: 'Standalone Story',
        description: 'A story without an epic.',
      }),
    );
    writeFileSync(
      join(storiesDir, 'story-standalone', 't1.json'),
      JSON.stringify({
        id: 't1',
        subject: 'Standalone Task',
        description: 'A standalone task',
        status: 'pending',
        blockedBy: [],
      }),
    );
  }

  beforeAll(async () => {
    // Create temp directory
    testDir = join(tmpdir(), `saga-routes-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    createTestFixtures();

    // Start server with random port
    server = await startServer({ sagaRoot: testDir, port: getRandomPort() });
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('GET /api/epics', () => {
    it('should return list of epic summaries', async () => {
      const res = await request(server.app).get('/api/epics');

      expect(res.status).toBe(HTTP_OK);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(EXPECTED_EPIC_COUNT);
    });

    it('should return epic summaries with correct structure', async () => {
      const res = await request(server.app).get('/api/epics');

      const epic1 = res.body.find((e: EpicSummary) => e.id === 'epic-one');
      expect(epic1).toBeDefined();
      expect(epic1.title).toBe('First Epic');
      expect(epic1.description).toBe('This is the first epic.');
      expect(epic1.status).toBeDefined();
      expect(epic1.storyCounts).toBeDefined();
      expect(epic1.storyCounts.total).toBe(EXPECTED_EPIC_ONE_STORY_COUNT);
    });

    it('should calculate story counts correctly with new statuses', async () => {
      const res = await request(server.app).get('/api/epics');

      const epic1 = res.body.find((e: EpicSummary) => e.id === 'epic-one');
      // story-alpha has mixed tasks (pending + completed) → pending derived status
      expect(epic1.storyCounts.pending).toBe(1);
      // story-beta has in_progress task → inProgress
      expect(epic1.storyCounts.inProgress).toBe(1);
      expect(epic1.storyCounts.completed).toBe(0);
      // No ready or blocked counts
      expect(epic1.storyCounts).not.toHaveProperty('ready');
      expect(epic1.storyCounts).not.toHaveProperty('blocked');
    });

    it('should not include full story list in epic summaries', async () => {
      const res = await request(server.app).get('/api/epics');

      const epic1 = res.body.find((e: EpicSummary) => e.id === 'epic-one');
      expect(epic1).not.toHaveProperty('stories');
      expect(epic1).not.toHaveProperty('children');
    });

    it('should return empty array when no epics exist', async () => {
      const emptyDir = join(tmpdir(), `saga-routes-empty-${Date.now()}`);
      mkdirSync(emptyDir, { recursive: true });

      const emptyServer = await startServer({
        sagaRoot: emptyDir,
        port: getRandomPort(),
      });

      try {
        const res = await request(emptyServer.app).get('/api/epics');
        expect(res.status).toBe(HTTP_OK);
        expect(res.body).toEqual([]);
      } finally {
        await emptyServer.close();
        rmSync(emptyDir, { recursive: true, force: true });
      }
    });
  });

  describe('GET /api/epics/:epicId', () => {
    it('should return epic detail with full story list', async () => {
      const res = await request(server.app).get('/api/epics/epic-one');

      expect(res.status).toBe(HTTP_OK);
      expect(res.body.id).toBe('epic-one');
      expect(res.body.title).toBe('First Epic');
      expect(res.body.description).toBe('This is the first epic.');
      expect(Array.isArray(res.body.stories)).toBe(true);
      expect(res.body.stories.length).toBe(EXPECTED_EPIC_ONE_STORY_COUNT);
    });

    it('should include children dependency array', async () => {
      const res = await request(server.app).get('/api/epics/epic-one');

      expect(Array.isArray(res.body.children)).toBe(true);
      expect(res.body.children.length).toBe(2);
      const betaChild = res.body.children.find((c: { id: string }) => c.id === 'story-beta');
      expect(betaChild.blockedBy).toEqual(['story-alpha']);
    });

    it('should include story details with tasks', async () => {
      const res = await request(server.app).get('/api/epics/epic-one');

      const storyAlpha = res.body.stories.find((s: StoryDetail) => s.id === 'story-alpha');
      expect(storyAlpha).toBeDefined();
      expect(storyAlpha.title).toBe('Story Alpha');
      expect(storyAlpha.status).toBe('pending'); // derived from tasks
      expect(storyAlpha.tasks).toHaveLength(2);
      expect(storyAlpha.tasks[0].id).toBe('t1');
    });

    it('should include derived epic status', async () => {
      const res = await request(server.app).get('/api/epics/epic-one');

      // epic-one has pending + inProgress stories → inProgress
      expect(res.body.status).toBe('inProgress');
    });

    it('should return 404 for non-existent epic', async () => {
      const res = await request(server.app).get('/api/epics/non-existent');

      expect(res.status).toBe(HTTP_NOT_FOUND);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('GET /api/stories/:storyId', () => {
    it('should return story detail by ID', async () => {
      const res = await request(server.app).get('/api/stories/story-alpha');

      expect(res.status).toBe(HTTP_OK);
      expect(res.body.id).toBe('story-alpha');
      expect(res.body.title).toBe('Story Alpha');
      expect(res.body.description).toBe('This is story alpha.');
      expect(res.body.status).toBe('pending'); // derived from tasks
    });

    it('should include tasks with full detail', async () => {
      const res = await request(server.app).get('/api/stories/story-alpha');

      expect(res.body.tasks).toHaveLength(2);
      expect(res.body.tasks[0]).toMatchObject({
        id: 't1',
        subject: 'Task 1',
        description: 'First task',
        status: 'pending',
        blockedBy: [],
      });
      expect(res.body.tasks[1]).toMatchObject({
        id: 't2',
        subject: 'Task 2',
        description: 'Second task',
        status: 'completed',
        blockedBy: [],
        guidance: 'Some guidance for t2',
        doneWhen: 'When t2 passes',
        activeForm: 'Working on task 2',
      });
    });

    it('should include optional story fields', async () => {
      const res = await request(server.app).get('/api/stories/story-alpha');

      expect(res.body.guidance).toBe('Follow the alpha pattern');
      expect(res.body.doneWhen).toBe('Alpha is complete');
      expect(res.body.epic).toBe('epic-one');
    });

    it('should include parsed journal when present', async () => {
      const res = await request(server.app).get('/api/stories/story-beta');

      expect(res.body.journal).toBeDefined();
      expect(Array.isArray(res.body.journal)).toBe(true);
      expect(res.body.journal.length).toBe(EXPECTED_JOURNAL_ENTRIES);
    });

    it('should parse journal entries with correct types', async () => {
      const res = await request(server.app).get('/api/stories/story-beta');

      const session = res.body.journal.find((e: { type: string }) => e.type === 'session');
      expect(session).toBeDefined();
      expect(session.timestamp).toBe('2026-01-26T10:00:00Z');
      expect(session.content).toContain('Started working on task 1');

      const blocker = res.body.journal.find((e: { type: string }) => e.type === 'blocker');
      expect(blocker).toBeDefined();
      expect(blocker.title).toBe('Need API clarification');
      expect(blocker.content).toContain('Waiting for API spec confirmation');

      const resolution = res.body.journal.find((e: { type: string }) => e.type === 'resolution');
      expect(resolution).toBeDefined();
      expect(resolution.title).toBe('API spec confirmed');
      expect(resolution.content).toContain('Got confirmation');
    });

    it('should not include journal property when no journal.md exists', async () => {
      const res = await request(server.app).get('/api/stories/story-alpha');

      expect(res.body.journal).toBeUndefined();
    });

    it('should return 404 for non-existent story', async () => {
      const res = await request(server.app).get('/api/stories/non-existent');

      expect(res.status).toBe(HTTP_NOT_FOUND);
      expect(res.body.error).toBeDefined();
    });

    it('should return standalone story (no epic)', async () => {
      const res = await request(server.app).get('/api/stories/story-standalone');

      expect(res.status).toBe(HTTP_OK);
      expect(res.body.id).toBe('story-standalone');
      expect(res.body.title).toBe('Standalone Story');
      expect(res.body.epic).toBeUndefined();
    });
  });

  describe('GET /api/stories', () => {
    it('should return standalone stories', async () => {
      const res = await request(server.app).get('/api/stories');

      expect(res.status).toBe(HTTP_OK);
      expect(Array.isArray(res.body)).toBe(true);
      const standalone = res.body.find((s: StoryDetail) => s.id === 'story-standalone');
      expect(standalone).toBeDefined();
      expect(standalone.title).toBe('Standalone Story');
    });

    it('should not include stories that belong to epics', async () => {
      const res = await request(server.app).get('/api/stories');

      const epicStory = res.body.find((s: StoryDetail) => s.id === 'story-alpha');
      expect(epicStory).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should return 404 for unknown API routes', async () => {
      const res = await request(server.app).get('/api/unknown');

      expect(res.status).toBe(HTTP_NOT_FOUND);
    });

    it('should return JSON error responses', async () => {
      const res = await request(server.app).get('/api/epics/non-existent');

      expect(res.headers['content-type']).toMatch(JSON_CONTENT_TYPE_PATTERN);
      expect(res.body).toHaveProperty('error');
    });
  });
});
