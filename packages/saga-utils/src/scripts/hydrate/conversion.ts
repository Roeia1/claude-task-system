/**
 * SAGA-to-Claude Code task conversion with computed blocks.
 *
 * Wraps the base conversion from @saga-ai/types and adds the `blocks`
 * computation that requires knowledge of the full task list.
 */

import { fromClaudeTask, toClaudeTask as toClaudeTaskBase } from '../../conversion.ts';
import type { ClaudeCodeTask, Task } from '../../schemas/index.ts';

/**
 * Convert a single SAGA task to Claude Code format, computing the `blocks`
 * array from the full task list.
 *
 * `blocks` is the inverse of `blockedBy`: task A blocks task B if B lists A
 * in its `blockedBy` array.
 */
export function convertTask(task: Task, allTasks: Task[]): ClaudeCodeTask {
  const blocks = allTasks
    .filter((other) => other.blockedBy.includes(task.id))
    .map((other) => other.id);

  const converted = toClaudeTaskBase(task);
  converted.blocks = blocks;
  return converted;
}

/**
 * Convert all SAGA tasks to Claude Code format with computed blocks.
 */
export function convertTasks(tasks: Task[]): ClaudeCodeTask[] {
  return tasks.map((task) => convertTask(task, tasks));
}

/**
 * Extract only the status field from a Claude Code task for syncing back
 * to SAGA. Alias for `fromClaudeTask` from @saga-ai/types.
 */
export function extractStatus(claudeTask: ClaudeCodeTask): Pick<Task, 'status'> {
  return fromClaudeTask(claudeTask);
}
