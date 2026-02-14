/**
 * saga create-story script - Create git infrastructure for a story
 *
 * Reads story + tasks JSON from stdin and creates:
 *   - Git branch: story/<storyId>
 *   - Git worktree: .saga/worktrees/<storyId>/
 *   - Story and task files in the worktree
 *   - Commit, push, and (optionally) draft PR
 *
 * Usage:
 *   echo '{"story":{...},"tasks":[...]}' | node create-story.js
 *   echo '{"story":{...},"tasks":[...]}' | node create-story.js --skip-install --skip-pr
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
  console.log(`Usage: echo '{"story":{...},"tasks":[...]}' | create-story [options]

Create git infrastructure for a SAGA story.

Reads JSON from stdin with fields:
  story    Story object (id, title, description, ...)
  tasks    Array of Task objects

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
}

function parseArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {
    help: false,
    skipInstall: false,
    skipPr: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--skip-install') {
      result.skipInstall = true;
    } else if (arg === '--skip-pr') {
      result.skipPr = true;
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

function readAndParseInput(): { story: unknown; tasks: unknown } | null {
  let rawInput: string;
  try {
    rawInput = readFileSync(0, 'utf-8');
  } catch {
    outputError('Failed to read from stdin');
    return null;
  }

  let input: unknown;
  try {
    input = JSON.parse(rawInput);
  } catch {
    outputError('Invalid JSON on stdin');
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

  const input = readAndParseInput();
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
