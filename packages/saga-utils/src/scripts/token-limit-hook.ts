/**
 * In-process token limit hook for the Agent SDK.
 *
 * PostToolUse hook callback that fires on every tool use. It reads a shared
 * TokenTracker (updated externally from assistant messages in the `for await`
 * loop) and returns additionalContext telling the agent to wrap up when the
 * input token count exceeds the configured limit.
 */

import type { HookCallback, HookJSONOutput } from '@anthropic-ai/claude-agent-sdk';

/**
 * Mutable token tracker shared between the `for await` message loop
 * (which writes `inputTokens`) and the hook (which reads it).
 */
interface TokenTracker {
  inputTokens: number;
}

/**
 * Create a PostToolUse hook callback that checks the current input token
 * count against a maximum and tells the agent to wrap up when exceeded.
 *
 * Returns `{ continue: true }` when below the limit.
 * Returns `{ continue: true, hookSpecificOutput }` with additionalContext
 * when at or above the limit.
 */
function createTokenLimitHook(tracker: TokenTracker, maxTokens: number): HookCallback {
  return (_input, _toolUseID, _options): Promise<HookJSONOutput> => {
    if (tracker.inputTokens < maxTokens) {
      return Promise.resolve({ continue: true });
    }

    return Promise.resolve({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'PostToolUse' as const,
        additionalContext:
          '[TOKEN LIMIT] You have reached the session token limit. ' +
          'Wrap up your current work immediately: commit progress, ' +
          'update task status, write a journal entry, and exit cleanly. ' +
          'Do NOT start any new tasks.',
      },
    });
  };
}

export { createTokenLimitHook };
export type { TokenTracker };
