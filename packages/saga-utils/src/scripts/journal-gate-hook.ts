/**
 * In-process journal reminder hook for the Agent SDK.
 *
 * PreToolUse hook callback that fires on TaskUpdate. When a task is being
 * marked as completed, it adds a reminder via additionalContext so the
 * agent writes a journal entry if it hasn't already.
 *
 * The task completion always proceeds — this is a soft reminder, not a gate.
 */

import type {
  HookCallback,
  HookJSONOutput,
  PreToolUseHookInput,
} from '@anthropic-ai/claude-agent-sdk';
import { createStoryPaths } from '../directory.ts';

/**
 * Create a PreToolUse hook callback that reminds the agent to write a
 * journal entry when completing a task.
 *
 * Always returns `{ continue: true }` — the task completion proceeds
 * regardless. On completion, additionalContext is included as a reminder.
 */
function createJournalGateHook(worktreePath: string, storyId: string): HookCallback {
  const { journalMd } = createStoryPaths(worktreePath, storyId);

  return (_input, _toolUseID, _options): Promise<HookJSONOutput> => {
    const hookInput = _input as PreToolUseHookInput;
    const toolInput = (hookInput.tool_input ?? {}) as Record<string, unknown>;

    const status = toolInput.status as string | undefined;
    const taskId = toolInput.taskId as string | undefined;

    if (status !== 'completed') {
      return Promise.resolve({ continue: true });
    }

    return Promise.resolve({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'PreToolUse' as const,
        additionalContext: `Reminder: if you haven't already, write a journal entry to ${journalMd} with the structure instructed earlier for the "${taskId}" completed task.`,
      },
    });
  };
}

export { createJournalGateHook };
