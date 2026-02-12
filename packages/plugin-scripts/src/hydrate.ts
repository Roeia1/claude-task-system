/**
 * saga hydrate script - Hydrate SAGA tasks into Claude Code format
 *
 * Reads SAGA task files from .saga/stories/<storyId>/, converts each to
 * Claude Code format, and writes them to ~/.claude/tasks/saga__<storyId>__<ts>/
 *
 * Usage:
 *   node hydrate.js <story-id>
 *   node hydrate.js <story-id> <session-timestamp>
 *
 * Output (JSON):
 *   { "success": true, "taskListId": "saga__...", "taskCount": N, "storyMeta": {...} }
 *   { "success": false, "error": "..." }
 */

import process from 'node:process';
import { hydrate } from './hydrate/service.ts';
import { getProjectDir } from './shared/env.ts';

// ============================================================================
// Types
// ============================================================================

interface HydrateSuccessResult {
  success: true;
  taskListId: string;
  taskCount: number;
  storyMeta: {
    title: string;
    description: string;
    guidance?: string;
    doneWhen?: string;
    avoid?: string;
  };
}

interface HydrateErrorResult {
  success: false;
  error: string;
}

type HydrateResult = HydrateSuccessResult | HydrateErrorResult;

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function printHelp(): void {
  console.log(`Usage: hydrate <story-id> [session-timestamp]

Hydrate SAGA tasks into Claude Code format.

Arguments:
  story-id            The story identifier
  session-timestamp   Optional session timestamp (default: Date.now())

Options:
  --help       Show this help message

Environment (required):
  SAGA_PROJECT_DIR        Project root directory
  SAGA_CLAUDE_TASKS_BASE  Override base tasks directory (optional, for testing)

Output (JSON):
  { "success": true, "taskListId": "saga__...", "taskCount": N, "storyMeta": {...} }
  { "success": false, "error": "..." }

Examples:
  hydrate my-story
  hydrate my-story 1700000000000
`);
}

function parseArgs(args: string[]): {
  storyId?: string;
  sessionTimestamp?: number;
  help: boolean;
} {
  const result: { storyId?: string; sessionTimestamp?: number; help: boolean } = {
    help: false,
  };
  const positional: string[] = [];

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  if (positional.length > 0) {
    result.storyId = positional[0];
  }
  if (positional.length >= 2) {
    const ts = Number(positional[1]);
    if (!Number.isNaN(ts)) {
      result.sessionTimestamp = ts;
    }
  }

  return result;
}

// ============================================================================
// Main Entry Point
// ============================================================================

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!args.storyId) {
    console.error('Error: story-id is required.\n');
    printHelp();
    process.exit(1);
  }

  // Get project path from environment
  let projectDir: string;
  try {
    projectDir = getProjectDir();
  } catch (error) {
    const result: HydrateResult = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  // Use provided timestamp or default to now
  const sessionTimestamp = args.sessionTimestamp ?? Date.now();

  // Optional override for claude tasks base directory
  const claudeTasksBase = process.env.SAGA_CLAUDE_TASKS_BASE || undefined;

  // Run hydration
  try {
    const hydrationResult = hydrate(args.storyId, sessionTimestamp, projectDir, claudeTasksBase);

    const result: HydrateResult = {
      success: true,
      taskListId: hydrationResult.taskListId,
      taskCount: hydrationResult.taskCount,
      storyMeta: hydrationResult.storyMeta,
    };
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    const result: HydrateResult = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }
}

// Run main
main();
