/**
 * Tests for sync-hook.ts - In-process SDK PostToolUse hook
 *
 * Tests the createSyncHook factory which syncs TaskUpdate status changes
 * back to SAGA task JSON files on disk.
 */

import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { PostToolUseHookInput } from '@anthropic-ai/claude-agent-sdk';
import { describe, expect, it } from 'vitest';
import { createSyncHook } from './sync-hook.ts';

const STORY_ID = 'my-story';
const TASK_ID = 't1';

function makeHookInput(
  toolInput: Record<string, unknown>,
  toolName = 'TaskUpdate',
): PostToolUseHookInput {
  return {
    session_id: 'test-session',
    transcript_path: '/tmp/transcript',
    cwd: '/tmp',
    hook_event_name: 'PostToolUse',
    tool_name: toolName,
    tool_input: toolInput,
    tool_response: { status: 'ok' },
    tool_use_id: 'tu-1',
  };
}

const abortController = new AbortController();
const hookOptions = { signal: abortController.signal };

describe('createSyncHook', () => {
  function setupTempProject(): {
    worktreePath: string;
    writeTask: (taskId: string, task: Record<string, unknown>) => void;
    readTask: (taskId: string) => Record<string, unknown>;
  } {
    const tempDir = realpathSync(mkdtempSync(join(tmpdir(), 'sync-hook-test-')));
    const storyDir = join(tempDir, '.saga', 'stories', STORY_ID);
    mkdirSync(storyDir, { recursive: true });

    return {
      worktreePath: tempDir,
      writeTask(taskId: string, task: Record<string, unknown>): void {
        writeFileSync(join(storyDir, `${taskId}.json`), JSON.stringify(task, null, 2));
      },
      readTask(taskId: string): Record<string, unknown> {
        return JSON.parse(readFileSync(join(storyDir, `${taskId}.json`), 'utf-8'));
      },
    };
  }

  it('should sync task status on TaskUpdate with taskId and status', async () => {
    const { worktreePath, writeTask, readTask } = setupTempProject();
    writeTask(TASK_ID, {
      id: TASK_ID,
      subject: 'Create entry point',
      description: 'Create the entry point',
      status: 'pending',
      blockedBy: [],
    });

    const hook = createSyncHook(worktreePath, STORY_ID);
    const input = makeHookInput({ taskId: TASK_ID, status: 'in_progress' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
    const updated = readTask(TASK_ID);
    expect(updated.status).toBe('in_progress');
  });

  it('should always return { continue: true }', async () => {
    const { worktreePath } = setupTempProject();

    const hook = createSyncHook(worktreePath, STORY_ID);
    const input = makeHookInput({ taskId: TASK_ID, status: 'completed' });
    const result = await hook(input, 'tu-1', hookOptions);

    // Task file doesn't exist, but it should still continue
    expect(result).toEqual({ continue: true });
  });

  it('should skip when taskId is missing from tool_input', async () => {
    const { worktreePath, writeTask, readTask } = setupTempProject();
    writeTask(TASK_ID, {
      id: TASK_ID,
      subject: 'Test',
      description: 'Test',
      status: 'pending',
      blockedBy: [],
    });

    const hook = createSyncHook(worktreePath, STORY_ID);
    const input = makeHookInput({ status: 'completed' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
    // Status should remain unchanged
    const task = readTask(TASK_ID);
    expect(task.status).toBe('pending');
  });

  it('should skip when status is missing from tool_input', async () => {
    const { worktreePath, writeTask, readTask } = setupTempProject();
    writeTask(TASK_ID, {
      id: TASK_ID,
      subject: 'Test',
      description: 'Test',
      status: 'pending',
      blockedBy: [],
    });

    const hook = createSyncHook(worktreePath, STORY_ID);
    const input = makeHookInput({ taskId: TASK_ID, subject: 'New subject' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
    // Status should remain unchanged
    const task = readTask(TASK_ID);
    expect(task.status).toBe('pending');
  });

  it('should not crash when task file does not exist', async () => {
    const { worktreePath } = setupTempProject();

    const hook = createSyncHook(worktreePath, STORY_ID);
    const input = makeHookInput({ taskId: 'nonexistent', status: 'completed' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
  });

  it('should handle missing tool_input gracefully', async () => {
    const { worktreePath } = setupTempProject();

    const hook = createSyncHook(worktreePath, STORY_ID);
    const input = {
      session_id: 'test-session',
      transcript_path: '/tmp/transcript',
      cwd: '/tmp',
      hook_event_name: 'PostToolUse' as const,
      tool_name: 'TaskUpdate',
      tool_response: { status: 'ok' },
      tool_use_id: 'tu-1',
    } as unknown as PostToolUseHookInput;
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
  });
});
