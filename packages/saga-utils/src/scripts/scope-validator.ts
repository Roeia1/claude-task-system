/**
 * Scope validation logic for story file access.
 *
 * Enforces story scope during autonomous execution by blocking access to:
 * - Files outside the worktree directory
 * - .saga/archive/ (completed stories)
 * - Other stories' files in .saga/stories/
 *
 * Used by the in-process SDK hook (scope-validator-hook.ts) via validatePath().
 */

import { relative, resolve } from 'node:path';

// Write tools that modify files (as opposed to read-only tools like Read, Glob, Grep)
const WRITE_TOOLS = new Set(['Write', 'Edit']);

// ============================================================================
// Types
// ============================================================================

interface ScopeInfo {
  storyId: string;
}

// ============================================================================
// Path Helpers
// ============================================================================

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

// ============================================================================
// Scope Validation
// ============================================================================

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

  const relPath = relative(resolve(worktreePath), resolve(normPath));
  if (!checkStoryAccessById(relPath, scope.storyId)) {
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
// Exports
// ============================================================================

export {
  checkStoryAccessById,
  isArchiveAccess,
  isJournalPath,
  isSagaPath,
  isWithinWorktree,
  normalizePath,
  validatePath,
};
