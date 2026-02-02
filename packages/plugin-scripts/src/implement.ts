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
 *   --path <path>       Path to SAGA project (default: auto-detect)
 *   --max-cycles <n>    Maximum worker cycles (default: 10)
 *   --max-time <n>      Maximum time in minutes (default: 60)
 *   --model <model>     Model to use (default: opus)
 *   --dry-run           Validate environment without running
 *   --help, -h          Show this help message
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
import { implementCommand, type ImplementOptions } from './implement/index.ts';

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
  --path <path>       Path to SAGA project (default: auto-detect)
  --max-cycles <n>    Maximum worker cycles (default: 10)
  --max-time <n>      Maximum time in minutes (default: 60)
  --model <model>     Model to use (default: opus)
  --dry-run           Validate environment without running
  --help, -h          Show this help message

Examples:
  # Implement a story (runs in detached tmux session)
  node implement.js add-user-auth

  # Dry run to check environment
  node implement.js add-user-auth --dry-run

  # Run with custom options
  node implement.js add-user-auth --max-cycles 5 --model sonnet

  # Specify project path
  node implement.js add-user-auth --path /path/to/project

Environment:
  SAGA_PROJECT_DIR    Project directory (optional if --path provided)
  SAGA_PLUGIN_ROOT    Plugin root directory (required)
  SAGA_INTERNAL_SESSION=1  Indicates running inside tmux session
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
 * Parse command line arguments
 */
function parseArgs(args: string[]): { storySlug: string; options: ImplementOptions } | null {
  const options: ImplementOptions = {};
  let storySlug: string | undefined;

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    // Handle --help
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }

    // Handle --path
    if (arg === '--path') {
      i++;
      if (i >= args.length) {
        printError('--path requires a value');
        return null;
      }
      options.path = args[i];
      i++;
      continue;
    }

    // Handle --max-cycles
    if (arg === '--max-cycles') {
      i++;
      if (i >= args.length) {
        printError('--max-cycles requires a value');
        return null;
      }
      const value = Number.parseInt(args[i], 10);
      if (Number.isNaN(value) || value < 1) {
        printError('--max-cycles must be a positive integer');
        return null;
      }
      options.maxCycles = value;
      i++;
      continue;
    }

    // Handle --max-time
    if (arg === '--max-time') {
      i++;
      if (i >= args.length) {
        printError('--max-time requires a value');
        return null;
      }
      const value = Number.parseInt(args[i], 10);
      if (Number.isNaN(value) || value < 1) {
        printError('--max-time must be a positive integer');
        return null;
      }
      options.maxTime = value;
      i++;
      continue;
    }

    // Handle --model
    if (arg === '--model') {
      i++;
      if (i >= args.length) {
        printError('--model requires a value');
        return null;
      }
      options.model = args[i];
      i++;
      continue;
    }

    // Handle --dry-run
    if (arg === '--dry-run') {
      options.dryRun = true;
      i++;
      continue;
    }

    // Handle unknown options
    if (arg.startsWith('--')) {
      printError(`Unknown option: ${arg}`);
      return null;
    }
    if (arg.startsWith('-') && arg !== '-') {
      printError(`Unknown option: ${arg}`);
      return null;
    }

    // Positional argument (story slug)
    if (!storySlug) {
      storySlug = arg;
      i++;
      continue;
    }

    // Extra positional argument
    printError(`Unexpected argument: ${arg}`);
    return null;
  }

  if (!storySlug) {
    printError('Missing required argument: story-slug');
    printUsage();
    return null;
  }

  return { storySlug, options };
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
