/**
 * In-process scope validator hook for the Agent SDK.
 *
 * Wraps the existing validatePath() logic as an SDK PreToolUse hook callback,
 * replacing the subprocess-based scope-validator script for the worker pipeline.
 */

import type {
  HookCallback,
  HookJSONOutput,
  PreToolUseHookInput,
} from '@anthropic-ai/claude-agent-sdk';
import { validatePath } from './scope-validator.ts';

/**
 * Create a PreToolUse hook callback that validates file paths against story scope.
 * Returns `{ continue: true }` for allowed operations,
 * or blocks with a deny decision for scope violations.
 */
function createScopeValidatorHook(worktreePath: string, storyId: string): HookCallback {
  return (_input, _toolUseID, _options): Promise<HookJSONOutput> => {
    const hookInput = _input as PreToolUseHookInput;
    const toolName = hookInput.tool_name;
    const toolInput = (hookInput.tool_input ?? {}) as Record<string, unknown>;
    const filePath = (toolInput.file_path || toolInput.path) as string | undefined;

    if (!filePath) {
      return Promise.resolve({ continue: true });
    }

    const violation = validatePath(filePath, worktreePath, { storyId }, toolName);
    if (violation) {
      return Promise.resolve({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse' as const,
          permissionDecision: 'deny' as const,
          // SDK hook output expects a single-line reason; take only the first line
          permissionDecisionReason: violation.split('\n')[0],
        },
      });
    }

    return Promise.resolve({ continue: true });
  };
}

export { createScopeValidatorHook };
