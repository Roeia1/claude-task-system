/**
 * saga scope-validator script - Validate story scope for file operations
 *
 * This script is invoked as a PreToolUse hook by the Claude CLI to enforce
 * story scope during autonomous execution. It blocks access to:
 * - Files outside the worktree directory
 * - .saga/archive/ (completed stories)
 * - Other stories' files in .saga/stories/ (when SAGA_STORY_ID is set)
 *
 * Environment variables (set by SessionStart hook via CLAUDE_ENV_FILE):
 * - SAGA_PROJECT_DIR: Absolute path to the project/worktree directory (always required)
 * - SAGA_STORY_ID: The current story identifier (required)
 *
 * Input: Tool input JSON is read from stdin
 * Exit codes:
 *   0 = allowed (operation can proceed)
 *   2 = blocked (scope violation or configuration error, with error message to stderr)
 */

import { relative, resolve } from 'node:path';
import process from 'node:process';

// Exit codes per Claude Code hooks specification
const EXIT_ALLOWED = 0;
const EXIT_BLOCKED = 2;

// Box formatting constants for scope violation message
const FILE_PATH_WIDTH = 50;
const SCOPE_VALUE_WIDTH = 43;
const REASON_WIDTH = 56;

// Write tools that modify files (as opposed to read-only tools like Read, Glob, Grep)
const WRITE_TOOLS = new Set(['Write', 'Edit']);

// ============================================================================
// Types
// ============================================================================

interface ScopeInfo {
  storyId: string;
}

// ============================================================================
// Input Parsing
// ============================================================================

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
 * Extract tool name from hook input JSON
 */
