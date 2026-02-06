/**
 * Task hydration for the worker pipeline (step 4)
 *
 * Reads SAGA task files from .saga/stories/<storyId>/, converts them to
 * Claude Code format, and writes them to ~/.claude/tasks/<taskListId>/.
 *
 * Delegates to the hydration service from hydrate/service.ts.
 */

import process from 'node:process';
import { type HydrationResult, hydrate } from '../hydrate/service.ts';

/**
 * Hydrate tasks for a story into Claude Code format.
 *
 * @param storyId - The story identifier
 * @param projectDir - The project root directory (contains .saga/)
 * @param claudeTasksBase - Override for the base tasks directory (used in tests)
 * @returns The hydration result containing taskListId, taskCount, and storyMeta
 */
function hydrateTasks(
  storyId: string,
  projectDir: string,
  claudeTasksBase?: string,
): HydrationResult {
  const sessionTimestamp = Date.now();
  const result = hydrate(storyId, sessionTimestamp, projectDir, claudeTasksBase);

  process.stdout.write(
    `[worker] Step 4: Hydrated ${result.taskCount} tasks → ${result.taskListId}\n`,
  );

  return result;
}

export { hydrateTasks };
