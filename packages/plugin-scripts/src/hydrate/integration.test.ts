/**
 * Integration tests for the full hydration-sync round trip.
 *
 * These tests exercise the complete flow:
 *   1. Write SAGA task files to a temp directory
 *   2. Hydrate them into Claude Code format
 *   3. Verify the hydrated files
 *   4. Simulate a TaskUpdate via the sync hook
 *   5. Verify the original SAGA task file was updated
 *
 * All filesystem operations use temp directories — nothing is written
 * to ~/.claude/tasks/ or real .saga/ directories.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import type { Story, Task } from '@saga-ai/types';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { processSyncInput } from '../sync-hook.ts';
import { hydrate } from './service.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIMESTAMP_SESSION_1 = 1_700_000_001_000;
const TIMESTAMP_SESSION_2 = 1_700_000_002_000;
const EXPECTED_TASK_COUNT = 3;

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
    title: 'Integration Test Story',
    description: 'A story for integration testing',
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

/**
 * Read a hydrated Claude Code task file from the task list directory.
 */
function readClaudeTask(
  claudeTasksBase: string,
  taskListId: string,
  taskId: string,
): Record<string, unknown> {
  const filePath = join(claudeTasksBase, taskListId, `${taskId}.json`);
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

/**
 * Read a SAGA task file from the project story directory.
 */
function readSagaTask(
  projectDir: string,
  storyId: string,
  taskId: string,
): Record<string, unknown> {
  const filePath = join(projectDir, '.saga', 'stories', storyId, `${taskId}.json`);
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

/**
 * Create a TaskUpdate hook input JSON string.
 */
function makeHookInput(taskId: string, status: string): string {
  return JSON.stringify({
    tool_name: 'TaskUpdate',
    tool_input: { taskId, status },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('hydration-sync integration', () => {
  const originalEnv = process.env;
  let projectDir: string;
  let claudeTasksBase: string;

  const STORY_ID = 'integration-story';

  beforeEach(() => {
    process.env = { ...originalEnv };
    projectDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-integration-test-')));
    claudeTasksBase = realpathSync(mkdtempSync(join(tmpdir(), 'saga-integration-tasks-')));
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(projectDir, { recursive: true, force: true });
    rmSync(claudeTasksBase, { recursive: true, force: true });
  });

  // -------------------------------------------------------------------------
  // Full round trip: hydrate → verify → sync → verify
  // -------------------------------------------------------------------------

  describe('full round trip', () => {
    it('hydrates SAGA tasks, then syncs a TaskUpdate back to the source', () => {
      // Step 1: Create SAGA story with tasks that have a dependency graph
      const story = makeStory({
        id: STORY_ID,
        title: 'Integration Story',
        description: 'Full round trip test',
        guidance: 'Follow TDD',
        doneWhen: 'All tests pass',
        avoid: 'Shortcuts',
      });
      const tasks = [
        makeTask({ id: 't1', subject: 'Setup', status: 'completed' }),
        makeTask({ id: 't2', subject: 'Implement', blockedBy: ['t1'], guidance: 'Be careful' }),
        makeTask({ id: 't3', subject: 'Test', blockedBy: ['t1', 't2'], doneWhen: 'Coverage 100%' }),
      ];
      setupStory(projectDir, STORY_ID, story, tasks);

      // Step 2: Hydrate into Claude Code format
      const result = hydrate(STORY_ID, TIMESTAMP_SESSION_1, projectDir, claudeTasksBase);

      expect(result.taskCount).toBe(EXPECTED_TASK_COUNT);
      expect(result.taskListId).toBe(`saga__${STORY_ID}__${TIMESTAMP_SESSION_1}`);
      expect(result.storyMeta).toEqual({
        title: 'Integration Story',
        description: 'Full round trip test',
        guidance: 'Follow TDD',
        doneWhen: 'All tests pass',
        avoid: 'Shortcuts',
      });

      // Step 3: Verify hydrated files have correct Claude Code format
      const claudeT1 = readClaudeTask(claudeTasksBase, result.taskListId, 't1');
      expect(claudeT1.id).toBe('t1');
      expect(claudeT1.subject).toBe('Setup');
      expect(claudeT1.status).toBe('completed');
      // t1 blocks t2 and t3 (both list t1 in blockedBy)
      expect(claudeT1.blocks).toEqual(expect.arrayContaining(['t2', 't3']));
      expect((claudeT1.blocks as string[]).length).toBe(2);

      const claudeT2 = readClaudeTask(claudeTasksBase, result.taskListId, 't2');
      expect(claudeT2.id).toBe('t2');
      expect(claudeT2.subject).toBe('Implement');
      expect(claudeT2.status).toBe('pending');
      expect(claudeT2.blockedBy).toEqual(['t1']);
      // t2 blocks t3
      expect(claudeT2.blocks).toEqual(['t3']);
      expect(claudeT2.metadata).toEqual({ guidance: 'Be careful' });

      const claudeT3 = readClaudeTask(claudeTasksBase, result.taskListId, 't3');
      expect(claudeT3.id).toBe('t3');
      expect(claudeT3.subject).toBe('Test');
      expect(claudeT3.status).toBe('pending');
      expect(claudeT3.blockedBy).toEqual(['t1', 't2']);
      expect(claudeT3.blocks).toEqual([]);
      expect(claudeT3.metadata).toEqual({ doneWhen: 'Coverage 100%' });

      // Step 4: Simulate a TaskUpdate via the sync hook
      process.env.SAGA_PROJECT_DIR = projectDir;
      process.env.SAGA_STORY_ID = STORY_ID;

      const syncResult = processSyncInput(makeHookInput('t2', 'in_progress'));
      expect(syncResult.synced).toBe(true);

      // Step 5: Verify the original SAGA task file was updated
      const updatedT2 = readSagaTask(projectDir, STORY_ID, 't2');
      expect(updatedT2.status).toBe('in_progress');
      // All other fields preserved
      expect(updatedT2.subject).toBe('Implement');
      expect(updatedT2.blockedBy).toEqual(['t1']);
      expect(updatedT2.guidance).toBe('Be careful');
    });

    it('syncs multiple sequential status transitions', () => {
      const story = makeStory({ id: STORY_ID });
      const tasks = [makeTask({ id: 't1', subject: 'Work item' })];
      setupStory(projectDir, STORY_ID, story, tasks);

      // Hydrate
      hydrate(STORY_ID, TIMESTAMP_SESSION_1, projectDir, claudeTasksBase);

      // Set up env for sync
      process.env.SAGA_PROJECT_DIR = projectDir;
      process.env.SAGA_STORY_ID = STORY_ID;

      // pending → in_progress
      let syncResult = processSyncInput(makeHookInput('t1', 'in_progress'));
      expect(syncResult.synced).toBe(true);
      expect(readSagaTask(projectDir, STORY_ID, 't1').status).toBe('in_progress');

      // in_progress → completed
      syncResult = processSyncInput(makeHookInput('t1', 'completed'));
      expect(syncResult.synced).toBe(true);
      expect(readSagaTask(projectDir, STORY_ID, 't1').status).toBe('completed');
    });

    it('ignores sync for runtime-created tasks (not in SAGA source)', () => {
      const story = makeStory({ id: STORY_ID });
      const tasks = [makeTask({ id: 't1' })];
      setupStory(projectDir, STORY_ID, story, tasks);

      hydrate(STORY_ID, TIMESTAMP_SESSION_1, projectDir, claudeTasksBase);

      process.env.SAGA_PROJECT_DIR = projectDir;
      process.env.SAGA_STORY_ID = STORY_ID;

      // Try to sync a task that doesn't exist in SAGA source
      const syncResult = processSyncInput(makeHookInput('runtime-task', 'completed'));
      expect(syncResult.synced).toBe(false);
      expect(syncResult.reason).toContain('not found');

      // Verify no file was created for the runtime task
      const runtimeTaskPath = join(projectDir, '.saga', 'stories', STORY_ID, 'runtime-task.json');
      expect(existsSync(runtimeTaskPath)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Per-session isolation
  // -------------------------------------------------------------------------

  describe('per-session isolation', () => {
    it('creates separate directories for different session timestamps', () => {
      const story = makeStory({ id: STORY_ID });
      const tasks = [makeTask({ id: 't1', subject: 'Original subject' })];
      setupStory(projectDir, STORY_ID, story, tasks);

      // Hydrate with two different timestamps
      const result1 = hydrate(STORY_ID, TIMESTAMP_SESSION_1, projectDir, claudeTasksBase);
      const result2 = hydrate(STORY_ID, TIMESTAMP_SESSION_2, projectDir, claudeTasksBase);

      // Task list IDs are different
      expect(result1.taskListId).not.toBe(result2.taskListId);
      expect(result1.taskListId).toBe(`saga__${STORY_ID}__${TIMESTAMP_SESSION_1}`);
      expect(result2.taskListId).toBe(`saga__${STORY_ID}__${TIMESTAMP_SESSION_2}`);

      // Both directories exist
      const dir1 = join(claudeTasksBase, result1.taskListId);
      const dir2 = join(claudeTasksBase, result2.taskListId);
      expect(existsSync(dir1)).toBe(true);
      expect(existsSync(dir2)).toBe(true);

      // Both contain the task file
      expect(existsSync(join(dir1, 't1.json'))).toBe(true);
      expect(existsSync(join(dir2, 't1.json'))).toBe(true);
    });

    it('session directories are independent — changes in one do not affect the other', () => {
      const story = makeStory({ id: STORY_ID });
      const tasks = [makeTask({ id: 't1', status: 'pending' })];
      setupStory(projectDir, STORY_ID, story, tasks);

      const result1 = hydrate(STORY_ID, TIMESTAMP_SESSION_1, projectDir, claudeTasksBase);
      const result2 = hydrate(STORY_ID, TIMESTAMP_SESSION_2, projectDir, claudeTasksBase);

      // Manually modify a task in session 1's directory
      const session1TaskPath = join(claudeTasksBase, result1.taskListId, 't1.json');
      const session1Task = JSON.parse(readFileSync(session1TaskPath, 'utf-8'));
      session1Task.status = 'completed';
      writeFileSync(session1TaskPath, JSON.stringify(session1Task));

      // Session 2's task should be unaffected
      const session2Task = readClaudeTask(claudeTasksBase, result2.taskListId, 't1');
      expect(session2Task.status).toBe('pending');
    });
  });

  // -------------------------------------------------------------------------
  // Idempotency
  // -------------------------------------------------------------------------

  describe('idempotency', () => {
    it('re-hydration with the same timestamp overwrites cleanly', () => {
      const story = makeStory({ id: STORY_ID });
      const tasks = [makeTask({ id: 't1', subject: 'Original' })];
      setupStory(projectDir, STORY_ID, story, tasks);

      // First hydration
      const result1 = hydrate(STORY_ID, TIMESTAMP_SESSION_1, projectDir, claudeTasksBase);
      const t1Before = readClaudeTask(claudeTasksBase, result1.taskListId, 't1');
      expect(t1Before.subject).toBe('Original');

      // Update the source SAGA task
      const storyDir = join(projectDir, '.saga', 'stories', STORY_ID);
      writeFileSync(
        join(storyDir, 't1.json'),
        JSON.stringify(makeTask({ id: 't1', subject: 'Updated' })),
      );

      // Re-hydrate with same timestamp
      const result2 = hydrate(STORY_ID, TIMESTAMP_SESSION_1, projectDir, claudeTasksBase);
      expect(result2.taskListId).toBe(result1.taskListId);

      // Hydrated file should reflect the update
      const t1After = readClaudeTask(claudeTasksBase, result2.taskListId, 't1');
      expect(t1After.subject).toBe('Updated');
    });

    it('re-hydration preserves synced status changes in SAGA source', () => {
      const story = makeStory({ id: STORY_ID });
      const tasks = [
        makeTask({ id: 't1', status: 'pending' }),
        makeTask({ id: 't2', status: 'pending', blockedBy: ['t1'] }),
      ];
      setupStory(projectDir, STORY_ID, story, tasks);

      // Hydrate first session
      hydrate(STORY_ID, TIMESTAMP_SESSION_1, projectDir, claudeTasksBase);

      // Sync a status update back to SAGA source
      process.env.SAGA_PROJECT_DIR = projectDir;
      process.env.SAGA_STORY_ID = STORY_ID;
      processSyncInput(makeHookInput('t1', 'completed'));

      // Verify SAGA source was updated
      expect(readSagaTask(projectDir, STORY_ID, 't1').status).toBe('completed');

      // Re-hydrate for a new session — should pick up the synced status
      const result2 = hydrate(STORY_ID, TIMESTAMP_SESSION_2, projectDir, claudeTasksBase);
      const claudeT1 = readClaudeTask(claudeTasksBase, result2.taskListId, 't1');
      expect(claudeT1.status).toBe('completed');
    });
  });

  // -------------------------------------------------------------------------
  // End-to-end with complex task graph
  // -------------------------------------------------------------------------

  describe('complex task graph', () => {
    it('correctly computes blocks and blockedBy across a multi-task dependency chain', () => {
      const story = makeStory({ id: STORY_ID });
      // Diamond dependency: t3 depends on t1 and t2, t4 depends on t2 and t3
      const tasks = [
        makeTask({ id: 't1', subject: 'Foundation' }),
        makeTask({ id: 't2', subject: 'Core', blockedBy: ['t1'] }),
        makeTask({ id: 't3', subject: 'Feature A', blockedBy: ['t1', 't2'] }),
        makeTask({ id: 't4', subject: 'Feature B', blockedBy: ['t2', 't3'] }),
      ];
      setupStory(projectDir, STORY_ID, story, tasks);

      const result = hydrate(STORY_ID, TIMESTAMP_SESSION_1, projectDir, claudeTasksBase);

      const ct1 = readClaudeTask(claudeTasksBase, result.taskListId, 't1');
      const ct2 = readClaudeTask(claudeTasksBase, result.taskListId, 't2');
      const ct3 = readClaudeTask(claudeTasksBase, result.taskListId, 't3');
      const ct4 = readClaudeTask(claudeTasksBase, result.taskListId, 't4');

      // t1 blocks t2 and t3
      expect(ct1.blocks).toEqual(expect.arrayContaining(['t2', 't3']));
      expect((ct1.blocks as string[]).length).toBe(2);

      // t2 blocks t3 and t4
      expect(ct2.blocks).toEqual(expect.arrayContaining(['t3', 't4']));
      expect((ct2.blocks as string[]).length).toBe(2);

      // t3 blocks t4
      expect(ct3.blocks).toEqual(['t4']);

      // t4 blocks nothing
      expect(ct4.blocks).toEqual([]);

      // blockedBy is preserved from source
      expect(ct1.blockedBy).toEqual([]);
      expect(ct2.blockedBy).toEqual(['t1']);
      expect(ct3.blockedBy).toEqual(['t1', 't2']);
      expect(ct4.blockedBy).toEqual(['t2', 't3']);
    });

    it('syncs status updates and re-hydrates reflecting the full graph state', () => {
      const story = makeStory({ id: STORY_ID });
      const tasks = [
        makeTask({ id: 't1', status: 'pending' }),
        makeTask({ id: 't2', status: 'pending', blockedBy: ['t1'] }),
        makeTask({ id: 't3', status: 'pending', blockedBy: ['t2'] }),
      ];
      setupStory(projectDir, STORY_ID, story, tasks);

      // Session 1: hydrate and work through tasks
      hydrate(STORY_ID, TIMESTAMP_SESSION_1, projectDir, claudeTasksBase);
      process.env.SAGA_PROJECT_DIR = projectDir;
      process.env.SAGA_STORY_ID = STORY_ID;

      processSyncInput(makeHookInput('t1', 'in_progress'));
      processSyncInput(makeHookInput('t1', 'completed'));
      processSyncInput(makeHookInput('t2', 'in_progress'));

      // Verify SAGA source state after session 1
      expect(readSagaTask(projectDir, STORY_ID, 't1').status).toBe('completed');
      expect(readSagaTask(projectDir, STORY_ID, 't2').status).toBe('in_progress');
      expect(readSagaTask(projectDir, STORY_ID, 't3').status).toBe('pending');

      // Session 2: re-hydrate and verify it picks up current state
      const result2 = hydrate(STORY_ID, TIMESTAMP_SESSION_2, projectDir, claudeTasksBase);

      const s2t1 = readClaudeTask(claudeTasksBase, result2.taskListId, 't1');
      const s2t2 = readClaudeTask(claudeTasksBase, result2.taskListId, 't2');
      const s2t3 = readClaudeTask(claudeTasksBase, result2.taskListId, 't3');

      expect(s2t1.status).toBe('completed');
      expect(s2t2.status).toBe('in_progress');
      expect(s2t3.status).toBe('pending');
    });
  });

  // -------------------------------------------------------------------------
  // File listing verification
  // -------------------------------------------------------------------------

  describe('file listing', () => {
    it('hydrated directory contains exactly the expected task files', () => {
      const story = makeStory({ id: STORY_ID });
      const tasks = [makeTask({ id: 't1' }), makeTask({ id: 't2' }), makeTask({ id: 't3' })];
      setupStory(projectDir, STORY_ID, story, tasks);

      const result = hydrate(STORY_ID, TIMESTAMP_SESSION_1, projectDir, claudeTasksBase);
      const taskListDir = join(claudeTasksBase, result.taskListId);
      const files = readdirSync(taskListDir).sort();

      expect(files).toEqual(['t1.json', 't2.json', 't3.json']);
    });
  });
});
