/**
 * In-process auto-commit hook for the Agent SDK.
 *
 * PostToolUse hook callback that fires on TaskUpdate. When a task is marked
 * as completed, it auto-commits and pushes all changes.
 *
 * Git failures are logged to stderr and surfaced to the agent via
 * additionalContext so it can fix issues and retry manually.
 */

import { execFileSync } from 'node:child_process';
import process from 'node:process';
import type {
  HookCallback,
  HookJSONOutput,
  PostToolUseHookInput,
} from '@anthropic-ai/claude-agent-sdk';

/**
 * Run a git command in the given cwd. Returns success/failure without throwing.
 */
function runGit(args: string[], cwd: string): { success: boolean; output: string } {
  try {
    const output = execFileSync('git', args, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, output: output.trim() };
  } catch (error) {
    const execError = error as { stderr?: Buffer; message?: string };
    const stderr = execError.stderr?.toString().trim() || execError.message || String(error);
    return { success: false, output: stderr };
  }
}

/**
 * Create a PostToolUse hook callback that auto-commits and pushes on task
 * completion.
 *
 * Returns `{ continue: true }` on success. On git commit/push failure,
 * returns `{ continue: true, hookSpecificOutput }` with additionalContext
 * describing the error so the agent can fix and retry.
 */
function createAutoCommitHook(worktreePath: string, storyId: string): HookCallback {
  return (_input, _toolUseID, _options): Promise<HookJSONOutput> => {
    const hookInput = _input as PostToolUseHookInput;
    const toolInput = (hookInput.tool_input ?? {}) as Record<string, unknown>;

    const taskId = toolInput.taskId as string | undefined;
    const status = toolInput.status as string | undefined;

    // Skip when taskId or status is missing, or status is not 'completed'
    if (!(taskId && status) || status !== 'completed') {
      return Promise.resolve({ continue: true });
    }

    const commitMessage = `feat(${storyId}): complete ${taskId}`;

    // Auto-commit + push (failures logged but never crash)
    try {
      runGit(['add', '.'], worktreePath);

      const commitResult = runGit(['commit', '-m', commitMessage], worktreePath);
      if (!commitResult.success) {
        process.stderr.write(`[worker] Auto-commit failed at commit: ${commitResult.output}\n`);
        return Promise.resolve({
          continue: true,
          hookSpecificOutput: {
            hookEventName: 'PostToolUse' as const,
            additionalContext: `Auto-commit failed at \`git commit\`. Error output:\n${commitResult.output}\n\nPlease fix the issues and run \`git add . && git commit && git push\` manually.`,
          },
        });
      }

      const pushResult = runGit(['push'], worktreePath);
      if (!pushResult.success) {
        process.stderr.write(`[worker] Auto-commit failed at push: ${pushResult.output}\n`);
        return Promise.resolve({
          continue: true,
          hookSpecificOutput: {
            hookEventName: 'PostToolUse' as const,
            additionalContext: `Auto-commit succeeded but \`git push\` failed. Error output:\n${pushResult.output}\n\nPlease fix the issues and run \`git push\` manually.`,
          },
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[worker] Auto-commit git error: ${errorMessage}\n`);
    }

    return Promise.resolve({ continue: true });
  };
}

export { createAutoCommitHook };
