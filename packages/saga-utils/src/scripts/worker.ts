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
 *   --messages-file <path> Write JSONL message stream to file
 *   --help, -h             Show this help message
 *
 * Configuration:
 *   Worker options (maxCycles, maxTime, maxTasksPerSession, maxTokensPerSession,
 *   model) are read from .saga/config.json under the "worker" key.
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
import { resolveMcpServers } from './worker/resolve-mcp-servers.ts';
import { resolveWorkerConfig } from './worker/resolve-worker-config.ts';
import { runHeadlessLoop } from './worker/run-headless-loop.ts';
import { setupWorktree } from './worker/setup-worktree.ts';

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
  --messages-file <path> Write JSONL message stream to file
  --help, -h             Show this help message

Configuration:
  Worker options are read from .saga/config.json under the "worker" key:
    {
      "worker": {
        "maxCycles": 10,
        "maxTime": 60,
        "maxTasksPerSession": 3,
        "maxTokensPerSession": 120000,
        "model": "opus"
      }
    }

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

  # Execute with JSONL output
  node worker.js auth-setup-db --messages-file output.jsonl
`.trim();

  process.stdout.write(`${usage}\n`);
}

function printError(message: string): void {
  process.stderr.write(`Error: ${message}\n`);
}

interface ParsedArgs {
  storyId: string;
  messagesFile?: string;
}

function parseArgs(args: string[]): ParsedArgs | null {
  let storyId: string | undefined;
  let messagesFile: string | undefined;
  const iter = args[Symbol.iterator]();

  for (const arg of iter) {
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
    if (arg === '--messages-file') {
      const next = iter.next();
      if (next.done) {
        printError('--messages-file requires a value');
        return null;
      }
      messagesFile = next.value;
      continue;
    }
    if (arg.startsWith('-') && arg !== '-') {
      printError(`Unknown option: ${arg}`);
      return null;
    }
    if (!storyId) {
      storyId = arg;
      continue;
    }
    printError(`Unexpected argument: ${arg}`);
    return null;
  }

  if (!storyId) {
    printError('Missing required argument: story-id');
    printUsage();
    return null;
  }

  return { storyId, messagesFile };
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

function writePipelineStart(writer: MessageWriter, storyId: string): void {
  writer.write({
    type: 'saga_worker',
    subtype: 'pipeline_start',
    timestamp: new Date().toISOString(),
    storyId,
  });
}

async function runPipeline(storyId: string, messagesFile?: string): Promise<StatusSummary> {
  const projectDir = getProjectDir();
  const options = resolveWorkerConfig(projectDir);
  const writer = createWriter(messagesFile);
  writePipelineStart(writer, storyId);

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

  // Resolve MCP servers from .saga/config.json (if present)
  const mcpServers = resolveMcpServers(projectDir);

  // Step 5: Headless run loop
  const result = await runHeadlessLoop(
    storyId,
    taskListId,
    worktreeResult.worktreePath,
    storyMeta,
    {
      ...options,
      messagesWriter: writer,
      mcpServers,
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

  const { storyId, messagesFile } = parsed;
  process.stdout.write(`[worker] Starting pipeline for story: ${storyId}\n`);

  const summary = await runPipeline(storyId, messagesFile);

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

export { parseArgs };
export type { ParsedArgs };
