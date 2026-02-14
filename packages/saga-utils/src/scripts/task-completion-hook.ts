/**
 * In-process task completion hook for the Agent SDK.
 *
 * PostToolUse hook callback that fires on TaskUpdate. When a task is marked
 * as completed, it auto-commits and pushes changes, then returns
 * additionalContext with a journal reminder and context usage guidance.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';
import type {
  HookCallback,
  HookJSONOutput,
  PostToolUseHookInput,
} from '@anthropic-ai/claude-agent-sdk';
import { createTaskPath } from '../directory.ts';

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
 * Read the task subject from the SAGA task JSON file.
 * Returns undefined if the file doesn't exist or can't be parsed.
 */
function readTaskSubject(
  worktreePath: string,
  storyId: string,
  taskId: string,
): string | undefined {
  try {
    const taskPath = createTaskPath(worktreePath, storyId, taskId);
    if (!existsSync(taskPath)) {
      return undefined;
    }
    const taskData = JSON.parse(readFileSync(taskPath, 'utf-8')) as { subject?: string };
    return taskData.subject;
  } catch {
    return undefined;
  }
}

/**
 * Build the additionalContext string returned after a task is completed.
 */
function buildAdditionalContext(
  storyId: string,
  taskId: string,
  subject: string | undefined,
): string {
  const taskLabel = subject ? `${taskId} - ${subject}` : taskId;

  return [
    `Task "${taskLabel}" completed. Changes committed and pushed.`,
    '',
    `REQUIRED: Write a journal entry to .saga/stories/${storyId}/journal.md:`,
    `## Session: ${new Date().toISOString()}`,
    `### Task: ${taskLabel}`,
    '**What was done:** ...',
    '**Decisions:** ...',
    '**Next steps:** ...',
    '',
    'CONTEXT CHECK: Target 40-70% context utilization per session.',
    '- If you have capacity, pick up the next unblocked task from TaskList.',
    '- If context is getting heavy, commit any remaining work and exit.',
  ].join('\n');
}

/**
 * Create a PostToolUse hook callback that auto-commits and pushes on task
 * completion, and returns additionalContext with a journal reminder.
 *
 * Returns `{ continue: true }` when status is not 'completed'.
 * Returns `{ continue: true, hookSpecificOutput }` with additionalContext
 * when status is 'completed'.
 *
 * Git failures are logged to stderr but never crash the agent.
 */
function createTaskCompletionHook(worktreePath: string, storyId: string): HookCallback {
  return (_input, _toolUseID, _options): Promise<HookJSONOutput> => {
    const hookInput = _input as PostToolUseHookInput;
    const toolInput = (hookInput.tool_input ?? {}) as Record<string, unknown>;

    const taskId = toolInput.taskId as string | undefined;
    const status = toolInput.status as string | undefined;

    // Skip when taskId or status is missing, or status is not 'completed'
    if (!(taskId && status) || status !== 'completed') {
      return Promise.resolve({ continue: true });
    }

    // Read task subject for the commit message
    const subject = readTaskSubject(worktreePath, storyId, taskId);
    const commitMessage = subject
      ? `feat(${storyId}): complete ${taskId} - ${subject}`
      : `feat(${storyId}): complete ${taskId}`;

    // Auto-commit + push (failures logged but never crash)
    try {
      runGit(['add', '.'], worktreePath);
      runGit(['commit', '-m', commitMessage], worktreePath);
      runGit(['push'], worktreePath);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[worker] Task completion git error: ${errorMessage}\n`);
    }

    // Return additionalContext regardless of git success/failure
    const additionalContext = buildAdditionalContext(storyId, taskId, subject);

    return Promise.resolve({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'PostToolUse' as const,
        additionalContext,
      },
    });
  };
}

export { createTaskCompletionHook };
