/**
 * saga scope-validator script - Validate story scope for file operations
 *
 * This script is invoked as a PreToolUse hook by the Claude CLI to enforce
 * story scope during autonomous execution. It blocks access to:
 * - Files outside the worktree directory
 * - .saga/archive/ (completed stories)
 * - Other stories' files in .saga/stories/ (when SAGA_STORY_ID is set)
 * - Other stories' files in .saga/epics/ (legacy mode with SAGA_EPIC_SLUG/SAGA_STORY_SLUG)
 *
 * Environment variables (set by SessionStart hook via CLAUDE_ENV_FILE):
 * - SAGA_PROJECT_DIR: Absolute path to the project/worktree directory (always required)
 * - SAGA_STORY_ID: The current story identifier (preferred, new flat layout)
 * - SAGA_EPIC_SLUG: The current epic identifier (legacy, fallback)
 * - SAGA_STORY_SLUG: The current story identifier (legacy, fallback)
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

// ============================================================================
// Types
// ============================================================================

interface StoryIdScope {
  mode: 'story-id';
  storyId: string;
}

interface LegacyScope {
  mode: 'legacy';
  epicSlug: string;
  storySlug: string;
}

type ScopeInfo = StoryIdScope | LegacyScope;

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
 * Check if path is within the allowed story scope using SAGA_STORY_ID.
 * Validates against .saga/stories/<storyId>/ (flat layout).
 * Blocks all .saga/epics/ story-level access (cannot reliably match without epic slug).
 * Returns true if access is allowed, false if blocked.
 */
function checkStoryAccessById(path: string, allowedStoryId: string): boolean {
  // Check the new flat .saga/stories/ layout
  if (path.includes('.saga/stories/')) {
    const parts = path.split('/');
    const storiesIdx = parts.indexOf('stories');

    // Need at least a story ID component after 'stories'
    if (storiesIdx === -1 || parts.length <= storiesIdx + 1) {
      return false;
    }

    const pathStoryId = parts[storiesIdx + 1];
    // Empty string after trailing slash
    if (!pathStoryId) {
      return false;
    }

    return pathStoryId === allowedStoryId;
  }

  // Block all .saga/epics/ story-level access when using SAGA_STORY_ID
  // We cannot reliably match the old epic+story pair with just a storyId
  if (path.includes('.saga/epics/')) {
    const parts = path.split('/');
    const epicsIdx = parts.indexOf('epics');

    if (epicsIdx === -1) {
      return true;
    }

    // Check if this path goes into a stories/ subfolder
    const storiesFolderIndex = 2;
    if (
      parts.length > epicsIdx + storiesFolderIndex &&
      parts[epicsIdx + storiesFolderIndex] === 'stories'
    ) {
      // Block all epic-nested story access when using SAGA_STORY_ID
      return false;
    }

    // Allow epic-level files (not story-specific) — they're not scoped
    return true;
  }

  // Not a .saga/stories/ or .saga/epics/ path - allow
  return true;
}

/**
 * Check if path is within the allowed story scope (legacy mode).
 * Validates against .saga/epics/<epicSlug>/stories/<storySlug>/.
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
  const scopeLines =
    scope.mode === 'story-id'
      ? [
          `│    Story:    ${scope.storyId.slice(0, SCOPE_VALUE_WIDTH).padEnd(SCOPE_VALUE_WIDTH)}│`,
          `│    Worktree: ${worktreePath.slice(0, SCOPE_VALUE_WIDTH).padEnd(SCOPE_VALUE_WIDTH)}│`,
        ]
      : [
          `│    Epic:     ${scope.epicSlug.slice(0, SCOPE_VALUE_WIDTH).padEnd(SCOPE_VALUE_WIDTH)}│`,
          `│    Story:    ${scope.storySlug.slice(0, SCOPE_VALUE_WIDTH).padEnd(SCOPE_VALUE_WIDTH)}│`,
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
 * Prefers SAGA_STORY_ID (new flat layout) over SAGA_EPIC_SLUG/SAGA_STORY_SLUG (legacy).
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

  // Prefer SAGA_STORY_ID (new flat layout)
  const storyId = process.env.SAGA_STORY_ID || '';
  if (storyId) {
    return { mode: 'story-id', storyId, worktreePath };
  }

  // Fall back to legacy SAGA_EPIC_SLUG + SAGA_STORY_SLUG
  const epicSlug = process.env.SAGA_EPIC_SLUG || '';
  const storySlug = process.env.SAGA_STORY_SLUG || '';

  if (!(epicSlug && storySlug)) {
    const missing: string[] = [];
    if (!epicSlug) {
      missing.push('SAGA_EPIC_SLUG');
    }
    if (!storySlug) {
      missing.push('SAGA_STORY_SLUG');
    }
    process.stderr.write(
      `scope-validator: Missing required environment variables: ${missing.join(', ')}\n\n` +
        'Neither SAGA_STORY_ID nor SAGA_EPIC_SLUG/SAGA_STORY_SLUG are set.\n' +
        'The scope validator cannot verify file access without these variables.\n' +
        'This is a configuration error - the orchestrator should set these variables.\n\n' +
        'You MUST exit with status BLOCKED and set blocker to:\n' +
        `"Scope validator misconfigured: missing ${missing.join(', ')}"\n`,
    );
    return null;
  }

  return { mode: 'legacy', epicSlug, storySlug, worktreePath };
}

// ============================================================================
// Path Validation
// ============================================================================

/**
 * Validate a file path against scope rules.
 * Returns the violation reason if blocked, null if allowed.
 */
function validatePath(filePath: string, worktreePath: string, scope: ScopeInfo): string | null {
  const normPath = normalizePath(filePath);

  if (!isWithinWorktree(normPath, worktreePath)) {
    return 'Access outside worktree blocked\nReason: Workers can only access files within their assigned worktree directory.';
  }

  if (isArchiveAccess(normPath)) {
    return 'Access to archive folder blocked\nReason: The archive folder contains completed stories and is read-only during execution.';
  }

  if (scope.mode === 'story-id') {
    if (!checkStoryAccessById(normPath, scope.storyId)) {
      return "Access to other story blocked\nReason: Workers can only access their assigned story's files.";
    }
  } else if (!checkStoryAccess(normPath, scope.epicSlug, scope.storySlug)) {
    return "Access to other story blocked\nReason: Workers can only access their assigned story's files.";
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

  const { worktreePath, ...scope } = env;
  const violation = validatePath(filePath, worktreePath, scope);
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
  checkStoryAccess,
  checkStoryAccessById,
  getFilePathFromInput,
  getScopeEnvironment,
  isArchiveAccess,
  isWithinWorktree,
  normalizePath,
  validatePath,
};
