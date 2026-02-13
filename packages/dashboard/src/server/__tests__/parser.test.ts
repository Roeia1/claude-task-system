/**
 * Tests for the file system parsing module
 *
 * Tests use JSON-based .saga/stories/ and .saga/epics/ structure
 * with derived statuses from @saga-ai/types.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseJournal, parseStory, scanSagaDirectory } from '../parser.ts';

// ============================================================================
// Test Helpers
// ============================================================================

/** Expected number of journal entries in mixed entry types test */
const EXPECTED_MIXED_JOURNAL_ENTRIES = 4;

/** Helper to assert a value is not null/undefined and return it typed */
function assertDefined<T>(
  value: T | null | undefined,
  message = 'Expected value to be defined',
): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
}

/** Write a story.json file */
function writeStoryJson(sagaDir: string, storyId: string, data: Record<string, unknown>): void {
  const storyDir = join(sagaDir, 'stories', storyId);
  mkdirSync(storyDir, { recursive: true });
  writeFileSync(join(storyDir, 'story.json'), JSON.stringify(data, null, 2));
}

/** Write a task JSON file */
function writeTaskJson(
  sagaDir: string,
  storyId: string,
  taskId: string,
  data: Record<string, unknown>,
): void {
  const storyDir = join(sagaDir, 'stories', storyId);
  mkdirSync(storyDir, { recursive: true });
  writeFileSync(join(storyDir, `${taskId}.json`), JSON.stringify(data, null, 2));
}

/** Write an epic.json file */
function writeEpicJson(sagaDir: string, epicId: string, data: Record<string, unknown>): void {
  mkdirSync(join(sagaDir, 'epics'), { recursive: true });
  writeFileSync(join(sagaDir, 'epics', `${epicId}.json`), JSON.stringify(data, null, 2));
}

