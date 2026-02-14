/**
 * Tests for task-completion-hook.ts - PostToolUse hook for auto-commit on task completion
 *
 * Tests the createTaskCompletionHook factory which:
 *   - Auto-commits and pushes when a task is marked as completed
 *   - Returns additionalContext with journal reminder and context check guidance
 *   - Handles git failures gracefully
 *   - Skips when taskId or status is missing or status is not 'completed'
 */

import type { PostToolUseHookInput } from '@anthropic-ai/claude-agent-sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTaskCompletionHook } from './task-completion-hook.ts';

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

describe('createTaskCompletionHook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return { continue: true } with no hookSpecificOutput when status is not completed', async () => {
    const hook = createTaskCompletionHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: TASK_ID, status: 'in_progress' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
    expect(result).not.toHaveProperty('hookSpecificOutput');
  });

  it('should return additionalContext when status is completed', async () => {
    mockExecFileSync.mockReturnValue('');

    const hook = createTaskCompletionHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: TASK_ID, status: 'completed' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toHaveProperty('continue', true);
    expect(result).toHaveProperty('hookSpecificOutput.hookEventName', 'PostToolUse');
    expect(result).toHaveProperty('hookSpecificOutput.additionalContext');

    const output = result as { hookSpecificOutput: { additionalContext: string } };
    const ctx = output.hookSpecificOutput.additionalContext;
    expect(ctx).toContain('completed');
    expect(ctx).toContain('journal');
    expect(ctx).toContain('CONTEXT CHECK');
  });

  it('should include journal reminder template in additionalContext', async () => {
    mockExecFileSync.mockReturnValue('');

    const hook = createTaskCompletionHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: TASK_ID, status: 'completed' });
    const result = await hook(input, 'tu-1', hookOptions);

    const output = result as { hookSpecificOutput: { additionalContext: string } };
    const ctx = output.hookSpecificOutput.additionalContext;
    expect(ctx).toContain(`.saga/stories/${STORY_ID}/journal.md`);
    expect(ctx).toContain('**What was done:**');
    expect(ctx).toContain('**Decisions:**');
    expect(ctx).toContain('**Next steps:**');
  });

  it('should include context check guidance in additionalContext', async () => {
    mockExecFileSync.mockReturnValue('');

    const hook = createTaskCompletionHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: TASK_ID, status: 'completed' });
    const result = await hook(input, 'tu-1', hookOptions);

    const output = result as { hookSpecificOutput: { additionalContext: string } };
    const ctx = output.hookSpecificOutput.additionalContext;
    expect(ctx).toContain('40-70%');
    expect(ctx).toContain('next unblocked task');
    expect(ctx).toContain('commit any remaining work and exit');
  });

  it('should run git add, commit, and push when status is completed', async () => {
    mockExecFileSync.mockReturnValue('');

    const hook = createTaskCompletionHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: TASK_ID, status: 'completed' });
    await hook(input, 'tu-1', hookOptions);

    const gitCalls = mockExecFileSync.mock.calls.filter((call) => call[0] === 'git');
    expect(gitCalls).toHaveLength(GIT_COMMAND_COUNT);
    expect(gitCalls[0][1]).toEqual(['add', '.']);
    expect(gitCalls[1][1]).toEqual(['commit', '-m', `feat(${STORY_ID}): complete ${TASK_ID}`]);
    expect(gitCalls[2][1]).toEqual(['push']);
  });

  it('should not run git when status is not completed', async () => {
    const hook = createTaskCompletionHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: TASK_ID, status: 'in_progress' });
    await hook(input, 'tu-1', hookOptions);

    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('should handle git failures gracefully and return additionalContext regardless', async () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('git failed');
    });

    // Suppress stderr output during test
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const hook = createTaskCompletionHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: TASK_ID, status: 'completed' });
    const result = await hook(input, 'tu-1', hookOptions);

    // Should not crash
    expect(result).toHaveProperty('continue', true);
    // Should still return additionalContext
    expect(result).toHaveProperty('hookSpecificOutput.additionalContext');

    stderrSpy.mockRestore();
  });

  it('should skip when taskId is missing', async () => {
    const hook = createTaskCompletionHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ status: 'completed' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('should skip when status is missing', async () => {
    const hook = createTaskCompletionHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: TASK_ID });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('should skip when status is pending', async () => {
    const hook = createTaskCompletionHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: TASK_ID, status: 'pending' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('should handle missing tool_input gracefully', async () => {
    const hook = createTaskCompletionHook(WORKTREE_PATH, STORY_ID);
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
