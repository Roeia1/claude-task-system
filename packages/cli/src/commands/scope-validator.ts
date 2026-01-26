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

import { resolve, relative } from 'node:path';

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

  // Check if this is in stories folder
  if (parts.length > epicsIdx + 3 && parts[epicsIdx + 2] === 'stories') {
    const pathStory = parts[epicsIdx + 3];
    // Allow if matches current epic and story
    return pathEpic === allowedEpic && pathStory === allowedStory;
  } else {
    // Not in a story folder - allow epic-level access for same epic
    return pathEpic === allowedEpic;
  }
}

/**
 * Print scope violation error message to stderr
 */
function printScopeViolation(
  filePath: string,
  epicSlug: string,
  storySlug: string,
  worktreePath: string,
  reason: string
): void {
  console.error(`SCOPE VIOLATION: ${reason}

Attempted path: ${filePath}

Your scope is limited to:
  Worktree: ${worktreePath}
  Epic: ${epicSlug}
  Story: ${storySlug}
  Allowed story files: .saga/epics/${epicSlug}/stories/${storySlug}/

Workers cannot access files outside the worktree directory.
To access other stories, start a new /implement session for that story.`);
}

/**
 * Execute the scope-validator command
 * Reads tool input from stdin and validates file path against story scope
 */
export async function scopeValidatorCommand(): Promise<void> {
  // Get environment variables (set by SessionStart hook via CLAUDE_ENV_FILE)
  const worktreePath = process.env.SAGA_PROJECT_DIR || '';
  const epicSlug = process.env.SAGA_EPIC_SLUG || '';
  const storySlug = process.env.SAGA_STORY_SLUG || '';

  if (!worktreePath || !epicSlug || !storySlug) {
    console.error(
      'ERROR: scope-validator requires SAGA_PROJECT_DIR, SAGA_EPIC_SLUG, and SAGA_STORY_SLUG environment variables'
    );
    process.exit(2);
  }

  // Read tool input JSON from stdin
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const toolInput = Buffer.concat(chunks).toString('utf-8');

  // Extract file path from JSON
  const filePath = getFilePathFromInput(toolInput);

  // If no path found, allow the operation (not a file operation)
  if (!filePath) {
    process.exit(0);
  }

  // Normalize path
  const normPath = normalizePath(filePath);

  // Check for worktree boundary violation (must check first)
  if (!isWithinWorktree(normPath, worktreePath)) {
    printScopeViolation(
      filePath,
      epicSlug,
      storySlug,
      worktreePath,
      'Access outside worktree blocked\nReason: Workers can only access files within their assigned worktree directory.'
    );
    process.exit(2);
  }

  // Check for archive access
  if (isArchiveAccess(normPath)) {
    printScopeViolation(
      filePath,
      epicSlug,
      storySlug,
      worktreePath,
      'Access to archive folder blocked\nReason: The archive folder contains completed stories and is read-only during execution.'
    );
    process.exit(2);
  }

  // Check for access to other stories
  if (!checkStoryAccess(normPath, epicSlug, storySlug)) {
    printScopeViolation(
      filePath,
      epicSlug,
      storySlug,
      worktreePath,
      'Access to other story blocked\nReason: Workers can only access their assigned story\'s files.'
    );
    process.exit(2);
  }

  // All other paths within the worktree are allowed
  process.exit(0);
}
