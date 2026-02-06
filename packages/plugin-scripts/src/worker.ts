/**
 * saga worker script - Story execution pipeline entry point
 *
 * This is the esbuild entry point that gets compiled to plugin/scripts/worker.js
 * The worker is a linear process that manages end-to-end story execution:
 *   1. Setup worktree and branch
 *   2. Create draft PR
 *   3. Read story.json for context
 *   4. Hydrate tasks to ~/.claude/tasks/
 *   5. Loop headless Claude runs with native Tasks tools
 *   6. Mark PR ready on completion
 *
 * Usage:
 *   node worker.js <story-id> [options]
 *
 * Arguments:
 *   story-id      The ID of the story to execute (e.g., auth-setup-db)
 *
 * Options:
 *   --max-cycles <n>    Maximum worker cycles (default: 10)
 *   --max-time <n>      Maximum time in minutes (default: 60)
 *   --model <model>     Model to use (default: opus)
 *   --help, -h          Show this help message
 *
 * Environment (required):
 *   SAGA_PROJECT_DIR       Project root directory
 *   SAGA_PLUGIN_ROOT       Plugin root directory
 *
 * Exit codes:
 *   0 - Success (all tasks completed)
 *   1 - Error
 *   2 - Max cycles or timeout reached
 */

import process from 'node:process';
import { getProjectDir } from './shared/env.ts';
import { createDraftPr } from './worker/create-draft-pr.ts';
import { setupWorktree } from './worker/setup-worktree.ts';

// ============================================================================
// Types
// ============================================================================

interface WorkerOptions {
  maxCycles?: number;
  maxTime?: number;
  model?: string;
}

// ============================================================================
// CLI Interface
// ============================================================================

function printUsage(): void {
  const usage = `
Usage: worker <story-id> [options]

Run story execution pipeline using Claude workers with native Tasks tools.

Arguments:
  story-id      The ID of the story to execute

Options:
  --max-cycles <n>    Maximum worker cycles (default: 10)
  --max-time <n>      Maximum time in minutes (default: 60)
  --model <model>     Model to use (default: opus)
  --help, -h          Show this help message

Environment (required):
  SAGA_PROJECT_DIR       Project root directory
  SAGA_PLUGIN_ROOT       Plugin root directory

Steps:
  1. Setup worktree and branch (story/<storyId>)
  2. Create draft PR
  3. Read story.json for context
  4. Hydrate tasks to ~/.claude/tasks/
  5. Loop headless Claude runs
  6. Mark PR ready on completion

Examples:
  # Execute a story
  node worker.js auth-setup-db

  # Run with custom options
  node worker.js auth-setup-db --max-cycles 5 --model sonnet
`.trim();

  process.stdout.write(`${usage}\n`);
}

function printError(message: string): void {
  process.stderr.write(`Error: ${message}\n`);
}

function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return null;
  }
  return parsed;
}

function consumeNextArg(iter: IterableIterator<string>): string | null {
  const next = iter.next();
  return next.done ? null : next.value;
}

function parseIntOption(name: string, iter: IterableIterator<string>): number | null {
  const raw = consumeNextArg(iter);
  if (raw === null) {
    printError(`${name} requires a value`);
    return null;
  }
  const value = parsePositiveInt(raw);
  if (value === null) {
    printError(`${name} must be a positive integer`);
    return null;
  }
  return value;
}

function processArg(
  arg: string,
  iter: IterableIterator<string>,
  options: WorkerOptions,
  state: { storyId?: string },
): boolean {
  if (arg === '--help' || arg === '-h') {
    printUsage();
    process.exit(0);
  }
  if (arg === '--max-cycles') {
    const value = parseIntOption('--max-cycles', iter);
    if (value === null) {
      return false;
    }
    options.maxCycles = value;
    return true;
  }
  if (arg === '--max-time') {
    const value = parseIntOption('--max-time', iter);
    if (value === null) {
      return false;
    }
    options.maxTime = value;
    return true;
  }
  if (arg === '--model') {
    const raw = consumeNextArg(iter);
    if (raw === null) {
      printError('--model requires a value');
      return false;
    }
    options.model = raw;
    return true;
  }
  if (arg.startsWith('-') && arg !== '-') {
    printError(`Unknown option: ${arg}`);
    return false;
  }
  if (!state.storyId) {
    state.storyId = arg;
    return true;
  }
  printError(`Unexpected argument: ${arg}`);
  return false;
}

function parseArgs(args: string[]): { storyId: string; options: WorkerOptions } | null {
  const options: WorkerOptions = {};
  const state: { storyId?: string } = {};
  const iter = args[Symbol.iterator]();

  for (const arg of iter) {
    if (!processArg(arg, iter, options, state)) {
      return null;
    }
  }

  if (!state.storyId) {
    printError('Missing required argument: story-id');
    printUsage();
    return null;
  }

  return { storyId: state.storyId, options };
}

// ============================================================================
// Pipeline Steps (stubs for now, implemented in later tasks)
// ============================================================================

// createDraftPr is imported from ./worker/create-draft-pr.ts

function hydrateTasks(_storyId: string): string {
  // t4: Implement hydration step
  const taskListId = `saga__${_storyId}__${Date.now()}`;
  process.stdout.write(`[worker] Step 4: Hydrate tasks → ${taskListId}\n`);
  return taskListId;
}

function runHeadlessLoop(
  _storyId: string,
  _taskListId: string,
  _options: WorkerOptions,
): { allCompleted: boolean; cycles: number } {
  // t5: Implement headless run loop
  process.stdout.write('[worker] Step 5: Run headless loop\n');
  return { allCompleted: false, cycles: 0 };
}

function markPrReady(_storyId: string, _allCompleted: boolean): void {
  // t6: Implement PR readiness marking
  process.stdout.write('[worker] Step 6: Mark PR ready\n');
}

// ============================================================================
// Main Entry Point
// ============================================================================

function main(): void {
  const args = process.argv.slice(2);

  const parsed = parseArgs(args);
  if (!parsed) {
    process.exit(1);
  }

  const { storyId, options } = parsed;

  process.stdout.write(`[worker] Starting pipeline for story: ${storyId}\n`);

  // Step 1: Setup worktree and branch
  const projectDir = getProjectDir();
  const worktreeResult = setupWorktree(storyId, projectDir);
  process.stdout.write(
    `[worker] Step 1: ${worktreeResult.alreadyExisted ? 'Worktree exists' : 'Created worktree'} at ${worktreeResult.worktreePath}\n`,
  );

  // Step 2: Create draft PR
  const prResult = createDraftPr(storyId, worktreeResult.worktreePath);
  process.stdout.write(
    `[worker] Step 2: ${prResult.alreadyExisted ? 'PR exists' : 'Created draft PR'}: ${prResult.prUrl}\n`,
  );

  // Step 3: Read story.json (done implicitly during hydration)

  // Step 4: Hydrate tasks
  const taskListId = hydrateTasks(storyId);

  // Step 5: Headless run loop
  const result = runHeadlessLoop(storyId, taskListId, options);

  // Step 6: Mark PR ready (if all tasks completed)
  markPrReady(storyId, result.allCompleted);

  process.stdout.write(`[worker] Pipeline complete. All tasks done: ${result.allCompleted}\n`);
}

// Run main
try {
  main();
} catch (error) {
  process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}

export type { WorkerOptions };
export { parseArgs };
