#!/usr/bin/env node

// src/scripts/token-limit-hook.ts
function createTokenLimitHook(tracker, maxTokens) {
  return (_input, _toolUseID, _options) => {
    if (tracker.inputTokens < maxTokens) {
      return Promise.resolve({ continue: true });
    }
    return Promise.resolve({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: "[TOKEN LIMIT] You have reached the session token limit. Wrap up your current work immediately: commit progress, update task status, write a journal entry, and exit cleanly. Do NOT start any new tasks."
      }
    });
  };
}
export {
  createTokenLimitHook
};
