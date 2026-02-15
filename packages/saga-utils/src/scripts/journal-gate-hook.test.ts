/**
 * Tests for journal-gate-hook.ts - PreToolUse hook that blocks task completion
 * without a journal entry.
 *
 * Tests the createJournalGateHook factory which:
 *   - Allows TaskUpdate when status is not 'completed'
 *   - Allows TaskUpdate when journal.md has uncommitted changes
 *   - Denies TaskUpdate when journal.md has no uncommitted changes
 *   - Fails open when git errors occur
 */

import type { PreToolUseHookInput } from '@anthropic-ai/claude-agent-sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createJournalGateHook } from './journal-gate-hook.ts';

// Mock child_process for git commands
vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

import { execFileSync } from 'node:child_process';

const mockExecFileSync = vi.mocked(execFileSync);

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

  it('should allow when status is not completed (in_progress)', async () => {
    const hook = createJournalGateHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: 't1', status: 'in_progress' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('should allow when status is not completed (pending)', async () => {
    const hook = createJournalGateHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: 't1', status: 'pending' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('should allow when status is missing', async () => {
    const hook = createJournalGateHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: 't1' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('should allow when tool_input is missing', async () => {
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
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('should allow when journal.md has unstaged changes', async () => {
    // ' M' prefix = unstaged modification
    mockExecFileSync.mockReturnValue(` M ${JOURNAL_PATH}\n`);

    const hook = createJournalGateHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: 't1', status: 'completed' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'git',
      ['status', '--porcelain', '--', JOURNAL_PATH],
      expect.objectContaining({ cwd: WORKTREE_PATH }),
    );
  });

  it('should allow when journal.md has staged changes', async () => {
    // 'M ' prefix = staged modification
    mockExecFileSync.mockReturnValue(`M  ${JOURNAL_PATH}\n`);

    const hook = createJournalGateHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: 't1', status: 'completed' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
  });

  it('should allow when journal.md is untracked (new file)', async () => {
    // '??' prefix = untracked
    mockExecFileSync.mockReturnValue(`?? ${JOURNAL_PATH}\n`);

    const hook = createJournalGateHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: 't1', status: 'completed' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
  });

  it('should deny when journal.md has no uncommitted changes', async () => {
    // Empty output = no changes
    mockExecFileSync.mockReturnValue('');

    const hook = createJournalGateHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: 't1', status: 'completed' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: expect.stringContaining(JOURNAL_PATH),
      },
    });
  });

  it('should include actionable reason in deny output', async () => {
    mockExecFileSync.mockReturnValue('');

    const hook = createJournalGateHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: 't1', status: 'completed' });
    const result = await hook(input, 'tu-1', hookOptions);

    const output = result as {
      hookSpecificOutput: { permissionDecisionReason: string };
    };
    expect(output.hookSpecificOutput.permissionDecisionReason).toContain('journal');
  });

  it('should fail open when execFileSync throws', async () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('git not found');
    });

    const hook = createJournalGateHook(WORKTREE_PATH, STORY_ID);
    const input = makeHookInput({ taskId: 't1', status: 'completed' });
    const result = await hook(input, 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
  });
});
