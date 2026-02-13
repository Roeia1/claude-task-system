/**
 * Task list ID generation and validation for per-session namespacing.
 *
 * Each worker session gets its own task list under ~/.claude/tasks/
 * using the pattern: saga__<storyId>__<sessionTimestamp>
 */

import { homedir } from 'node:os';
import { join } from 'node:path';

const TASK_LIST_ID_PATTERN = /^saga__([a-z0-9-]+)__(\d+)$/;

/**
 * Generate a task list ID for a given story and session.
 */
export function generateTaskListId(storyId: string, sessionTimestamp: number): string {
  return `saga__${storyId}__${sessionTimestamp}`;
}

/**
 * Parse a task list ID into its components.
 * Returns null for non-SAGA task list IDs.
 */
export function parseTaskListId(
  taskListId: string,
): { storyId: string; sessionTimestamp: number } | null {
  const match = taskListId.match(TASK_LIST_ID_PATTERN);
  if (!match) {
    return null;
  }
  return {
    storyId: match[1],
    sessionTimestamp: Number(match[2]),
  };
}

/**
 * Get the full directory path for a task list.
 * Defaults to ~/.claude/tasks/<taskListId>/ but can be overridden
 * via the baseDir parameter (used in tests).
 */
export function getTaskListDir(taskListId: string, baseDir?: string): string {
  const base = baseDir ?? join(homedir(), '.claude', 'tasks');
  return join(base, taskListId);
}
