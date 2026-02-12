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
 *   --messages-file <path> Write JSONL message stream to file
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
import { hydrateTasks } from './worker/hydrate-tasks.ts';
import type { StatusSummary } from './worker/mark-pr-ready.ts';
import { buildStatusSummary, markPrReady } from './worker/mark-pr-ready.ts';
import type { MessageWriter } from './worker/message-writer.ts';
import { createFileMessageWriter, createNoopMessageWriter } from './worker/message-writer.ts';
import { runHeadlessLoop } from './worker/run-headless-loop.ts';
import { setupWorktree } from './worker/setup-worktree.ts';

// ============================================================================
// Types
// ============================================================================

interface WorkerOptions {
  maxCycles?: number;
  maxTime?: number;
  model?: string;
  messagesFile?: string;
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
  --max-cycles <n>       Maximum worker cycles (default: 10)
  --max-time <n>         Maximum time in minutes (default: 60)
  --model <model>        Model to use (default: opus)
  --messages-file <path> Write JSONL message stream to file
  --help, -h             Show this help message

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

function parseStringOption(name: string, iter: IterableIterator<string>): string | null {
  const raw = consumeNextArg(iter);
  if (raw === null) {
    printError(`${name} requires a value`);
    return null;
  }
  return raw;
}

function processOption(
  arg: string,
  iter: IterableIterator<string>,
  options: WorkerOptions,
): boolean | null {
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
    const raw = parseStringOption('--model', iter);
    if (raw === null) {
      return false;
    }
    options.model = raw;
    return true;
  }
  if (arg === '--messages-file') {
    const raw = parseStringOption('--messages-file', iter);
    if (raw === null) {
      return false;
    }
    options.messagesFile = raw;
    return true;
  }
  return null; // Not a recognized option
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
  const optionResult = processOption(arg, iter, options);
  if (optionResult !== null) {
    return optionResult;
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
// Main Entry Point
// ============================================================================

function createWriter(messagesFile?: string): MessageWriter {
  return messagesFile ? createFileMessageWriter(messagesFile) : createNoopMessageWriter();
}

function writeStep(writer: MessageWriter, step: number, message: string): void {
  writer.write({
    type: 'saga_worker',
    subtype: 'pipeline_step',
    timestamp: new Date().toISOString(),
    step,
    message,
  });
}

function writePipelineEnd(writer: MessageWriter, storyId: string, summary: StatusSummary): void {
  writer.write({
    type: 'saga_worker',
    subtype: 'pipeline_end',
    timestamp: new Date().toISOString(),
    storyId,
    status: summary.status,
    exitCode: summary.exitCode,
    cycles: summary.cycles,
    elapsedMinutes: summary.elapsedMinutes,
  });
}

async function runPipeline(storyId: string, options: WorkerOptions): Promise<StatusSummary> {
  const projectDir = getProjectDir();
  const writer = createWriter(options.messagesFile);

  writer.write({
    type: 'saga_worker',
    subtype: 'pipeline_start',
    timestamp: new Date().toISOString(),
    storyId,
  });

  // Step 1: Setup worktree and branch
  const worktreeResult = setupWorktree(storyId, projectDir);
  writeStep(
    writer,
    1,
    worktreeResult.alreadyExisted
      ? `Worktree exists at ${worktreeResult.worktreePath}`
      : `Created worktree at ${worktreeResult.worktreePath}`,
  );

  // Step 2: Create draft PR
  const prResult = createDraftPr(storyId, worktreeResult.worktreePath);
  writeStep(
    writer,
    2,
    prResult.alreadyExisted
      ? `PR exists: ${prResult.prUrl}`
      : `Created draft PR: ${prResult.prUrl}`,
  );

  // Step 3 & 4: Read story.json and hydrate tasks (from worktree, not master)
  const { taskListId, storyMeta } = hydrateTasks(storyId, worktreeResult.worktreePath);

  // Step 5: Headless run loop
  const result = await runHeadlessLoop(
    storyId,
    taskListId,
    worktreeResult.worktreePath,
    storyMeta,
    {
      ...options,
      messagesWriter: writer,
    },
  );

  // Step 6: Mark PR ready (if all tasks completed)
  markPrReady(storyId, worktreeResult.worktreePath, result.allCompleted);
  const summary = buildStatusSummary(result.allCompleted, result.cycles, result.elapsedMinutes);
  writePipelineEnd(writer, storyId, summary);

  return summary;
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed) {
    process.exit(1);
  }

  const { storyId, options } = parsed;
  process.stdout.write(`[worker] Starting pipeline for story: ${storyId}\n`);

  const summary = await runPipeline(storyId, options);

  process.stdout.write(
    `[worker] Pipeline complete. Status: ${summary.status}, cycles: ${summary.cycles}, elapsed: ${summary.elapsedMinutes.toFixed(1)}m\n`,
  );

  process.exit(summary.exitCode);
}

// Run main
main().catch((error) => {
  process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});

export type { WorkerOptions };
export { parseArgs };
