/**
 * Tests for auto-commit-hook.ts - PostToolUse hook for auto-commit on task completion
 *
 * Tests the createAutoCommitHook factory which:
 *   - Auto-commits and pushes when a task is marked as completed
 *   - Handles git failures gracefully
 *   - Skips when taskId or status is missing or status is not 'completed'
 */

import type { PostToolUseHookInput } from '@anthropic-ai/claude-agent-sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAutoCommitHook } from './auto-commit-hook.ts';

// Mock child_process for git commands
vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

import { execFileSync } from 'node:child_process';
import process from 'node:process';

const mockExecFileSync = vi.mocked(execFileSync);

const WORKTREE_PATH = '/project/.saga/worktrees/auth-setup';
const STORY_ID = 'auth-setup';
const TASK_ID = 't1';
const GIT_COMMAND_COUNT = 3; // git add, git commit, git push

function makeHookInput(toolInput: Record<string, unknown>): PostToolUseHookInput {
  return {
    session_id: 'test-session',
    transcript_path: '/tmp/transcript',
    cwd: '/tmp',
    hook_event_name: 'PostToolUse',
    tool_name: 'TaskUpdate',
    tool_input: toolInput,
    tool_response: { status: 'ok' },
    tool_use_id: 'tu-1',
  };
}

const abortController = new AbortController();
const hookOptions = { signal: abortController.signal };

describe('createAutoCommitHook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should run git add, commit, and push when status is completed', async () => {
    mockExecFileSync.mockReturnValue('');

    const hook = createAutoCommitHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: TASK_ID, status: 'completed' });
    await hook(input, 'tu-1', hookOptions);

    const gitCalls = mockExecFileSync.mock.calls.filter((call) => call[0] === 'git');
    expect(gitCalls).toHaveLength(GIT_COMMAND_COUNT);
    expect(gitCalls[0][1]).toEqual(['add', '.']);
    expect(gitCalls[1][1]).toEqual(['commit', '-m', `feat(${STORY_ID}): complete ${TASK_ID}`]);
    expect(gitCalls[2][1]).toEqual(['push']);
  });

  it('should return additionalContext confirming commit on success', async () => {
    mockExecFileSync.mockReturnValue('');

    const hook = createAutoCommitHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: TASK_ID, status: 'completed' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: 'Changes committed and pushed.',
      },
    });
  });

  it('should not run git when status is not completed', async () => {
    const hook = createAutoCommitHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: TASK_ID, status: 'in_progress' });
    await hook(input, 'tu-1', hookOptions);

    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('should return additionalContext when git add fails', async () => {
    const addError = 'fatal: not a git repository';
    mockExecFileSync.mockImplementation((_cmd: unknown, args: unknown) => {
      const gitArgs = args as string[];
      if (gitArgs[0] === 'add') {
        const err = new Error('Command failed') as Error & { stderr: Buffer };
        err.stderr = Buffer.from(addError);
        throw err;
      }
      return '';
    });

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const hook = createAutoCommitHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: TASK_ID, status: 'completed' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: expect.stringContaining(addError),
      },
    });
    expect(
      (result as { hookSpecificOutput: { additionalContext: string } }).hookSpecificOutput
        .additionalContext,
    ).toContain('add');

    stderrSpy.mockRestore();
  });

  it('should return additionalContext when git commit fails', async () => {
    const lintError = 'error: lint check failed\nhook aborted';
    mockExecFileSync.mockImplementation((_cmd: unknown, args: unknown) => {
      const gitArgs = args as string[];
      if (gitArgs[0] === 'commit') {
        const err = new Error('Command failed') as Error & { stderr: Buffer };
        err.stderr = Buffer.from(lintError);
        throw err;
      }
      return '';
    });

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const hook = createAutoCommitHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: TASK_ID, status: 'completed' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: expect.stringContaining(lintError),
      },
    });
    expect(
      (result as { hookSpecificOutput: { additionalContext: string } }).hookSpecificOutput
        .additionalContext,
    ).toContain('commit');

    stderrSpy.mockRestore();
  });

  it('should return additionalContext when git push fails', async () => {
    const pushError = 'fatal: failed to push some refs';
    mockExecFileSync.mockImplementation((_cmd: unknown, args: unknown) => {
      const gitArgs = args as string[];
      if (gitArgs[0] === 'push') {
        const err = new Error('Command failed') as Error & { stderr: Buffer };
        err.stderr = Buffer.from(pushError);
        throw err;
      }
      return '';
    });

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const hook = createAutoCommitHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: TASK_ID, status: 'completed' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: expect.stringContaining(pushError),
      },
    });
    expect(
      (result as { hookSpecificOutput: { additionalContext: string } }).hookSpecificOutput
        .additionalContext,
    ).toContain('push');

    stderrSpy.mockRestore();
  });

  it('should handle git failures gracefully (no crash)', async () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('git failed');
    });

    // Suppress stderr output during test
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const hook = createAutoCommitHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: TASK_ID, status: 'completed' });
    const result = await hook(input, 'tu-1', hookOptions);

    // Should not crash, should still return continue: true
    expect(result.continue).toBe(true);

    stderrSpy.mockRestore();
  });

  it('should skip when taskId is missing', async () => {
    const hook = createAutoCommitHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ status: 'completed' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('should skip when status is missing', async () => {
    const hook = createAutoCommitHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: TASK_ID });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('should skip when status is pending', async () => {
    const hook = createAutoCommitHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: TASK_ID, status: 'pending' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('should handle missing tool_input gracefully', async () => {
    const hook = createAutoCommitHook(WORKTREE_PATH, STORY_ID);
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
