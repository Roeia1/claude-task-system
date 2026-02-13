import type { ClaudeCodeTask } from './schemas/claude-code-task.ts';
import type { Task } from './schemas/task.ts';

/**
 * Converts a SAGA task to Claude Code's native task format.
 *
 * - `guidance` and `doneWhen` are placed in `metadata`
 * - `blocks` is always `[]` (computed separately from other tasks' `blockedBy`)
 */
export function toClaudeTask(sagaTask: Task): ClaudeCodeTask {
  const metadata: Record<string, unknown> = {};
  if (sagaTask.guidance !== undefined) {
    metadata.guidance = sagaTask.guidance;
  }
  if (sagaTask.doneWhen !== undefined) {
    metadata.doneWhen = sagaTask.doneWhen;
  }

  return {
    id: sagaTask.id,
    subject: sagaTask.subject,
    description: sagaTask.description,
    ...(sagaTask.activeForm !== undefined && { activeForm: sagaTask.activeForm }),
    status: sagaTask.status,
    blockedBy: sagaTask.blockedBy,
    blocks: [],
    ...(Object.keys(metadata).length > 0 && { metadata }),
  };
}

/**
 * Extracts sync-relevant fields from a Claude Code task back to SAGA format.
 *
 * Only `status` is synced back -- other fields are source-controlled in SAGA
 * and should not be overwritten from Claude Code.
 */
export function fromClaudeTask(claudeTask: ClaudeCodeTask): Pick<Task, 'status'> {
  return { status: claudeTask.status };
}
