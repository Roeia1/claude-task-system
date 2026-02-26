/**
 * Headless run loop for the worker pipeline (step 5)
 *
 * Builds a prompt from story metadata, runs headless Claude sessions via
 * the Agent SDK with CLAUDE_CODE_ENABLE_TASKS and CLAUDE_CODE_TASK_LIST_ID
 * environment variables, and loops until all tasks are completed or limits are reached.
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { createStoryPaths } from '../../directory.ts';
import { createAutoCommitHook } from '../auto-commit-hook.ts';
import type { StoryMeta } from '../hydrate/service.ts';
import { createJournalGateHook } from '../journal-gate-hook.ts';
import { buildWorkerInstructions } from '../prompts/worker-instructions.ts';
import { createScopeValidatorHook } from '../scope-validator-hook.ts';
import { createSyncHook } from '../sync-hook.ts';
import { createTaskPacingHook } from '../task-pacing-hook.ts';
import type { TokenTracker } from '../token-limit-hook.ts';
import { createTokenLimitHook } from '../token-limit-hook.ts';
import type { MessageWriter } from './message-writer.ts';
import { createNoopMessageWriter } from './message-writer.ts';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_CYCLES = 10;
const DEFAULT_MAX_TIME_MINUTES = 60;
const DEFAULT_MAX_TASKS_PER_SESSION = 3;
const DEFAULT_MAX_TOKENS_PER_SESSION = 120_000;
const DEFAULT_MODEL = 'opus';
const MS_PER_MINUTE = 60_000;

// Environment variable name constants (SCREAMING_SNAKE_CASE names require computed properties)
const ENV_PROJECT_DIR = 'SAGA_PROJECT_DIR';
const ENV_ENABLE_TASKS = 'CLAUDE_CODE_ENABLE_TASKS';
const ENV_TASK_LIST_ID = 'CLAUDE_CODE_TASK_LIST_ID';
const ENV_STORY_ID = 'SAGA_STORY_ID';
const ENV_STORY_TASK_LIST_ID = 'SAGA_STORY_TASK_LIST_ID';
const ENV_CLAUDECODE = 'CLAUDECODE';

/**
 * Resolve the path to the `claude` CLI binary using `which`.
 * Throws if the binary cannot be found.
 */
function resolveClaudeBinary(): string {
  try {
    return execFileSync('which', ['claude'], { encoding: 'utf-8' }).trim();
  } catch {
    throw new Error('Could not find `claude` binary. Ensure Claude Code is installed and on PATH.');
  }
}

// Tools to scope-validate (file-accessing tools)
const SCOPE_TOOLS = ['Read', 'Write', 'Edit', 'Glob', 'Grep'];
const SCOPE_TOOL_MATCHER = SCOPE_TOOLS.join('|');

// SDK hook event names (PascalCase per SDK API)
const PRE_TOOL_USE = 'PreToolUse' as const;
const POST_TOOL_USE = 'PostToolUse' as const;

// PostToolUse matcher for TaskUpdate hooks (sync, auto-commit, task pacing)
const TASK_UPDATE_MATCHER = 'TaskUpdate';

// ============================================================================
// Types
// ============================================================================

interface RunLoopOptions {
  maxCycles?: number;
  maxTime?: number;
  maxTasksPerSession?: number;
  maxTokensPerSession?: number;
  model?: string;
  messagesWriter?: MessageWriter;
}

interface RunLoopResult {
  allCompleted: boolean;
  cycles: number;
  elapsedMinutes: number;
}

// ============================================================================
// Prompt Building
// ============================================================================

/**
 * Build the headless run prompt from story metadata.
 * Prepends worker instructions, then includes story-specific content.
 * Only includes non-empty metadata fields.
 */
function buildPrompt(meta: StoryMeta, storyId: string, worktreePath: string): string {
  const lines: string[] = [];

  // Worker instructions first
  lines.push(buildWorkerInstructions(storyId, worktreePath));

  // Story metadata
  lines.push(`# Story: ${meta.title}`);
  lines.push('');
  lines.push(meta.description);

  if (meta.guidance) {
    lines.push('');
    lines.push(`Guidance: ${meta.guidance}`);
  }

  if (meta.doneWhen) {
    lines.push('');
    lines.push(`Done when: ${meta.doneWhen}`);
  }

  if (meta.avoid) {
    lines.push('');
    lines.push(`Avoid: ${meta.avoid}`);
  }

  lines.push('');
  lines.push('Execute the tasks in the task list using TaskList, TaskGet, and TaskUpdate.');

  return lines.join('\n');
}

// ============================================================================
// Task Completion Checking
// ============================================================================

/**
 * Get the list of task JSON files in a story directory (excluding story.json).
 */
