/**
 * In-process task pacing hook for the Agent SDK.
 *
 * PostToolUse hook callback that fires on TaskUpdate. When a task is marked
 * as completed, it tracks the count and returns additionalContext with
 * context usage guidance.
 *
 * When the completed count reaches maxTasksPerSession, the additionalContext
 * instructs the agent to finish the session.
 */

import type {
  HookCallback,
  HookJSONOutput,
  PostToolUseHookInput,
} from '@anthropic-ai/claude-agent-sdk';
import { buildTaskPacingContext } from './prompts/task-pacing-context.ts';

/**
 * Create a PostToolUse hook callback that tracks completed task count and
 * returns additionalContext with context guidance.
 *
 * Returns `{ continue: true }` when status is not 'completed'.
 * Returns `{ continue: true, hookSpecificOutput }` with additionalContext
 * when status is 'completed'.
 */
function createTaskPacingHook(
  _worktreePath: string,
  _storyId: string,
  maxTasksPerSession: number,
): HookCallback {
  let completedCount = 0;

  return (_input, _toolUseID, _options): Promise<HookJSONOutput> => {
    const hookInput = _input as PostToolUseHookInput;
    const toolInput = (hookInput.tool_input ?? {}) as Record<string, unknown>;

    const taskId = toolInput.taskId as string | undefined;
    const status = toolInput.status as string | undefined;

    // Skip when taskId or status is missing, or status is not 'completed'
    if (!(taskId && status) || status !== 'completed') {
      return Promise.resolve({ continue: true });
    }

    completedCount++;

    const maxTasksReached = completedCount >= maxTasksPerSession;

    const additionalContext = buildTaskPacingContext(taskId, maxTasksReached);

    return Promise.resolve({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'PostToolUse' as const,
        additionalContext,
      },
    });
  };
}

export { createTaskPacingHook };
