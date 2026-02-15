/**
 * In-process auto-commit hook for the Agent SDK.
 *
 * PostToolUse hook callback that fires on TaskUpdate. When a task is marked
 * as completed, it auto-commits and pushes all changes.
 *
 * Git failures are logged to stderr but never crash the agent.
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
 * Returns `{ continue: true }` always. Git failures are logged but never
 * crash the agent.
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
      runGit(['commit', '-m', commitMessage], worktreePath);
      runGit(['push'], worktreePath);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[worker] Auto-commit git error: ${errorMessage}\n`);
    }

    return Promise.resolve({ continue: true });
  };
}

export { createAutoCommitHook };