describe('parser', () => {
  let testDir: string;
  let sagaDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'saga-parser-test-'));
    sagaDir = join(testDir, '.saga');
    mkdirSync(join(sagaDir, 'stories'), { recursive: true });
    mkdirSync(join(sagaDir, 'epics'), { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('parseStory', () => {
    it('should parse a story with tasks and derive status', async () => {
      writeStoryJson(sagaDir, 'test-story', {
        id: 'test-story',
        title: 'Test Story Title',
        description: 'A test story description',
        epic: 'test-epic',
      });
      writeTaskJson(sagaDir, 'test-story', 't1', {
        id: 't1',
        subject: 'First Task',
        description: 'Do the first thing',
        status: 'completed',
        blockedBy: [],
      });
      writeTaskJson(sagaDir, 'test-story', 't2', {
        id: 't2',
        subject: 'Second Task',
        description: 'Do the second thing',
        status: 'pending',
        blockedBy: ['t1'],
      });

      const result = assertDefined(await parseStory(testDir, 'test-story'));

      expect(result.id).toBe('test-story');
      expect(result.title).toBe('Test Story Title');
      expect(result.description).toBe('A test story description');
      expect(result.epic).toBe('test-epic');
      expect(result.status).toBe('pending'); // derived: not all completed, none in_progress
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks.find((t) => t.id === 't1')).toMatchObject({
        id: 't1',
        subject: 'First Task',
        description: 'Do the first thing',
        status: 'completed',
        blockedBy: [],
      });
      expect(result.tasks.find((t) => t.id === 't2')).toMatchObject({
        id: 't2',
        subject: 'Second Task',
        description: 'Do the second thing',
        status: 'pending',
        blockedBy: ['t1'],
      });
    });

    it('should derive inProgress status when a task is in_progress', async () => {
      writeStoryJson(sagaDir, 'ip-story', {
        id: 'ip-story',
        title: 'In Progress Story',
        description: 'desc',
      });
      writeTaskJson(sagaDir, 'ip-story', 't1', {
        id: 't1',
        subject: 'Done Task',
        description: 'done',
        status: 'completed',
        blockedBy: [],
      });
      writeTaskJson(sagaDir, 'ip-story', 't2', {
        id: 't2',
        subject: 'Active Task',
        description: 'active',
        status: 'in_progress',
        blockedBy: [],
      });

      const result = assertDefined(await parseStory(testDir, 'ip-story'));
      expect(result.status).toBe('inProgress');
    });

    it('should derive completed status when all tasks are completed', async () => {
      writeStoryJson(sagaDir, 'done-story', {
        id: 'done-story',
        title: 'Done Story',
        description: 'desc',
      });
      writeTaskJson(sagaDir, 'done-story', 't1', {
        id: 't1',
        subject: 'Done 1',
        description: 'done',
        status: 'completed',
        blockedBy: [],
      });
      writeTaskJson(sagaDir, 'done-story', 't2', {
        id: 't2',
        subject: 'Done 2',
        description: 'done',
        status: 'completed',
        blockedBy: [],
      });

      const result = assertDefined(await parseStory(testDir, 'done-story'));
      expect(result.status).toBe('completed');
    });

    it('should derive pending status for story with no tasks', async () => {
      writeStoryJson(sagaDir, 'empty-story', {
        id: 'empty-story',
        title: 'Empty Story',
        description: 'desc',
      });

      const result = assertDefined(await parseStory(testDir, 'empty-story'));
      expect(result.status).toBe('pending');
      expect(result.tasks).toEqual([]);
    });

    it('should return null for non-existent story', async () => {
      const result = await parseStory(testDir, 'nonexistent');
      expect(result).toBeNull();
    });

    it('should include optional story fields', async () => {
      writeStoryJson(sagaDir, 'full-story', {
        id: 'full-story',
        title: 'Full Story',
        description: 'Full description',
        epic: 'my-epic',
        guidance: 'Do it this way',
        doneWhen: 'Tests pass',
        avoid: 'Do not do this',
        branch: 'feature/full-story',
        pr: 'https://github.com/org/repo/pull/42',
        worktree: '/path/to/worktree',
      });

      const result = assertDefined(await parseStory(testDir, 'full-story'));

      expect(result.guidance).toBe('Do it this way');
      expect(result.doneWhen).toBe('Tests pass');
      expect(result.avoid).toBe('Do not do this');
      expect(result.branch).toBe('feature/full-story');
      expect(result.pr).toBe('https://github.com/org/repo/pull/42');
      expect(result.worktree).toBe('/path/to/worktree');
    });

    it('should include task guidance, doneWhen, and activeForm', async () => {
      writeStoryJson(sagaDir, 'task-fields-story', {
        id: 'task-fields-story',
        title: 'Task Fields',
        description: 'desc',
      });
      writeTaskJson(sagaDir, 'task-fields-story', 't1', {
        id: 't1',
        subject: 'Detailed Task',
        description: 'A detailed task',
        status: 'in_progress',
        blockedBy: [],
        guidance: 'Follow TDD',
        doneWhen: 'All tests green',
        activeForm: 'Implementing the detailed task',
      });

      const result = assertDefined(await parseStory(testDir, 'task-fields-story'));

      expect(result.tasks[0].guidance).toBe('Follow TDD');
      expect(result.tasks[0].doneWhen).toBe('All tests green');
      expect(result.tasks[0].activeForm).toBe('Implementing the detailed task');
    });

    it('should detect journal.md if present', async () => {
      writeStoryJson(sagaDir, 'journal-story', {
        id: 'journal-story',
        title: 'Story with Journal',
        description: 'desc',
      });
      writeFileSync(join(sagaDir, 'stories', 'journal-story', 'journal.md'), '# Journal');

      const result = assertDefined(await parseStory(testDir, 'journal-story'));
      expect(result.journalPath).toContain('journal.md');
    });

    it('should handle standalone story (no epic)', async () => {
      writeStoryJson(sagaDir, 'standalone', {
        id: 'standalone',
        title: 'Standalone Story',
        description: 'No epic here',
      });

      const result = assertDefined(await parseStory(testDir, 'standalone'));
      expect(result.epic).toBeUndefined();
    });
  });

  describe('parseJournal', () => {
    it('should parse session entries', async () => {
      const journalContent = `# Journal

## Session: 2024-01-15T10:00:00Z

### Task: t1 - First Task

**What was done:**
- Implemented feature X

**Decisions:**
- Used approach A

**Next steps:**
- Continue with task t2
`;

      const storyDir = join(sagaDir, 'stories', 'test-story');
      mkdirSync(storyDir, { recursive: true });
      writeFileSync(join(storyDir, 'journal.md'), journalContent);

      const entries = await parseJournal(join(storyDir, 'journal.md'));

      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('session');
      expect(entries[0].timestamp).toBe('2024-01-15T10:00:00Z');
      expect(entries[0].content).toContain('First Task');
    });

    it('should parse blocker entries', async () => {
      const journalContent = `# Journal

## Blocker: Authentication Issue

**Task**: t3 - Login implementation
**What I'm trying to do**: Implement OAuth flow
**What I tried**: Using passport.js
**What I need**: Decision on auth provider
**Suggested options**:
- Option A: Google OAuth
- Option B: GitHub OAuth
`;

      const storyDir = join(sagaDir, 'stories', 'test-story');
      mkdirSync(storyDir, { recursive: true });
      writeFileSync(join(storyDir, 'journal.md'), journalContent);

      const entries = await parseJournal(join(storyDir, 'journal.md'));

      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('blocker');
      expect(entries[0].title).toBe('Authentication Issue');
      expect(entries[0].content).toContain('Implement OAuth flow');
    });

    it('should parse resolution entries', async () => {
      const journalContent = `# Journal

## Resolution: Use Google OAuth

After team discussion, we decided to use Google OAuth because:
- Better user experience
- Simpler integration
`;

      const storyDir = join(sagaDir, 'stories', 'test-story');
      mkdirSync(storyDir, { recursive: true });
      writeFileSync(join(storyDir, 'journal.md'), journalContent);

      const entries = await parseJournal(join(storyDir, 'journal.md'));

      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('resolution');
      expect(entries[0].title).toBe('Use Google OAuth');
      expect(entries[0].content).toContain('Better user experience');
    });

    it('should parse multiple entries of different types', async () => {
      const journalContent = `# Journal

## Session: 2024-01-14T10:00:00Z

Started work on authentication.

## Blocker: Need OAuth Provider Decision

Blocked on auth provider choice.

## Resolution: Use GitHub OAuth

Team chose GitHub OAuth.

## Session: 2024-01-15T10:00:00Z

Implemented GitHub OAuth.
`;

      const storyDir = join(sagaDir, 'stories', 'test-story');
      mkdirSync(storyDir, { recursive: true });
      writeFileSync(join(storyDir, 'journal.md'), journalContent);

      const entries = await parseJournal(join(storyDir, 'journal.md'));

      expect(entries).toHaveLength(EXPECTED_MIXED_JOURNAL_ENTRIES);
      expect(entries[0].type).toBe('session');
      expect(entries[1].type).toBe('blocker');
      expect(entries[2].type).toBe('resolution');
      expect(entries[3].type).toBe('session');
    });

    it('should return empty array for non-existent file', async () => {
      const entries = await parseJournal('/nonexistent/journal.md');
      expect(entries).toEqual([]);
    });

    it('should return empty array for file with no recognized headers', async () => {
      const storyDir = join(sagaDir, 'stories', 'test-story');
      mkdirSync(storyDir, { recursive: true });
      writeFileSync(join(storyDir, 'journal.md'), '# Just a title\n\nSome random content.');

      const entries = await parseJournal(join(storyDir, 'journal.md'));
      expect(entries).toEqual([]);
    });
  });

  describe('scanSagaDirectory', () => {
    it('should return empty epics and stories when nothing exists', () => {
      const result = scanSagaDirectory(testDir);

      expect(result.epics).toEqual([]);
      expect(result.standaloneStories).toEqual([]);
    });

    it('should scan an epic with stories and derive status', () => {
      writeEpicJson(sagaDir, 'my-epic', {
        id: 'my-epic',
        title: 'My Test Epic',
        description: 'An epic description',
        children: [{ id: 'my-story', blockedBy: [] }],
      });

      writeStoryJson(sagaDir, 'my-story', {
        id: 'my-story',
        title: 'My Test Story',
        description: 'Story content.',
        epic: 'my-epic',
      });
      writeTaskJson(sagaDir, 'my-story', 't1', {
        id: 't1',
        subject: 'Task One',
        description: 'Do task one',
        status: 'pending',
        blockedBy: [],
      });

      const result = scanSagaDirectory(testDir);

      expect(result.epics).toHaveLength(1);
      expect(result.epics[0].id).toBe('my-epic');
      expect(result.epics[0].title).toBe('My Test Epic');
      expect(result.epics[0].description).toBe('An epic description');
      expect(result.epics[0].status).toBe('pending');
      expect(result.epics[0].stories).toHaveLength(1);
      expect(result.epics[0].stories[0].id).toBe('my-story');
      expect(result.epics[0].stories[0].title).toBe('My Test Story');
      expect(result.epics[0].stories[0].status).toBe('pending');
      expect(result.epics[0].stories[0].tasks).toHaveLength(1);
    });

    it('should calculate story counts with new statuses', () => {
      writeEpicJson(sagaDir, 'counting-epic', {
        id: 'counting-epic',
        title: 'Counting Epic',
        description: 'desc',
        children: [
          { id: 'story-0', blockedBy: [] },
          { id: 'story-1', blockedBy: [] },
          { id: 'story-2', blockedBy: [] },
        ],
      });

      // story-0: all tasks pending -> pending
      writeStoryJson(sagaDir, 'story-0', {
        id: 'story-0',
        title: 'Story 0',
        description: 'desc',
        epic: 'counting-epic',
      });
      writeTaskJson(sagaDir, 'story-0', 't1', {
        id: 't1',
        subject: 'Task',
        description: 'd',
        status: 'pending',
        blockedBy: [],
      });

      // story-1: one task in_progress -> inProgress
      writeStoryJson(sagaDir, 'story-1', {
        id: 'story-1',
        title: 'Story 1',
        description: 'desc',
        epic: 'counting-epic',
      });
      writeTaskJson(sagaDir, 'story-1', 't1', {
        id: 't1',
        subject: 'Task',
        description: 'd',
        status: 'in_progress',
        blockedBy: [],
      });

      // story-2: all tasks completed -> completed
      writeStoryJson(sagaDir, 'story-2', {
        id: 'story-2',
        title: 'Story 2',
        description: 'desc',
        epic: 'counting-epic',
      });
      writeTaskJson(sagaDir, 'story-2', 't1', {
        id: 't1',
        subject: 'Task',
        description: 'd',
        status: 'completed',
        blockedBy: [],
      });

      const result = scanSagaDirectory(testDir);

      expect(result.epics[0].storyCounts).toEqual({
        total: 3,
        pending: 1,
        inProgress: 1,
        completed: 1,
      });
    });

    it('should scan multiple epics', () => {
      for (const epicId of ['epic-one', 'epic-two']) {
        writeEpicJson(sagaDir, epicId, {
          id: epicId,
          title: `${epicId} Title`,
          description: `${epicId} desc`,
          children: [{ id: `story-${epicId}`, blockedBy: [] }],
        });

        writeStoryJson(sagaDir, `story-${epicId}`, {
          id: `story-${epicId}`,
          title: `Story for ${epicId}`,
          description: 'desc',
          epic: epicId,
        });
      }

      const result = scanSagaDirectory(testDir);

      expect(result.epics).toHaveLength(2);
      const ids = result.epics.map((e) => e.id).sort();
      expect(ids).toEqual(['epic-one', 'epic-two']);
    });

    it('should include standalone stories (no epic)', () => {
      writeStoryJson(sagaDir, 'standalone-story', {
        id: 'standalone-story',
        title: 'Standalone',
        description: 'No epic',
      });
      writeTaskJson(sagaDir, 'standalone-story', 't1', {
        id: 't1',
        subject: 'Task',
        description: 'd',
        status: 'pending',
        blockedBy: [],
      });

      const result = scanSagaDirectory(testDir);

      expect(result.standaloneStories).toHaveLength(1);
      expect(result.standaloneStories[0].id).toBe('standalone-story');
      expect(result.standaloneStories[0].status).toBe('pending');
    });

    it('should handle epic with no matching stories', () => {
      writeEpicJson(sagaDir, 'empty-epic', {
        id: 'empty-epic',
        title: 'Empty Epic',
        description: 'No stories',
        children: [],
      });

      const result = scanSagaDirectory(testDir);

      expect(result.epics).toHaveLength(1);
      expect(result.epics[0].id).toBe('empty-epic');
      expect(result.epics[0].stories).toEqual([]);
      expect(result.epics[0].storyCounts.total).toBe(0);
      expect(result.epics[0].status).toBe('pending');
    });

    it('should derive epic status from story statuses', () => {
      writeEpicJson(sagaDir, 'mixed-epic', {
        id: 'mixed-epic',
        title: 'Mixed Epic',
        description: 'desc',
        children: [
          { id: 'story-a', blockedBy: [] },
          { id: 'story-b', blockedBy: ['story-a'] },
        ],
      });

      // story-a: in_progress
      writeStoryJson(sagaDir, 'story-a', {
        id: 'story-a',
        title: 'Story A',
        description: 'desc',
        epic: 'mixed-epic',
      });
      writeTaskJson(sagaDir, 'story-a', 't1', {
        id: 't1',
        subject: 'Task',
        description: 'd',
        status: 'in_progress',
        blockedBy: [],
      });

      // story-b: pending
      writeStoryJson(sagaDir, 'story-b', {
        id: 'story-b',
        title: 'Story B',
        description: 'desc',
        epic: 'mixed-epic',
      });
      writeTaskJson(sagaDir, 'story-b', 't1', {
        id: 't1',
        subject: 'Task',
        description: 'd',
        status: 'pending',
        blockedBy: [],
      });

      const result = scanSagaDirectory(testDir);

      // Epic status should be in_progress (has an in_progress story)
      expect(result.epics[0].status).toBe('inProgress');
    });

    it('should include epic children with dependencies', () => {
      writeEpicJson(sagaDir, 'dep-epic', {
        id: 'dep-epic',
        title: 'Dep Epic',
        description: 'desc',
        children: [
          { id: 'story-a', blockedBy: [] },
          { id: 'story-b', blockedBy: ['story-a'] },
        ],
      });

      writeStoryJson(sagaDir, 'story-a', {
        id: 'story-a',
        title: 'Story A',
        description: 'desc',
        epic: 'dep-epic',
      });
      writeStoryJson(sagaDir, 'story-b', {
        id: 'story-b',
        title: 'Story B',
        description: 'desc',
        epic: 'dep-epic',
      });

      const result = scanSagaDirectory(testDir);

      expect(result.epics[0].children).toHaveLength(2);
      expect(result.epics[0].children[1].blockedBy).toEqual(['story-a']);
    });

    it('should handle missing .saga directory', () => {
      const emptyDir = mkdtempSync(join(tmpdir(), 'saga-empty-'));
      try {
        const result = scanSagaDirectory(emptyDir);
        expect(result.epics).toEqual([]);
        expect(result.standaloneStories).toEqual([]);
      } finally {
        rmSync(emptyDir, { recursive: true, force: true });
      }
    });
  });
});
