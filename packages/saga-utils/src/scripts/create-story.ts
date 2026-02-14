/**
 * saga create-story script - Create git infrastructure for a story
 *
 * Reads story + tasks JSON from a file (--input) or stdin and creates:
 *   - Git branch: story/<storyId>
 *   - Git worktree: .saga/worktrees/<storyId>/
 *   - Story and task files in the worktree
 *   - Commit, push, and (optionally) draft PR
 *
 * Usage:
 *   node create-story.js --input story.json --skip-install --skip-pr
 *   echo '{"story":{...},"tasks":[...]}' | node create-story.js
 *
 * Output (JSON):
 *   { "success": true, "storyId": "...", "storyTitle": "...", ... }
 *   { "success": false, "error": "..." }
 */

import { readFileSync } from 'node:fs';
import process from 'node:process';
import { type Story, StorySchema } from '../schemas/story.ts';
import { type Task, TaskSchema } from '../schemas/task.ts';
import { createStory } from './create-story/service.ts';
import { getProjectDir } from './shared/env.ts';

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function printHelp(): void {
  console.log(`Usage: create-story [options]

Create git infrastructure for a SAGA story.

Input (JSON with "story" and "tasks" fields):
  --input <path>   Read JSON from a file (recommended)
  <stdin>          Read JSON from stdin (fallback)

Options:
  --skip-install   Skip dependency installation in worktree
  --skip-pr        Skip draft PR creation
  --help           Show this help message

Environment (required):
  SAGA_PROJECT_DIR   Project root directory

Output (JSON):
  { "success": true, "storyId": "...", "storyTitle": "...", "branch": "...", "worktreePath": "...", "prUrl": "..." }
  { "success": false, "error": "..." }
`);
}

interface ParsedArgs {
  help: boolean;
  skipInstall: boolean;
  skipPr: boolean;
  input: string | null;
}

function parseArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {
    help: false,
    skipInstall: false,
    skipPr: false,
    input: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--skip-install') {
      result.skipInstall = true;
    } else if (arg === '--skip-pr') {
      result.skipPr = true;
    } else if (arg === '--input' && i + 1 < args.length) {
      result.input = args[++i];
    }
  }

  return result;
}

// ============================================================================
// Input Parsing
// ============================================================================

function outputError(error: string): void {
  console.log(JSON.stringify({ success: false, error }, null, 2));
}

function readAndParseInput(inputPath: string | null): { story: unknown; tasks: unknown } | null {
  let rawInput: string;
  try {
    rawInput = inputPath ? readFileSync(inputPath, 'utf-8') : readFileSync(0, 'utf-8');
  } catch {
    outputError(
      inputPath ? `Failed to read input file: ${inputPath}` : 'Failed to read from stdin',
    );
    return null;
  }

  let input: unknown;
  try {
    input = JSON.parse(rawInput);
  } catch {
    outputError(inputPath ? `Invalid JSON in file: ${inputPath}` : 'Invalid JSON on stdin');
    return null;
  }

  const inputObj = input as { story?: unknown; tasks?: unknown };
  if (!(inputObj.story && inputObj.tasks)) {
    outputError('Input must have "story" and "tasks" fields');
    return null;
  }

  return { story: inputObj.story, tasks: inputObj.tasks };
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

  const input = readAndParseInput(args.input);
  if (!input) {
    process.exit(1);
  }

  // Validate against schemas
  let story: Story;
  try {
    story = StorySchema.parse(input.story);
  } catch (error) {
    outputError(`Invalid story: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  let tasks: Task[];
  try {
    const tasksArray = Array.isArray(input.tasks) ? input.tasks : [];
    tasks = tasksArray.map((t: unknown) => TaskSchema.parse(t));
  } catch (error) {
    outputError(`Invalid task: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  // Get project dir from env
  let projectDir: string;
  try {
    projectDir = getProjectDir();
  } catch (error) {
    outputError(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Run service
  const result = createStory({
    projectDir,
    story,
    tasks,
    skipInstall: args.skipInstall,
    skipPr: args.skipPr,
  });

  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exit(1);
  }
}

main();
