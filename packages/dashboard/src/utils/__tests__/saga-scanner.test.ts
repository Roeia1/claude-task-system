/**
 * Tests for the saga-scanner module (JSON-based storage)
 *
 * The scanner uses @saga-ai/types storage utilities to read
 * .saga/stories/ and .saga/epics/ in JSON format.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseFrontmatter, sagaDirectoryExists, scanEpics, scanStories } from '../saga-scanner.ts';

/** Expected number of stories in multiple stories test */
const EXPECTED_MULTIPLE_STORIES = 3;

describe('saga-scanner', () => {
  let testDir: string;
  let sagaDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'saga-scanner-test-'));
    sagaDir = join(testDir, '.saga');
    mkdirSync(join(sagaDir, 'stories'), { recursive: true });
    mkdirSync(join(sagaDir, 'epics'), { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  // ============================================================================
  // scanStories
  // ============================================================================

  describe('scanStories', () => {
    it('should return empty array when no stories exist', () => {
      const result = scanStories(testDir);
      expect(result).toEqual([]);
    });

    it('should scan a single story with tasks', () => {
      // Create story
      const storyDir = join(sagaDir, 'stories', 'my-story');
      mkdirSync(storyDir, { recursive: true });
      writeFileSync(
        join(storyDir, 'story.json'),
        JSON.stringify({
          id: 'my-story',
          title: 'My Test Story',
          description: 'A story for testing',
          epic: 'test-epic',
        }),
      );

      // Create tasks
      writeFileSync(
        join(storyDir, 't1.json'),
        JSON.stringify({
          id: 't1',
          subject: 'First Task',
          description: 'Do the first thing',
          status: 'completed',
          blockedBy: [],
        }),
      );
      writeFileSync(
        join(storyDir, 't2.json'),
        JSON.stringify({
          id: 't2',
          subject: 'Second Task',
          description: 'Do the second thing',
          status: 'pending',
          blockedBy: ['t1'],
          guidance: 'Follow the pattern from t1',
          doneWhen: 'Tests pass',
        }),
      );

      const result = scanStories(testDir);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('my-story');
      expect(result[0].title).toBe('My Test Story');
      expect(result[0].description).toBe('A story for testing');
      expect(result[0].epicId).toBe('test-epic');
      expect(result[0].tasks).toHaveLength(2);
      expect(result[0].tasks[0]).toEqual({
        id: 't1',
        subject: 'First Task',
        description: 'Do the first thing',
        status: 'completed',
        blockedBy: [],
      });
      expect(result[0].tasks[1]).toMatchObject({
        id: 't2',
        subject: 'Second Task',
        status: 'pending',
        blockedBy: ['t1'],
        guidance: 'Follow the pattern from t1',
        doneWhen: 'Tests pass',
      });
    });

    it('should scan standalone story (no epic)', () => {
      const storyDir = join(sagaDir, 'stories', 'standalone');
      mkdirSync(storyDir, { recursive: true });
      writeFileSync(
        join(storyDir, 'story.json'),
        JSON.stringify({
          id: 'standalone',
          title: 'Standalone Story',
          description: 'Not in an epic',
        }),
      );

      const result = scanStories(testDir);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('standalone');
      expect(result[0].epicId).toBeUndefined();
    });

    it('should include worktree field from story.json', () => {
      const storyDir = join(sagaDir, 'stories', 'wt-story');
      mkdirSync(storyDir, { recursive: true });
      writeFileSync(
        join(storyDir, 'story.json'),
        JSON.stringify({
          id: 'wt-story',
          title: 'Worktree Story',
          description: 'Has a worktree',
          epic: 'my-epic',
          worktree: '/path/to/worktree',
        }),
      );

      const result = scanStories(testDir);

      expect(result).toHaveLength(1);
      expect(result[0].worktree).toBe('/path/to/worktree');
    });

    it('should include journalPath when journal.md exists', () => {
      const storyDir = join(sagaDir, 'stories', 'journaled');
      mkdirSync(storyDir, { recursive: true });
      writeFileSync(
        join(storyDir, 'story.json'),
        JSON.stringify({
          id: 'journaled',
          title: 'Story With Journal',
          description: 'Has a journal',
        }),
      );
      writeFileSync(join(storyDir, 'journal.md'), '## Session: 2024-01-01\nDid stuff.');

      const result = scanStories(testDir);

      expect(result).toHaveLength(1);
      expect(result[0].journalPath).toContain('journal.md');
    });

    it('should not include journalPath when journal.md does not exist', () => {
      const storyDir = join(sagaDir, 'stories', 'no-journal');
      mkdirSync(storyDir, { recursive: true });
      writeFileSync(
        join(storyDir, 'story.json'),
        JSON.stringify({
          id: 'no-journal',
          title: 'No Journal Story',
          description: 'No journal here',
        }),
      );

      const result = scanStories(testDir);

      expect(result).toHaveLength(1);
      expect(result[0].journalPath).toBeUndefined();
    });

    it('should scan multiple stories', () => {
      for (const id of ['story-a', 'story-b', 'story-c']) {
        const storyDir = join(sagaDir, 'stories', id);
        mkdirSync(storyDir, { recursive: true });
        writeFileSync(
          join(storyDir, 'story.json'),
          JSON.stringify({
            id,
            title: `Story ${id}`,
            description: `Description for ${id}`,
          }),
        );
      }

      const result = scanStories(testDir);

      expect(result).toHaveLength(EXPECTED_MULTIPLE_STORIES);
      const ids = result.map((s) => s.id).sort();
      expect(ids).toEqual(['story-a', 'story-b', 'story-c']);
    });

    it('should include story optional fields (guidance, doneWhen, avoid, branch, pr)', () => {
      const storyDir = join(sagaDir, 'stories', 'full-story');
      mkdirSync(storyDir, { recursive: true });
      writeFileSync(
        join(storyDir, 'story.json'),
        JSON.stringify({
          id: 'full-story',
          title: 'Full Story',
          description: 'Has all optional fields',
          epic: 'my-epic',
          guidance: 'Follow TDD',
          doneWhen: 'All tests pass',
          avoid: 'Do not change X',
          branch: 'feature/full-story',
          pr: 'https://github.com/org/repo/pull/42',
          worktree: '/tmp/worktrees/full-story',
        }),
      );

      const result = scanStories(testDir);

      expect(result).toHaveLength(1);
      const story = result[0];
      expect(story.guidance).toBe('Follow TDD');
      expect(story.doneWhen).toBe('All tests pass');
      expect(story.avoid).toBe('Do not change X');
      expect(story.branch).toBe('feature/full-story');
      expect(story.pr).toBe('https://github.com/org/repo/pull/42');
      expect(story.worktree).toBe('/tmp/worktrees/full-story');
    });

    it('should return empty tasks array for story with no task files', () => {
      const storyDir = join(sagaDir, 'stories', 'no-tasks');
      mkdirSync(storyDir, { recursive: true });
      writeFileSync(
        join(storyDir, 'story.json'),
        JSON.stringify({
          id: 'no-tasks',
          title: 'No Tasks Story',
          description: 'Has no tasks',
        }),
      );

      const result = scanStories(testDir);

      expect(result).toHaveLength(1);
      expect(result[0].tasks).toEqual([]);
    });
  });

  // ============================================================================
  // scanEpics
  // ============================================================================

  describe('scanEpics', () => {
    it('should return empty array when no epics exist', () => {
      const result = scanEpics(testDir);
      expect(result).toEqual([]);
    });

    it('should scan a single epic', () => {
      writeFileSync(
        join(sagaDir, 'epics', 'my-epic.json'),
        JSON.stringify({
          id: 'my-epic',
          title: 'My Test Epic',
          description: 'An epic for testing',
          children: [
            { id: 'story-1', blockedBy: [] },
            { id: 'story-2', blockedBy: ['story-1'] },
          ],
        }),
      );

      const result = scanEpics(testDir);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('my-epic');
      expect(result[0].title).toBe('My Test Epic');
      expect(result[0].description).toBe('An epic for testing');
      expect(result[0].children).toHaveLength(2);
      expect(result[0].children[0]).toEqual({ id: 'story-1', blockedBy: [] });
      expect(result[0].children[1]).toEqual({ id: 'story-2', blockedBy: ['story-1'] });
    });

    it('should scan multiple epics', () => {
      for (const id of ['epic-a', 'epic-b']) {
        writeFileSync(
          join(sagaDir, 'epics', `${id}.json`),
          JSON.stringify({
            id,
            title: `Epic ${id}`,
            description: `Description for ${id}`,
            children: [],
          }),
        );
      }

      const result = scanEpics(testDir);

      expect(result).toHaveLength(2);
      const ids = result.map((e) => e.id).sort();
      expect(ids).toEqual(['epic-a', 'epic-b']);
    });

    it('should skip non-JSON files in epics directory', () => {
      // Write a non-JSON file (should be skipped)
      writeFileSync(join(sagaDir, 'epics', 'README.md'), '# Epics');

      // Write a valid epic
      writeFileSync(
        join(sagaDir, 'epics', 'valid-epic.json'),
        JSON.stringify({
          id: 'valid-epic',
          title: 'Valid Epic',
          description: 'A valid epic',
          children: [],
        }),
      );

      const result = scanEpics(testDir);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('valid-epic');
    });
  });

  // ============================================================================
  // parseFrontmatter (kept for journal.md parsing)
  // ============================================================================

  describe('parseFrontmatter', () => {
    it('should parse simple key-value frontmatter', () => {
      const content = `---
title: My Title
status: ready
---

Body content here.`;

      const result = parseFrontmatter(content);

      expect(result.frontmatter.title).toBe('My Title');
      expect(result.frontmatter.status).toBe('ready');
      expect(result.body).toBe('Body content here.');
    });

    it('should return empty frontmatter for content without ---', () => {
      const content = 'Just regular content.';

      const result = parseFrontmatter(content);

      expect(result.frontmatter).toEqual({});
      expect(result.body).toBe('Just regular content.');
    });

    it('should handle quoted values', () => {
      const content = `---
title: "Quoted Title"
---

Body.`;

      const result = parseFrontmatter(content);

      expect(result.frontmatter.title).toBe('Quoted Title');
    });
  });

  // ============================================================================
  // sagaDirectoryExists
  // ============================================================================

  describe('sagaDirectoryExists', () => {
    it('should return true when .saga directory exists', () => {
      expect(sagaDirectoryExists(testDir)).toBe(true);
    });

    it('should return false when .saga directory does not exist', () => {
      const emptyDir = mkdtempSync(join(tmpdir(), 'saga-empty-'));
      try {
        expect(sagaDirectoryExists(emptyDir)).toBe(false);
      } finally {
        rmSync(emptyDir, { recursive: true, force: true });
      }
    });
  });
});
