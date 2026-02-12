/**
 * In-process sync hook for the Agent SDK.
 *
 * PostToolUse hook callback that syncs TaskUpdate status changes
 * back to SAGA task JSON files on disk.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type {
  HookCallback,
  HookJSONOutput,
  PostToolUseHookInput,
} from '@anthropic-ai/claude-agent-sdk';
import { createTaskPath } from '@saga-ai/types';

/**
 * Create a PostToolUse hook callback that syncs TaskUpdate status changes
 * back to SAGA task files on disk.
 *
 * Returns `{ continue: true }` always — sync failures must not crash the agent.
 */
function createSyncHook(worktreePath: string, storyId: string): HookCallback {
  return (_input, _toolUseID, _options): Promise<HookJSONOutput> => {
    const hookInput = _input as PostToolUseHookInput;
    const toolInput = (hookInput.tool_input ?? {}) as Record<string, unknown>;

    const taskId = toolInput.taskId as string | undefined;
    const status = toolInput.status as string | undefined;

    if (taskId && status) {
      try {
        const taskPath = createTaskPath(worktreePath, storyId, taskId);
        if (existsSync(taskPath)) {
          const taskData = JSON.parse(readFileSync(taskPath, 'utf-8')) as Record<string, unknown>;
          taskData.status = status;
          writeFileSync(taskPath, JSON.stringify(taskData, null, 2));
        }
      } catch {
        // Sync failures must not crash the agent
      }
    }

    return Promise.resolve({ continue: true });
  };
}

export { createSyncHook };
