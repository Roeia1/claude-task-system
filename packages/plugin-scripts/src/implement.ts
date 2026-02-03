/**
 * saga implement script - Worker orchestration entry point
 *
 * This is the esbuild entry point that gets compiled to plugin/scripts/implement.js
 *
 * Usage:
 *   node implement.js <story-slug> [options]
 *
 * Arguments:
 *   story-slug    The slug of the story to implement
 *
 * Options:
 *   --max-cycles <n>    Maximum worker cycles (default: 10)
 *   --max-time <n>      Maximum time in minutes (default: 60)
 *   --model <model>     Model to use (default: opus)
 *   --dry-run           Validate environment without running
 *   --help, -h          Show this help message
 *
 * Environment (required):
 *   SAGA_PROJECT_DIR       Project root directory
 *   SAGA_PLUGIN_ROOT       Plugin root directory
 *   SAGA_INTERNAL_SESSION  Set to "1" when running inside tmux session
 *
 * Output: Depends on mode
 *   - Detached mode: JSON with { sessionName, outputFile }
 *   - Internal mode: Streamed worker output
 *   - Dry-run mode: Validation check results
 *
 * Exit codes:
 *   0 - Success
 *   1 - Error or validation failure
 */

import process from 'node:process';
import { type ImplementOptions, implementCommand } from './implement/index.ts';

// ============================================================================
// CLI Interface
// ============================================================================

/**
 * Print usage information
 */
function printUsage(): void {
  const usage = `
Usage: implement <story-slug> [options]

Run story implementation using Claude workers.

Arguments:
  story-slug    The slug of the story to implement

Options:
  --max-cycles <n>    Maximum worker cycles (default: 10)
  --max-time <n>      Maximum time in minutes (default: 60)
  --model <model>     Model to use (default: opus)
  --dry-run           Validate environment without running
  --help, -h          Show this help message

Environment (required):
  SAGA_PROJECT_DIR       Project root directory
  SAGA_PLUGIN_ROOT       Plugin root directory
  SAGA_INTERNAL_SESSION  Set to "1" when running inside tmux session

Examples:
  # Implement a story (runs in detached tmux session)
  node implement.js add-user-auth

  # Dry run to check environment
  node implement.js add-user-auth --dry-run

  # Run with custom options
  node implement.js add-user-auth --max-cycles 5 --model sonnet
`.trim();

  console.log(usage);
}

/**
 * Print error message to stderr
 */
function printError(message: string): void {
  process.stderr.write(`Error: ${message}\n`);
}

/**
 * Parse a positive integer from a string, returning null if invalid
 */
function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return null;
  }
  return parsed;
}

/**
 * Consume the next argument from the iterator, returning null if exhausted
 */
function consumeNextArg(iter: IterableIterator<string>): string | null {
  const next = iter.next();
  return next.done ? null : next.value;
}

/**
 * Parse a named option that requires a positive integer value
 */
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

/**
 * Process a single CLI argument and update options/storySlug
 * Returns false if parsing should abort
 */
function processArg(
  arg: string,
  iter: IterableIterator<string>,
  options: ImplementOptions,
  state: { storySlug?: string },
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
  if (arg === '--dry-run') {
    options.dryRun = true;
    return true;
  }
  if (arg.startsWith('-') && arg !== '-') {
    printError(`Unknown option: ${arg}`);
    return false;
  }
  if (!state.storySlug) {
    state.storySlug = arg;
    return true;
  }
  printError(`Unexpected argument: ${arg}`);
  return false;
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): { storySlug: string; options: ImplementOptions } | null {
  const options: ImplementOptions = {};
  const state: { storySlug?: string } = {};
  const iter = args[Symbol.iterator]();

  for (const arg of iter) {
    if (!processArg(arg, iter, options, state)) {
      return null;
    }
  }

  if (!state.storySlug) {
    printError('Missing required argument: story-slug');
    printUsage();
    return null;
  }

  return { storySlug: state.storySlug, options };
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Execute the implement command
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const parsed = parseArgs(args);
  if (!parsed) {
    process.exit(1);
  }

  await implementCommand(parsed.storySlug, parsed.options);
}

// Run main
main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
