import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { processSyncInput } from './sync-hook.ts';

describe('sync-hook', () => {
  const originalEnv = process.env;
  let tempDir: string;
  let projectDir: string;

  const STORY_ID = 'my-story';
  const TASK_ID = 't1';
  const READONLY_PERMISSIONS = 0o444;
  const READWRITE_PERMISSIONS = 0o644;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Create temp project structure: <tempDir>/.saga/stories/<storyId>/
    tempDir = realpathSync(mkdtempSync(join(tmpdir(), 'sync-hook-test-')));
    projectDir = tempDir;
    const storyDir = join(projectDir, '.saga', 'stories', STORY_ID);
    mkdirSync(storyDir, { recursive: true });

    process.env.SAGA_PROJECT_DIR = projectDir;
    process.env.SAGA_STORY_ID = STORY_ID;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  /**
   * Helper to write a SAGA task file to the temp story directory.
   */
  function writeTaskFile(taskId: string, task: Record<string, unknown>): void {
    const taskPath = join(projectDir, '.saga', 'stories', STORY_ID, `${taskId}.json`);
    writeFileSync(taskPath, JSON.stringify(task, null, 2));
  }

  /**
   * Helper to read a SAGA task file from the temp story directory.
   */
  function readTaskFile(taskId: string): Record<string, unknown> {
    const taskPath = join(projectDir, '.saga', 'stories', STORY_ID, `${taskId}.json`);
    return JSON.parse(readFileSync(taskPath, 'utf-8'));
  }

  /**
   * Helper to create valid TaskUpdate hook input JSON.
   */
  function makeHookInput(taskId: string, status: string): string {
    return JSON.stringify({
      tool_name: 'TaskUpdate',
      tool_input: { taskId, status },
    });
  }

  // ============================================================================
  // Successful sync
  // ============================================================================

  describe('successful sync', () => {
    it('updates task status from pending to in_progress', () => {
      writeTaskFile(TASK_ID, {
        id: TASK_ID,
        subject: 'Create entry point',
        description: 'Create the hydration entry point',
        status: 'pending',
        blockedBy: [],
      });

      const result = processSyncInput(makeHookInput(TASK_ID, 'in_progress'));

      expect(result.synced).toBe(true);
      const updated = readTaskFile(TASK_ID);
      expect(updated.status).toBe('in_progress');
    });

    it('updates task status from in_progress to completed', () => {
      writeTaskFile(TASK_ID, {
        id: TASK_ID,
        subject: 'Create entry point',
        description: 'Create the hydration entry point',
        status: 'in_progress',
        blockedBy: [],
      });

      const result = processSyncInput(makeHookInput(TASK_ID, 'completed'));

      expect(result.synced).toBe(true);
      const updated = readTaskFile(TASK_ID);
      expect(updated.status).toBe('completed');
    });

    it('preserves all other fields when updating status', () => {
      const originalTask = {
        id: TASK_ID,
        subject: 'Create entry point',
        description: 'Create the hydration entry point',
        activeForm: 'Creating entry point',
        status: 'pending',
        blockedBy: ['t0'],
        guidance: 'Follow the pattern',
        doneWhen: 'Tests pass',
      };
      writeTaskFile(TASK_ID, originalTask);

      processSyncInput(makeHookInput(TASK_ID, 'completed'));

      const updated = readTaskFile(TASK_ID);
      expect(updated.status).toBe('completed');
      expect(updated.id).toBe(TASK_ID);
      expect(updated.subject).toBe('Create entry point');
      expect(updated.description).toBe('Create the hydration entry point');
      expect(updated.activeForm).toBe('Creating entry point');
      expect(updated.blockedBy).toEqual(['t0']);
      expect(updated.guidance).toBe('Follow the pattern');
      expect(updated.doneWhen).toBe('Tests pass');
    });
  });

  // ============================================================================
  // Runtime-created tasks (no matching file)
  // ============================================================================

  describe('runtime-created tasks', () => {
    it('silently ignores tasks with no matching file', () => {
      // No task file written for 'runtime-task'
      const result = processSyncInput(makeHookInput('runtime-task', 'in_progress'));

      expect(result.synced).toBe(false);
      expect(result.reason).toContain('not found');
    });

    it('does not create a task file for unknown tasks', () => {
      processSyncInput(makeHookInput('unknown-task', 'completed'));

      const taskPath = join(projectDir, '.saga', 'stories', STORY_ID, 'unknown-task.json');
      expect(existsSync(taskPath)).toBe(false);
    });
  });

  // ============================================================================
  // Malformed input
  // ============================================================================

  describe('malformed input', () => {
    it('returns not synced for empty input', () => {
      const result = processSyncInput('');
      expect(result.synced).toBe(false);
    });

    it('returns not synced for invalid JSON', () => {
      const result = processSyncInput('not valid json {{{');
      expect(result.synced).toBe(false);
    });

    it('returns not synced for missing tool_input', () => {
      const result = processSyncInput(JSON.stringify({ tool_name: 'TaskUpdate' }));
      expect(result.synced).toBe(false);
    });

    it('returns not synced for missing taskId in tool_input', () => {
      const result = processSyncInput(
        JSON.stringify({
          tool_name: 'TaskUpdate',
          tool_input: { status: 'completed' },
        }),
      );
      expect(result.synced).toBe(false);
    });

    it('returns not synced for missing status in tool_input', () => {
      const result = processSyncInput(
        JSON.stringify({
          tool_name: 'TaskUpdate',
          tool_input: { taskId: TASK_ID },
        }),
      );
      expect(result.synced).toBe(false);
    });
  });

  // ============================================================================
  // Missing environment variables
  // ============================================================================

  describe('missing environment variables', () => {
    it('returns not synced when SAGA_STORY_ID is not set', () => {
      process.env.SAGA_STORY_ID = undefined;
      writeTaskFile(TASK_ID, {
        id: TASK_ID,
        subject: 'Test',
        description: 'Test',
        status: 'pending',
        blockedBy: [],
      });

      const result = processSyncInput(makeHookInput(TASK_ID, 'completed'));

      expect(result.synced).toBe(false);
      expect(result.reason).toContain('SAGA_STORY_ID');
    });

    it('returns not synced when SAGA_PROJECT_DIR is not set', () => {
      process.env.SAGA_PROJECT_DIR = undefined;
      // Can't write task file since projectDir is unknown, but the test
      // verifies the env check happens before file access.

      const result = processSyncInput(makeHookInput(TASK_ID, 'completed'));

      expect(result.synced).toBe(false);
      expect(result.reason).toContain('SAGA_PROJECT_DIR');
    });
  });

  // ============================================================================
  // Write failure handling
  // ============================================================================

  describe('write failure handling', () => {
    it('returns not synced when task file has malformed JSON', () => {
      // Write non-JSON content to the task file
      const taskPath = join(projectDir, '.saga', 'stories', STORY_ID, `${TASK_ID}.json`);
      writeFileSync(taskPath, 'this is not json');

      const result = processSyncInput(makeHookInput(TASK_ID, 'completed'));

      expect(result.synced).toBe(false);
      expect(result.reason).toContain('parse');
    });

    it('returns not synced when task file is read-only (write failure)', () => {
      const taskPath = join(projectDir, '.saga', 'stories', STORY_ID, `${TASK_ID}.json`);
      writeFileSync(
        taskPath,
        JSON.stringify({
          id: TASK_ID,
          subject: 'Test',
          description: 'Test task',
          status: 'pending',
          blockedBy: [],
        }),
      );
      // Make the file read-only so writeFileSync fails
      chmodSync(taskPath, READONLY_PERMISSIONS);

      try {
        const result = processSyncInput(makeHookInput(TASK_ID, 'completed'));

        expect(result.synced).toBe(false);
        expect(result.reason).toContain('Failed to write task file');
      } finally {
        // Restore permissions for cleanup
        chmodSync(taskPath, READWRITE_PERMISSIONS);
      }
    });
  });

  // ============================================================================
  // Error reason messages
  // ============================================================================

  describe('error reason messages', () => {
    it('includes env var name when SAGA_PROJECT_DIR is missing', () => {
      process.env.SAGA_PROJECT_DIR = undefined;
      const result = processSyncInput(makeHookInput(TASK_ID, 'completed'));
      expect(result.reason).toBe('SAGA_PROJECT_DIR not set');
    });

    it('includes env var name when SAGA_STORY_ID is missing', () => {
      process.env.SAGA_STORY_ID = undefined;
      writeTaskFile(TASK_ID, {
        id: TASK_ID,
        subject: 'Test',
        description: 'Test',
        status: 'pending',
        blockedBy: [],
      });
      const result = processSyncInput(makeHookInput(TASK_ID, 'completed'));
      expect(result.reason).toBe('SAGA_STORY_ID not set');
    });

    it('includes file path when task file is not found', () => {
      const result = processSyncInput(makeHookInput('missing-task', 'completed'));
      expect(result.reason).toContain('Task file not found');
      expect(result.reason).toContain('missing-task');
    });

    it('includes parse error details for malformed task file', () => {
      const taskPath = join(projectDir, '.saga', 'stories', STORY_ID, `${TASK_ID}.json`);
      writeFileSync(taskPath, '<<<not json>>>');

      const result = processSyncInput(makeHookInput(TASK_ID, 'completed'));
      expect(result.reason).toContain('Failed to parse task file');
    });

    it('returns descriptive reason for empty stdin input', () => {
      const result = processSyncInput('');
      expect(result.reason).toBe('Invalid or missing hook input');
    });

    it('returns descriptive reason for invalid JSON stdin', () => {
      const result = processSyncInput('not json at all');
      expect(result.reason).toBe('Invalid or missing hook input');
    });
  });
});
