/**
 * Headless run loop for the worker pipeline (step 5)
 *
 * Builds a prompt from story metadata, spawns headless Claude runs with
 * CLAUDE_CODE_ENABLE_TASKS and CLAUDE_CODE_TASK_LIST_ID environment variables,
 * and loops until all tasks are completed or limits are reached.
 */

import { spawn } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { createStoryPaths } from '@saga-ai/types';
import type { StoryMeta } from '../hydrate/service.ts';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_CYCLES = 10;
const DEFAULT_MAX_TIME_MINUTES = 60;
const DEFAULT_MODEL = 'opus';
const MS_PER_MINUTE = 60_000;

// Environment variable name constants (SCREAMING_SNAKE_CASE names require computed properties)
const ENV_ENABLE_TASKS = 'CLAUDE_CODE_ENABLE_TASKS';
const ENV_TASK_LIST_ID = 'CLAUDE_CODE_TASK_LIST_ID';
const ENV_STORY_ID = 'SAGA_STORY_ID';
const ENV_STORY_TASK_LIST_ID = 'SAGA_STORY_TASK_LIST_ID';

// ============================================================================
// Types
// ============================================================================

interface RunLoopOptions {
  maxCycles?: number;
  maxTime?: number;
  model?: string;
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
 * Only includes non-empty fields.
 */
function buildPrompt(meta: StoryMeta): string {
  const lines: string[] = [];

  lines.push(`You are working on: ${meta.title}`);
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
 * Check if all SAGA tasks in a story directory are completed.
 * Reads task JSON files (excluding story.json) and checks their status.
 */
function checkAllTasksCompleted(storyDir: string): boolean {
  const files = readdirSync(storyDir).filter((f) => f.endsWith('.json') && f !== 'story.json');

  if (files.length === 0) {
    return true;
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
 * Spawn a single headless Claude run and wait for it to complete.
 */
function spawnHeadlessRun(
  prompt: string,
  model: string,
  taskListId: string,
  storyId: string,
  worktreePath: string,
): Promise<{ exitCode: number | null }> {
  return new Promise((resolve) => {
    const args = ['-p', prompt, '--model', model, '--verbose', '--dangerously-skip-permissions'];

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      [ENV_ENABLE_TASKS]: 'true',
      [ENV_TASK_LIST_ID]: taskListId,
      [ENV_STORY_ID]: storyId,
      [ENV_STORY_TASK_LIST_ID]: taskListId,
    };

    const child = spawn('claude', args, {
      cwd: worktreePath,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (chunk: Buffer) => {
      process.stdout.write(chunk);
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      process.stderr.write(chunk);
    });

    child.on('error', (err) => {
      process.stderr.write(`[worker] Headless run error: ${err.message}\n`);
      resolve({ exitCode: 1 });
    });

    child.on('close', (code) => {
      resolve({ exitCode: code });
    });
  });
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
  maxTimeMs: number;
  startTime: number;
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

  process.stdout.write(
    `[worker] Starting headless run cycle ${state.cycles + 1}/${config.maxCycles}\n`,
  );

  return spawnHeadlessRun(
    config.prompt,
    config.model,
    config.taskListId,
    config.storyId,
    config.worktreePath,
  ).then(({ exitCode }) => {
    state.cycles++;

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
  projectDir: string,
  options: RunLoopOptions,
): Promise<RunLoopResult> {
  const maxCycles = options.maxCycles ?? DEFAULT_MAX_CYCLES;
  const maxTimeMs = (options.maxTime ?? DEFAULT_MAX_TIME_MINUTES) * MS_PER_MINUTE;
  const model = options.model ?? DEFAULT_MODEL;

  const prompt = buildPrompt(storyMeta);
  const startTime = Date.now();
  const { storyDir } = createStoryPaths(projectDir, storyId);

  const config: LoopConfig = {
    prompt,
    model,
    taskListId,
    storyId,
    worktreePath,
    storyDir,
    maxCycles,
    maxTimeMs,
    startTime,
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
