/**
 * In-process journal gate hook for the Agent SDK.
 *
 * PreToolUse hook callback that fires on TaskUpdate. When a task is being
 * marked as completed, it checks whether journal.md has uncommitted changes.
 * If not, the tool call is denied so the agent writes a journal entry first.
 *
 * Fails open on git errors to avoid permanently blocking the agent.
 */

import { execFileSync } from 'node:child_process';
import type {
  HookCallback,
  HookJSONOutput,
  PreToolUseHookInput,
} from '@anthropic-ai/claude-agent-sdk';
import { createStoryPaths } from '../directory.ts';

/**
 * Create a PreToolUse hook callback that blocks task completion unless
 * journal.md has uncommitted changes.
 *
 * Returns `{ continue: true }` when allowed (status is not 'completed',
 * journal has changes, or git error).
 * Returns a deny decision when journal.md has no uncommitted changes.
 */
function createJournalGateHook(worktreePath: string, storyId: string): HookCallback {
  const { journalMd } = createStoryPaths(worktreePath, storyId);

  return (_input, _toolUseID, _options): Promise<HookJSONOutput> => {
    const hookInput = _input as PreToolUseHookInput;
    const toolInput = (hookInput.tool_input ?? {}) as Record<string, unknown>;

    const status = toolInput.status as string | undefined;

    // Only gate on status: 'completed'
    if (status !== 'completed') {
      return Promise.resolve({ continue: true });
    }

    try {
      const output = execFileSync('git', ['status', '--porcelain', '--', journalMd], {
        cwd: worktreePath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (output.trim().length > 0) {
        // Journal has uncommitted changes — allow
        return Promise.resolve({ continue: true });
      }

      // No changes to journal — deny
      return Promise.resolve({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse' as const,
          permissionDecision: 'deny' as const,
          permissionDecisionReason: `Write a journal entry to ${journalMd} before marking the task as completed.`,
        },
      });
    } catch {
      // Fail open on git errors
      return Promise.resolve({ continue: true });
    }
  };
}

export { createJournalGateHook };