function getTaskFiles(storyDir: string): string[] {
  return readdirSync(storyDir).filter((f) => f.endsWith('.json') && f !== 'story.json');
}

/**
 * Check if all SAGA tasks in a story directory are completed.
 * Reads task JSON files (excluding story.json) and checks their status.
 * Returns false if there are no task files.
 */
function checkAllTasksCompleted(storyDir: string): boolean {
  const files = getTaskFiles(storyDir);

  if (files.length === 0) {
    return false;
  }

  for (const file of files) {
    const filePath = join(storyDir, file);
    const raw = readFileSync(filePath, 'utf-8');
    const task = JSON.parse(raw) as { status: string };
    if (task.status !== 'completed') {
      return false;
    }
  }

  return true;
}

// ============================================================================
// Headless Run Spawning
// ============================================================================

/**
 * Extract input token count from an SDK assistant message, if present.
 * Returns undefined when the message is not an assistant message or has no usage.
 */
const INPUT_TOKENS_KEY = 'input_tokens';

function extractInputTokens(message: { type: string }): number | undefined {
  if (message.type !== 'assistant') {
    return undefined;
  }
  const msg = message as { message?: { usage?: Record<string, unknown> } };
  const tokens = msg.message?.usage?.[INPUT_TOKENS_KEY];
  return typeof tokens === 'number' ? tokens : undefined;
}

/**
 * Build the query options for a headless Agent SDK run.
 */
function buildQueryOptions(
  model: string,
  worktreePath: string,
  taskListId: string,
  storyId: string,
  maxTasksPerSession: number,
  maxTokensPerSession: number,
  tracker: TokenTracker,
) {
  return {
    pathToClaudeCodeExecutable: resolveClaudeBinary(),
    model,
    cwd: worktreePath,
    env: {
      ...process.env,
      [ENV_CLAUDECODE]: undefined,
      [ENV_PROJECT_DIR]: worktreePath,
      [ENV_ENABLE_TASKS]: 'true',
      [ENV_TASK_LIST_ID]: taskListId,
      [ENV_STORY_ID]: storyId,
      [ENV_STORY_TASK_LIST_ID]: taskListId,
    },
    permissionMode: 'bypassPermissions' as const,
    allowDangerouslySkipPermissions: true,
    sandbox: {
      enabled: true,
      autoAllowBashIfSandboxed: true,
      allowUnsandboxedCommands: false,
      network: {
        allowManagedDomainsOnly: false,
        allowLocalBinding: true,
      },
      filesystem: {
        allowWrite: ['/tmp', '/private/tmp'],
      },
    },
    hooks: {
      [PRE_TOOL_USE]: [
        {
          matcher: SCOPE_TOOL_MATCHER,
          hooks: [createScopeValidatorHook(worktreePath, storyId)],
        },
        {
          matcher: TASK_UPDATE_MATCHER,
          hooks: [createJournalGateHook(worktreePath, storyId)],
        },
      ],
      [POST_TOOL_USE]: [
        {
          matcher: TASK_UPDATE_MATCHER,
          hooks: [
            createSyncHook(worktreePath, storyId),
            createAutoCommitHook(worktreePath, storyId),
            createTaskPacingHook(worktreePath, storyId, maxTasksPerSession),
          ],
        },
        {
          hooks: [createTokenLimitHook(tracker, maxTokensPerSession)],
        },
      ],
    },
  };
}

/**
 * Run a single headless Claude session via the Agent SDK and wait for it to complete.
 */
