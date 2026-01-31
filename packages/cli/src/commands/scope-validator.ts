/**
 * saga scope-validator command - Validate story scope for file operations
 *
 * This command is invoked as a PreToolUse hook by the Claude CLI to enforce
 * story scope during autonomous execution. It blocks access to:
 * - Files outside the worktree directory
 * - .saga/archive/ (completed stories)
 * - Other stories' files in .saga/epics/
 *
 * Environment variables required (set by SessionStart hook via CLAUDE_ENV_FILE):
 * - SAGA_PROJECT_DIR: Absolute path to the project/worktree directory
 * - SAGA_EPIC_SLUG: The current epic identifier
 * - SAGA_STORY_SLUG: The current story identifier
 *
 * Input: Tool input JSON is read from stdin
 * Output: Exit code 0 = allowed, exit code 2 = blocked (with error message)
 */

import { relative, resolve } from 'node:path';
import process from 'node:process';

/**
 * Extract file path from hook input JSON
 *
 * Hook input structure:
 * {
 *   "tool_name": "Read",
 *   "tool_input": { "file_path": "/path/to/file.txt" },
 *   ...
 * }
 */
function getFilePathFromInput(hookInput: string): string | null {
  try {
    const data = JSON.parse(hookInput);
    const toolInput = data.tool_input || {};
    // Read, Write, Edit use file_path; Glob, Grep use path
    return toolInput.file_path || toolInput.path || null;
  } catch {
    return null;
  }
}

/**
 * Normalize path by removing leading ./
 */
function normalizePath(path: string): string {
  if (path.startsWith('./')) {
    return path.slice(2);
  }
  return path;
}

/**
 * Check if path attempts to access the archive folder
 */
function isArchiveAccess(path: string): boolean {
  return path.includes('.saga/archive');
}

/**
 * Check if a path is within the allowed worktree directory.
 * Returns true if access is allowed, false if blocked.
 */
function isWithinWorktree(filePath: string, worktreePath: string): boolean {
  // Resolve both paths to absolute form
  const absoluteFilePath = resolve(filePath);
  const absoluteWorktree = resolve(worktreePath);

  // Get relative path from worktree to file
  const relativePath = relative(absoluteWorktree, absoluteFilePath);

  // If relative path starts with '..' or is absolute, file is outside worktree
  if (relativePath.startsWith('..') || resolve(relativePath) === relativePath) {
    return false;
  }

  return true;
}

/**
 * Check if path is within the allowed story scope.
 * Returns true if access is allowed, false if blocked.
 */
function checkStoryAccess(path: string, allowedEpic: string, allowedStory: string): boolean {
  if (!path.includes('.saga/epics/')) {
    return true;
  }

  const parts = path.split('/');
  const epicsIdx = parts.indexOf('epics');

  if (epicsIdx === -1) {
    // No 'epics' in path - not a story file
    return true;
  }

  // Check if path has epic component
  if (parts.length <= epicsIdx + 1) {
    // Just epics folder itself
    return true;
  }

  const pathEpic = parts[epicsIdx + 1];

  // Path indices for story folder structure: .saga/epics/{epicSlug}/stories/{storySlug}
  const storiesFolderIndex = 2;
  const storySlugIndex = 3;

  // Check if this is in stories folder
  if (
    parts.length > epicsIdx + storySlugIndex &&
    parts[epicsIdx + storiesFolderIndex] === 'stories'
  ) {
    const pathStory = parts[epicsIdx + storySlugIndex];
    // Allow if matches current epic and story
    return pathEpic === allowedEpic && pathStory === allowedStory;
  }
  // Not in a story folder - allow epic-level access for same epic
  return pathEpic === allowedEpic;
}

/**
 * Print scope violation error message to stderr
 */
function printScopeViolation(
  filePath: string,
  epicSlug: string,
  storySlug: string,
  worktreePath: string,
  reason: string,
): void {
  const message = [
    '',
    '╭─ Scope Violation ─────────────────────────────────────────╮',
    '│                                                           │',
    `│  File: ${filePath.slice(0, 50).padEnd(50)}│`,
    '│                                                           │',
    `│  ${reason.split('\n')[0].padEnd(56)}│`,
    '│                                                           │',
    `│  Current scope:                                           │`,
    `│    Epic:     ${epicSlug.slice(0, 43).padEnd(43)}│`,
    `│    Story:    ${storySlug.slice(0, 43).padEnd(43)}│`,
    `│    Worktree: ${worktreePath.slice(0, 43).padEnd(43)}│`,
    '│                                                           │',
    '╰───────────────────────────────────────────────────────────╯',
    '',
  ].join('\n');

  process.stderr.write(message);
}

/**
 * Read tool input from stdin
 */
async function readStdinInput(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

/**
 * Get required environment variables for scope validation
 * Returns null if any required variable is missing
 */
function getScopeEnvironment(): {
  worktreePath: string;
  epicSlug: string;
  storySlug: string;
} | null {
  const worktreePath = process.env.SAGA_PROJECT_DIR || '';
  const epicSlug = process.env.SAGA_EPIC_SLUG || '';
  const storySlug = process.env.SAGA_STORY_SLUG || '';

  if (!(worktreePath && epicSlug && storySlug)) {
    return null;
  }

  return { worktreePath, epicSlug, storySlug };
}

/**
 * Validate a file path against scope rules
 * Returns the violation reason if blocked, null if allowed
 */
function validatePath(
  filePath: string,
  worktreePath: string,
  epicSlug: string,
  storySlug: string,
): string | null {
  const normPath = normalizePath(filePath);

  if (!isWithinWorktree(normPath, worktreePath)) {
    return 'Access outside worktree blocked\nReason: Workers can only access files within their assigned worktree directory.';
  }

  if (isArchiveAccess(normPath)) {
    return 'Access to archive folder blocked\nReason: The archive folder contains completed stories and is read-only during execution.';
  }

  if (!checkStoryAccess(normPath, epicSlug, storySlug)) {
    return "Access to other story blocked\nReason: Workers can only access their assigned story's files.";
  }

  return null;
}

/**
 * Execute the scope-validator command
 * Reads tool input from stdin and validates file path against story scope
 */
export async function scopeValidatorCommand(): Promise<void> {
  const env = getScopeEnvironment();
  if (!env) {
    process.exit(2);
  }

  const toolInput = await readStdinInput();
  const filePath = getFilePathFromInput(toolInput);

  // If no path found, allow the operation (not a file operation)
  if (!filePath) {
    process.exit(0);
  }

  const violation = validatePath(filePath, env.worktreePath, env.epicSlug, env.storySlug);
  if (violation) {
    printScopeViolation(filePath, env.epicSlug, env.storySlug, env.worktreePath, violation);
    process.exit(2);
  }

  process.exit(0);
}
