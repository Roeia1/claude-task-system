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

interface GitStep {
  name: string;
  args: string[];
  recoveryHint: string;
}

/**
 * Run the add/commit/push pipeline. Returns an additionalContext string on
 * failure, or undefined on success.
 */
function runGitPipeline(steps: GitStep[], cwd: string): string | undefined {
  for (const step of steps) {
    const result = runGit(step.args, cwd);
    if (!result.success) {
      process.stderr.write(`[worker] Auto-commit failed at ${step.name}: ${result.output}\n`);
      return `Auto-commit failed at \`git ${step.name}\`. Error output:\n${result.output}\n\n${step.recoveryHint}`;
    }
  }
  return undefined;
}

/**
 * Create a PostToolUse hook callback that auto-commits and pushes on task
 * completion.
 *
 * On success, returns `{ continue: true, hookSpecificOutput }` with
 * additionalContext confirming the commit and push.
 * On failure, returns `{ continue: true, hookSpecificOutput }` with
 * additionalContext describing the error so the agent can fix and retry.
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
    const fullCommitHint =
      'Please fix the issues and run `git add . && git commit && git push` manually.';

    try {
      const error = runGitPipeline(
        [
          { name: 'add', args: ['add', '.'], recoveryHint: fullCommitHint },
          { name: 'commit', args: ['commit', '-m', commitMessage], recoveryHint: fullCommitHint },
          {
            name: 'push',
            args: ['push'],
            recoveryHint: 'Please fix the issues and run `git push` manually.',
          },
        ],
        worktreePath,
      );

      if (error) {
        return Promise.resolve({
          continue: true,
          hookSpecificOutput: {
            hookEventName: 'PostToolUse' as const,
            additionalContext: error,
          },
        });
      }
      // Success
      return Promise.resolve({
        continue: true,
        hookSpecificOutput: {
          hookEventName: 'PostToolUse' as const,
          additionalContext: 'Changes committed and pushed.',
        },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[worker] Auto-commit git error: ${errorMessage}\n`);
      return Promise.resolve({ continue: true });
    }
  };
}

export { createAutoCommitHook };
