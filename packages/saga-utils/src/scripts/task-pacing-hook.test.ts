/**
 * Tests for task-pacing-hook.ts - PostToolUse hook for task pacing
 *
 * Tests the createTaskPacingHook factory which:
 *   - Returns additionalContext with context check guidance
 *   - Tracks completed task count and signals max tasks reached
 *   - Skips when taskId or status is missing or status is not 'completed'
 */

import type { PostToolUseHookInput } from '@anthropic-ai/claude-agent-sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTaskPacingHook } from './task-pacing-hook.ts';

const WORKTREE_PATH = '/project/.saga/worktrees/auth-setup';
const STORY_ID = 'auth-setup';
const TASK_ID = 't1';
const MAX_TASKS_PER_SESSION = 3;

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

describe('createTaskPacingHook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return { continue: true } with no hookSpecificOutput when status is not completed', async () => {
    const hook = createTaskPacingHook(WORKTREE_PATH, STORY_ID, MAX_TASKS_PER_SESSION);
    const input = makeHookInput({ taskId: TASK_ID, status: 'in_progress' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
    expect(result).not.toHaveProperty('hookSpecificOutput');
  });

  it('should return additionalContext when status is completed', async () => {
    const hook = createTaskPacingHook(WORKTREE_PATH, STORY_ID, MAX_TASKS_PER_SESSION);
    const input = makeHookInput({ taskId: TASK_ID, status: 'completed' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toHaveProperty('continue', true);
    expect(result).toHaveProperty('hookSpecificOutput.hookEventName', 'PostToolUse');
    expect(result).toHaveProperty('hookSpecificOutput.additionalContext');

    const output = result as { hookSpecificOutput: { additionalContext: string } };
    const ctx = output.hookSpecificOutput.additionalContext;
    expect(ctx).toContain('completed');
    expect(ctx).toContain('CONTEXT CHECK');
  });

  it('should include context check guidance in additionalContext', async () => {
    const hook = createTaskPacingHook(WORKTREE_PATH, STORY_ID, MAX_TASKS_PER_SESSION);
    const input = makeHookInput({ taskId: TASK_ID, status: 'completed' });
    const result = await hook(input, 'tu-1', hookOptions);

    const output = result as { hookSpecificOutput: { additionalContext: string } };
    const ctx = output.hookSpecificOutput.additionalContext;
    expect(ctx).toContain('40-70%');
    expect(ctx).toContain('Assess the next task');
    expect(ctx).toContain('above the context utilization window');
  });

  it('should signal max tasks reached after completing maxTasksPerSession tasks', async () => {
    const hook = createTaskPacingHook(WORKTREE_PATH, STORY_ID, 2);
    const input = makeHookInput({ taskId: TASK_ID, status: 'completed' });

    // First completion - not at max
    const result1 = await hook(input, 'tu-1', hookOptions);
    const output1 = result1 as { hookSpecificOutput: { additionalContext: string } };
    expect(output1.hookSpecificOutput.additionalContext).toContain('CONTEXT CHECK');
    expect(output1.hookSpecificOutput.additionalContext).not.toContain('maximum number of tasks');

    // Second completion - at max
    const result2 = await hook(input, 'tu-2', hookOptions);
    const output2 = result2 as { hookSpecificOutput: { additionalContext: string } };
    expect(output2.hookSpecificOutput.additionalContext).toContain('maximum number of tasks');
    expect(output2.hookSpecificOutput.additionalContext).not.toContain('CONTEXT CHECK');
  });

  it('should skip when taskId is missing', async () => {
    const hook = createTaskPacingHook(WORKTREE_PATH, STORY_ID, MAX_TASKS_PER_SESSION);
    const input = makeHookInput({ status: 'completed' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
  });

  it('should skip when status is missing', async () => {
    const hook = createTaskPacingHook(WORKTREE_PATH, STORY_ID, MAX_TASKS_PER_SESSION);
    const input = makeHookInput({ taskId: TASK_ID });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
  });

  it('should skip when status is pending', async () => {
    const hook = createTaskPacingHook(WORKTREE_PATH, STORY_ID, MAX_TASKS_PER_SESSION);
    const input = makeHookInput({ taskId: TASK_ID, status: 'pending' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
  });

  it('should handle missing tool_input gracefully', async () => {
    const hook = createTaskPacingHook(WORKTREE_PATH, STORY_ID, MAX_TASKS_PER_SESSION);
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
