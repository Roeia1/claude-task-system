/**
 * Tests for worker/hydrate-tasks.ts - Task hydration step (step 4)
 *
 * Tests the hydrateTasks function which:
 *   - Calls the hydration service to convert SAGA tasks to Claude Code format
 *   - Writes tasks to ~/.claude/tasks/<taskListId>/
 *   - Returns the taskListId and storyMeta for use in the headless run loop
 *
 * These tests use temp directories to avoid writing to real paths.
 */

import {
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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Story, Task } from '../../schemas/index.ts';
import { hydrateTasks } from './hydrate-tasks.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_TIMESTAMP = 1_700_000_000_000;
const EXPECTED_MULTI_TASK_COUNT = 3;

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

function setupStory(projectDir: string, storyId: string, story: Story, tasks: Task[]): void {
  const storyDir = join(projectDir, '.saga', 'stories', storyId);
  mkdirSync(storyDir, { recursive: true });
  writeFileSync(join(storyDir, 'story.json'), JSON.stringify(story));
  for (const task of tasks) {
    writeFileSync(join(storyDir, `${task.id}.json`), JSON.stringify(task));
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('hydrateTasks', () => {
  let projectDir: string;
  let claudeTasksBase: string;

  beforeEach(() => {
    projectDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-hydrate-worker-')));
    claudeTasksBase = realpathSync(mkdtempSync(join(tmpdir(), 'saga-hydrate-worker-tasks-')));
    vi.spyOn(Date, 'now').mockReturnValue(TEST_TIMESTAMP);
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
    rmSync(claudeTasksBase, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('returns taskListId with saga__<storyId>__<timestamp> format', () => {
    const storyId = 'my-story';
    setupStory(projectDir, storyId, makeStory({ id: storyId }), [makeTask({ id: 't1' })]);

    const result = hydrateTasks(storyId, projectDir, claudeTasksBase);

    expect(result.taskListId).toBe('saga__my-story__1700000000000');
  });

  it('returns storyMeta with title and description', () => {
    const storyId = 'meta-story';
    setupStory(
      projectDir,
      storyId,
      makeStory({ id: storyId, title: 'My Title', description: 'My Description' }),
      [makeTask({ id: 't1' })],
    );

    const result = hydrateTasks(storyId, projectDir, claudeTasksBase);

    expect(result.storyMeta.title).toBe('My Title');
    expect(result.storyMeta.description).toBe('My Description');
  });

  it('returns storyMeta with optional fields when present', () => {
    const storyId = 'rich-story';
    setupStory(
      projectDir,
      storyId,
      makeStory({
        id: storyId,
        guidance: 'Follow TDD',
        doneWhen: 'All tests pass',
        avoid: 'Over-engineering',
      }),
      [makeTask({ id: 't1' })],
    );

    const result = hydrateTasks(storyId, projectDir, claudeTasksBase);

    expect(result.storyMeta.guidance).toBe('Follow TDD');
    expect(result.storyMeta.doneWhen).toBe('All tests pass');
    expect(result.storyMeta.avoid).toBe('Over-engineering');
  });

  it('omits optional storyMeta fields when not present', () => {
    const storyId = 'minimal-story';
    setupStory(projectDir, storyId, makeStory({ id: storyId }), [makeTask({ id: 't1' })]);

    const result = hydrateTasks(storyId, projectDir, claudeTasksBase);

    expect(result.storyMeta).not.toHaveProperty('guidance');
    expect(result.storyMeta).not.toHaveProperty('doneWhen');
    expect(result.storyMeta).not.toHaveProperty('avoid');
  });

  it('returns task count', () => {
    const storyId = 'count-story';
    setupStory(projectDir, storyId, makeStory({ id: storyId }), [
      makeTask({ id: 't1' }),
      makeTask({ id: 't2', blockedBy: ['t1'] }),
      makeTask({ id: 't3' }),
    ]);

    const result = hydrateTasks(storyId, projectDir, claudeTasksBase);

    expect(result.taskCount).toBe(EXPECTED_MULTI_TASK_COUNT);
  });

  it('writes Claude Code format task files to the task list directory', () => {
    const storyId = 'write-check';
    setupStory(projectDir, storyId, makeStory({ id: storyId }), [
      makeTask({ id: 't1', subject: 'First', guidance: 'Be careful' }),
      makeTask({ id: 't2', blockedBy: ['t1'] }),
    ]);

    const result = hydrateTasks(storyId, projectDir, claudeTasksBase);

    const taskListDir = join(claudeTasksBase, result.taskListId);
    expect(existsSync(taskListDir)).toBe(true);

    // Verify t1.json
    const t1 = JSON.parse(readFileSync(join(taskListDir, 't1.json'), 'utf-8'));
    expect(t1.id).toBe('t1');
    expect(t1.subject).toBe('First');
    expect(t1.blocks).toEqual(['t2']);
    expect(t1.metadata).toEqual({ guidance: 'Be careful' });

    // Verify t2.json
    const t2 = JSON.parse(readFileSync(join(taskListDir, 't2.json'), 'utf-8'));
    expect(t2.id).toBe('t2');
    expect(t2.blockedBy).toEqual(['t1']);
    expect(t2.blocks).toEqual([]);
  });

  it('computes blocks from reverse dependency analysis', () => {
    const storyId = 'blocks-test';
    setupStory(projectDir, storyId, makeStory({ id: storyId }), [
      makeTask({ id: 't1' }),
      makeTask({ id: 't2', blockedBy: ['t1'] }),
      makeTask({ id: 't3', blockedBy: ['t1', 't2'] }),
    ]);

    const result = hydrateTasks(storyId, projectDir, claudeTasksBase);

    const taskListDir = join(claudeTasksBase, result.taskListId);
    const t1 = JSON.parse(readFileSync(join(taskListDir, 't1.json'), 'utf-8'));
    const t2 = JSON.parse(readFileSync(join(taskListDir, 't2.json'), 'utf-8'));
    const t3 = JSON.parse(readFileSync(join(taskListDir, 't3.json'), 'utf-8'));

    // t1 blocks t2 and t3
    expect(t1.blocks).toEqual(expect.arrayContaining(['t2', 't3']));
    expect(t1.blocks).toHaveLength(2);

    // t2 blocks t3
    expect(t2.blocks).toEqual(['t3']);

    // t3 blocks nothing
    expect(t3.blocks).toEqual([]);
  });

  it('preserves task status during hydration', () => {
    const storyId = 'status-test';
    setupStory(projectDir, storyId, makeStory({ id: storyId }), [
      makeTask({ id: 't1', status: 'completed' }),
      makeTask({ id: 't2', status: 'in_progress' }),
      makeTask({ id: 't3', status: 'pending' }),
    ]);

    const result = hydrateTasks(storyId, projectDir, claudeTasksBase);

    const taskListDir = join(claudeTasksBase, result.taskListId);
    const t1 = JSON.parse(readFileSync(join(taskListDir, 't1.json'), 'utf-8'));
    const t2 = JSON.parse(readFileSync(join(taskListDir, 't2.json'), 'utf-8'));
    const t3 = JSON.parse(readFileSync(join(taskListDir, 't3.json'), 'utf-8'));

    expect(t1.status).toBe('completed');
    expect(t2.status).toBe('in_progress');
    expect(t3.status).toBe('pending');
  });

  it('throws when story directory does not exist', () => {
    expect(() => hydrateTasks('nonexistent', projectDir, claudeTasksBase)).toThrow(
      'Story directory not found',
    );
  });

  it('puts guidance and doneWhen into task metadata', () => {
    const storyId = 'metadata-test';
    setupStory(projectDir, storyId, makeStory({ id: storyId }), [
      makeTask({ id: 't1', guidance: 'Step by step', doneWhen: 'Tests pass' }),
    ]);

    const result = hydrateTasks(storyId, projectDir, claudeTasksBase);

    const taskListDir = join(claudeTasksBase, result.taskListId);
    const t1 = JSON.parse(readFileSync(join(taskListDir, 't1.json'), 'utf-8'));

    expect(t1.metadata).toEqual({ guidance: 'Step by step', doneWhen: 'Tests pass' });
  });
});
