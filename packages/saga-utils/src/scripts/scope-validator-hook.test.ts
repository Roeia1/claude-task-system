/**
 * Tests for scope-validator-hook.ts - In-process SDK PreToolUse hook
 *
 * Tests the createScopeValidatorHook factory which wraps validatePath()
 * for use as an Agent SDK PreToolUse hook callback.
 */

import type { PreToolUseHookInput } from '@anthropic-ai/claude-agent-sdk';
import { describe, expect, it } from 'vitest';
import { createScopeValidatorHook } from './scope-validator-hook.ts';

const WORKTREE = '/project/worktree';
const STORY_ID = 'my-story';

function makeHookInput(toolInput: Record<string, unknown>, toolName = 'Read'): PreToolUseHookInput {
  return {
    session_id: 'test-session',
    transcript_path: '/tmp/transcript',
    cwd: WORKTREE,
    hook_event_name: 'PreToolUse',
    tool_name: toolName,
    tool_input: toolInput,
    tool_use_id: 'tu-1',
  };
}

const abortController = new AbortController();
const hookOptions = { signal: abortController.signal };

describe('createScopeValidatorHook', () => {
  const hook = createScopeValidatorHook(WORKTREE, STORY_ID);

  it('should allow paths within the worktree', async () => {
    const input = makeHookInput({ file_path: `${WORKTREE}/src/main.ts` });
    const result = await hook(input, 'tu-1', hookOptions);
    expect(result).toEqual({ continue: true });
  });

  it('should allow paths using the path field (Glob/Grep)', async () => {
    const input = makeHookInput({ path: `${WORKTREE}/src` });
    const result = await hook(input, 'tu-1', hookOptions);
    expect(result).toEqual({ continue: true });
  });

  it('should allow when no file_path or path is present', async () => {
    const input = makeHookInput({ command: 'ls' });
    const result = await hook(input, 'tu-1', hookOptions);
    expect(result).toEqual({ continue: true });
  });

  it('should block paths outside the worktree', async () => {
    const input = makeHookInput({ file_path: '/etc/passwd' });
    const result = await hook(input, 'tu-1', hookOptions);
    expect(result).toHaveProperty('hookSpecificOutput.permissionDecision', 'deny');
    expect(result).toHaveProperty('hookSpecificOutput.permissionDecisionReason');
  });

  it('should block archive access', async () => {
    const input = makeHookInput({
      file_path: `${WORKTREE}/.saga/archive/old-story/story.json`,
    });
    const result = await hook(input, 'tu-1', hookOptions);
    expect(result).toHaveProperty('hookSpecificOutput.permissionDecision', 'deny');
  });

  it('should block access to other stories', async () => {
    const input = makeHookInput({
      file_path: `${WORKTREE}/.saga/stories/other-story/t1.json`,
    });
    const result = await hook(input, 'tu-1', hookOptions);
    expect(result).toHaveProperty('hookSpecificOutput.permissionDecision', 'deny');
  });

  it('should allow access to the assigned story', async () => {
    const input = makeHookInput({
      file_path: `${WORKTREE}/.saga/stories/${STORY_ID}/t1.json`,
    });
    const result = await hook(input, 'tu-1', hookOptions);
    expect(result).toEqual({ continue: true });
  });

  it('should include hookEventName PreToolUse in deny output', async () => {
    const input = makeHookInput({ file_path: '/etc/passwd' });
    const result = await hook(input, 'tu-1', hookOptions);
    expect(result).toHaveProperty('hookSpecificOutput.hookEventName', 'PreToolUse');
  });

  describe('.saga write immutability', () => {
    it('should block Write to story.json in .saga/', async () => {
      const input = makeHookInput(
        { file_path: `${WORKTREE}/.saga/stories/${STORY_ID}/story.json` },
        'Write',
      );
      const result = await hook(input, 'tu-1', hookOptions);
      expect(result).toHaveProperty('hookSpecificOutput.permissionDecision', 'deny');
    });

    it('should block Edit to task files in .saga/', async () => {
      const input = makeHookInput(
        { file_path: `${WORKTREE}/.saga/stories/${STORY_ID}/t1.json` },
        'Edit',
      );
      const result = await hook(input, 'tu-1', hookOptions);
      expect(result).toHaveProperty('hookSpecificOutput.permissionDecision', 'deny');
    });

    it('should allow Write to journal.md of assigned story', async () => {
      const input = makeHookInput(
        { file_path: `${WORKTREE}/.saga/stories/${STORY_ID}/journal.md` },
        'Write',
      );
      const result = await hook(input, 'tu-1', hookOptions);
      expect(result).toEqual({ continue: true });
    });

    it('should allow Read of story.json (not a write tool)', async () => {
      const input = makeHookInput(
        { file_path: `${WORKTREE}/.saga/stories/${STORY_ID}/story.json` },
        'Read',
      );
      const result = await hook(input, 'tu-1', hookOptions);
      expect(result).toEqual({ continue: true });
    });

    it('should block Write to another story journal.md', async () => {
      const input = makeHookInput(
        { file_path: `${WORKTREE}/.saga/stories/other-story/journal.md` },
        'Write',
      );
      const result = await hook(input, 'tu-1', hookOptions);
      expect(result).toHaveProperty('hookSpecificOutput.permissionDecision', 'deny');
    });
  });
});
