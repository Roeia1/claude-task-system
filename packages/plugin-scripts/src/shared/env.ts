/**
 * Shared environment variable helpers for plugin-scripts
 *
 * These functions read required SAGA environment variables and throw
 * descriptive errors if they are not set.
 */

import process from 'node:process';

/**
 * Get SAGA_PROJECT_DIR from environment
 * @throws Error if not set
 */
export function getProjectDir(): string {
  const projectDir = process.env.SAGA_PROJECT_DIR;
  if (!projectDir) {
    throw new Error(
      'SAGA_PROJECT_DIR environment variable is not set.\n' +
        'This script must be run from a SAGA session where env vars are set.',
    );
  }
  return projectDir;
}

/**
 * Get SAGA_PLUGIN_ROOT from environment
 * @throws Error if not set
 */
export function getPluginRoot(): string {
  const pluginRoot = process.env.SAGA_PLUGIN_ROOT;
  if (!pluginRoot) {
    throw new Error(
      'SAGA_PLUGIN_ROOT environment variable is not set.\n' +
        'This script must be run from a SAGA session where env vars are set.',
    );
  }
  return pluginRoot;
}

/**
 * Get SAGA_STORY_ID from environment.
 * This is the primary story identifier in the new story-based workflow.
 * Set by the worker before spawning headless runs.
 * @throws Error if not set
 */
export function getStoryId(): string {
  const storyId = process.env.SAGA_STORY_ID;
  if (!storyId) {
    throw new Error(
      'SAGA_STORY_ID environment variable is not set.\n' +
        'This variable is required in worker context and is set by the worker script.',
    );
  }
  return storyId;
}

/**
 * Get SAGA_STORY_TASK_LIST_ID from environment.
 * This is the task list identifier for Claude Code native Tasks integration.
 * Set by the worker before spawning headless runs.
 * @throws Error if not set
 */
export function getStoryTaskListId(): string {
  const taskListId = process.env.SAGA_STORY_TASK_LIST_ID;
  if (!taskListId) {
    throw new Error(
      'SAGA_STORY_TASK_LIST_ID environment variable is not set.\n' +
        'This variable is required in worker context and is set by the worker script.',
    );
  }
  return taskListId;
}

/**
 * Get SAGA_EPIC_SLUG from environment.
 * @deprecated Use getStoryId() instead. The story ID is now the primary identifier,
 * replacing the old epic-slug + story-slug pair. This function remains for backward
 * compatibility during migration.
 * @throws Error if not set
 */
export function getEpicSlug(): string {
  const epicSlug = process.env.SAGA_EPIC_SLUG;
  if (!epicSlug) {
    throw new Error(
      'SAGA_EPIC_SLUG environment variable is not set.\n' +
        'This script must be run from a SAGA session where env vars are set.',
    );
  }
  return epicSlug;
}

/**
 * Get SAGA_STORY_SLUG from environment.
 * @deprecated Use getStoryId() instead. The story ID is now the primary identifier,
 * replacing the old epic-slug + story-slug pair. This function remains for backward
 * compatibility during migration.
 * @throws Error if not set
 */
export function getStorySlug(): string {
  const storySlug = process.env.SAGA_STORY_SLUG;
  if (!storySlug) {
    throw new Error(
      'SAGA_STORY_SLUG environment variable is not set.\n' +
        'This script must be run from a SAGA session where env vars are set.',
    );
  }
  return storySlug;
}
