/**
 * Tests for journal-gate-hook.ts - PreToolUse hook that reminds the agent
 * to write a journal entry on task completion.
 *
 * Tests the createJournalGateHook factory which:
 *   - Allows silently when status is not 'completed'
 *   - Allows with a journal reminder when status is 'completed'
 */

import type { PreToolUseHookInput } from '@anthropic-ai/claude-agent-sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createJournalGateHook } from './journal-gate-hook.ts';

const WORKTREE_PATH = '/project/.saga/worktrees/auth-setup';
const STORY_ID = 'auth-setup';
const JOURNAL_PATH = `${WORKTREE_PATH}/.saga/stories/${STORY_ID}/journal.md`;

function makeHookInput(toolInput: Record<string, unknown>): PreToolUseHookInput {
  return {
    session_id: 'test-session',
    transcript_path: '/tmp/transcript',
    cwd: '/tmp',
    hook_event_name: 'PreToolUse',
    tool_name: 'TaskUpdate',
    tool_input: toolInput,
    tool_use_id: 'tu-1',
  };
}

const abortController = new AbortController();
const hookOptions = { signal: abortController.signal };

describe('createJournalGateHook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should allow without reminder when status is in_progress', async () => {
    const hook = createJournalGateHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: 't1', status: 'in_progress' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
  });

  it('should allow without reminder when status is pending', async () => {
    const hook = createJournalGateHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: 't1', status: 'pending' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
  });

  it('should allow without reminder when status is missing', async () => {
    const hook = createJournalGateHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: 't1' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
  });

  it('should allow without reminder when tool_input is missing', async () => {
    const hook = createJournalGateHook(WORKTREE_PATH, STORY_ID);
    const input = {
      session_id: 'test-session',
      transcript_path: '/tmp/transcript',
      cwd: '/tmp',
      hook_event_name: 'PreToolUse' as const,
      tool_name: 'TaskUpdate',
      tool_use_id: 'tu-1',
    } as unknown as PreToolUseHookInput;
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
  });

  it('should return reminder when status is completed', async () => {
    const hook = createJournalGateHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: 't1', status: 'completed' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        additionalContext: expect.stringContaining(JOURNAL_PATH),
      },
    });
  });

  it('should include actionable reminder text', async () => {
    const hook = createJournalGateHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: 't1', status: 'completed' });
    const result = await hook(input, 'tu-1', hookOptions);

    const output = result as {
      continue: boolean;
      hookSpecificOutput: { additionalContext: string };
    };
    expect(output.continue).toBe(true);
    expect(output.hookSpecificOutput.additionalContext).toContain('completed task');
  });
});