async function spawnHeadlessRun(
  prompt: string,
  model: string,
  taskListId: string,
  storyId: string,
  worktreePath: string,
  maxTasksPerSession: number,
  maxTokensPerSession: number,
  messagesWriter: MessageWriter,
): Promise<{ exitCode: number | null }> {
  try {
    let exitCode: number | null = 0;
    const tracker: TokenTracker = { inputTokens: 0 };
    const options = buildQueryOptions(
      model,
      worktreePath,
      taskListId,
      storyId,
      maxTasksPerSession,
      maxTokensPerSession,
      tracker,
    );

    for await (const message of query({ prompt, options })) {
      const tokens = extractInputTokens(message);
      if (tokens !== undefined) {
        tracker.inputTokens = tokens;
      }

      messagesWriter.write(message);
      if (message.type === 'result') {
        exitCode = message.subtype === 'success' ? 0 : 1;
      }
    }

    return { exitCode };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[worker] Headless run error: ${errorMessage}\n`);
    return { exitCode: 1 };
  }
}

// ============================================================================
// Main Loop
// ============================================================================

interface LoopConfig {
  prompt: string;
  model: string;
  taskListId: string;
  storyId: string;
  worktreePath: string;
  storyDir: string;
  maxCycles: number;
  maxTasksPerSession: number;
  maxTokensPerSession: number;
  maxTimeMs: number;
  startTime: number;
  messagesWriter: MessageWriter;
}

interface LoopState {
  cycles: number;
  allCompleted: boolean;
}

/**
 * Execute a single cycle: spawn a headless run and check task completion.
 * Returns whether the loop should continue.
 */
function executeCycle(config: LoopConfig, state: LoopState): Promise<{ shouldContinue: boolean }> {
  // Check time limit before starting a new cycle
  if (Date.now() - config.startTime >= config.maxTimeMs) {
    return Promise.resolve({ shouldContinue: false });
  }

  // Check max cycles
  if (state.cycles >= config.maxCycles) {
    return Promise.resolve({ shouldContinue: false });
  }

  const cycleNum = state.cycles + 1;

  process.stdout.write(`[worker] Starting headless run cycle ${cycleNum}/${config.maxCycles}\n`);

  config.messagesWriter.write({
    type: 'saga_worker',
    subtype: 'cycle_start',
    timestamp: new Date().toISOString(),
    cycle: cycleNum,
    maxCycles: config.maxCycles,
  });

  return spawnHeadlessRun(
    config.prompt,
    config.model,
    config.taskListId,
    config.storyId,
    config.worktreePath,
    config.maxTasksPerSession,
    config.maxTokensPerSession,
    config.messagesWriter,
  ).then(({ exitCode }) => {
    state.cycles++;

    config.messagesWriter.write({
      type: 'saga_worker',
      subtype: 'cycle_end',
      timestamp: new Date().toISOString(),
      cycle: cycleNum,
      exitCode,
    });

    // On spawn error, count the cycle but don't check tasks
    if (exitCode !== 0 && exitCode !== null) {
      return { shouldContinue: true };
    }

    // Check if all tasks are completed
    if (checkAllTasksCompleted(config.storyDir)) {
      state.allCompleted = true;
      return { shouldContinue: false };
    }

    return { shouldContinue: true };
  });
}

/**
 * Run sequential cycles using an async iterable to avoid await-in-loop lint issues.
 */
async function runSequentialCycles(config: LoopConfig, state: LoopState): Promise<void> {
  const cycleIterable = {
    [Symbol.asyncIterator]() {
      let done = false;
      return {
        next(): Promise<IteratorResult<{ shouldContinue: boolean }>> {
          if (done) {
            return Promise.resolve({ done: true, value: undefined });
          }
          return executeCycle(config, state).then((result) => {
            if (!result.shouldContinue) {
              done = true;
            }
            return { done: false, value: result };
          });
        },
      };
    },
  };

  for await (const _result of cycleIterable) {
    // Loop drives execution; state is mutated by executeCycle
  }
}

/**
 * Run the headless loop: spawn Claude runs until all tasks are completed
 * or limits (maxCycles, maxTime) are reached.
 */
async function runHeadlessLoop(
  storyId: string,
  taskListId: string,
  worktreePath: string,
  storyMeta: StoryMeta,
  options: RunLoopOptions,
): Promise<RunLoopResult> {
  const maxCycles = options.maxCycles ?? DEFAULT_MAX_CYCLES;
  const maxTasksPerSession = options.maxTasksPerSession ?? DEFAULT_MAX_TASKS_PER_SESSION;
  const maxTokensPerSession = options.maxTokensPerSession ?? DEFAULT_MAX_TOKENS_PER_SESSION;
  const maxTimeMs = (options.maxTime ?? DEFAULT_MAX_TIME_MINUTES) * MS_PER_MINUTE;
  const model = options.model ?? DEFAULT_MODEL;
  const messagesWriter = options.messagesWriter ?? createNoopMessageWriter();

  const prompt = buildPrompt(storyMeta, storyId, worktreePath);
  const startTime = Date.now();
  const { storyDir } = createStoryPaths(worktreePath, storyId);

  // Validate that the story has tasks before starting the loop
  const taskFiles = getTaskFiles(storyDir);
  if (taskFiles.length === 0) {
    throw new Error(
      `No task files found in ${storyDir}. ` +
        'The story must have at least one task file (e.g., t1.json) to execute.',
    );
  }

  const config: LoopConfig = {
    prompt,
    model,
    taskListId,
    storyId,
    worktreePath,
    storyDir,
    maxCycles,
    maxTasksPerSession,
    maxTokensPerSession,
    maxTimeMs,
    startTime,
    messagesWriter,
  };

  const state: LoopState = {
    cycles: 0,
    allCompleted: false,
  };

  await runSequentialCycles(config, state);

  return {
    allCompleted: state.allCompleted,
    cycles: state.cycles,
    elapsedMinutes: (Date.now() - startTime) / MS_PER_MINUTE,
  };
}

export { buildPrompt, checkAllTasksCompleted, runHeadlessLoop };
export type { RunLoopOptions, RunLoopResult };
