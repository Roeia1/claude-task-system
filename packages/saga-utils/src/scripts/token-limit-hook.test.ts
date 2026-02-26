/**
 * Tests for token-limit-hook.ts - PostToolUse hook for token-based session limiting
 *
 * Tests the createTokenLimitHook factory which:
 *   - Returns { continue: true } when tracker is below the limit
 *   - Returns additionalContext telling the agent to wrap up when at/above the limit
 *   - Reacts to tracker mutations (shared mutable state)
 *   - Consistently returns the wrap-up message after the limit is triggered
 */

import type { PostToolUseHookInput } from '@anthropic-ai/claude-agent-sdk';
import { describe, expect, it } from 'vitest';
import type { TokenTracker } from './token-limit-hook.ts';
import { createTokenLimitHook } from './token-limit-hook.ts';

const MAX_TOKENS = 120_000;
const ABOVE_LIMIT_TOKENS = 150_000;
const BELOW_LIMIT_TOKENS = 50_000;
const MUTATED_TOKENS = 130_000;

function makeHookInput(): PostToolUseHookInput {
  return {
    session_id: 'test-session',
    transcript_path: '/tmp/transcript',
    cwd: '/tmp',
    hook_event_name: 'PostToolUse',
    tool_name: 'Bash',
    tool_input: { command: 'echo hello' },
    tool_response: { status: 'ok' },
    tool_use_id: 'tu-1',
  };
}

const abortController = new AbortController();
const hookOptions = { signal: abortController.signal };

describe('createTokenLimitHook', () => {
  it('should return { continue: true } when below the limit', async () => {
    const tracker: TokenTracker = { inputTokens: BELOW_LIMIT_TOKENS };
    const hook = createTokenLimitHook(tracker, MAX_TOKENS);
    const result = await hook(makeHookInput(), 'tu-1', hookOptions);

    expect(result).toEqual({ continue: true });
    expect(result).not.toHaveProperty('hookSpecificOutput');
  });

  it('should return additionalContext when at the limit', async () => {
    const tracker: TokenTracker = { inputTokens: MAX_TOKENS };
    const hook = createTokenLimitHook(tracker, MAX_TOKENS);
    const result = await hook(makeHookInput(), 'tu-1', hookOptions);

    expect(result).toHaveProperty('continue', true);
    expect(result).toHaveProperty('hookSpecificOutput.hookEventName', 'PostToolUse');
    expect(result).toHaveProperty('hookSpecificOutput.additionalContext');

    const output = result as { hookSpecificOutput: { additionalContext: string } };
    expect(output.hookSpecificOutput.additionalContext).toContain('TOKEN LIMIT');
    expect(output.hookSpecificOutput.additionalContext).toContain('Wrap up');
  });

  it('should return additionalContext when above the limit', async () => {
    const tracker: TokenTracker = { inputTokens: ABOVE_LIMIT_TOKENS };
    const hook = createTokenLimitHook(tracker, MAX_TOKENS);
    const result = await hook(makeHookInput(), 'tu-1', hookOptions);

    expect(result).toHaveProperty('hookSpecificOutput.hookEventName', 'PostToolUse');

    const output = result as { hookSpecificOutput: { additionalContext: string } };
    expect(output.hookSpecificOutput.additionalContext).toContain('TOKEN LIMIT');
  });

  it('should react to tracker mutations', async () => {
    const tracker: TokenTracker = { inputTokens: 0 };
    const hook = createTokenLimitHook(tracker, MAX_TOKENS);

    // Below limit
    const result1 = await hook(makeHookInput(), 'tu-1', hookOptions);
    expect(result1).toEqual({ continue: true });
    expect(result1).not.toHaveProperty('hookSpecificOutput');

    // Mutate tracker to exceed limit
    tracker.inputTokens = MUTATED_TOKENS;

    // Now at limit
    const result2 = await hook(makeHookInput(), 'tu-2', hookOptions);
    expect(result2).toHaveProperty('hookSpecificOutput.additionalContext');

    const output = result2 as { hookSpecificOutput: { additionalContext: string } };
    expect(output.hookSpecificOutput.additionalContext).toContain('TOKEN LIMIT');
  });

  it('should consistently return wrap-up message after trigger', async () => {
    const tracker: TokenTracker = { inputTokens: MAX_TOKENS };
    const hook = createTokenLimitHook(tracker, MAX_TOKENS);

    // First call at limit
    const result1 = await hook(makeHookInput(), 'tu-1', hookOptions);
    expect(result1).toHaveProperty('hookSpecificOutput.additionalContext');

    // Second call still at limit
    const result2 = await hook(makeHookInput(), 'tu-2', hookOptions);
    expect(result2).toHaveProperty('hookSpecificOutput.additionalContext');

    const output1 = result1 as { hookSpecificOutput: { additionalContext: string } };
    const output2 = result2 as { hookSpecificOutput: { additionalContext: string } };
    expect(output1.hookSpecificOutput.additionalContext).toBe(
      output2.hookSpecificOutput.additionalContext,
    );
  });
});
