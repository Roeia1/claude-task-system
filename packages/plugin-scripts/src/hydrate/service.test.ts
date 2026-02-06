/**
 * Unit tests for the hydration service.
 *
 * Uses temp directories to avoid writing to ~/.claude/tasks/ or real .saga/ directories.
 */

import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Story, Task } from '@saga-ai/types';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hydrate } from './service.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_TIMESTAMP = 1_700_000_000_000;
const SESSION_TIMESTAMP_A = 1000;
const SESSION_TIMESTAMP_B = 2000;
const EXPECTED_MULTI_TASK_COUNT = 3;
const READONLY_PERMISSIONS = 0o444;
const READWRITE_PERMISSIONS = 0o755;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTask(overrides: Partial<Task> & Pick<Task, 'id'>): Task {
  return {
    subject: `Task ${overrides.id}`,
    description: `Description for ${overrides.id}`,
    status: 'pending',
    blockedBy: [],
    ...overrides,
  };
}

function makeStory(overrides: Partial<Story> & Pick<Story, 'id'>): Story {
  return {
    title: 'Test Story',
    description: 'A test story',
    ...overrides,
  };
}

/**
 * Set up a .saga/stories/<storyId>/ directory with story.json and task files.
 */
function setupStory(projectDir: string, storyId: string, story: Story, tasks: Task[]): string {
  const storyDir = join(projectDir, '.saga', 'stories', storyId);
  mkdirSync(storyDir, { recursive: true });
  writeFileSync(join(storyDir, 'story.json'), JSON.stringify(story));
  for (const task of tasks) {
    writeFileSync(join(storyDir, `${task.id}.json`), JSON.stringify(task));
  }
  return storyDir;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('hydrate service', () => {
  let projectDir: string;
  let claudeTasksBase: string;

  beforeEach(() => {
    projectDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-service-test-')));
    claudeTasksBase = realpathSync(mkdtempSync(join(tmpdir(), 'saga-service-tasks-')));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
    rmSync(claudeTasksBase, { recursive: true, force: true });
  });

  // -------------------------------------------------------------------------
  // Successful hydration
  // -------------------------------------------------------------------------

  describe('successful hydration', () => {
    it('hydrates a single task', () => {
      const story = makeStory({ id: 'my-story' });
      const tasks = [makeTask({ id: 't1', subject: 'First task' })];
      setupStory(projectDir, 'my-story', story, tasks);

      const result = hydrate('my-story', TEST_TIMESTAMP, projectDir, claudeTasksBase);

      expect(result.taskListId).toBe('saga__my-story__1700000000000');
      expect(result.taskCount).toBe(1);
      expect(result.storyMeta.title).toBe('Test Story');
    });

    it('hydrates multiple tasks', () => {
      const story = makeStory({ id: 'multi' });
      const tasks = [
        makeTask({ id: 't1' }),
        makeTask({ id: 't2', blockedBy: ['t1'] }),
        makeTask({ id: 't3', blockedBy: ['t1', 't2'] }),
      ];
      setupStory(projectDir, 'multi', story, tasks);

      const result = hydrate('multi', TEST_TIMESTAMP, projectDir, claudeTasksBase);

      expect(result.taskCount).toBe(EXPECTED_MULTI_TASK_COUNT);
    });

    it('writes Claude Code format files to the task list directory', () => {
      const story = makeStory({ id: 'write-test' });
      const tasks = [
        makeTask({ id: 't1', subject: 'Task One', guidance: 'Do it well' }),
        makeTask({ id: 't2', blockedBy: ['t1'] }),
      ];
      setupStory(projectDir, 'write-test', story, tasks);

      const result = hydrate('write-test', TEST_TIMESTAMP, projectDir, claudeTasksBase);

      const taskListDir = join(claudeTasksBase, result.taskListId);
      expect(existsSync(taskListDir)).toBe(true);

      // Verify t1.json
      const t1File = join(taskListDir, 't1.json');
      expect(existsSync(t1File)).toBe(true);
      const t1 = JSON.parse(readFileSync(t1File, 'utf-8'));
      expect(t1.id).toBe('t1');
      expect(t1.subject).toBe('Task One');
      expect(t1.status).toBe('pending');
      expect(t1.blocks).toEqual(['t2']);
      expect(t1.metadata).toEqual({ guidance: 'Do it well' });

      // Verify t2.json
      const t2File = join(taskListDir, 't2.json');
      expect(existsSync(t2File)).toBe(true);
      const t2 = JSON.parse(readFileSync(t2File, 'utf-8'));
      expect(t2.id).toBe('t2');
      expect(t2.blockedBy).toEqual(['t1']);
      expect(t2.blocks).toEqual([]);
    });

    it('preserves completed tasks during hydration', () => {
      const story = makeStory({ id: 'completed' });
      const tasks = [
        makeTask({ id: 't1', status: 'completed' }),
        makeTask({ id: 't2', status: 'in_progress' }),
        makeTask({ id: 't3', status: 'pending' }),
      ];
      setupStory(projectDir, 'completed', story, tasks);

      const result = hydrate('completed', TEST_TIMESTAMP, projectDir, claudeTasksBase);

      expect(result.taskCount).toBe(EXPECTED_MULTI_TASK_COUNT);

      const taskListDir = join(claudeTasksBase, result.taskListId);
      const t1 = JSON.parse(readFileSync(join(taskListDir, 't1.json'), 'utf-8'));
      const t2 = JSON.parse(readFileSync(join(taskListDir, 't2.json'), 'utf-8'));
      const t3 = JSON.parse(readFileSync(join(taskListDir, 't3.json'), 'utf-8'));

      expect(t1.status).toBe('completed');
      expect(t2.status).toBe('in_progress');
      expect(t3.status).toBe('pending');
    });

    it('handles story with zero tasks', () => {
      const story = makeStory({ id: 'empty' });
      setupStory(projectDir, 'empty', story, []);

      const result = hydrate('empty', TEST_TIMESTAMP, projectDir, claudeTasksBase);

      expect(result.taskCount).toBe(0);
      expect(result.taskListId).toBe('saga__empty__1700000000000');
      expect(existsSync(join(claudeTasksBase, result.taskListId))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Story metadata extraction
  // -------------------------------------------------------------------------

  describe('story metadata', () => {
    it('extracts all optional fields when present', () => {
      const story = makeStory({
        id: 'meta',
        title: 'Rich Story',
        description: 'Detailed description',
        guidance: 'Follow TDD',
        doneWhen: 'All tests pass',
        avoid: 'Over-engineering',
      });
      setupStory(projectDir, 'meta', story, [makeTask({ id: 't1' })]);

      const result = hydrate('meta', TEST_TIMESTAMP, projectDir, claudeTasksBase);

      expect(result.storyMeta).toEqual({
        title: 'Rich Story',
        description: 'Detailed description',
        guidance: 'Follow TDD',
        doneWhen: 'All tests pass',
        avoid: 'Over-engineering',
      });
    });

    it('omits optional fields when not present', () => {
      const story = makeStory({
        id: 'minimal',
        title: 'Minimal Story',
        description: 'Just the basics',
      });
      setupStory(projectDir, 'minimal', story, [makeTask({ id: 't1' })]);

      const result = hydrate('minimal', TEST_TIMESTAMP, projectDir, claudeTasksBase);

      expect(result.storyMeta).toEqual({
        title: 'Minimal Story',
        description: 'Just the basics',
      });
      expect(result.storyMeta).not.toHaveProperty('guidance');
      expect(result.storyMeta).not.toHaveProperty('doneWhen');
      expect(result.storyMeta).not.toHaveProperty('avoid');
    });

    it('extracts partial optional fields', () => {
      const story = makeStory({
        id: 'partial',
        title: 'Partial Story',
        description: 'Some fields',
        guidance: 'Be careful',
      });
      setupStory(projectDir, 'partial', story, [makeTask({ id: 't1' })]);

      const result = hydrate('partial', TEST_TIMESTAMP, projectDir, claudeTasksBase);

      expect(result.storyMeta.guidance).toBe('Be careful');
      expect(result.storyMeta).not.toHaveProperty('doneWhen');
      expect(result.storyMeta).not.toHaveProperty('avoid');
    });
  });

  // -------------------------------------------------------------------------
  // Per-session namespacing
  // -------------------------------------------------------------------------

  describe('session namespacing', () => {
    it('creates separate directories for different timestamps', () => {
      const story = makeStory({ id: 'ns-test' });
      const tasks = [makeTask({ id: 't1' })];
      setupStory(projectDir, 'ns-test', story, tasks);

      const result1 = hydrate('ns-test', SESSION_TIMESTAMP_A, projectDir, claudeTasksBase);
      const result2 = hydrate('ns-test', SESSION_TIMESTAMP_B, projectDir, claudeTasksBase);

      expect(result1.taskListId).toBe('saga__ns-test__1000');
      expect(result2.taskListId).toBe('saga__ns-test__2000');
      expect(existsSync(join(claudeTasksBase, 'saga__ns-test__1000'))).toBe(true);
      expect(existsSync(join(claudeTasksBase, 'saga__ns-test__2000'))).toBe(true);
    });

    it('overwrites cleanly on re-hydration with same timestamp', () => {
      const story = makeStory({ id: 'idem' });
      const tasks = [makeTask({ id: 't1', subject: 'Original' })];
      setupStory(projectDir, 'idem', story, tasks);

      hydrate('idem', SESSION_TIMESTAMP_A, projectDir, claudeTasksBase);

      // Update the source task
      const storyDir = join(projectDir, '.saga', 'stories', 'idem');
      writeFileSync(
        join(storyDir, 't1.json'),
        JSON.stringify(makeTask({ id: 't1', subject: 'Updated' })),
      );

      hydrate('idem', SESSION_TIMESTAMP_A, projectDir, claudeTasksBase);

      const taskListDir = join(claudeTasksBase, 'saga__idem__1000');
      const t1 = JSON.parse(readFileSync(join(taskListDir, 't1.json'), 'utf-8'));
      expect(t1.subject).toBe('Updated');
    });
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  describe('error handling', () => {
    it('throws when story directory does not exist', () => {
      expect(() =>
        hydrate('nonexistent', SESSION_TIMESTAMP_A, projectDir, claudeTasksBase),
      ).toThrow('Story directory not found');
    });

    it('throws when story.json is missing', () => {
      const storyDir = join(projectDir, '.saga', 'stories', 'no-story-json');
      mkdirSync(storyDir, { recursive: true });
      // Write a task file but no story.json
      writeFileSync(join(storyDir, 't1.json'), JSON.stringify(makeTask({ id: 't1' })));

      expect(() =>
        hydrate('no-story-json', SESSION_TIMESTAMP_A, projectDir, claudeTasksBase),
      ).toThrow('story.json not found');
    });

    it('throws when story.json has malformed JSON', () => {
      const storyDir = join(projectDir, '.saga', 'stories', 'bad-story');
      mkdirSync(storyDir, { recursive: true });
      writeFileSync(join(storyDir, 'story.json'), 'not valid json{{{');

      expect(() => hydrate('bad-story', SESSION_TIMESTAMP_A, projectDir, claudeTasksBase)).toThrow(
        'Failed to parse story.json',
      );
    });

    it('throws when a task file has malformed JSON', () => {
      const story = makeStory({ id: 'bad-task' });
      setupStory(projectDir, 'bad-task', story, []);

      // Write a malformed task file manually
      const storyDir = join(projectDir, '.saga', 'stories', 'bad-task');
      writeFileSync(join(storyDir, 'broken.json'), '{ invalid json }');

      expect(() => hydrate('bad-task', SESSION_TIMESTAMP_A, projectDir, claudeTasksBase)).toThrow(
        'Failed to parse task file broken.json',
      );
    });

    it('throws when story.json fails schema validation', () => {
      const storyDir = join(projectDir, '.saga', 'stories', 'invalid-schema');
      mkdirSync(storyDir, { recursive: true });
      // Valid JSON but invalid story schema (missing required fields)
      writeFileSync(join(storyDir, 'story.json'), JSON.stringify({ id: 'x' }));

      expect(() =>
        hydrate('invalid-schema', SESSION_TIMESTAMP_A, projectDir, claudeTasksBase),
      ).toThrow('Failed to parse story.json');
    });

    it('throws when a task file fails schema validation', () => {
      const story = makeStory({ id: 'invalid-task' });
      setupStory(projectDir, 'invalid-task', story, []);

      // Valid JSON but invalid task schema
      const storyDir = join(projectDir, '.saga', 'stories', 'invalid-task');
      writeFileSync(
        join(storyDir, 'bad-task.json'),
        JSON.stringify({ id: 'x', subject: 'Missing fields' }),
      );

      expect(() =>
        hydrate('invalid-task', SESSION_TIMESTAMP_A, projectDir, claudeTasksBase),
      ).toThrow('Failed to parse task file bad-task.json');
    });

    it('ignores non-json files in the story directory', () => {
      const story = makeStory({ id: 'mixed-files' });
      const tasks = [makeTask({ id: 't1' })];
      setupStory(projectDir, 'mixed-files', story, tasks);

      // Add non-json files that should be ignored
      const storyDir = join(projectDir, '.saga', 'stories', 'mixed-files');
      writeFileSync(join(storyDir, 'notes.md'), '# Notes');
      writeFileSync(join(storyDir, 'journal.md'), '# Journal');

      const result = hydrate('mixed-files', SESSION_TIMESTAMP_A, projectDir, claudeTasksBase);

      expect(result.taskCount).toBe(1);
    });

    it('throws when task list directory cannot be created (permissions)', () => {
      const story = makeStory({ id: 'perm-fail' });
      const tasks = [makeTask({ id: 't1' })];
      setupStory(projectDir, 'perm-fail', story, tasks);

      // Make the claude tasks base directory read-only so mkdirSync fails
      chmodSync(claudeTasksBase, READONLY_PERMISSIONS);

      try {
        expect(() =>
          hydrate('perm-fail', SESSION_TIMESTAMP_A, projectDir, claudeTasksBase),
        ).toThrow('Failed to create task list directory');
      } finally {
        // Restore permissions for cleanup
        chmodSync(claudeTasksBase, READWRITE_PERMISSIONS);
      }
    });

    it('includes the story directory path in missing directory error', () => {
      try {
        hydrate('nonexistent-path', SESSION_TIMESTAMP_A, projectDir, claudeTasksBase);
        expect.unreachable('Should have thrown');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('Story directory not found');
        expect(message).toContain('nonexistent-path');
      }
    });

    it('includes the file name in malformed task error', () => {
      const story = makeStory({ id: 'task-err-msg' });
      setupStory(projectDir, 'task-err-msg', story, []);

      const storyDir = join(projectDir, '.saga', 'stories', 'task-err-msg');
      writeFileSync(join(storyDir, 'specific-task.json'), '<<<not json>>>');

      try {
        hydrate('task-err-msg', SESSION_TIMESTAMP_A, projectDir, claudeTasksBase);
        expect.unreachable('Should have thrown');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('specific-task.json');
      }
    });

    it('includes the story.json path in missing story.json error', () => {
      const storyDir = join(projectDir, '.saga', 'stories', 'no-story-check');
      mkdirSync(storyDir, { recursive: true });

      try {
        hydrate('no-story-check', SESSION_TIMESTAMP_A, projectDir, claudeTasksBase);
        expect.unreachable('Should have thrown');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('story.json not found');
        expect(message).toContain('no-story-check');
      }
    });
  });
});