function getToolNameFromInput(hookInput: string): string | null {
  try {
    const data = JSON.parse(hookInput);
    return data.tool_name || null;
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

// ============================================================================
// Scope Validation
// ============================================================================

/**
 * Check if a path is inside the .saga/ directory (relative to worktree).
 */
function isSagaPath(filePath: string, worktreePath: string): boolean {
  const absoluteFilePath = resolve(filePath);
  const absoluteWorktree = resolve(worktreePath);
  const rel = relative(absoluteWorktree, absoluteFilePath);
  return rel === '.saga' || rel.startsWith('.saga/');
}

/**
 * Check if a path is the journal.md of the assigned story.
 */
function isJournalPath(filePath: string, worktreePath: string, storyId: string): boolean {
  const absoluteFilePath = resolve(filePath);
  const absoluteWorktree = resolve(worktreePath);
  const rel = relative(absoluteWorktree, absoluteFilePath);
  return rel === `.saga/stories/${storyId}/journal.md`;
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
 * Check if a .saga/stories/ path matches the allowed story ID.
 * Returns true if access is allowed, false if blocked.
 */
function checkStoriesPath(parts: string[], allowedStoryId: string): boolean {
  const sagaIdx = parts.indexOf('.saga');
  if (sagaIdx === -1) {
    return false;
  }

  const storiesIdx = sagaIdx + 1;
  if (parts[storiesIdx] !== 'stories' || parts.length <= storiesIdx + 1) {
    return false;
  }

  const pathStoryId = parts[storiesIdx + 1];
  if (!pathStoryId) {
    return false;
  }

  return pathStoryId === allowedStoryId;
}

/**
 * Check if a .saga/epics/ path is allowed.
 * Blocks story-level access within epics (cannot match without epic slug).
 * Returns true if access is allowed, false if blocked.
 */
function checkEpicsPath(parts: string[]): boolean {
  const sagaIdx = parts.indexOf('.saga');
  if (sagaIdx === -1) {
    return true;
  }

  const epicsIdx = sagaIdx + 1;
  if (parts[epicsIdx] !== 'epics') {
    return true;
  }

  const storiesFolderIndex = 2;
  if (
    parts.length > epicsIdx + storiesFolderIndex &&
    parts[epicsIdx + storiesFolderIndex] === 'stories'
  ) {
    return false;
  }

  return true;
}

/**
 * Check if path is within the allowed story scope using SAGA_STORY_ID.
 * Validates against .saga/stories/<storyId>/ (flat layout).
 * Blocks all .saga/epics/ story-level access (cannot reliably match without epic slug).
 * Returns true if access is allowed, false if blocked.
 */
function checkStoryAccessById(path: string, allowedStoryId: string): boolean {
  if (path.includes('.saga/stories/')) {
    return checkStoriesPath(path.split('/'), allowedStoryId);
  }

  if (path.includes('.saga/epics/')) {
    return checkEpicsPath(path.split('/'));
  }

  return true;
}

// ============================================================================
// Output Formatting
// ============================================================================

/**
 * Print scope violation error message to stderr
 */
function printScopeViolation(
  filePath: string,
  scope: ScopeInfo,
  worktreePath: string,
  reason: string,
): void {
  const scopeLines = [
    `│    Story:    ${scope.storyId.slice(0, SCOPE_VALUE_WIDTH).padEnd(SCOPE_VALUE_WIDTH)}│`,
    `│    Worktree: ${worktreePath.slice(0, SCOPE_VALUE_WIDTH).padEnd(SCOPE_VALUE_WIDTH)}│`,
  ];

  const message = [
    '',
    '╭─ Scope Violation ─────────────────────────────────────────╮',
    '│                                                           │',
    `│  File: ${filePath.slice(0, FILE_PATH_WIDTH).padEnd(FILE_PATH_WIDTH)}│`,
    '│                                                           │',
    `│  ${reason.split('\n')[0].padEnd(REASON_WIDTH)}│`,
    '│                                                           │',
    '│  Current scope:                                           │',
    ...scopeLines,
    '│                                                           │',
    '╰───────────────────────────────────────────────────────────╯',
    '',
  ].join('\n');

  process.stderr.write(message);
}

// ============================================================================
// Stdin Reading
// ============================================================================

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

// ============================================================================
// Environment
// ============================================================================

/**
 * Get required environment variables for scope validation.
 * Requires SAGA_STORY_ID to be set.
 * Returns null if required variables are missing, with error output to stderr.
 */
function getScopeEnvironment(): (ScopeInfo & { worktreePath: string }) | null {
  const worktreePath = process.env.SAGA_PROJECT_DIR || '';

  if (!worktreePath) {
    process.stderr.write(
      'scope-validator: Missing required environment variable: SAGA_PROJECT_DIR\n\n' +
        'The scope validator cannot verify file access without this variable.\n' +
        'This is a configuration error - the orchestrator should set this variable.\n\n' +
        'You MUST exit with status BLOCKED and set blocker to:\n' +
        '"Scope validator misconfigured: missing SAGA_PROJECT_DIR"\n',
    );
    return null;
  }

  const storyId = process.env.SAGA_STORY_ID || '';
  if (!storyId) {
    process.stderr.write(
      'scope-validator: Missing required environment variable: SAGA_STORY_ID\n\n' +
        'The scope validator cannot verify file access without this variable.\n' +
        'This is a configuration error - the worker should set SAGA_STORY_ID.\n\n' +
        'You MUST exit with status BLOCKED and set blocker to:\n' +
        '"Scope validator misconfigured: missing SAGA_STORY_ID"\n',
    );
    return null;
  }

  return { storyId, worktreePath };
}

// ============================================================================
// Path Validation
// ============================================================================

/**
 * Validate a file path against scope rules.
 * Returns the violation reason if blocked, null if allowed.
 *
 * When toolName is provided and is a write tool (Write/Edit),
 * .saga/ files are immutable except for journal.md of the assigned story.
 */
function validatePath(
  filePath: string,
  worktreePath: string,
  scope: ScopeInfo,
  toolName?: string,
): string | null {
  const normPath = normalizePath(filePath);

  if (!isWithinWorktree(normPath, worktreePath)) {
    return 'Access outside worktree blocked\nReason: Workers can only access files within their assigned worktree directory.';
  }

  if (isArchiveAccess(normPath)) {
    return 'Access to archive folder blocked\nReason: The archive folder contains completed stories and is read-only during execution.';
  }

  if (!checkStoryAccessById(normPath, scope.storyId)) {
    return "Access to other story blocked\nReason: Workers can only access their assigned story's files.";
  }

  // .saga/ files are immutable for write tools, except journal.md of the assigned story
  if (
    toolName &&
    WRITE_TOOLS.has(toolName) &&
    isSagaPath(normPath, worktreePath) &&
    !isJournalPath(normPath, worktreePath, scope.storyId)
  ) {
    return '.saga write blocked\nReason: Only journal.md is writable inside the .saga directory. All other .saga files are immutable during execution.';
  }

  return null;
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Execute the scope-validator command
 * Reads tool input from stdin and validates file path against story scope
 */
async function main(): Promise<void> {
  const env = getScopeEnvironment();
  if (!env) {
    // Missing required environment variables - block operation and instruct worker to fail
    process.exit(EXIT_BLOCKED);
  }

  const toolInput = await readStdinInput();
  const filePath = getFilePathFromInput(toolInput);

  // If no path found, allow the operation (not a file operation)
  if (!filePath) {
    process.exit(EXIT_ALLOWED);
  }

  const toolName = getToolNameFromInput(toolInput);
  const { worktreePath, ...scope } = env;
  const violation = validatePath(filePath, worktreePath, scope, toolName ?? undefined);
  if (violation) {
    printScopeViolation(filePath, scope, worktreePath, violation);
    process.exit(EXIT_BLOCKED);
  }

  process.exit(EXIT_ALLOWED);
}

// Run main only when executed directly (not when imported for testing)
const isDirectExecution =
  process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isDirectExecution) {
  main();
}

// ============================================================================
// Exports
// ============================================================================

export {
  checkStoryAccessById,
  getFilePathFromInput,
  getScopeEnvironment,
  getToolNameFromInput,
  isArchiveAccess,
  isJournalPath,
  isSagaPath,
  isWithinWorktree,
  normalizePath,
  validatePath,
};
